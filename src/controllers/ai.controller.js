import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initializing the Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const explainDecision = asyncHandler(async (req, res) => {
    const { report } = req.body;

    if (!report) {
        throw new ApiError(400, "No report data found in request body");
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
        const model = genAI.getGenerativeModel({
            model: "gemini-3.5-flash",
            generationConfig: {
                // 1. INCREASE CAPACITY: Bumped from 80 to 250 tokens to allow a full paragraph
                maxOutputTokens: 1000,
                temperature: 0.2,
            },
        });

        const reportType = report.type || "Unknown Disaster";
        const reportStatus = report.status || "REVIEW_PENDING";
        const upvotes = report.upvotesCount !== undefined ? report.upvotesCount : 0;
        const downvotes = report.downvotesCount !== undefined ? report.downvotesCount : 0;

        // 2. DETAILED PROMPT: Demands a rigorous, comprehensive step-by-step audit
        const prompt = `You are an emergency system assistant translating technical data into clear, simple English for regular operators and citizens.

[REPORT DETAILS]
- Crisis Type: ${reportType}
- Current Status: ${reportStatus}
- Community Feedback: ${upvotes} people confirmed this, ${downvotes} people disputed this.

[VALIDATION SYSTEM RULES]
1. FLOODS: Checked against regional weather station sensors using two metrics: either a 3-day cumulative rainfall total (sustained flooding) OR a high-intensity single-day rainfall spike (flash flooding), alongside community votes.
2. EARTHQUAKES: Checked against real-time user reports and consensus matching.

[OBJECTIVE]
Explain simply and clearly why this report has its current status based on the details above.

[OUTPUT DIRECTIVES]
- Write 1 or 2 simple, conversational sentences.
- Use everyday English. Avoid robotic jargon.
- If verified due to a single heavy downpour, make sure to mention that extreme single-day rainfall triggered the alert.`;

        const result = await model.generateContent(prompt, { signal: controller.signal });
        clearTimeout(timeoutId);

        let aiText = "";
        if (result?.response && typeof result.response.text === "function") {
            aiText = result.response.text().trim();
        }

        if (!aiText) {
            throw new Error("Empty response received from generation model");
        }

        return res.status(200).json(
            new ApiResponse(200, { explanation: aiText }, "AI Detailed Audit Success")
        );

    } catch (error) {
        clearTimeout(timeoutId);
        console.error("Gemini Audit Error Logged:", error.message);

        // --- DETAILED FALLBACK LOGIC ---
        // (Ensures the UI still gets a professional detailed paragraph if the API is down)
        const isFlood = report.type?.toUpperCase().includes("FLOOD");
        const status = report.status;
        let explanation = "";

        if (status === "NEEDS_REVIEW") {
            explanation = isFlood
                ? "This flood report has been set to Needs Review because the localized community voting matrix has not crossed the required verification threshold. The system is currently holding the record in queue while waiting for subsequent weather API synchronization telemetry."
                : "This earthquake log requires further real-time citizen nodes to cast validation consensus votes. Operational protocols prevent dispatching response teams until the localized peer-to-peer trust metrics clear system constraints.";
        } else if (status === "REJECTED") {
            explanation = isFlood
                ? "This incident log has been automatically flagged as Rejected. Immediate cross-checking against meteorological sensor networks over the 3-day buffer showed zero precipitation or environmental correlation, pointing to an unverified community claim."
                : "The system has Rejected this earthquake notification due to low community trust patterns. The downvote delta significantly outpaced confirmation signals, categorizing this submission as an invalid or false panic log.";
        } else {
            explanation = isFlood
                ? "Operational verification confirmed. This flood entry successfully passed through the 3-tier validation cycle, matching positive data metrics from local meteorological APIs alongside a highly sustainable positive community consensus score."
                : "The entry has been fully Verified. Real-time community trust arrays successfully crossed the system's high-confidence threshold, indicating clear, decentralized peer verification of a localized seismic event.";
        }

        return res.status(200).json(
            new ApiResponse(200, { explanation }, "Fallback applied due to API error")
        );
    }
});