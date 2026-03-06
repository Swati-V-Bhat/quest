import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import admin, { ServiceAccount } from 'firebase-admin';

// Initialize Firebase Admin if not already
if (!admin.apps.length) {
    const serviceAccount = JSON.parse(
        Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_K!, 'base64').toString('utf-8')
    );

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount as ServiceAccount)
    });
}

const db = admin.firestore();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: Request) {
    try {
        const { questId } = await request.json();

        if (!questId) {
            return NextResponse.json({ success: false, error: 'questId is required' }, { status: 400 });
        }

        const questRef = db.collection('quest').doc(questId);
        const questSnap = await questRef.get();

        if (!questSnap.exists) {
            return NextResponse.json({ success: false, error: 'Quest not found' }, { status: 404 });
        }

        const questData = questSnap.data()!;

        // Skip AI-generated quests
        if (questData.isAiGenerated || questData.type === 'ai_generated') {
            return NextResponse.json({
                success: true,
                message: 'Scoring skipped for AI-generated quest',
                score: 0
            });
        }

        // 1. Calculate Waypoints Score (Max 1 point)
        // Rule: 8 waypoints = 1 point. Scale linearly up to 1 point.
        let totalWaypoints = 0;
        let totalPhotos = 0;

        // Process text for AI
        let compiledTextData = `Quest Title: ${questData.title || ''}\n`;
        compiledTextData += `Destination: ${questData.destination || ''}\n`;
        compiledTextData += `Description: ${questData.description || ''}\n\n`;

        if (questData.itinerary && Array.isArray(questData.itinerary.days)) {
            questData.itinerary.days.forEach((day: any, dayIndex: number) => {
                compiledTextData += `Day ${dayIndex + 1}: ${day.title || ''}\n`;
                if (Array.isArray(day.activities)) {
                    day.activities.forEach((activity: any) => {
                        if (activity.type === 'activity' || activity.type === 'place' || activity.title || activity.description) {
                            totalWaypoints++;

                            if (activity.media && Array.isArray(activity.media)) {
                                totalPhotos += activity.media.length;
                            }

                            compiledTextData += `- Activity: ${activity.title || ''}\n`;
                            compiledTextData += `  Description/Notes: ${activity.description || ''}\n`;
                            compiledTextData += `  Location: ${activity.location?.name || ''}\n`;
                        }
                    });
                }
            });
        }

        // Calculate baseline scores
        const waypointsScore = Math.min(1, totalWaypoints / 8);
        const photosScore = Math.min(1, totalPhotos / 8);

        // 2. Calculate Logistics/Usefulness Score via Gemini (Max 3 points)
        // Benchmark: Varkala quest is the "best" standard (worth ~4/5 total, so ~2-3/3 for logistics).
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

        const prompt = `
      You are an expert travel evaluator scoring user-generated travel itineraries ("quests").
      Your task is to evaluate the "Logistical Metadata" and helpfulness of the following quest.
      
      You must return ONLY a single integer from 0 to 3 representing the score. No other text.

      Scoring Benchmark: We consider our "Varkala" quest as the gold standard (a 3 out of 3 for logistics). 
      A gold standard quest has:
      - Very detailed descriptions of activities.
      - Helpful tips, notes on transportation, pricing, timings, or local insights.
      - Easy to understand, well-structured text that genuinely helps another traveler.
      
      Criteria for this score (0 to 3 points):
      0: Barely any useful information, just titles or generic text.
      1: Some basic descriptions, but lacking depth or real insider tips.
      2: Good amount of detail, helpful for planning, clear descriptions.
      3: Gold standard (like Varkala level). Exceptional detail, insider tips, highly practical for another traveler to replicate.

      Evaluate the following quest data:
      ${compiledTextData}
    `;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text().trim();

        // Parse the AI score, fallback to 0 if NaN
        let logisticsScore = parseInt(responseText, 10);
        if (isNaN(logisticsScore) || logisticsScore < 0) logisticsScore = 0;
        if (logisticsScore > 3) logisticsScore = 3;

        // 3. Finalize Score
        const rawTotalScore = waypointsScore + photosScore + logisticsScore;
        const finalScore = Math.round(rawTotalScore); // Nearest integer 0-5

        // Save to Firestore
        await questRef.update({
            questScore: finalScore,
            scoreDetails: {
                waypoints: waypointsScore,
                photos: photosScore,
                logistics: logisticsScore,
                rawTotal: rawTotalScore,
                evaluatedAt: admin.firestore.FieldValue.serverTimestamp()
            }
        });

        return NextResponse.json({
            success: true,
            score: finalScore,
            details: {
                waypointsScore,
                photosScore,
                logisticsScore,
                rawTotalScore
            }
        });

    } catch (error: any) {
        console.error('Error calculating quest score:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
