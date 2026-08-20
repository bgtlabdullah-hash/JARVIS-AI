const functions = require("firebase-functions");
const fetch = require("node-fetch");

// Securely store the key in Firebase environment config
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

exports.geminiProxy = functions.https.onCall(async (data, context) => {
  // Require user authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be logged in to access KING AI PRO."
    );
  }

  const { contents, systemInstruction } = data;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

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
});
