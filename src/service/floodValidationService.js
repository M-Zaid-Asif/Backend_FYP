import prisma from "../constants/prisma.js";
import axios from "axios";

const isWithinRange = (lat1, lon1, lat2, lon2, km) => {
  const range = km / 111; 
  return Math.abs(lat1 - lat2) <= range && Math.abs(lon1 - lon2) <= range;
};

export const validateFloodReport = async (reportId) => {
  try {
    const report = await prisma.report.findUnique({ 
        where: { id: reportId } 
    });
    
    if (!report) return;

    let score = 0;
    let weatherMatch = false;

    const up = report.upvotesCount || 0;
    const down = report.downvotesCount || 0;
    const totalVotes = up + down;
    const consensusRate = totalVotes > 0 ? up / totalVotes : 0;

    // --- BRANCH: FLOOD LOGIC ---
    if (report.type === "FLOOD") {
        // 1. Weather Data (50%)
        try {
          const url = `${process.env.WEATHER_BASE_URL}/${report.latitude},${report.longitude}/last3days/next3days`;
          const res = await axios.get(url, {
            params: { unitGroup: "metric", elements: "precip", key: process.env.WEATHER_API_KEY }
          });
          const totalRain = (res.data.days || []).reduce((sum, d) => sum + (d.precip || 0), 0);
          if (totalRain >= 10) { score += 50; weatherMatch = true; }
        } catch (err) { console.error("Weather API Down"); }

        // 2. Social Proof (25%) - Nearby verified reports
        const nearby = await prisma.report.count({
          where: {
            type: "FLOOD",
            status: "VERIFIED",
            id: { not: reportId },
            createdAt: { gte: new Date(Date.now() - 6 * 60 * 60 * 1000) },
            latitude: { gte: report.latitude - 0.03, lte: report.latitude + 0.03 },
            longitude: { gte: report.longitude - 0.03, lte: report.longitude + 0.03 }
          }
        });
        if (nearby >= 3) score += 25;

        // 3. Community Voting (25%)
        if (consensusRate >= 0.8 && up >= 5) score += 25;
        else if (consensusRate >= 0.5) score += 10;
    } 

    // --- BRANCH: EARTHQUAKE LOGIC (Vote-Dominant) ---
    else if (report.type === "EARTHQUAKE") {
        // Since there's no "Weather API" for EQ, we rely 100% on high-confidence voting
        // We require a higher threshold of 'Upvotes' to prevent prank reports
        if (totalVotes >= 10) {
            if (consensusRate >= 0.9) score = 100;      // Strong Consensus
            else if (consensusRate >= 0.7) score = 80;  // High Confidence
            else if (consensusRate >= 0.5) score = 50;  // Mixed (Needs Review)
            else score = 10;                            // Disputed (Rejected)
        } else {
            // Initial phase: Not enough data yet
            score = 40; // Keeps it in PENDING/NEEDS_REVIEW
        }
    }

    // --- FINAL DECISION MAPPING ---
    let finalDecision = "NEEDS_REVIEW";
    let finalStatus = "PENDING";

    if (score >= 75) {
        finalDecision = "VERIFIED";
        finalStatus = "VERIFIED";
    } else if (score < 30) {
        finalDecision = "REJECTED";
        finalStatus = "REJECTED";
    }

    await prisma.$transaction([
        prisma.validationResult.upsert({
            where: { reportId },
            update: { confidenceScore: score, decision: finalDecision, weatherMatch, newsMatch: false },
            create: { reportId, confidenceScore: score, decision: finalDecision, weatherMatch, newsMatch: false }
        }),
        prisma.report.update({
            where: { id: reportId },
            data: { status: finalStatus }
        })
    ]);

  } catch (error) {
    console.error("Validation logic failed:", error);
  }
};