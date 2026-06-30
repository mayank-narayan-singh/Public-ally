<div align="center">

</div>

# 📢 public-ally

> **Audit-Ready Civic Infrastructure Reporting & Anti-Fraud Platform** > Built for the **vibe2ship Hackathon** under the *Community Hero - Hyperlocal Problem Solver* track.

---

## 🚀 Live Links & Assets

* **🌐 Live Deployed Application:** [👉 Access public-ally on Google Cloud Run](https://public-ally-999137243064.asia-southeast1.run.app)
* **📄 Project Documentation:** [👉 Open Project Description (Google Doc)](https://docs.google.com/document/d/11hCt0dTVRcZ9-7YRmTpJVdrEMfmi7BsKgrZlMLYFN90/edit?tab=t.0#heading=h.pxjqtaqmp1jb)
* **📁 Sandbox Testing Images:** [👉 Download Pre-Verified Testing Kit (Google Drive)](https://drive.google.com/drive/folders/1p-8ZnlqMRDpQeE6EfWjRrGbNmPkZjXWY?usp=drive_link)

---

## 💡 The Core Problem: Overcoming the Khandwa, MP Crisis

Traditional civic portals fail because they lack data integrity. In well-documented instances like the **Khandwa, MP municipal portal**, government infrastructure reporting loops were systemically broken by bad actors spamming duplicate photos, uploading fake AI-generated data, or scraping generic internet stock photos to artificially farm civic rewards. 

**public-ally** provides an absolute countermeasure. By integrating a multi-tiered **AI and Human-in-the-Loop validation pipeline**, the app transforms standard public reporting into a robust, fraud-proof municipal ecosystem.

---

## 📱 Architecture & Key Features

### 1. Cross-Platform Responsive Engine
Civic reporting happens on the street, not at a desk. `public-ally` features a **100% fluid mobile-first architecture**. 
* On desktop viewports, it serves a dense, multi-column administrative layout. 
* On mobile/Android devices, the platform automatically drops horizontal scroll parameters, wraps navigation paths inside an accessible **collapsible hamburger menu (☰)**, and stacks feed assets vertically for optimized touch targets.

### 2. Gemini 3.5 Flash Anti-Fraud Pipeline
When a citizen uploads structural evidence, the platform runs it through a real-time pixel and metadata analysis guardrail powered by **Google Gemini 3.5 Flash**:
* **Synthetic Media Check:** Flags and blocks AI-generated structures.
* **Internet Scrape Block:** Uses advanced computer vision to scan for translucent watermarks and studio-lit professional compositions to stop internet stock photos.
* **Explainable Feedback:** Instantly triggers prominent frontend **Detection Notices** detailing the precise rejection reason (e.g., *"Image likely a stock photo from the internet"*).

### 3. Transparent Dispute Protocol
If the automated vision engine misclassifies a complex edge case, citizens can issue a manual override. The report is funneled directly into a secure **"Pending Verification"** timeline queue, where its leaderboard rewards are frozen until an official evaluation occurs.

### 4. Role-Based Governance (Demo User Switcher)
The interface features an integrated top-right profile switcher to simulate distinct platform permissions:
* **Citizen:** Permissions locked purely to reading the feed and submitting reports.
* **Platform Moderator:** Gains exclusive access to the dispute queue to **Approve Override** or **Confirm Fraud** (which permanently purges the entry).
* **City Leader:** Form inputs are heavily programmatically **role-locked** to prevent leaders from manufacturing fake neighborhood problems to boost standings. Closing issues triggers an explicit, high-visibility warning: `⚠️ Accountability Alert: Incomplete or false resolutions will attract negative points.`

### 5. Cryptographic Duplicate Mitigation
Every upload runs through a backend data-fingerprinting layout (**SHA-256 byte-hashing**). If an incoming hash matches an existing structural asset in our memory index, the submission is blocked instantly before hitting the API, neutralizing Sybil and spam attacks.

### 6. Dual-Click Safe App Reset
Engineered explicitly for project evaluators. Clicking the **"Reset App Data"** footer button exactly twice safely flushes active state memory and re-seeds the interface back to its flawless, pre-seeded prototype data array for effortless back-to-back testing.

---

## ⚙️ Tech Stack

* **Frontend:** React.js, Tailwind CSS (Responsive media utility frameworks)
* **Backend:** Node.js, Express.js (REST APIs, role middleware tracking)
* **AI Engine:** Google AI Studio / Gemini 3.5 Flash API (Structured JSON schema vision models)
* **Hosting & CI/CD:** Google Cloud Run (Containerized, auto-scaling serverless edge deployment)

---

## 🧪 5-Minute Evaluator Sandbox Testing Guide

To test the automated guardrails in real time on our live deployment, download the files from the **Sandbox Testing Images** folder linked above and follow this testing script:

| # | Test Scenario | Upload Target | Expected System Action | Demonstrates |
| :--- | :--- | :--- | :--- | :--- |
| **1** | **Genuine Infra Damage** | 'https://drive.google.com/file/d/1qkadoz0o7odxcZHYIttz-Wf3Im8Ho5ws/view?usp=drive_link' | Passes instantly, categorizes the issue, routes it to the live feed, and increments leaderboard tallies. | Intentional computer vision categorization. |
| **2** | **AI Generated pothole** | 'https://drive.google.com/file/d/1zLyF6yF3ejYt1a8oy2Z4H752jsWyQ3d0/view?usp=drive_link' | Immediately blocked. Displays **Detection Notice: Image likely AI-generated.** | Real-time synthetic artifact protection. |
| **3** | **Stock photo** | 'https://drive.google.com/file/d/1gZEksKaj7NSZEnxDCVV_ykB5hCvoCH-8/view?usp=drive_link' | Immediately blocked. Detects professional staging/watermarks and flags a stock photo error. | Internet scrape protection. |
| **4** | **Community housing pipeline** | 'https://drive.google.com/file/d/1_CRu2UUsiaTeVxJhhz7F-hTuEkU3jaTp/view?usp=drive_link' | Click **Manual Override** under the error warning, select a category, and submit. Check the feed under **Platform Moderator** view to resolve. | Human-in-the-loop validation. |
| **5** | **Genuine Infra Duplicate file** | 'https://drive.google.com/file/d/1UrweAC9BjKIl0c_KyuXPYn3yIRDeuJ2o/view?usp=drive_link' | Try uploading this asset a second time. The platform intercepts the duplicate cryptographic hash and blocks the upload. | Native data fingerprint anti-spamming. |

*💡 **Pro-Tip:** Double-click **"Reset App Data"** at the bottom of the live screen at any point to completely wipe and refresh the environment to its baseline state.*

1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
