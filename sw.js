const functions = require("firebase-functions");
const fetch = require("node-fetch");

// Retrieve API key securely from Firebase environment configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

exports.geminiProxy = functions.https.onCall(async (data, context) => {
  const { contents, systemInstruction } = data;

  // Endpoint for Gemini 2.5 Flash
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
      throw new functions.https.HttpsError(
        "internal",
        responseData.error?.message || "Gemini API request failed"
      );
    }

    return responseData;
  } catch (error) {
    console.error("Proxy execution error:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});
