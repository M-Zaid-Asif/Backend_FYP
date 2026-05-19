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
            model: "gemini-3.1-flash-lite-preview",
            generationConfig: {
                maxOutputTokens: 40,
                temperature: 0.3,
            },
        });

        // Refined prompt to reflect your validation logic
        const prompt = `Context: Disaster Report Verification System (FAEAS).
        Input: ${report.type}, Status: ${report.status}, Votes: ${report.upvotesCount}U/${report.downvotesCount}D.

        Rules: 
        1. Floods: Verified via 3-day temporal weather buffer (1 day before/after report), social proof, and votes.
        2. Earthquakes: Verified via real-time community consensus and voting patterns.

        Objective: Audit the relationship between inputs and status.
        Response: Two concise sentences (max 20 words) explaining the specific validation logic.`;

        const result = await model.generateContent(prompt, { signal: controller.signal });
        clearTimeout(timeoutId);

        const aiText = result.response.text().trim();

        return res.status(200).json(
            new ApiResponse(200, { explanation: aiText }, "AI Audit Success")
        );

    } catch (error) {
        clearTimeout(timeoutId);
        console.error("Gemini Audit Error:", error.message);

        // --- INTEGRATED FALLBACK LOGIC ---
        const isFlood = report.type?.toUpperCase().includes("FLOOD");
        const status = report.status;
        let explanation = "";

        if (status === "NEEDS_REVIEW") {
            explanation = isFlood
                ? "Flood report requires additional sensor data and further community metrics."
                : "Earthquake report requires more user votes for verification";
        } else if (status === "REJECTED") {
            explanation = isFlood
                ? "Report rejected due to lack of weather API correlation."
                : "Report rejected due to low community trust.";
        } else {
            explanation = isFlood
                ? "Verification confirmed via weather APIs and social proof."
                : "Verification confirmed via high-confidence community consensus.";
        }

        return res.status(200).json(
            new ApiResponse(200, { explanation }, "Fallback applied due to API error")
        );
    }
});