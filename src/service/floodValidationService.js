import prisma from "../constants/prisma.js";
import axios from "axios";

const isWithinRange = (lat1, lon1, lat2, lon2, km) => {
  const range = km / 111; 
  return Math.abs(lat1 - lat2) <= range && Math.abs(lon1 - lon2) <= range;
};

export const validateFloodReport = async (reportId) => {
  console.log(`--- Starting Validation Task: ${reportId} ---`);
  
  try {
    // 1. Fetch report including the new separate vote counters
    await new Promise(resolve => setTimeout(resolve, 500));
    const report = await prisma.report.findUnique({ 
        where: { id: reportId } 
    });
    
    if (!report) {
        console.error("Validation Error: Report not found in database.");
        return;
    }

    let score = 0;
    let weatherMatch = false;

    // 2. Weather Logic (Weight: 50%)
    try {
      const url = `${process.env.WEATHER_BASE_URL}/${report.latitude},${report.longitude}/last3days/next3days`;
      const res = await axios.get(url, {
        params: { unitGroup: "metric", elements: "precip", include: "days", key: process.env.WEATHER_API_KEY, contentType: "json" }
      });
      const totalRainfall = (res.data.days || []).reduce((sum, day) => sum + (day.precip || 0), 0);
      console.log(`[Weather] Total Rainfall: ${totalRainfall}mm`);

      if (totalRainfall >= 10) { 
        score += 50; 
        weatherMatch = true; 
      }
    } catch (err) {
      console.error("[Weather] API unavailable, bypassing weather weight...");
    }

    // 3. Social Logic (Weight: 25%) - Only trust already VERIFIED nearby reports
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
    const recentVerifiedReports = await prisma.report.findMany({
      where: {
        type: "FLOOD", 
        id: { not: reportId },
        status: "VERIFIED", 
        createdAt: { gte: sixHoursAgo },
      },
    });

    const nearbyCount = recentVerifiedReports.filter(r => 
        isWithinRange(report.latitude, report.longitude, r.latitude, r.longitude, 3)
    ).length;
    
    console.log(`[Social] Nearby verified reports: ${nearbyCount}`);

    if (nearbyCount >= 3) score += 25;
    else if (nearbyCount >= 1) score += 15;

    // 4. Enhanced Vote Logic (Weight: 25%) - Using Consensus Ratio
    const up = report.upvotesCount || 0;
    const down = report.downvotesCount || 0;
    const totalVotes = up + down;

    if (totalVotes > 0) {
        const consensusRate = up / totalVotes; 
        console.log(`[Community] Up: ${up}, Down: ${down}, Ratio: ${(consensusRate * 100).toFixed(1)}%`);

        if (consensusRate >= 0.8 && up >= 5) {
            // High Consensus (80%+ agreement with significant sample size)
            score += 25;
        } else if (consensusRate >= 0.5) {
            // Moderate Consensus
            score += 15;
        } else if (consensusRate < 0.3) {
            // High Dispute (More than 70% of people say it's fake)
            score -= 30; 
        }
    }

    // 5. Decision Mapping
    let finalDecision = "NEEDS_REVIEW";
    let finalStatus = "PENDING";

    // Thresholds: Verified at 75%+, Rejected below 25%
    if (score >= 75) {
        finalDecision = "VERIFIED";
        finalStatus = "VERIFIED";
    } else if (score < 25) {
        finalDecision = "REJECTED";
        finalStatus = "REJECTED";
    }

    console.log(`Final Decision: ${finalDecision} | Calculated Score: ${score}%`);

    // 6. Atomic Update
    await prisma.$transaction([
        prisma.validationResult.upsert({
            where: { reportId: reportId },
            update: { confidenceScore: Math.max(0, score), decision: finalDecision, weatherMatch },
            create: { 
                reportId: reportId, 
                confidenceScore: Math.max(0, score), 
                decision: finalDecision, 
                weatherMatch, 
                newsMatch: false 
            }
        }),
        prisma.report.update({
            where: { id: reportId },
            data: { status: finalStatus }
        })
    ]);

    console.log("!!! VALIDATION COMPLETE: DATABASE SYNCED !!!");

  } catch (error) {
    console.error("CRITICAL VALIDATION ERROR:", error);
  }
};