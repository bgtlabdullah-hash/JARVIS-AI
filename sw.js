const functions = require("firebase-functions");
const fetch = require("node-fetch");

// Hardcoded Permanent API Key
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "const functions = require("firebase-functions");
const fetch = require("node-fetch");

// Hardcoded Permanent API Key
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AQ.Ab8RN6InaFNln-3h208lBZnycnKl4OXkddg6r56A3i1FNl5vAg";

exports.geminiProxy = functions.https.onCall(async (data, context) => {
  const { mode, prompt, systemInstruction, contents } = data;

  // Image Generation Endpoint
  if (mode === "image") {
    const encodedPrompt = encodeURIComponent(prompt || "8k high quality car");
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1280&height=720&nologo=true&seed=${Math.floor(Math.random() * 1000000)}`;
    return { imageUrl };
  }

  // Text Chat Endpoint using your permanent API key
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: systemInstruction,
        contents: contents
      })
    });

    const responseData = await response.json();
    if (!response.ok) {
      throw new functions.https.HttpsError("internal", responseData.error?.message || "API request failed");
    }

    return responseData;
  } catch (error) {
    console.error("Error executing proxy:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});";

exports.geminiProxy = functions.https.onCall(async (data, context) => {
  const { mode, prompt, systemInstruction, contents } = data;

  // Image Generation Endpoint
  if (mode === "image") {
    const encodedPrompt = encodeURIComponent(prompt || "8k high quality car");
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1280&height=720&nologo=true&seed=${Math.floor(Math.random() * 1000000)}`;
    return { imageUrl };
  }

  // Text Chat Endpoint using your permanent API key
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: systemInstruction,
        contents: contents
      })
    });

    const responseData = await response.json();
    if (!response.ok) {
      throw new functions.https.HttpsError("internal", responseData.error?.message || "API request failed");
    }

    return responseData;
  } catch (error) {
    console.error("Error executing proxy:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});
