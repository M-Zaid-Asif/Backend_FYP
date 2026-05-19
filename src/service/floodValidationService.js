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
      // 1. Weather Data (50%) - Integrated 3-Day Temporal Buffer
      try {
        const reportDate = new Date(report.createdAt);

        // Calculate the window: 1 day before to 1 day after
        const startDate = new Date(reportDate);
        startDate.setDate(startDate.getDate() - 1);
        const endDate = new Date(reportDate);
        endDate.setDate(endDate.getDate() + 1);

        // Format dates to YYYY-MM-DD for the API
        const startStr = startDate.toISOString().split('T')[0];
        const endStr = endDate.toISOString().split('T')[0];

        const url = `${process.env.WEATHER_BASE_URL}/${report.latitude},${report.longitude}/${startStr}/${endStr}`;

        const res = await axios.get(url, {
          params: {
            unitGroup: "metric",
            elements: "precip,preciprob,conditions",
            key: process.env.WEATHER_API_KEY
          }
        });

        // Sum precipitation across the 3-day window
        const totalRain = (res.data.days || []).reduce((sum, d) => sum + (d.precip || 0), 0);

        // Logic: Validated if total rain >= 10mm in that specific 3-day window
        if (totalRain >= 10) {
          score += 50;
          weatherMatch = true;
        }
      } catch (err) {
        console.error("Weather API Failure for Temporal Window");
      }

      // 2. Social Proof (25%) - Proximity to existing verified reports
      const nearby = await prisma.report.count({
        where: {
          type: "FLOOD",
          status: "VERIFIED",
          id: { not: reportId },
          // Matches reports within the same 6-hour danger window
          createdAt: {
            gte: new Date(new Date(report.createdAt).getTime() - 6 * 60 * 60 * 1000),
            lte: new Date(new Date(report.createdAt).getTime() + 6 * 60 * 60 * 1000)
          },
          latitude: { gte: report.latitude - 0.03, lte: report.latitude + 0.03 },
          longitude: { gte: report.longitude - 0.03, lte: report.longitude + 0.03 }
        }
      });
      if (nearby >= 3) score += 25;

      // 3. Community Voting (25%) - Consensus-based validation
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