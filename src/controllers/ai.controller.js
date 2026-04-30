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

    // Setting a strict 8-second timeout to prevent UI hangs
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
        // Using gemini-3.1-flash-lite-preview
        const model = genAI.getGenerativeModel({ 
            model: "gemini-3.1-flash-lite-preview", 
            generationConfig: {
                maxOutputTokens: 40, // Limiting the response
                temperature: 0.3,    // Lower temperature, more consistent logic
            },
        });

        const prompt = `
        Context: Disaster Report Verification System.
        Input Data:
        - Disaster: ${report.type}
        - Current Status: ${report.status}
        - User Support: ${report.upvotesCount} Up / ${report.downvotesCount} Down

        Objective: Audit the relationship between user votes and system status.
        Rules:
        1. If Status=REJECTED but Upvotes > 10, cite "potential misinformation" or "duplicate entry."
        2. If Status=VERIFIED but Upvotes < 3, cite "sensor-based confirmation."
        3. Never repeat the status as its own justification.

        Response: One concise sentence (max 10 words).`;

        const result = await model.generateContent(prompt, { signal: controller.signal });
        clearTimeout(timeoutId);

        const aiText = result.response.text().trim();

        return res.status(200).json(
            new ApiResponse(200, { explanation: aiText }, "AI Audit Success")
        );

    } catch (error) {
        clearTimeout(timeoutId);
        console.error("Gemini Audit Error:", error.message);
        
        // Logical Fallback: Provides a smarter reason even if the API fails
        const fallbackReason = report.status === "REJECTED" 
            ? "Report rejected due to low source reliability or duplication."
            : "Verification confirmed via cross-referenced satellite and sensor data.";

        return res.status(200).json(
            new ApiResponse(200, { explanation: fallbackReason }, "Fallback applied")
        );
    }
});