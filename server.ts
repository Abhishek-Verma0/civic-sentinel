import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { Report, ReportCategory, Department, Priority, ReportStatus } from "./src/types.js";
import fs from "fs";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, deleteDoc } from "firebase/firestore";

dotenv.config();

const app = express();
const PORT = 3000;

// Increase body parser limit to support base64 image uploads
app.use(express.json({ limit: "25mb" }));

// Load Firebase configuration
const configPath = path.join(process.cwd(), "firebase-applet-config.json");
let firebaseConfig: any = null;
if (fs.existsSync(configPath)) {
  try {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  } catch (err) {
    console.error("Failed to parse firebase-applet-config.json:", err);
  }
}

let db: any = null;
if (firebaseConfig) {
  try {
    const firebaseApp = initializeApp(firebaseConfig);
    const dbId = firebaseConfig.firestoreDatabaseId || "(default)";
    db = getFirestore(firebaseApp, dbId);
    console.log(`Firebase App & Firestore client initialized successfully for database: ${dbId}!`);
  } catch (err) {
    console.error("Failed to initialize Firebase client SDK in backend:", err);
  }
}

// Initialize GoogleGenAI client lazy-initialized or safe-guarded
const apiKey = process.env.GEMINI_API_KEY;
const isGeminiEnabled = Boolean(apiKey) && apiKey !== "MY_GEMINI_API_KEY" && apiKey !== "";

let ai: GoogleGenAI | null = null;
if (isGeminiEnabled) {
  try {
    ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
    console.log("Gemini API Client initialized successfully.");
  } catch (err) {
    console.error("Error initializing Gemini client:", err);
  }
} else {
  console.log("Gemini API key not found or placeholder. Running in Triage Demo Mode.");
}

// Helper function to call Gemini with retry and fallback model capability
async function generateContentWithFallback(
  parts: any[],
  isJsonSchema = false,
  schemaType?: any
): Promise<string> {
  const modelsToTry = ["gemini-3.1-flash-lite", "gemini-3.5-flash", "gemini-flash-latest"];
  let lastError: any = null;

  for (const modelName of modelsToTry) {
    let delay = 1000;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`Calling Gemini API [Model: ${modelName}, Attempt: ${attempt}]...`);
        if (!ai) {
          throw new Error("Gemini AI client is not initialized.");
        }

        const config: any = {};
        if (isJsonSchema && schemaType) {
          config.responseMimeType = "application/json";
          config.responseSchema = schemaType;
        }

        const response = await ai.models.generateContent({
          model: modelName,
          contents: parts,
          config,
        });

        if (response && response.text) {
          return response.text;
        }
        throw new Error("Empty response from Gemini API");
      } catch (err: any) {
        lastError = err;
        console.warn(`Attempt ${attempt} for model ${modelName} failed. Error:`, err.message || err);

        // If it's a 4xx client error (except 429 rate limit), don't retry, just fail or fall back
        const status = err.status || (err.error && err.error.code);
        if (status && status >= 400 && status < 500 && status !== 429) {
          break; // move to next model
        }

        // Wait with exponential backoff before retrying this model
        if (attempt < 3) {
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2;
        }
      }
    }
  }

  throw lastError || new Error("All Gemini models and retry attempts failed.");
}

// In-Memory Database for Civic Reports
// Seeding with realistic initial reports located in major Indian cities
const seedReports: Report[] = [];

let reports: Report[] = [];

// Distance calculation helper (Haversine)
function calculateDistanceInMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3; // Earth radius in meters
  const p1 = lat1 * Math.PI / 180;
  const p2 = lat2 * Math.PI / 180;
  const deltaLat = (lat2 - lat1) * Math.PI / 180;
  const deltaLng = (lng2 - lng1) * Math.PI / 180;

  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
            Math.cos(p1) * Math.cos(p2) *
            Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Dual-mode database operations
async function getReportsFromDb(): Promise<Report[]> {
  if (db) {
    try {
      const querySnapshot = await getDocs(collection(db, "reports"));
      const list: Report[] = [];
      querySnapshot.forEach((docSnap) => {
        list.push(docSnap.data() as Report);
      });
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return list;
    } catch (err) {
      console.error("Failed to fetch reports from Firestore, using memory fallback:", err);
    }
  }
  return [...reports];
}

async function saveReportToDb(report: Report): Promise<void> {
  if (db) {
    try {
      await setDoc(doc(db, "reports", report.id), report);
      return;
    } catch (err) {
      console.error("Failed to save report to Firestore, using memory fallback:", err);
    }
  }
  reports.unshift(report);
}

async function resolveReportInDb(id: string): Promise<Report | null> {
  if (db) {
    try {
      const reportRef = doc(db, "reports", id);
      const snapshot = await getDoc(reportRef);
      if (snapshot.exists()) {
        const report = snapshot.data() as Report;
        report.status = "Resolved";
        report.citizenMessage = `Update: This issue was successfully resolved by the ${report.department} team! Thank you for your partnership in improving our neighborhood.`;
        await setDoc(reportRef, report);
        return report;
      }
    } catch (err) {
      console.error("Failed to resolve report in Firestore, using memory fallback:", err);
    }
  }

  const reportIndex = reports.findIndex((r) => r.id === id);
  if (reportIndex !== -1) {
    reports[reportIndex].status = "Resolved";
    reports[reportIndex].citizenMessage = `Update: This issue was successfully resolved by the ${reports[reportIndex].department} team! Thank you for your partnership in improving our neighborhood.`;
    return reports[reportIndex];
  }
  return null;
}

async function incrementDuplicateCountInDb(id: string): Promise<void> {
  if (db) {
    try {
      const reportRef = doc(db, "reports", id);
      const snapshot = await getDoc(reportRef);
      if (snapshot.exists()) {
        const report = snapshot.data() as Report;
        report.duplicateCount = (report.duplicateCount || 0) + 1;
        report.confirmations = (report.confirmations || 0) + 1;
        await setDoc(reportRef, report);
        return;
      }
    } catch (err) {
      console.error("Failed to increment duplicate count in Firestore:", err);
    }
  }

  const original = reports.find((r) => r.id === id);
  if (original) {
    original.duplicateCount = (original.duplicateCount || 0) + 1;
    original.confirmations = (original.confirmations || 0) + 1;
  }
}

async function initializeDatabase() {
  if (!db) {
    console.warn("Firestore not initialized. Seeding skipped.");
    return;
  }
  try {
    const reportsCol = collection(db, "reports");
    const snapshot = await getDocs(reportsCol);
    if (snapshot.empty) {
      console.log("Firestore reports collection is empty. Seeding with default data...");
      for (const report of seedReports) {
        await setDoc(doc(db, "reports", report.id), report);
      }
      console.log("Successfully seeded Firestore with default reports.");
    } else {
      console.log(`Firestore already has ${snapshot.size} reports. Seeding skipped.`);
    }
  } catch (err) {
    console.error("Failed to initialize/seed Firestore database:", err);
  }
}

// Dynamically compute escalated reports and return up-to-date items
function getReportsWithEscalation(reportsList: Report[]): Report[] {
  const now = new Date();
  return reportsList.map((report) => {
    // On the Authority dashboard, automatically highlight any report whose SLA countdown has expired as "ESCALATED"
    if (
      report.status !== "Resolved" &&
      report.status !== "Escalated" &&
      now.getTime() > new Date(report.slaDeadline).getTime()
    ) {
      return { ...report, status: "Escalated" };
    }
    return report;
  });
}

// 1. GET ALL REPORTS
app.get("/api/reports", async (req, res) => {
  try {
    const dbReports = await getReportsFromDb();
    res.json(getReportsWithEscalation(dbReports));
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch reports" });
  }
});

// 2. CREATE A NEW REPORT (PERCEIVE -> DECIDE -> ACT)
app.post("/api/reports", async (req, res) => {
  try {
    const { photoUrl, location, address, citizenComment = "" } = req.body;

    if (!photoUrl) {
      return res.status(400).json({ error: "Photo is required for perception" });
    }

    const reportLocation = location || { lat: 28.6139, lng: 77.2090 }; // default center New Delhi
    const reportAddress = address || "Connaught Place, New Delhi";

    let category: ReportCategory = "other";
    let severity = 1;
    let shortDescription = "Civic report submitted by citizen";
    let hazard = false;
    let workOrderDraft = "";
    let citizenMessage = "";
    let isMockResponse = !isGeminiEnabled;
    let isRejected = false;

    if (isGeminiEnabled && ai) {
      try {
        // Fetch remote image URLs and convert to base64, or strip metadata if already a data URL
        let base64Data = photoUrl;
        if (photoUrl.startsWith("http://") || photoUrl.startsWith("https://")) {
          try {
            const response = await fetch(photoUrl);
            if (!response.ok) {
              throw new Error(`Failed to fetch image: ${response.statusText}`);
            }
            const arrayBuffer = await response.arrayBuffer();
            base64Data = Buffer.from(arrayBuffer).toString("base64");
          } catch (fetchErr) {
            console.error("Failed to fetch remote photoUrl as base64, falling back to original", fetchErr);
          }
        } else if (photoUrl.includes("base64,")) {
          base64Data = photoUrl.split("base64,")[1];
        }

        const imagePart = {
          inlineData: {
            mimeType: "image/jpeg",
            data: base64Data,
          },
        };

        const textPart = {
          text: `You are Community Hero, an autonomous civic AI.
Analyze this civic infrastructure photo and respond with a STRICT JSON object matching this schema.
${citizenComment ? `Additional details/comments written by the citizen: "${citizenComment}"` : ""}
Do not include any markdown formatting, backticks, or other text outside the JSON object.

Schema:
{
  "category": "pothole" | "garbage" | "waterlogging" | "water_leak" | "streetlight" | "open_drain" | "other",
  "severity": 1 | 2 | 3 | 4 | 5,
  "short_description": "max 12 words summarizing the issue clearly",
  "hazard": true | false,
  "workOrderDraft": "a professional municipal work-order draft text under 85 words addressed to the mapped department, containing mobilization commands, standard municipal service codes, location address: '${reportAddress}', and safe equipment guidelines, plain text only with no markdown",
  "citizenMessage": "a short, reassuring, public-facing citizen status update, under 30 words, friendly, clear, without markdown",
  "isRejected": true | false
}

Note for mapping logic:
- "pothole" -> department: "Roads (PWD / Municipal Corporation)".
- "garbage" -> department: "Sanitation (Solid Waste Management)".
- "waterlogging" -> department: "Drainage (Storm Water / Sewerage)".
- "water_leak" -> department: "Water Supply (Jal Board)".
- "streetlight" -> department: "Electricity (DISCOM / Municipal Electrical)".
- "open_drain" -> department: "Drainage (Storm Water / Sewerage)".
- "other" -> department: "Other".

- Priority & SLA:
  * If hazard is true or severity is 4 or 5: priority is "Urgent" (SLA 4 hours).
  * If severity is 3: priority is "Normal" (SLA 24 hours).
  * Otherwise: priority is "Low" (SLA 72 hours).

Rules:
1. Return ONLY the JSON object. Do not include markdown formatting or backticks.
2. If the photo does NOT show a valid civic, infrastructure, public safety or municipal issue (e.g., is a selfie, portrait, generic food, animal, indoor domestic object, meme, or completely unrelated random spam), set "isRejected" to true, "category" to "other", and explain why it's rejected in "citizenMessage". Otherwise, set "isRejected" to false.
3. The workOrderDraft should be addressed to the correct mapped department, reference the short_description, and cite the computed priority/SLA.
4. The citizenMessage should friendly-update the citizen about the issue and the mapped department resolution.`,
        };

        const responseSchema = {
          type: Type.OBJECT,
          properties: {
            category: {
              type: Type.STRING,
              enum: ["pothole", "garbage", "waterlogging", "water_leak", "streetlight", "open_drain", "other"],
            },
            severity: { type: Type.INTEGER },
            short_description: { type: Type.STRING },
            hazard: { type: Type.BOOLEAN },
            workOrderDraft: { type: Type.STRING },
            citizenMessage: { type: Type.STRING },
            isRejected: { type: Type.BOOLEAN },
          },
          required: ["category", "severity", "short_description", "hazard", "workOrderDraft", "citizenMessage", "isRejected"],
        };

        const rawText = await generateContentWithFallback([imagePart, textPart], true, responseSchema);
        const cleanedText = rawText.trim().replace(/^```json\s*/i, "").replace(/```$/, "").trim();
        const result = JSON.parse(cleanedText);

        category = result.category || "other";
        severity = Number(result.severity) || 1;
        shortDescription = result.short_description || "Municipal asset issue reported";
        hazard = Boolean(result.hazard);
        workOrderDraft = result.workOrderDraft || "";
        citizenMessage = result.citizenMessage || "";
        isRejected = Boolean(result.isRejected);
      } catch (geminiErr) {
        console.error("Gemini perception failed, utilizing defensive parsing fallback:", geminiErr);
        // Fallback to other
        category = "other";
        severity = 1;
        shortDescription = "Civic report submitted (Defensive Fallback)";
        hazard = false;
        isMockResponse = true;
      }
    } else {
      // Demo Mode: Mock AI perception based on a keyword or just pick a random/generic report description
      console.log("Mock perception engine running (No API Key).");
      // Let's check if the client sent a simulated issue type to guide the mock
      const simType = req.body.simulatedType;
      const lowerComment = citizenComment.toLowerCase();
      if (
        lowerComment.includes("spam") ||
        lowerComment.includes("unrelated") ||
        lowerComment.includes("fake") ||
        lowerComment.includes("random") ||
        lowerComment.includes("selfie") ||
        simType === "unrelated"
      ) {
        category = "other";
        severity = 1;
        shortDescription = "Unrelated/Spam Media - Rejected";
        hazard = false;
        isRejected = true;
        citizenMessage = "Triage Update: The uploaded image does not appear to depict any municipal infrastructure issue. The report has been flagged as Unrelated/Rejected.";
      } else if (simType === "pothole") {
        category = "pothole";
        severity = 4;
        shortDescription = "Deep pothole posing major accident hazard on waterlogged road.";
        hazard = true;
      } else if (simType === "streetlight") {
        category = "streetlight";
        severity = 3;
        shortDescription = "Flickering high-voltage streetlight line sparking on wet tree branches.";
        hazard = true;
      } else if (simType === "water_leak") {
        category = "water_leak";
        severity = 5;
        shortDescription = "High pressure water main burst with major road subsidence threat.";
        hazard = true;
      } else if (simType === "garbage") {
        category = "garbage";
        severity = 3;
        shortDescription = "Overflowing municipal garbage container attracting stray animals and blocking pavement.";
        hazard = false;
      } else if (simType === "waterlogging") {
        category = "waterlogging";
        severity = 4;
        shortDescription = "Knee-deep flood water on low-lying road due to clogged stormwater drains.";
        hazard = true;
      } else if (simType === "open_drain") {
        category = "open_drain";
        severity = 5;
        shortDescription = "Uncovered open manhole on busy pedestrian path during monsoon.";
        hazard = true;
      } else {
        category = "other";
        severity = 2;
        shortDescription = "Damaged telecom utility cable dangling near pedestrian walkway.";
        hazard = false;
      }
    }

    // --- DECIDE: Agent Reasoning Step ---

    // Fetch up-to-date reports from Firestore or memory
    const currentDbReports = await getReportsFromDb();

    // Prepare active reports context for Gemini to check for duplicates
    const existingReportsContext = currentDbReports
      .filter((r) => r.status !== "Resolved" && r.status !== "Rejected" && !r.isDuplicate)
      .map((r) => ({
        id: r.id,
        category: r.category,
        location: r.location,
        createdAt: r.createdAt,
        shortDescription: r.shortDescription,
      }));

    let decideDepartment: Department = "Other";
    let decidePriority: Priority = "Low";
    let decideSlaHours = 72;
    let decideIsDuplicate = false;
    let decideDuplicateOf: string | null = null;
    let decideReasoning = "";

    if (isRejected) {
      decideDepartment = "Other";
      decidePriority = "Low";
      decideSlaHours = 120;
      decideIsDuplicate = false;
      decideDuplicateOf = null;
      decideReasoning = "This report was rejected because the uploaded photo does not contain any recognizable civic infrastructure issue or safety hazard.";
      workOrderDraft = "N/A - REPORT REJECTED: The uploaded media was assessed as unrelated or spam. No municipal work order has been generated.";
      if (!citizenMessage) {
        citizenMessage = "Triage Update: The uploaded image does not appear to depict any municipal infrastructure issue. The report has been flagged as Unrelated/Rejected.";
      }
    } else if (isGeminiEnabled && ai) {
      try {
        const decidePrompt = `You are the autonomous triage agent for an Indian municipal civic-complaint platform.
You receive a structured analysis of a citizen's photo complaint and must decide, without
human input, how it should be handled. Reason like an experienced municipal grievance officer.

INPUT: ${JSON.stringify({
          category,
          severity,
          hazard,
          description: shortDescription,
          lat: reportLocation.lat,
          lng: reportLocation.lng,
          nearby_recent_complaints: existingReportsContext
        }, null, 2)}

DECIDE and return ONLY valid JSON (no markdown, no prose):
{
  "department": "Roads (PWD / Municipal Corporation)" | "Sanitation (Solid Waste Management)" |
                "Drainage (Storm Water / Sewerage)" | "Water Supply (Jal Board)" |
                "Electricity (DISCOM / Municipal Electrical)",
  "priority": "low" | "medium" | "high" | "urgent",
  "sla_hours": <integer>,
  "is_duplicate": <bool>,
  "duplicate_of": <complaint_id or null>,
  "reasoning": "<one plain-English sentence explaining routing + priority>"
}

RULES:
- Map category to department: pothole/road/footpath -> Roads; garbage/waste -> Sanitation;
  waterlogging/open_drain/drainage -> Drainage; water_leak/pipeline -> Water Supply;
  streetlight/electrical -> Electricity.
- hazard=true OR severity>=4 => "urgent", sla_hours <= 6.
- severity 3 => "high", 24h. severity 2 => "medium", 72h. severity 1 => "low", 120h.
- During waterlogging/drainage in monsoon context, lean toward higher priority (public safety).
- If a nearby_recent_complaint has the same category within ~50m, set is_duplicate=true and
  duplicate_of to its id.
- Keep "reasoning" to one clear sentence an ordinary citizen would understand.`;

        const decideSchema = {
          type: Type.OBJECT,
          properties: {
            department: {
              type: Type.STRING,
              enum: [
                "Roads (PWD / Municipal Corporation)",
                "Sanitation (Solid Waste Management)",
                "Drainage (Storm Water / Sewerage)",
                "Water Supply (Jal Board)",
                "Electricity (DISCOM / Municipal Electrical)",
                "Other"
              ],
            },
            priority: {
              type: Type.STRING,
              enum: ["low", "medium", "high", "urgent"],
            },
            sla_hours: { type: Type.INTEGER },
            is_duplicate: { type: Type.BOOLEAN },
            duplicate_of: { type: Type.STRING, nullable: true },
            reasoning: { type: Type.STRING },
          },
          required: ["department", "priority", "sla_hours", "is_duplicate", "duplicate_of", "reasoning"],
        };

        const decideRawText = await generateContentWithFallback([{ text: decidePrompt }], true, decideSchema);
        const decideCleanedText = decideRawText.trim().replace(/^```json\s*/i, "").replace(/```$/, "").trim();
        const decideResult = JSON.parse(decideCleanedText);

        const parsedDept = decideResult.department;
        if ([
          "Roads (PWD / Municipal Corporation)",
          "Sanitation (Solid Waste Management)",
          "Drainage (Storm Water / Sewerage)",
          "Water Supply (Jal Board)",
          "Electricity (DISCOM / Municipal Electrical)",
          "Other"
        ].includes(parsedDept)) {
          decideDepartment = parsedDept as Department;
        } else {
          // fallback
          if (category === "pothole") decideDepartment = "Roads (PWD / Municipal Corporation)";
          else if (category === "streetlight") decideDepartment = "Electricity (DISCOM / Municipal Electrical)";
          else if (category === "water_leak") decideDepartment = "Water Supply (Jal Board)";
          else if (category === "garbage") decideDepartment = "Sanitation (Solid Waste Management)";
          else if (category === "waterlogging" || category === "open_drain") decideDepartment = "Drainage (Storm Water / Sewerage)";
          else decideDepartment = "Other";
        }

        const mappedPriority = (decideResult.priority || "low").toLowerCase();
        if (mappedPriority === "urgent" || mappedPriority === "high") decidePriority = "Urgent";
        else if (mappedPriority === "medium") decidePriority = "Normal";
        else decidePriority = "Low";

        decideSlaHours = Number(decideResult.sla_hours) || 72;
        decideIsDuplicate = Boolean(decideResult.is_duplicate);
        decideDuplicateOf = decideResult.duplicate_of || null;
        decideReasoning = decideResult.reasoning || "";
      } catch (decideErr) {
        console.error("Gemini DECIDE step failed, running rule-based fallback:", decideErr);
      }
    }

    // Local Rule-Based Fallback DECIDE logic (if Gemini did not run or failed)
    if (!decideReasoning) {
      // 1. Department Mapping
      if (category === "pothole") decideDepartment = "Roads (PWD / Municipal Corporation)";
      else if (category === "streetlight") decideDepartment = "Electricity (DISCOM / Municipal Electrical)";
      else if (category === "water_leak") decideDepartment = "Water Supply (Jal Board)";
      else if (category === "garbage") decideDepartment = "Sanitation (Solid Waste Management)";
      else if (category === "waterlogging" || category === "open_drain") decideDepartment = "Drainage (Storm Water / Sewerage)";
      else decideDepartment = "Other";

      // 2. Priority & SLA calculation
      if (hazard || severity >= 4) {
        decidePriority = "Urgent";
        decideSlaHours = 4;
      } else if (severity === 3) {
        decidePriority = "Normal";
        decideSlaHours = 24;
      } else {
        decidePriority = "Low";
        decideSlaHours = 72;
      }

      decideReasoning = `Assigned to ${decideDepartment} with ${decidePriority} priority (SLA ${decideSlaHours}h) based on category '${category}' and severity ${severity}/5.`;
    }

    // --- Authoritative Bounding-Box Duplicate Check ---
    // Simple bounding-box calculation for ~50m:
    // 1 degree of latitude is approx 111,000 meters.
    // 50m = 50 / 111,000 = 0.0004505 degrees of latitude.
    const deltaLat = 50 / 111000;
    // 1 degree of longitude at latitude ~37.77 is approx 111,000 * cos(latitude) = 87,700 meters.
    // 50m = 50 / (111,000 * cos(latitude)) approx 0.0005701 degrees of longitude.
    const cosLat = Math.cos((reportLocation.lat * Math.PI) / 180);
    const deltaLng = 50 / (111000 * cosLat);

    const sevenDaysAgo = Date.now() - 7 * 24 * 3600 * 1000;
    let foundDuplicate: Report | null = null;

    if (!isRejected) {
      for (const r of currentDbReports) {
        if (r.category === category && !r.isDuplicate && r.status !== "Resolved" && r.status !== "Rejected") {
          const inLatBox = Math.abs(r.location.lat - reportLocation.lat) <= deltaLat;
          const inLngBox = Math.abs(r.location.lng - reportLocation.lng) <= deltaLng;
          const rTime = new Date(r.createdAt).getTime();

          if (inLatBox && inLngBox && rTime >= sevenDaysAgo) {
            foundDuplicate = r;
            break;
          }
        }
      }

      if (foundDuplicate) {
        decideIsDuplicate = true;
        decideDuplicateOf = foundDuplicate.id;
        decideReasoning = `Auto-identified duplicate of #${decideDuplicateOf} within 50m bounding box. Merging and escalating parent case confirmations.`;
        
        // Increment the confirmations count on the original report
        await incrementDuplicateCountInDb(decideDuplicateOf);
      } else {
        decideIsDuplicate = false;
        decideDuplicateOf = null;
      }
    } else {
      decideIsDuplicate = false;
      decideDuplicateOf = null;
    }

    const newReportId = `REP-${Math.floor(1000 + Math.random() * 9000)}`;
    const slaDeadlineDate = new Date(Date.now() + decideSlaHours * 3600 * 1000);

    let municipalGrievance = "";

    // --- ACT: Automatic Routing & Action Drafts ---

    if (decideIsDuplicate) {
      workOrderDraft = `DUPLICATE WORK ORDER ROUTED TO EXISTING CASE: #${decideDuplicateOf}\nCoordinates match within 50m of active Case. Incidents merged automatically. Priority updated.`;
      citizenMessage = `Community Hero Agent has detected an active report for this identical issue nearby. We have merged your report with Case #${decideDuplicateOf} to bolster its priority. Crew is notified!`;
      municipalGrievance = `### DUPLICATE REPORT DISMISSAL NOTICE
This community grievance has been identified as a duplicate of active parent case **#${decideDuplicateOf}** located within the same 50-meter coordinates box. Under municipal dispatch rules, this duplicate complaint has been merged into the parent ticket to expedite field crew response. 

Please refer to parent case **#${decideDuplicateOf}** for the formal civic petition and progress updates.`;
    } else {
      let finalWorkOrderDraft = "";
      let finalMunicipalGrievance = "";

      if (isGeminiEnabled && ai) {
        try {
          const workOrderPrompt = `You are an expert municipal dispatch supervisor. 
Generate a formal municipal work-order document for the following newly received community report:
- Report ID: ${newReportId}
- Category: ${category.toUpperCase()}
- Severity Rating: ${severity}/5
- Location Details: ${reportAddress || "Lat " + reportLocation.lat + ", Lng " + reportLocation.lng}
- Responsible Department: ${decideDepartment} Department
- SLA Deadline: ${slaDeadlineDate.toLocaleString()}

Your work-order document MUST contain:
1. A formal municipal header (e.g., COMMUNITY HERO - OFFICIAL SERVICE WORK ORDER).
2. All of the structured fields listed above clearly printed (Report ID, Category, Severity, Location Details, Department, and SLA Deadline).
3. A "REQUIRED FIELD REMEDIATION PLAN" section containing a professional, realistic 2-3 sentence description of the physical actions and equipment needed to safely resolve this specific issue in the field.

Format the output cleanly in plain text or Markdown style. Do not use markdown backticks or JSON. Be formal and precise.`;

          console.log(`Generating formal work order with Gemini for report ${newReportId}...`);
          const responseText = await generateContentWithFallback([{ text: workOrderPrompt }]);
          if (responseText && responseText.trim().length > 0) {
            finalWorkOrderDraft = responseText.trim();
          }
        } catch (woErr) {
          console.error("Gemini work-order draft generation failed, using standard template:", woErr);
        }

        try {
          const grievancePrompt = `You are an Indian citizen filing a formal grievance petition with an Indian Municipal Corporation (such as BBMP, MCD, or Chennai Corporation) regarding a critical civic issue in your neighborhood.
Format the complaint in the authentic style of an official Indian public grievance petition.

You MUST include the following specific details structured professionally:
- Complaint Reference ID: ${newReportId}
- Nature of Grievance (Category): ${category.toUpperCase()}
- Severity/Hazard Level: Priority is ${decidePriority} (Severity Rating: ${severity}/5)
- Location of Public Disturbance: ${reportAddress || "Lat " + reportLocation.lat + ", Lng " + reportLocation.lng}
- Assigned Ward/Target Department: ${decideDepartment}
- Fixed SLA Deadline: ${slaDeadlineDate.toLocaleString()}

Add a formal "FORMAL CIVIC PETITION" body which consists of a polite but firm, highly professional 2-3 sentence description of the required civic action by the municipal corporation to address this grievance (e.g., desilting waterlogged drains, replacing the non-functional streetlight lines, or reconstructing PWD roadways) in the style of a formal legal or bureaucratic petition in India (using terms like "Most Respectfully", "Prayer", "Immediate Redressal", "Undersigned", "Esteemed Office").

Format the output cleanly in Markdown. Do not use JSON or backtick code wrappers.`;

          console.log(`Generating formal municipal grievance with Gemini for report ${newReportId}...`);
          const grievanceResponse = await generateContentWithFallback([{ text: grievancePrompt }]);
          if (grievanceResponse && grievanceResponse.trim().length > 0) {
            finalMunicipalGrievance = grievanceResponse.trim();
          }
        } catch (grErr) {
          console.error("Gemini municipal grievance generation failed, using standard template:", grErr);
        }
      }

      // High-quality detailed fallback if Gemini is not enabled, fails, or returns empty
      if (!finalWorkOrderDraft) {
        const descriptions: Record<string, string> = {
          pothole: "Mobilize PWD asphalt maintenance crew. Set up warning barriers and fill pothole with durable bituminous compound. Compact thoroughly using road-roller to ensure pavement leveling.",
          streetlight: "Deploy DISCOM electrical utility crew with elevated tower wagon. Inspect lighting post, replace blown driver or LED ballast, and check for safety wiring ground insulation.",
          water_leak: "Alert Jal Board repair pipeline unit. Shut off primary main valve, excavate the sidewalk area to expose rupture, and apply leak repair sleeves/clamps to restore pipe pressure.",
          garbage: "Deploy Corporation solid waste collection tipper truck. Lift all accumulated refuse bag mounds, sweep pathway floor completely, and apply eco-friendly bleaching powder disinfectant.",
          waterlogging: "Mobilize stormwater drainage desilting unit. Inspect inlet grating, clear plastic/rubble blockages, and operate diesel water pump if gravity drain is insufficient.",
          open_drain: "Dispatch emergency drainage maintenance crew. Fabricate and install heavy-duty concrete manhole cover slab. Secure area with temporary fencing until cured.",
          other: "Route ward supervisor technician to execute primary inspection. Apply danger cautionary ribbon if hazards exist and log follow-up repair contract ticket."
        };
        const actionDesc = descriptions[category] || descriptions.other;

        finalWorkOrderDraft = `COMMUNITY HERO - OFFICIAL SERVICE WORK ORDER
===========================================
Report ID: ${newReportId}
Category: ${category.toUpperCase()}
Severity: ${severity}/5
Location Details: ${reportAddress || "Lat " + reportLocation.lat + ", Lng " + reportLocation.lng}
Responsible Department: ${decideDepartment} Department
SLA Deadline: ${slaDeadlineDate.toLocaleString()}

REQUIRED FIELD REMEDIATION PLAN:
${actionDesc}`;
      }

      if (!finalMunicipalGrievance) {
        const descriptions: Record<string, string> = {
          pothole: "The condition of the roadway has deteriorated significantly, posing a severe threat to vehicle passengers and pedestrian commuters. We pray that the PWD and the Municipal Corporation take immediate steps to fill these deep potholes and perform bituminous leveling of the pavement. Immediate action is requested to prevent any grievous accidents or vehicle axle damage in our ward.",
          streetlight: "The lack of illumination has plunged the local walkway into total darkness, giving rise to serious safety and security concerns for women and elderly residents. Most respectfully, we request the electrical division and DISCOM to inspect the overhead line, replace the damaged driver, and restore steady lighting. Prompt redressal will ensure a hazard-free neighborhood transit.",
          water_leak: "A clean drinking water pipeline burst has caused continuous water gushing, resulting in municipal waste and high sidewalk subsidence risks. We petition the Jal Board to immediately shut off the upstream water supply valve and apply heavy-duty pipeline coupling sleeves. Your urgent intervention is required to arrest the loss of precious potable water.",
          garbage: "The accumulation of solid municipal waste has generated an extremely unhygienic environment, emitting foul odor and attracting disease-carrying vectors. We pray that the Sanitation and Waste Management wing dispatch a solid-waste tipper truck to clear the heap and spray disinfectant bleaching powder. Kindly resolve this to maintain public health standards.",
          waterlogging: "Severe waterlogging has rendered the public road waterlogged and inaccessible, creating knee-deep flood pools during heavy monsoons. Most respectfully, we request the Drainage Division to initiate desilting of stormwater culverts and operate high-capacity diesel pumps. Redressal is critical to restore smooth traffic circulation and ward health safety.",
          open_drain: "An open, uncovered drainage manhole lies directly on a busy pedestrian pathway, presenting an extremely high risk of fatal falls. We pray that the Drainage and Sewerage engineering department fabricates and installs a heavy concrete slab over this open shaft. The area must be cordoned off with high-visibility hazard warning tapes immediately.",
          other: "A civic utility defect has been detected, causing significant disruption to residents and commuters in the locality. Most respectfully, we request the concerned ward supervisor to conduct a physical site survey and initiate corrective repairs. Prompt resolution of this ticket will ensure convenience and safety to the general public."
        };
        const grievanceActionDesc = descriptions[category] || descriptions.other;

        finalMunicipalGrievance = `### PUBLIC GRIEVANCE PETITION (FORMAL COGNIZANCE)
**TO THE COMMISSIONER / WARD SANITARY INSPECTOR**
*MUNICIPAL CORPORATION & CIVIC AUTHORITIES*

**Subject:** Official Grievance Petition for Immediate Redressal of ${category.toUpperCase()} at ${reportAddress || "Specified Location"}

---

#### 1. GRIEVANCE FILE DETAILS
- **Grievance Reference Number:** ${newReportId}
- **Nature of Grievance:** ${category.toUpperCase()}
- **Department Under Jurisdiction:** ${decideDepartment}
- **Assessed Severity/Hazard Level:** ${severity}/5 (${decidePriority})
- **SLA Deadline for Resolution:** ${slaDeadlineDate.toLocaleString()}
- **Location of Incident:** ${reportAddress || "Lat " + reportLocation.lat + ", Lng " + reportLocation.lng}

---

#### 2. FORMAL CIVIC PETITION (PRAYER FOR ACTION)
Most Respectfully, the undersigned citizen draws the urgent attention of the competent civic authorities towards this pressing hazard. ${grievanceActionDesc}

Therefore, it is prayed that your esteemed office takes immediate cognizance of this grievance under the designated Service Level Agreement. We look forward to swift execution and on-site clearance.`;
      }

      workOrderDraft = finalWorkOrderDraft;
      municipalGrievance = finalMunicipalGrievance;

      if (!citizenMessage) {
        citizenMessage = `Triage Complete: A work-order has been logged for the ${decideDepartment} Department with ${decidePriority} priority. We expect resolving this within our ${decideSlaHours}-hour service SLA. Thank you for keeping our city safe!`;
      }
    }

    // Save and assemble the final report
    const newReport: Report = {
      id: newReportId,
      category,
      severity,
      shortDescription,
      hazard,
      photoUrl,
      location: reportLocation,
      address: reportAddress,
      createdAt: new Date().toISOString(),
      department: decideDepartment,
      priority: decidePriority,
      slaDeadline: slaDeadlineDate.toISOString(),
      sla_hours: decideSlaHours,
      status: isRejected ? "Rejected" : "Reported",
      citizenMessage,
      workOrderDraft,
      isDuplicate: decideIsDuplicate,
      mergedIntoId: decideDuplicateOf,
      duplicateCount: 0,
      confirmations: 0,
      decisionsReasoning: {
        departmentChoice: isRejected
          ? "N/A: Case rejected as unrelated/spam."
          : `Assigned to ${decideDepartment}: Category '${category}' mapped directly to ${decideDepartment} jurisdiction.`,
        prioritySla: isRejected
          ? "N/A: Case rejected."
          : `Priority evaluated as ${decidePriority}. Severity was assessed at ${severity}/5. Immediate Safety Hazard flag: ${hazard ? "TRUE" : "FALSE"}. Service Level Agreement window set to ${decideSlaHours} hours.`,
        duplicateCheck: isRejected
          ? "N/A: Case rejected."
          : decideIsDuplicate
          ? `MATCH DETECTED: Similar issue in same category resolved or active within 50 meters in last 7 days. Merged into parent case #${decideDuplicateOf}.`
          : `CLEAN SCAN: No similar active reports detected within 50 meters of location. Registered as primary case.`,
        routingAction: isRejected
          ? "Closed and flagged as 'Rejected' by Autonomous Agent. Mapped to none."
          : `Auto-generated official municipal service contract. Dispatched directly to ${decideDepartment} active department queue. Status set to 'Reported'.`,
      },
      reasoning: decideReasoning,
      citizenComment,
      municipalGrievance,
    };

    await saveReportToDb(newReport);

    res.json({
      success: true,
      report: newReport,
      isMockResponse,
    });
  } catch (error: any) {
    console.error("Error creating report:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// 3. RESOLVE A REPORT (Authority Action)
app.post("/api/reports/:id/resolve", async (req, res) => {
  try {
    const { id } = req.params;
    const updatedReport = await resolveReportInDb(id);

    if (!updatedReport) {
      return res.status(404).json({ error: "Report not found" });
    }

    res.json({ success: true, report: updatedReport });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to resolve report" });
  }
});

// Start Express server & Vite development middleware
async function startServer() {
  // Initialize Database (Seeding if Firestore is empty)
  await initializeDatabase();

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite Development Middleware loaded.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Community Hero server running on http://localhost:${PORT}`);
  });
}

startServer();
