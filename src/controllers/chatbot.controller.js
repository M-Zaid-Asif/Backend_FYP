import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import prisma from "../constants/prisma.js";

const getKnowledgeChatResponse = asyncHandler(async (req, res) => {
    const { message } = req.body;

    if (!message || !message.trim()) {
        throw new ApiError(
            400,
            "Please enter an emergency condition or disaster type."
        );
    }

    // Normalize User Query
    const query = message.trim().toLowerCase().replace(/[^\w\s]/g, " ");

    // Stop Words
    const stopWords = new Set([
        "a","an","the","is","are","am","was","were","be","been",
        "i","me","my","mine","you","your","yours","he","him","his",
        "she","her","they","them","their","it","its","we","our","ours",
        "this","that","these","those","of","to","in","on","at","for","from","by","with",
        "after","before","during","while","into","onto","over","and","or","but",
        "can","could","should","would","will","shall","may","has","have","had","do","does","did",
        "please","help","need","there","here","someone","person"
    ]);

    // Extract meaningful words
    const queryWords = [
        ...new Set(
            query
                .split(/\s+/)
                .filter(word => word.length > 1)
                .filter(word => !stopWords.has(word))
        )
    ];

    // Synonym Dictionary
    const synonyms = {
        blood: ["bleeding", "hemorrhage"],
        bleeding: ["blood", "hemorrhage"],
        fracture: ["broken", "bone"],
        broken: ["fracture"],
        collapse: ["building", "fallen", "crushed"],
        drowning: ["underwater", "submerged"],
        choke: ["choking", "airway"],
        burn: ["burned", "burning"],
        shock: ["trauma"],
        flood: ["floodwater", "water"],
        earthquake: ["quake", "tremor"],
        dehydration: ["thirst"],
        unconscious: ["unresponsive"],
        rescue: ["save"],
        snake: ["serpent"],
        bite: ["bitten"],
        electrocution: ["electric", "current"],
        landslide: ["mudslide"],
        panic: ["anxiety"]
    };

    // Expand query using synonyms
    const expandedWords = [...queryWords];
    for (const word of queryWords) {
        if (synonyms[word]) {
            expandedWords.push(...synonyms[word]);
        }
    }
    const finalWords = [...new Set(expandedWords)];

    // Fetch all conditions
    const conditions = await prisma.condition.findMany();
    
    // Array to hold matches with calculated scores
    const matchedConditions = [];

    // Start ranking every condition
    for (const condition of conditions) {
        let score = 0;
        const title = condition.title.toLowerCase();
        const description = (condition.description || "").toLowerCase();
        const keywords = condition.keywords.map(keyword => keyword.toLowerCase());

        // 1. Exact Title Match
        if (title === query) {
            score += 100;
        }
        // 2. Partial Title Match
        else if (title.includes(query)) {
            score += 60;
        }

        // 3. Query Words in Title
        for (const word of finalWords) {
            if (title.includes(word)) {
                score += 20;
            }
        }

        // 4. Description Matching
        for (const word of finalWords) {
            if (description.includes(word)) {
                score += 5;
            }
        }

        // 5. Keyword Scoring (Weighted)
        keywords.forEach((keyword, index) => {
            let keywordWeight = 15;
            if (index < 3) keywordWeight = 30;
            else if (index < 6) keywordWeight = 25;
            else if (index < 9) keywordWeight = 20;

            if (query.includes(keyword)) {
                score += keywordWeight + 15;
            }

            for (const word of finalWords) {
                if (keyword === word) {
                    score += keywordWeight;
                } else if (keyword.includes(word) || word.includes(keyword)) {
                    score += 10;
                }
            }
        });

        // 6. Bonus Score
        let titleMatched = false;
        for (const word of finalWords) {
            if (title.includes(word)) {
                titleMatched = true;
                break;
            }
        }

        if (titleMatched && score >= 50) {
            score += 20;
        }

        // Calculate Confidence percentage for this specific match
        const confidence = Math.min(Math.round((score / 180) * 100), 100);

        // If it crosses the minimum confidence floor, add it to potential results
        if (confidence >= 25) {
            matchedConditions.push({
                title: condition.title,
                description: condition.description,
                recoveryPosition: condition.recoveryPosition,
                steps: condition.steps,
                precautions: condition.precautions,
                verified: true,
                confidence
            });
        }
    }

    // Sort matching results descending by confidence/score
    matchedConditions.sort((a, b) => b.confidence - a.confidence);

    // Limit to top 4 most relevant choices so we don't overwhelm the user
    const finalResults = matchedConditions.slice(0, 4);

    if (finalResults.length > 0) {
        return res
            .status(200)
            .json(new ApiResponse(200, finalResults, "Verified rescue options retrieved."));
    }

    // No Match Found Fallback
    return res.status(404).json(
        new ApiResponse(
            404,
            {
                verified: false,
                reply: "Sorry, I couldn't find relevant emergency instructions. Please contact emergency services immediately if this is a critical emergency."
            },
            "No matching condition found."
        )
    );
});

export { getKnowledgeChatResponse };