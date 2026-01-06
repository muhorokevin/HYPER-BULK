
import { GoogleGenAI, Type } from "@google/genai";
import { Meal, UserProfile, WorkoutSession } from "../types.ts";

const safeJsonParse = (text: string) => {
  try {
    const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("JSON Parsing Error. Raw Text:", text);
    throw new Error("Invalid neural data received.");
  }
};

export const suggestRoutes = async (lat: number, lng: number) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Find popular running routes and trails near coordinates ${lat}, ${lng}. Provide a list of names and approximate distances.`,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  return {
    text: response.text || "No route telemetry found.",
    sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
  };
};

export const findLocalGyms = async (lat: number, lng: number) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: `Find high-rated gyms with fair pricing near the location ${lat}, ${lng}. List the top 3 with their specific names and why they are recommended.`,
    config: {
      tools: [{ googleMaps: {} }],
      toolConfig: {
        retrievalConfig: {
          latLng: {
            latitude: lat,
            longitude: lng
          }
        }
      }
    },
  });

  return {
    text: response.text || "No local centers identified.",
    sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
  };
};

export const generatePersonalizedWorkout = async (profile: UserProfile, intent: string, environment: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const equipment = profile.availableEquipment?.join(', ') || 'None (Bodyweight only)';
  const prompt = `Generate a tactical workout plan for a pilot focused on bulking. 
    Pilot: ${profile.displayName}
    Current Weight: ${profile.weight}kg
    Goal: ${profile.goalType}
    Environment: ${environment}
    Available Equipment: ${equipment}
    Preferred Gym/Location context: ${profile.preferredGym || 'Not specified'}
    User Intent: ${intent}
    
    Focus on compound movements and progressive overload for muscle hypertrophy.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          exercises: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                sets: { type: Type.NUMBER },
                reps: { type: Type.STRING },
                weight: { type: Type.STRING },
                reason: { type: Type.STRING, description: "Why this is optimal for this gear" }
              },
              required: ["name", "sets", "reps", "weight"]
            }
          }
        },
        required: ["title", "exercises"]
      },
    },
  });

  if (!response.text) throw new Error("Neural session blank.");
  return safeJsonParse(response.text);
};

export const analyzeFuelVariance = async (planned: Meal[], actual: Meal[], profile: UserProfile) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const planSum = planned.reduce((acc, m) => ({ c: acc.c + (Number(m.calories) || 0), p: acc.p + (Number(m.protein) || 0) }), { c: 0, p: 0 });
  const actualSum = actual.reduce((acc, m) => ({ c: acc.c + (Number(m.calories) || 0), p: acc.p + (Number(m.protein) || 0) }), { c: 0, p: 0 });

  const prompt = `Perform a Fuel Variance Analysis.
    Planned Intake: ${planSum.c}kcal, ${planSum.p}g protein.
    Actual Intake: ${actualSum.c}kcal, ${actualSum.p}g protein.
    Goal: Bulking (Mass Gain).
    Compare these datasets and provide a tactical verdict on adherence for muscle growth.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          verdict: { type: Type.STRING },
          adherenceScore: { type: Type.NUMBER },
          correctiveAction: { type: Type.STRING }
        },
        required: ["verdict", "adherenceScore", "correctiveAction"]
      }
    }
  });
  if (!response.text) throw new Error("Empty analysis.");
  return safeJsonParse(response.text);
};

export const estimateActivityBurn = async (type: string, distance: number, duration: number, profile: UserProfile) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Estimate calories burned for a ${profile.weight}kg individual performing a ${type} mission. Distance: ${distance} meters. Duration: ${duration} seconds.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          calories: { type: Type.NUMBER },
          intensityLevel: { type: Type.STRING },
          recoveryNote: { type: Type.STRING }
        },
        required: ["calories", "intensityLevel", "recoveryNote"]
      }
    }
  });
  const data = safeJsonParse(response.text || '{}');
  return {
    ...data,
    calories: Number(data.calories) || 0
  };
};

export const generatePeriodReview = async (
  profile: UserProfile, 
  meals: Meal[], 
  workouts: WorkoutSession[], 
  periodType: 'week' | 'month'
) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const totalCals = meals.reduce((s, m) => s + (Number(m.calories) || 0), 0);
  const prompt = `Perform a high-level tactical review for a ${periodType}ly period. Pilot: ${profile.displayName}, Focus: Aggressive Bulking. Total: ${totalCals}kcal. Assess muscle building potential.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          periodSummary: { type: Type.STRING },
          grade: { type: Type.STRING },
          strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
          weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
          tacticalImprovements: { type: Type.ARRAY, items: { type: Type.STRING } },
          closingDirective: { type: Type.STRING }
        },
        required: ["periodSummary", "grade", "strengths", "weaknesses", "tacticalImprovements", "closingDirective"]
      }
    }
  });

  if (!response.text) throw new Error("Review text blank.");
  return safeJsonParse(response.text);
};

export const generateAudioBriefing = async (profile: UserProfile, meals: Meal[], workouts: WorkoutSession[]) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const totalCal = meals.reduce((s, m) => s + (Number(m.calories) || 0), 0);
  
  // Simplify prompt to minimize potential 500 errors from complex instructions in TTS
  const prompt = `Briefing for Pilot ${profile.displayName}. Current fuel levels: ${totalCal} calories today. Target: Maximum Muscle Hypertrophy. Operational Status: Aggressive Bulking Phase. Proceed with heavy lifting.`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      // Use string literal to ensure compatibility
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: {
          // Switching to Kore as a fallback to see if voice 'Puck' causes the 500
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  });

  const base64Data = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Data) {
    throw new Error("No audio data returned from neural link.");
  }
  return base64Data;
};

export const calculateMacroTargets = async (profile: Partial<UserProfile>) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Calculate calorie and protein goals for Weight: ${profile.weight}kg, Goal: BULK (Maximum Muscle Gain). Provide aggressive but safe numbers.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          calories: { type: Type.NUMBER },
          protein: { type: Type.NUMBER },
          reasoning: { type: Type.STRING }
        },
        required: ["calories", "protein", "reasoning"]
      },
    },
  });

  if (!response.text) throw new Error("Blank calc.");
  const data = safeJsonParse(response.text);
  return {
    ...data,
    calories: Number(data.calories) || 0,
    protein: Number(data.protein) || 0
  };
};

export const estimateMealMacros = async (mealDescription: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Analyze macros for a bulking athlete: "${mealDescription}". Focus on identifying calorie-dense ingredients.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          calories: { type: Type.NUMBER },
          protein: { type: Type.NUMBER },
          carbs: { type: Type.NUMBER },
          fats: { type: Type.NUMBER },
          bulkingNote: { type: Type.STRING, description: "How this specifically helps with mass gain." }
        },
        required: ["name", "calories", "protein", "carbs", "fats", "bulkingNote"]
      },
    },
  });

  if (!response.text) throw new Error("Empty meal response.");
  const data = safeJsonParse(response.text);
  return {
    ...data,
    calories: Number(data.calories) || 0,
    protein: Number(data.protein) || 0,
    carbs: Number(data.carbs) || 0,
    fats: Number(data.fats) || 0
  };
};

export const estimateMacrosFromImage = async (base64Data: string, mimeType: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        { inlineData: { data: base64Data, mimeType } },
        { text: "Identify the food in this image and estimate the calories, protein, carbs, and fats for someone on a serious bulking phase. Return JSON. Be generous with portion estimates for mass gain." }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          calories: { type: Type.NUMBER },
          protein: { type: Type.NUMBER },
          carbs: { type: Type.NUMBER },
          fats: { type: Type.NUMBER },
          bulkingNote: { type: Type.STRING, description: "A tactical note on why this is good for bulking." }
        },
        required: ["name", "calories", "protein", "carbs", "fats", "bulkingNote"]
      },
    },
  });

  if (!response.text) throw new Error("Neural visual session blank.");
  const data = safeJsonParse(response.text);
  return {
    ...data,
    calories: Number(data.calories) || 0,
    protein: Number(data.protein) || 0,
    carbs: Number(data.carbs) || 0,
    fats: Number(data.fats) || 0
  };
};

export const suggestSchedule = async (currentSchedule: string, goals: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Optimize this schedule for someone bulking: "${goals}". Current: "${currentSchedule}". Focus on meal timing and sleep for maximum anabolism.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            time: { type: Type.STRING },
            activity: { type: Type.STRING },
            type: { type: Type.STRING }
          },
          required: ["time", "activity", "type"]
        }
      },
    },
  });

  if (!response.text) throw new Error("Blank schedule.");
  return safeJsonParse(response.text);
};
