import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

// Load environment variables from .env
dotenv.config();

const app = express();
const PORT = 3000;

// Set up JSON body parser with increased limit for base64 image uploads
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ limit: "20mb", extended: true }));

// Types definitions
interface Leader {
  id: string;
  name: string;
  city: string;
  points: number;
}

interface CivicReport {
  id: string;
  imageUrl: string; // contains the base64 data URI
  category: string;
  city: string;
  leaderName: string;
  status: string; // defaults to "Reported"
  timestamp: number;
}

interface DbSchema {
  leaders: Leader[];
  reports: CivicReport[];
  imageHashes: string[];
}

const DB_FILE = path.join(process.cwd(), "db.json");

const initialLeaders: Leader[] = [
  { id: "1", name: "M. Goutham Kumar", city: "Bengaluru", points: 850 },
  { id: "2", name: "Pravesh Wahi", city: "Delhi", points: 920 },
  { id: "3", name: "Priya Rajan", city: "Chennai", points: 780 },
  { id: "4", name: "Gadwal Vijayalakshmi", city: "Hyderabad", points: 890 },
  { id: "5", name: "Bhushan Gagrani", city: "Mumbai", points: 940 },
  { id: "6", name: "Pratibhaben Jain", city: "Ahmedabad", points: 810 },
  { id: "7", name: "Firhad Hakim", city: "Kolkata", points: 860 },
  { id: "8", name: "Naval Kishore Ram", city: "Pune", points: 900 },
  { id: "9", name: "Somya Gurjar", city: "Jaipur", points: 750 },
  { id: "10", name: "Sushma Kharakwal", city: "Lucknow", points: 830 },
];

// Helper to load or initialize database
function loadDb(): DbSchema {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, "utf-8");
      const parsed = JSON.parse(data);
      // Ensure basic structure is correct
      if (parsed && Array.isArray(parsed.leaders) && Array.isArray(parsed.reports) && Array.isArray(parsed.imageHashes)) {
        // Automatically migrate to include any new initial leaders that aren't already in the loaded leaders list
        let modified = false;
        for (const initialLeader of initialLeaders) {
          if (!parsed.leaders.some((l: any) => l.city.toLowerCase() === initialLeader.city.toLowerCase())) {
            parsed.leaders.push(initialLeader);
            modified = true;
          }
        }
        if (modified) {
          saveDb(parsed);
        }
        return parsed;
      }
    }
  } catch (error) {
    console.error("Error reading database file, resetting to initial:", error);
  }
  return {
    leaders: initialLeaders,
    reports: [],
    imageHashes: []
  };
}

// Helper to save database
function saveDb(db: DbSchema) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing to database file:", error);
  }
}

// Lazy initialization of Gemini client to prevent startup crash if GEMINI_API_KEY is missing
let aiInstance: GoogleGenAI | null = null;

function getGoogleGenAI(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    throw new Error("GEMINI_API_KEY is not configured. Please add your key in Settings > Secrets.");
  }
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiInstance;
}

// Helper to strip data prefix from base64 string
function parseBase64Image(dataUri: string): { data: string; mimeType: string } {
  const matches = dataUri.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (matches && matches.length === 3) {
    return {
      mimeType: matches[1],
      data: matches[2],
    };
  }
  // Default fallback if it doesn't have the data URL scheme
  return {
    mimeType: "image/jpeg",
    data: dataUri,
  };
}

// Helper to clean and parse JSON response from Gemini
function parseGeminiResponse(rawText: string) {
  let cleaned = rawText.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, -3);
  }
  cleaned = cleaned.trim();
  return JSON.parse(cleaned);
}

// Helper to call Gemini API with retries for temporary service/rate-limiting errors
async function generateContentWithRetry(ai: any, params: any, retries = 3, delayMs = 1000): Promise<any> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await ai.models.generateContent(params);
    } catch (err: any) {
      const isRateLimitOrUnavailable =
        err?.status === 429 ||
        err?.status === 503 ||
        err?.code === 503 ||
        (err?.message && (
          err.message.includes("503") ||
          err.message.includes("UNAVAILABLE") ||
          err.message.includes("high demand") ||
          err.message.includes("429") ||
          err.message.includes("ResourceExhausted")
        ));
      
      if (isRateLimitOrUnavailable && attempt < retries) {
        console.warn(`Gemini API call returned temporary error (attempt ${attempt}/${retries}). Retrying in ${delayMs}ms... Error: ${err?.message || err}`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        delayMs *= 2; // Exponential backoff
        continue;
      }
      throw err;
    }
  }
}

// --- API ROUTES ---

// 1. Get complete state
app.get("/api/state", (req, res) => {
  const db = loadDb();
  res.json({
    leaders: db.leaders,
    reports: db.reports,
  });
});

// 2. Clear state (useful utility for testing)
app.post("/api/reset", (req, res) => {
  const db = {
    leaders: JSON.parse(JSON.stringify(initialLeaders)),
    reports: [],
    imageHashes: []
  };
  saveDb(db);
  res.json({ success: true, leaders: db.leaders, reports: db.reports });
});

// 3. Submit civic issue report
app.post("/api/report", async (req, res) => {
  const { imageBase64, city, manualCategory, isDisputedOverride, userRole } = req.body;

  if (userRole !== "Citizen") {
    return res.status(403).json({ error: "Note: Only Citizens have permission to submit new civic reports." });
  }

  if (!imageBase64) {
    return res.status(400).json({ error: "Missing image upload." });
  }

  if (!city) {
    return res.status(400).json({ error: "Missing selected city." });
  }

  const validCities = [
    "Bengaluru", "Delhi", "Chennai", "Hyderabad", "Mumbai",
    "Ahmedabad", "Kolkata", "Pune", "Jaipur", "Lucknow"
  ];
  if (!validCities.includes(city)) {
    return res.status(400).json({ error: `Invalid city. Must be one of: ${validCities.join(", ")}` });
  }

  const db = loadDb();

  // --- DUPLICATE PROTECTION CHECK ---
  // Generate a hash of the raw base64 content to unique identify the image file contents
  const { data: rawBase64, mimeType } = parseBase64Image(imageBase64);
  const imageHash = crypto.createHash("md5").update(rawBase64).digest("hex");

  if (db.imageHashes.includes(imageHash)) {
    return res.status(400).json({
      error: "Duplicate Error: This image has already been used to report an issue."
    });
  }

  // --- MANUAL CATEGORIZATION FLOW ---
  if (manualCategory) {
    const validCategories = ["Pothole", "Water Leakage", "Damaged Streetlight", "Waste Management", "Public Infrastructure"];
    if (!validCategories.includes(manualCategory)) {
      return res.status(400).json({ error: "Invalid category selected." });
    }

    // Find leader for selected city
    const leader = db.leaders.find(l => l.city.toLowerCase() === city.toLowerCase());
    if (!leader) {
      return res.status(400).json({ error: `No assigned leader found for city: ${city}` });
    }

    const isDisputed = !!isDisputedOverride;

    // Create civic issue report
    const newReport: CivicReport = {
      id: crypto.randomUUID(),
      imageUrl: imageBase64,
      category: manualCategory,
      city: city,
      leaderName: leader.name,
      status: isDisputed ? "Pending Verification (AI Dispute)" : "Reported",
      timestamp: Date.now(),
    };

    // Add to public feed
    db.reports.push(newReport);

    // If NOT disputed, increment leader score by +100
    if (!isDisputed) {
      leader.points += 100;
    }

    // Track the image hash to prevent duplicates in the future
    db.imageHashes.push(imageHash);

    // Save database state
    saveDb(db);

    return res.json({
      success: true,
      report: newReport,
      leaders: db.leaders,
      message: isDisputed
        ? "Success! Your dispute override has been submitted for Community Audit."
        : "Success! Your report has been verified by public-ally."
    });
  }

  try {
    // Check if Gemini API key exists
    const ai = getGoogleGenAI();

    // Prepare content parts for Gemini API
    const imagePart = {
      inlineData: {
        mimeType: mimeType,
        data: rawBase64,
      },
    };

    const promptPart = {
      text: "Analyze this image and return verification results according to the systemInstruction instructions.",
    };

    // System instruction requested by the user
    const systemInstruction = `You are the verification engine for public-ally, a civic application. Analyze this user-uploaded image for both legitimacy (Anti-Fraud) and categorization. 
Step 1: Set 'is_legitimate' to false if the image is a photo of another digital screen, contains heavy stock photo watermarks, appears to be AI-generated/synthetic/manipulated content, or does not show a real-world city infrastructure issue (e.g., a selfie, meme, or random indoor room). Otherwise, set it to true.
Step 2: If legitimate, classify the issue into exactly one of these strings: [Pothole, Water Leakage, Damaged Streetlight, Waste Management, Public Infrastructure]. If not legitimate, set category to 'None'.

For 'rejection_reason' when 'is_legitimate' is false:
- If you detect the image is synthetic, manipulated, or AI-generated, 'rejection_reason' must be exactly: "Image likely AI-generated."
- If you detect the image is a private indoor/home photo or taken in a private setting, 'rejection_reason' must be exactly: "Image likely from a local home/private area."
- If you detect the image is a photo of another digital screen, 'rejection_reason' must be exactly: "Image likely a photo of another screen."
- For other non-legitimate images, provide a concise real reason why it does not represent a real-world public infrastructure issue.

Return strictly a JSON object with keys: 'is_legitimate' (boolean), 'rejection_reason' (string or null), and 'category' (string).`;

    let verificationResult;
    try {
      // Make Gemini API call with retries for transient issues like high demand (503)
      const response = await generateContentWithRetry(ai, {
        model: "gemini-3.5-flash",
        contents: [imagePart, promptPart],
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.1,
          responseMimeType: "application/json",
        },
      });

      const resultText = response.text;
      if (!resultText) {
        throw new Error("Empty response received from verification engine.");
      }

      verificationResult = parseGeminiResponse(resultText);
    } catch (apiError) {
      console.warn("Gemini API direct failure, fallback to manual triggered:", apiError);
      return res.json({
        requiresManualCategorization: true,
        message: "Notice: We couldn't automatically detect your issue type. Please remember to be responsible, accurate, and honest in what you upload to public-ally."
      });
    }

    const isNoneCategory = !verificationResult.category || verificationResult.category.toLowerCase() === "none";

    if (verificationResult.is_legitimate === true && isNoneCategory) {
      return res.json({
        requiresManualCategorization: true,
        message: "Notice: We couldn't automatically detect your issue type. Please remember to be responsible, accurate, and honest in what you upload to public-ally."
      });
    }

    if (verificationResult.is_legitimate === true) {
      // Find leader for selected city
      const leader = db.leaders.find(l => l.city.toLowerCase() === city.toLowerCase());
      if (!leader) {
        return res.status(400).json({ error: `No assigned leader found for city: ${city}` });
      }

      // Create civic issue report
      const newReport: CivicReport = {
        id: crypto.randomUUID(),
        imageUrl: imageBase64, // save image data URI
        category: verificationResult.category || "General Civic Issue",
        city: city,
        leaderName: leader.name,
        status: "Reported",
        timestamp: Date.now(),
      };

      // Add to public feed
      db.reports.push(newReport);

      // Increment leader score by +100
      leader.points += 100;

      // Track the image hash to prevent duplicates in the future
      db.imageHashes.push(imageHash);

      // Save database state
      saveDb(db);

      return res.json({
        success: true,
        report: newReport,
        leaders: db.leaders,
        message: "Success! Your report has been verified by public-ally."
      });

    } else {
      // If Gemini returns is_legitimate: false, return dispute warning rather than permanently blocking
      const rejectionReason = verificationResult.rejection_reason || "Image does not depict a real-world civic infrastructure issue.";
      return res.json({
        requiresDisputeOverride: true,
        rejectionReason: rejectionReason
      });
    }

  } catch (error: any) {
    console.warn("Verification logic wrapper failure, triggering fallback:", error);
    return res.json({
      requiresManualCategorization: true,
      message: "Notice: We couldn't automatically detect your issue type. Please remember to be responsible, accurate, and honest in what you upload to public-ally."
    });
  }
});

// 4. Mark report as Resolved
app.post("/api/report/:id/resolve", (req, res) => {
  const { id } = req.params;
  const db = loadDb();
  const report = db.reports.find(r => r.id === id);
  if (!report) {
    return res.status(404).json({ error: "Report not found." });
  }
  if (report.status !== "Resolved") {
    report.status = "Resolved";
    // Find leader for that city and award +100 points
    const leader = db.leaders.find(l => l.city.toLowerCase() === report.city.toLowerCase());
    if (leader) {
      leader.points += 100;
    }
    saveDb(db);
  }
  res.json({ success: true, reports: db.reports, leaders: db.leaders });
});

// 5. Approve Override for disputed issues
app.post("/api/report/:id/approve-override", (req, res) => {
  const { id } = req.params;
  const db = loadDb();
  const report = db.reports.find(r => r.id === id);
  if (!report) {
    return res.status(404).json({ error: "Report not found." });
  }
  if (report.status === "Pending Verification (AI Dispute)") {
    report.status = "Reported";
    // Award +100 points to the city leader now that it is approved
    const leader = db.leaders.find(l => l.city.toLowerCase() === report.city.toLowerCase());
    if (leader) {
      leader.points += 100;
    }
    saveDb(db);
  }
  res.json({ success: true, reports: db.reports, leaders: db.leaders });
});

// 6. Confirm Fraud (delete card, keep points frozen/unchanged)
app.post("/api/report/:id/confirm-fraud", (req, res) => {
  const { id } = req.params;
  const db = loadDb();
  const reportIndex = db.reports.findIndex(r => r.id === id);
  if (reportIndex === -1) {
    return res.status(404).json({ error: "Report not found." });
  }
  // Remove the card from the feed entirely
  db.reports.splice(reportIndex, 1);
  saveDb(db);
  res.json({ success: true, reports: db.reports, leaders: db.leaders, message: "Submission permanently deleted due to confirmed fraud." });
});

// Serve frontend assets & mount Vite middleware
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // SPA catch-all fallback
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Public-ally] Server running on http://0.0.0.0:${PORT} in ${process.env.NODE_ENV || "development"} mode`);
  });
}

startServer();
