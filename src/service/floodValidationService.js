import prisma from "../constants/prisma.js";
import axios from "axios";

const isWithinRange = (lat1, lon1, lat2, lon2, km) => {
  const range = km / 111; 
  return Math.abs(lat1 - lat2) <= range && Math.abs(lon1 - lon2) <= range;
};

export const validateFloodReport = async (reportId) => {
  console.log(`--- Starting Validation Task: ${reportId} ---`);
  
  try {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 1. Fetch report including its current votesCount
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
      
      if (totalRainfall >= 10) { 
        score += 50; // Weather contributes 50 points
        weatherMatch = true; 
      }
    } catch (err) {
      console.error("Weather API unavailable...");
    }

    // 3. Social Logic (Weight: 25%)
    // Only counting reports that are already VERIFIED
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
    const recentVerifiedReports = await prisma.report.findMany({
      where: {
        type: "FLOOD", 
        id: { not: reportId },
        status: "VERIFIED", // CRITICAL: Only trust verified reports
        createdAt: { gte: sixHoursAgo },
      },
    });

    const nearbyCount = recentVerifiedReports.filter(r => 
        isWithinRange(report.latitude, report.longitude, r.latitude, r.longitude, 3)
    ).length;
    
    if (nearbyCount >= 3) score += 25;
    else if (nearbyCount >= 1) score += 15;

    // 4. Vote Logic (Weight: 25%)
    // We calculate community trust based on the votesCount
    // If votes are >= 5, full 25 points. If positive but < 5, 10 points.
    if (report.votesCount >= 5) {
        score += 25;
    } else if (report.votesCount > 0) {
        score += 10;
    } else if (report.votesCount < 0) {
        // Penalty for negative votes to help trigger REJECTED status
        score -= 20; 
    }

    // 5. Decision Mapping
    let finalDecision = "NEEDS_REVIEW";
    let finalStatus = "PENDING";

    // Normalized thresholds based on 100 point scale
    if (score >= 70) {
        finalDecision = "VERIFIED";
        finalStatus = "VERIFIED";
    } else if (score < 20) {
        finalDecision = "REJECTED";
        finalStatus = "REJECTED";
    }

    console.log(`Final Decision: ${finalDecision} | Total Score: ${score}%`);

    // 6. Atomic Update/Create
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

    console.log("!!! DATABASE SYNC COMPLETE !!!");

  } catch (error) {
    console.error("CRITICAL VALIDATION ERROR:", error);
  }
};