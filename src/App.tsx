import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Megaphone,
  Activity,
  Award,
  Upload,
  MapPin,
  User,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  TrendingUp,
  RefreshCw,
  X,
  Plus,
  FileImage
} from "lucide-react";
import { Leader, CivicReport, Screen } from "./types";

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("REPORT");
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [reports, setReports] = useState<CivicReport[]>([]);
  
  // Form State
  const [selectedCity, setSelectedCity] = useState<string>("Bengaluru");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [imageFileName, setImageFileName] = useState<string>("");
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  // Manual Categorization Fallback States
  const [requiresManual, setRequiresManual] = useState<boolean>(false);
  const [fallbackMessage, setFallbackMessage] = useState<string | null>(null);
  const [manualCategorySelection, setManualCategorySelection] = useState<string>("Pothole");

  // AI Dispute Override States
  const [requiresDisputeOverride, setRequiresDisputeOverride] = useState<boolean>(false);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [disputedCategorySelection, setDisputedCategorySelection] = useState<string>("Pothole");

  // Notification States
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resetConfirm, setResetConfirm] = useState<boolean>(false);

  // Role-Based Views State
  const [userRole, setUserRole] = useState<"Citizen" | "CityLeader" | "PlatformModerator">("Citizen");
  const [roleDropdownOpen, setRoleDropdownOpen] = useState<boolean>(false);
  const [issueToResolve, setIssueToResolve] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch current state from the backend
  const fetchState = async () => {
    try {
      const res = await fetch("/api/state");
      if (res.ok) {
        const data = await res.json();
        setLeaders(data.leaders || []);
        setReports(data.reports || []);
      }
    } catch (err) {
      console.error("Error fetching state:", err);
    }
  };

  useEffect(() => {
    fetchState();
  }, []);

  useEffect(() => {
    if (!roleDropdownOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("#btn-role-dropdown")) {
        setRoleDropdownOpen(false);
      }
    };
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, [roleDropdownOpen]);

  // Utility to convert file to Base64
  const handleFileChange = (file: File) => {
    if (!file) return;
    if (!file.type.match("image/jpeg") && !file.type.match("image/png")) {
      showError("Invalid File Type: Only JPEG and PNG images are accepted.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setUploadedImage(e.target.result as string);
        setImageFileName(file.name);
      }
    };
    reader.readAsDataURL(file);
  };

  const onDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  // Trigger file selection programmatically
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Standard notification show logic
  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setErrorMessage(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const showError = (msg: string) => {
    setErrorMessage(msg);
    setSuccessMessage(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Submit the report to the backend
  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadedImage) {
      showError("Please upload an image before submitting.");
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const bodyPayload: any = {
      imageBase64: uploadedImage,
      city: selectedCity,
    };

    if (requiresManual) {
      bodyPayload.manualCategory = manualCategorySelection;
    } else if (requiresDisputeOverride) {
      bodyPayload.manualCategory = disputedCategorySelection;
      bodyPayload.isDisputedOverride = true;
    }

    try {
      const response = await fetch("/api/report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bodyPayload),
      });

      const data = await response.json();

      if (response.ok) {
        if (data.requiresManualCategorization) {
          // Trigger fallback state
          setRequiresManual(true);
          setFallbackMessage(data.message || "Notice: We couldn't automatically detect your issue type. Please remember to be responsible, accurate, and honest in what you upload to public-ally.");
          setRequiresDisputeOverride(false);
          setRejectionReason(null);
          setErrorMessage(null);
          setSuccessMessage(null);
        } else if (data.requiresDisputeOverride) {
          // Trigger dispute override state
          setRequiresDisputeOverride(true);
          setRejectionReason(data.rejectionReason || "AI assessment rejected the image.");
          setRequiresManual(false);
          setFallbackMessage(null);
          setErrorMessage(null);
          setSuccessMessage(null);
        } else {
          // Normal Success or Completed manual / dispute override submission
          setUploadedImage(null);
          setImageFileName("");
          setRequiresManual(false);
          setFallbackMessage(null);
          setManualCategorySelection("Pothole");

          setRequiresDisputeOverride(false);
          setRejectionReason(null);
          setDisputedCategorySelection("Pothole");

          // Reload states
          setLeaders(data.leaders);
          await fetchState();
          showSuccess(data.message || "Success! Your report has been verified by public-ally.");
        }
      } else {
        // Validation Failed or Duplicate
        showError(data.error || "Verification failed.");
      }
    } catch (err: any) {
      console.error("Submission error, falling back to manual:", err);
      // Fallback for API failure / network timeout
      setRequiresManual(true);
      setFallbackMessage("Notice: We couldn't automatically detect your issue type. Please remember to be responsible, accurate, and honest in what you upload to public-ally.");
      setRequiresDisputeOverride(false);
      setRejectionReason(null);
      setErrorMessage(null);
      setSuccessMessage(null);
    } finally {
      setLoading(false);
    }
  };

  // Resolve the issue on the backend
  const handleResolveIssue = async (id: string) => {
    try {
      const response = await fetch(`/api/report/${id}/resolve`, {
        method: "POST",
      });
      if (response.ok) {
        const data = await response.json();
        setReports(data.reports || []);
        setLeaders(data.leaders || []);
        showSuccess("Issue has been successfully marked as Resolved!");
      } else {
        const data = await response.json();
        showError(data.error || "Failed to resolve issue.");
      }
    } catch (err: any) {
      showError(`Error resolving issue: ${err.message || err}`);
    }
  };

  // Approve the dispute override on the backend
  const handleApproveOverride = async (id: string) => {
    try {
      const response = await fetch(`/api/report/${id}/approve-override`, {
        method: "POST",
      });
      if (response.ok) {
        const data = await response.json();
        setReports(data.reports || []);
        setLeaders(data.leaders || []);
        showSuccess("Dispute override has been successfully approved!");
      } else {
        const data = await response.json();
        showError(data.error || "Failed to approve override.");
      }
    } catch (err: any) {
      showError(`Error approving override: ${err.message || err}`);
    }
  };

  // Confirm issue is fraud and delete it from the feed
  const handleConfirmFraud = async (id: string) => {
    try {
      const response = await fetch(`/api/report/${id}/confirm-fraud`, {
        method: "POST",
      });
      if (response.ok) {
        const data = await response.json();
        setReports(data.reports || []);
        setLeaders(data.leaders || []);
        showSuccess(data.message || "Submission permanently deleted due to confirmed fraud.");
      } else {
        const data = await response.json();
        showError(data.error || "Failed to confirm fraud.");
      }
    } catch (err: any) {
      showError(`Error confirming fraud: ${err.message || err}`);
    }
  };

  // Reset Application Data (Developer Mode / Seeding Helper)
  const handleResetData = async () => {
    if (!resetConfirm) {
      setResetConfirm(true);
      // Auto-cancel confirmation after 4 seconds of inactivity
      setTimeout(() => {
        setResetConfirm(false);
      }, 4000);
      return;
    }

    try {
      const res = await fetch("/api/reset", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setLeaders(data.leaders);
        setReports(data.reports);
        setResetConfirm(false);
        showSuccess("Application data state successfully reset to default pre-seeded state.");
      }
    } catch (err) {
      console.error("Error resetting data:", err);
    }
  };

  // Create standard canvas drawings for instant development testing
  const generateMockTestImage = (type: "pothole" | "leak" | "light" | "trash" | "fraud") => {
    const canvas = document.createElement("canvas");
    canvas.width = 600;
    canvas.height = 450;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Draw background
    if (type === "pothole") {
      ctx.fillStyle = "#4a5568"; // Grey asphalt
      ctx.fillRect(0, 0, 600, 450);
      // Street yellow divider lines
      ctx.fillStyle = "#ecc94b";
      ctx.fillRect(285, 0, 30, 100);
      ctx.fillRect(285, 200, 30, 100);
      ctx.fillRect(285, 400, 30, 50);

      // Deep pothole cracks
      ctx.fillStyle = "#1a202c";
      ctx.beginPath();
      ctx.ellipse(300, 250, 140, 75, Math.PI / 12, 0, 2 * Math.PI);
      ctx.fill();

      ctx.strokeStyle = "#2d3748";
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(180, 240);
      ctx.lineTo(120, 250);
      ctx.moveTo(380, 260);
      ctx.lineTo(440, 280);
      ctx.stroke();

      // Sign text helper for Gemini simulation
      ctx.fillStyle = "#f56565";
      ctx.font = "bold 22px 'Inter', sans-serif";
      ctx.fillText("DANGEROUS POTHOLE AHEAD", 140, 380);

    } else if (type === "leak") {
      ctx.fillStyle = "#cbd5e0"; // Concrete floor
      ctx.fillRect(0, 0, 600, 450);

      // Pipes
      ctx.fillStyle = "#718096";
      ctx.fillRect(0, 80, 600, 50);

      // Water leak splash
      ctx.fillStyle = "#63b3ed";
      ctx.beginPath();
      ctx.ellipse(300, 250, 160, 90, 0, 0, 2 * Math.PI);
      ctx.fill();

      ctx.fillStyle = "#3182ce";
      ctx.beginPath();
      ctx.arc(300, 105, 12, 0, 2 * Math.PI);
      ctx.fill();

      // Ripples
      ctx.strokeStyle = "#ebf8ff";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(300, 250, 50, 0, 2 * Math.PI);
      ctx.arc(300, 250, 100, 0, 2 * Math.PI);
      ctx.stroke();

      ctx.fillStyle = "#2b6cb0";
      ctx.font = "bold 20px sans-serif";
      ctx.fillText("WATER MAIN BREAK - ACTIVE LEAKAGE", 130, 390);

    } else if (type === "light") {
      ctx.fillStyle = "#1a202c"; // Dark city night
      ctx.fillRect(0, 0, 600, 450);

      // Pole
      ctx.fillStyle = "#4a5568";
      ctx.fillRect(100, 120, 20, 330);
      ctx.fillRect(100, 120, 120, 15);

      // Broken bulb (Dark, cracked)
      ctx.fillStyle = "#2d3748";
      ctx.beginPath();
      ctx.arc(210, 145, 20, 0, 2 * Math.PI);
      ctx.fill();

      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(200, 135);
      ctx.lineTo(220, 155);
      ctx.moveTo(220, 135);
      ctx.lineTo(200, 155);
      ctx.stroke();

      ctx.fillStyle = "#e2e8f0";
      ctx.font = "bold 20px sans-serif";
      ctx.fillText("DAMAGED STREETLIGHT", 180, 300);

    } else if (type === "trash") {
      ctx.fillStyle = "#e2e8f0"; // Sidewalk pavement
      ctx.fillRect(0, 0, 600, 450);

      // Rubbish bags
      ctx.fillStyle = "#2d3748";
      ctx.beginPath();
      ctx.arc(200, 280, 60, 0, 2 * Math.PI);
      ctx.arc(270, 290, 50, 0, 2 * Math.PI);
      ctx.fill();

      // Litter spill (boxes, cans)
      ctx.fillStyle = "#dd6b20";
      ctx.fillRect(340, 290, 70, 50); // box

      ctx.fillStyle = "#319795";
      ctx.beginPath();
      ctx.arc(320, 330, 15, 0, 2 * Math.PI); // soda can
      ctx.fill();

      ctx.fillStyle = "#718096";
      ctx.font = "bold 20px sans-serif";
      ctx.fillText("UNCOLLECTED PUBLIC WASTE ACCUMULATION", 90, 400);

    } else {
      // Fraud case: photo of a selfie / digital monitor screen / meme
      ctx.fillStyle = "#ebf8ff";
      ctx.fillRect(0, 0, 600, 450);
      
      // Happy avatar selfie
      ctx.fillStyle = "#ecc94b";
      ctx.beginPath();
      ctx.arc(300, 180, 70, 0, 2 * Math.PI);
      ctx.fill();

      ctx.fillStyle = "#2d3748";
      ctx.beginPath();
      ctx.arc(275, 160, 10, 0, 2 * Math.PI);
      ctx.arc(325, 160, 10, 0, 2 * Math.PI);
      ctx.fill();

      ctx.strokeStyle = "#2d3748";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(300, 190, 30, 0, Math.PI);
      ctx.stroke();

      ctx.fillStyle = "#2b6cb0";
      ctx.font = "bold 22px sans-serif";
      ctx.fillText("Just a happy selfie! (Legitimacy Check Test)", 80, 330);
    }

    const dataUrl = canvas.toDataURL("image/jpeg");
    setUploadedImage(dataUrl);
    setImageFileName(`generated_test_${type}.jpg`);
    showSuccess(`Generated and preloaded ${type.toUpperCase()} test image successfully!`);
  };

  // Sort reports to display newest at the top
  const sortedReports = [...reports].sort((a, b) => b.timestamp - a.timestamp);

  // Sort leaders by points descending
  const sortedLeaders = [...leaders].sort((a, b) => b.points - a.points);

  return (
    <div id="app-root" className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col antialiased">
      {/* 🚀 GLOBAL NAVIGATION BAR */}
      <nav id="nav-bar" className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Title Branding */}
            <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setCurrentScreen("REPORT")}>
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
                <Megaphone className="h-4.5 w-4.5" />
              </div>
              <span className="text-2xl font-bold tracking-tight text-slate-800">
                Public-ally
              </span>
            </div>

            {/* Screen Switching Controls */}
            <div className="flex items-center gap-1 bg-transparent p-1 rounded-full">
              <button
                id="btn-nav-report"
                onClick={() => setCurrentScreen("REPORT")}
                className={`flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  currentScreen === "REPORT"
                    ? "text-blue-600 bg-blue-50"
                    : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                <Plus className="h-4 w-4" />
                <span>Report an Issue</span>
              </button>
              
              <button
                id="btn-nav-feed"
                onClick={() => setCurrentScreen("FEED")}
                className={`flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  currentScreen === "FEED"
                    ? "text-blue-600 bg-blue-50"
                    : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                <Activity className="h-4 w-4" />
                <span>Live Feed</span>
              </button>

              <button
                id="btn-nav-leaderboard"
                onClick={() => setCurrentScreen("LEADERBOARD")}
                className={`flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  currentScreen === "LEADERBOARD"
                    ? "text-blue-600 bg-blue-50"
                    : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                <Award className="h-4 w-4" />
                <span>Leaderboard</span>
              </button>
            </div>

            {/* Right side avatar slot */}
            <div className="flex items-center gap-2 md:gap-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                <span>Viewing as: {userRole === "Citizen" ? "Citizen" : userRole === "CityLeader" ? "City Leader" : "Platform Moderator"}</span>
              </span>

              <div className="relative">
                <button
                  id="btn-role-dropdown"
                  onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                  className="w-8 h-8 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center font-bold text-xs shadow-md transition-all cursor-pointer focus:outline-none"
                  title="Switch Role"
                >
                  PA
                </button>

                {roleDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-3 z-50 animate-fadeIn">
                    <div className="px-4 py-1.5 border-b border-slate-100 mb-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Demo Environment:
                      </p>
                      <p className="text-xs font-semibold text-slate-800">
                        Switch User Role
                      </p>
                    </div>

                    <div className="space-y-1 px-2">
                      <button
                        type="button"
                        onClick={() => {
                          setUserRole("Citizen");
                          setRoleDropdownOpen(false);
                          showSuccess("Switched view to Citizen role");
                        }}
                        className={`w-full flex items-center space-x-2.5 px-3 py-2 text-xs rounded-lg font-semibold transition-all text-left ${
                          userRole === "Citizen"
                            ? "bg-blue-50 text-blue-700 font-bold"
                            : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <span className="text-sm">👤</span>
                        <span>Citizen</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setUserRole("CityLeader");
                          setRoleDropdownOpen(false);
                          showSuccess("Switched view to City Leader role");
                        }}
                        className={`w-full flex items-center space-x-2.5 px-3 py-2 text-xs rounded-lg font-semibold transition-all text-left ${
                          userRole === "CityLeader"
                            ? "bg-blue-50 text-blue-700 font-bold"
                            : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <span className="text-sm">🏛️</span>
                        <span>City Leader</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setUserRole("PlatformModerator");
                          setRoleDropdownOpen(false);
                          showSuccess("Switched view to Platform Moderator role");
                        }}
                        className={`w-full flex items-center space-x-2.5 px-3 py-2 text-xs rounded-lg font-semibold transition-all text-left ${
                          userRole === "PlatformModerator"
                            ? "bg-blue-50 text-blue-700 font-bold"
                            : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <span className="text-sm">🛡️</span>
                        <span>Platform Moderator</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* 📣 NOTIFICATION POP-UPS */}
      <div className="max-w-3xl mx-auto w-full px-4 mt-6">
        <AnimatePresence mode="wait">
          {successMessage && (
            <motion.div
              id="alert-success"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl shadow-sm text-emerald-900 flex items-start space-x-3"
            >
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1 text-sm">
                <span className="font-bold">Success!</span> {successMessage}
              </div>
              <button onClick={() => setSuccessMessage(null)} className="text-emerald-500 hover:text-emerald-700">
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          )}

          {errorMessage && (
            <motion.div
              id="alert-error"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-red-50 border border-red-200 p-4 rounded-xl shadow-sm text-red-900 flex items-start space-x-3"
            >
              <ShieldAlert className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1 text-sm">
                <span className="font-bold">Error:</span> {errorMessage}
              </div>
              <button onClick={() => setErrorMessage(null)} className="text-red-500 hover:text-red-700">
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 🖥️ MAIN SCREEN VIEWS CONTAINER */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <AnimatePresence mode="wait">
          
          {/* SCREEN 1: REPORT FORM */}
          {currentScreen === "REPORT" && (
            <motion.div
              key="report-screen"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="max-w-xl mx-auto space-y-6"
            >
              <div className="text-center space-y-1">
                <h1 id="screen-title" className="text-2xl font-bold tracking-tight text-slate-800">
                  public-ally: Speak Up for Your Community
                </h1>
                <p className="text-xs text-slate-500">
                  Report verified local civic issues in 30 seconds. Powered by Gemini AI.
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Form Wrapper */}
                <form onSubmit={handleSubmitReport} className="p-6 space-y-5">
                  
                  {/* File Upload Component */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block">
                      Evidence <span className="text-red-500">*</span>
                    </label>
                    
                    <div
                      id="drop-zone"
                      onDragEnter={onDrag}
                      onDragLeave={onDrag}
                      onDragOver={onDrag}
                      onDrop={onDrop}
                      onClick={triggerFileInput}
                      className={`relative border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-all duration-200 cursor-pointer ${
                        dragActive
                          ? "border-blue-400 bg-blue-50/20 scale-[0.99]"
                          : uploadedImage
                          ? "border-emerald-400 bg-emerald-50/10"
                          : "border-slate-200 hover:border-blue-400 bg-slate-50"
                      }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png"
                        onChange={(e) => e.target.files && handleFileChange(e.target.files[0])}
                        className="hidden"
                      />

                      {uploadedImage ? (
                        <div className="space-y-4 w-full flex flex-col items-center">
                          <div className="relative w-full max-h-56 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 flex justify-center items-center">
                            <img
                              src={uploadedImage}
                              alt="Upload Preview"
                              className="object-contain max-h-56 w-full"
                            />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setUploadedImage(null);
                                setImageFileName("");
                                setRequiresManual(false);
                                setFallbackMessage(null);
                                setRequiresDisputeOverride(false);
                                setRejectionReason(null);
                              }}
                              className="absolute top-2 right-2 p-1.5 bg-slate-900/80 hover:bg-slate-900 text-white rounded-full transition-colors"
                              title="Remove Image"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                          <div className="flex items-center space-x-2 text-emerald-600 text-xs font-bold uppercase tracking-wider">
                            <CheckCircle2 className="h-4 w-4 shrink-0" />
                            <span className="truncate max-w-xs">{imageFileName || "Preloaded_Image.jpg"}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center space-y-2">
                          <div className="mx-auto w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center text-slate-500">
                            <Upload className="h-5 w-5" />
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-semibold text-slate-700">
                              Upload JPEG/PNG
                            </p>
                            <p className="text-[10px] text-slate-400">
                              Drag &amp; drop or click to select
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Dropdown Menu for City Selection */}
                  <div className="space-y-2">
                    <label htmlFor="city-select" className="text-xs font-semibold text-slate-600 uppercase tracking-wider block">
                      Your City
                    </label>
                    <select
                      id="city-select"
                      value={selectedCity}
                      onChange={(e) => setSelectedCity(e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-xs"
                    >
                      <option value="Bengaluru">Bengaluru</option>
                      <option value="Delhi">Delhi</option>
                      <option value="Chennai">Chennai</option>
                      <option value="Hyderabad">Hyderabad</option>
                      <option value="Mumbai">Mumbai</option>
                      <option value="Ahmedabad">Ahmedabad</option>
                      <option value="Kolkata">Kolkata</option>
                      <option value="Pune">Pune</option>
                      <option value="Jaipur">Jaipur</option>
                      <option value="Lucknow">Lucknow</option>
                    </select>
                  </div>
                                  {/* Manual Categorization Fallback Banner & Dropdown */}
                  {requiresManual && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-4 animate-fadeIn">
                      <div className="flex gap-2.5">
                        <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-amber-800 uppercase tracking-wider">
                            Detection Notice
                          </p>
                          <p className="text-xs text-amber-750 leading-relaxed mt-0.5">
                            Notice: We couldn't automatically detect your issue type. Please remember to be responsible, accurate, and honest in what you upload to public-ally.
                          </p>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-amber-200/50 space-y-2">
                        <label htmlFor="manual-category-select" className="text-xs font-bold text-slate-700 block">
                          Help us categorize this issue manually:
                        </label>
                        <div className="flex gap-2">
                          <select
                            id="manual-category-select"
                            value={manualCategorySelection}
                            onChange={(e) => setManualCategorySelection(e.target.value)}
                            className="flex-1 p-2.5 bg-white border border-amber-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                          >
                            <option value="Pothole">Pothole</option>
                            <option value="Water Leakage">Water Leakage</option>
                            <option value="Damaged Streetlight">Damaged Streetlight</option>
                            <option value="Waste Management">Waste Management</option>
                            <option value="Public Infrastructure">Public Infrastructure</option>
                          </select>

                          <button
                            type="submit"
                            id="btn-complete-submission"
                            disabled={loading}
                            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-100 flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
                          >
                            {loading ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <span>Complete Submission</span>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* AI Dispute Override Fallback Banner & Dropdown */}
                  {requiresDisputeOverride && (
                    <div className="bg-red-50 border border-red-250 rounded-xl p-4 space-y-4 animate-fadeIn">
                      <div className="flex gap-2.5">
                        <ShieldAlert className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-red-800 uppercase tracking-wider">
                            AI Assessment
                          </p>
                          <p className="text-xs text-red-750 leading-relaxed font-semibold">
                            Detection Notice: {rejectionReason}
                          </p>
                          <p className="text-xs text-red-750/90 font-medium">
                            Community Reminder: Please be responsible and upload clear, real-world public infrastructure evidence.
                          </p>
                        </div>
                      </div>

                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <p className="text-xs text-amber-800 leading-relaxed font-medium">
                          Notice: If you believe the AI is incorrect, please be responsible, honest, and accurate. You may manually override this assessment below.
                        </p>
                      </div>

                      <div className="pt-2 border-t border-red-200/50 space-y-2">
                        <label htmlFor="dispute-category-select" className="text-xs font-bold text-slate-700 block">
                          Help us categorize this issue manually:
                        </label>
                        <div className="flex gap-2">
                          <select
                            id="dispute-category-select"
                            value={disputedCategorySelection}
                            onChange={(e) => setDisputedCategorySelection(e.target.value)}
                            className="flex-1 p-2.5 bg-white border border-red-350 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                          >
                            <option value="Pothole">Pothole</option>
                            <option value="Water Leakage">Water Leakage</option>
                            <option value="Damaged Streetlight">Damaged Streetlight</option>
                            <option value="Waste Management">Waste Management</option>
                            <option value="Public Infrastructure">Public Infrastructure</option>
                          </select>

                          <button
                            type="submit"
                            id="btn-complete-submission-disputed"
                            disabled={loading}
                            className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md shadow-red-100 flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer whitespace-nowrap"
                          >
                            {loading ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <span>Submit for Verification</span>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Submit Button */}
                  {!requiresManual && !requiresDisputeOverride && (
                    <button
                      type="submit"
                      id="btn-submit-report"
                      disabled={loading}
                      className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-100 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-sm"
                    >
                      {loading ? (
                        <div className="flex items-center space-x-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Verifying with Gemini...</span>
                        </div>
                      ) : (
                        <span>Submit Report</span>
                      )}
                    </button>
                  )}
                </form>
              </div>

              {/* Reset State Button for Easy Evaluation */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResetData}
                  className={`inline-flex items-center space-x-1.5 text-[10px] transition-all font-semibold uppercase tracking-wider px-3 py-1 rounded-full ${
                    resetConfirm
                      ? "text-red-600 bg-red-50 hover:bg-red-100 animate-pulse border border-red-200"
                      : "text-slate-400 hover:text-red-500 hover:bg-slate-100"
                  }`}
                >
                  <RefreshCw className={`h-3 w-3 ${resetConfirm ? "animate-spin" : ""}`} />
                  <span>{resetConfirm ? "Click again to confirm reset" : "Reset App Data"}</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* SCREEN 2: TRACKING FEED */}
          {currentScreen === "FEED" && (
            <motion.div
              key="feed-screen"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="max-w-2xl mx-auto space-y-4"
            >
              {/* Header block resembling the theme's feed header */}
              <div className="bg-white px-5 py-4 rounded-xl border border-slate-200 flex justify-between items-center shadow-xs">
                <div>
                  <h2 className="font-bold text-slate-800 text-lg">Live Feed</h2>
                  <p className="text-xs text-slate-500">legitimate, verified civic reports</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200/50 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>{reports.filter((r) => r.status === "Reported" || r.status === "Pending Verification (AI Dispute)").length} Reports Active</span>
                  </span>
                </div>
              </div>

              {/* Timeline Container */}
              {sortedReports.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mx-auto">
                    <FileImage className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-slate-850">No reported issues yet</h3>
                    <p className="text-xs text-slate-400 max-w-xs mx-auto">
                      Submit a valid photo on the report form to kickstart public-ally's live tracking system!
                    </p>
                  </div>
                  <button
                    onClick={() => setCurrentScreen("REPORT")}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Report First Issue</span>
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-4" id="feed-list">
                  {sortedReports.map((report) => (
                    <div
                      key={report.id}
                      className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex gap-4 hover:border-blue-400 transition-colors"
                    >
                      {/* Image Thumbnail Block */}
                      <img
                        src={report.imageUrl}
                        alt={report.category}
                        className="w-24 h-24 object-cover rounded-lg shrink-0 border border-slate-100"
                      />

                      {/* Content Info Block */}
                      <div className="flex-1 flex flex-col justify-between min-w-0">
                        <div>
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-xs font-bold text-blue-600 uppercase tracking-tighter">
                              {report.category}
                            </span>
                            <span className={`px-2 py-0.5 text-[10px] rounded font-bold uppercase tracking-wider ${
                              report.status === "Resolved"
                                ? "bg-emerald-100 text-emerald-700 border border-emerald-200/20"
                                : report.status === "Pending Verification (AI Dispute)"
                                ? "bg-orange-100 text-orange-700 border border-orange-200"
                                : "bg-amber-50 text-amber-700 border border-amber-200/20"
                            }`}>
                              {report.status}
                            </span>
                          </div>
                          
                          <h3 className="text-sm font-semibold text-slate-900 truncate">
                            {report.category} in {report.city}
                          </h3>
                          <p className="text-xs text-slate-500 mt-1">
                            Assigned: <span className="font-medium text-slate-750">{report.leaderName}</span>
                          </p>
                        </div>

                        {/* Timing indicator and action buttons */}
                        <div className="flex justify-between items-center mt-2 flex-wrap gap-2">
                          <p className="text-[10px] text-slate-400">
                            {new Date(report.timestamp).toLocaleString()}
                          </p>
                          <div className="flex gap-2">
                            {userRole === "PlatformModerator" && report.status === "Pending Verification (AI Dispute)" && (
                              <>
                                <button
                                  onClick={() => handleApproveOverride(report.id)}
                                  className="text-[10px] px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold uppercase rounded-lg transition-all cursor-pointer shadow-sm"
                                >
                                  Approve Override
                                </button>
                                <button
                                  onClick={() => handleConfirmFraud(report.id)}
                                  className="text-[10px] px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white font-bold uppercase rounded-lg transition-all cursor-pointer shadow-sm"
                                >
                                  Confirm Fraud
                                </button>
                              </>
                            )}
                            {userRole === "CityLeader" && report.status !== "Resolved" && report.status !== "Pending Verification (AI Dispute)" && (
                              <button
                                onClick={() => setIssueToResolve(report.id)}
                                className="text-[10px] px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/50 font-bold uppercase rounded-lg transition-all cursor-pointer"
                              >
                                Mark as Resolved
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* SCREEN 3: LEADERBOARD */}
          {currentScreen === "LEADERBOARD" && (
            <motion.div
              key="leaderboard-screen"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="max-w-2xl mx-auto space-y-6"
            >
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <header className="p-5 border-b border-slate-100 bg-white">
                  <h2 className="text-lg font-bold text-slate-800">City Leaderboard</h2>
                  <p className="text-xs text-slate-500">Most active civic responders.</p>
                </header>

                <div className="p-2 overflow-x-auto">
                  <table className="w-full text-left border-separate border-spacing-y-2" id="leaderboard-table">
                    <thead className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">
                      <tr>
                        <th className="px-4 py-2">Rank</th>
                        <th className="py-2">Leader Name</th>
                        <th className="py-2">City</th>
                        <th className="py-2 text-right px-4">Points</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {sortedLeaders.map((leader, index) => {
                        const rank = index + 1;
                        const isTop = rank === 1;

                        return (
                          <tr
                            key={leader.id}
                            className={`transition-all duration-150 rounded-xl ${
                              isTop 
                                ? "bg-amber-50/50 hover:bg-amber-50 ring-2 ring-amber-200" 
                                : "hover:bg-slate-50"
                            }`}
                          >
                            {/* Rank Column */}
                            <td className="px-4 py-3 whitespace-nowrap">
                              {isTop ? (
                                <div className="w-6 h-6 bg-amber-400 text-white rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm">
                                  #1
                                </div>
                              ) : (
                                <span className="text-slate-400 font-bold pl-1">#{rank}</span>
                              )}
                            </td>

                            {/* Leader Name */}
                            <td className="py-3 whitespace-nowrap font-semibold text-slate-900">
                              {leader.name}
                            </td>

                            {/* City */}
                            <td className="py-3 whitespace-nowrap text-xs text-slate-500">
                              {leader.city}
                            </td>

                            {/* Total Points */}
                            <td className={`py-3 text-right px-4 font-bold ${
                              isTop ? "text-amber-600 font-black" : "text-slate-700"
                            }`}>
                              {leader.points}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="p-4 bg-slate-50 text-[10px] text-slate-400 text-center font-medium border-t border-slate-100">
                  Points awarded for every verified report fixed.
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* 🔮 FOOTER INFO */}
      <footer className="bg-white border-t border-slate-100 mt-auto py-5">
        <div className="max-w-7xl mx-auto px-4 text-center text-[10px] text-slate-400 font-medium">
          <p>© 2026 Public-ally. Powered by Google AI Studio Gemini 3.5 Flash.</p>
        </div>
      </footer>

      {/* 👤 Floating Role Indicator Badge */}
      <div className="fixed bottom-4 right-4 z-50 pointer-events-none">
        <div className="bg-slate-900/95 backdrop-blur-xs text-white text-[11px] font-bold px-3 py-1.5 rounded-full shadow-lg border border-slate-700/50 flex items-center gap-1.5 tracking-wide pointer-events-auto">
          <span className="inline-flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>Viewing as: {userRole === "Citizen" ? "👤 Citizen" : userRole === "CityLeader" ? "🏛️ City Leader" : "🛡️ Platform Moderator"}</span>
        </div>
      </div>

      {/* 🏛️ CITY LEADER RESOLUTION CONFIRMATION MODAL */}
      <AnimatePresence>
        {issueToResolve && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIssueToResolve(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
            />
            
            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-white w-full max-w-md rounded-2xl border border-slate-200 shadow-2xl overflow-hidden p-6 space-y-4"
            >
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center text-xl shadow-inner">
                  ⚠️
                </div>
                <h3 className="text-base font-bold text-slate-800">
                  Confirm Resolution Action
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed font-medium bg-amber-50 border border-amber-200 p-4 rounded-xl text-left">
                  ⚠️ Accountability Alert: Incomplete or false resolutions will attract negative points, and the public WILL know about it. Are you sure this issue has been fully and honestly resolved?
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  id="btn-confirm-resolve"
                  onClick={async () => {
                    const id = issueToResolve;
                    setIssueToResolve(null);
                    await handleResolveIssue(id);
                  }}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-100 transition-all cursor-pointer text-center"
                >
                  Yes, Confirm Resolution
                </button>
                <button
                  type="button"
                  id="btn-cancel-resolve"
                  onClick={() => setIssueToResolve(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold text-xs rounded-xl transition-all cursor-pointer text-center"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
