// ==========================================
// CONFIGURATION & STATE
// ==========================================
// Replace with a fresh API Key generated from Google AI Studio
const API_KEY = "YOUR_GEMINI_API_KEY_HERE"; 
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

let textChatCount = 0;
const MAX_TEXT_CHATS = 50;

// DOM Element Selectors (Adjust IDs if needed to match your HTML)
const chatInput = document.querySelector('input[type="text"]') || document.getElementById("chat-input");
const sendBtn = document.querySelector('button.bg-amber-500') || document.getElementById("send-btn");
const chatContainer = document.querySelector('.flex-1.overflow-y-auto') || document.getElementById("chat-container");
const counterDisplay = document.getElementById("text-chat-counter");

// ==========================================
// EVENT LISTENERS
// ==========================================
if (sendBtn) {
  sendBtn.addEventListener("click", handleSendMessage);
}

if (chatInput) {
  chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  });
}

// ==========================================
// MAIN HANDLER
// ==========================================
async function handleSendMessage() {
  const userText = chatInput.value.trim();
  if (!userText) return;

  // Clear input and temporarily disable UI
  chatInput.value = "";
  chatInput.disabled = true;

  // 1. Display User Message
  const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  renderUserMessage(userText, currentTime);

  // 2. Display Temporary Loading State
  const loadingId = renderLoadingMessage();
  scrollToBottom();

  // 3. Call Gemini API & Update Interface
  try {
    const aiResponse = await fetchGeminiResponse(userText);
    removeElement(loadingId);
    renderJarvisMessage(aiResponse);

    // Update stats counter
    textChatCount++;
    if (counterDisplay) {
      counterDisplay.textContent = `${textChatCount} / ${MAX_TEXT_CHATS}`;
    }
  } catch (error) {
    removeElement(loadingId);
    renderJarvisMessage(`⚠️ Request Failed: ${error.message}`);
  } finally {
    chatInput.disabled = false;
    chatInput.focus();
    scrollToBottom();
  }
}

// ==========================================
// GEMINI API FETCH
// ==========================================
async function fetchGeminiResponse(promptText) {
  if (!API_KEY || API_KEY === "YOUR_GEMINI_API_KEY_HERE") {
    throw new Error("Invalid API key. Please insert your key from Google AI Studio in the JavaScript file.");
  }

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: promptText }]
        }
      ]
    })
  });

  const data = await response.json();

  // If status is 401, 403, or general error, throw explicit detail
  if (!response.ok) {
    throw new Error(data.error?.message || `Server responded with HTTP ${response.status}`);
  }

  const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!generatedText) {
    throw new Error("Received empty response payload from backend.");
  }

  return generatedText;
}

// ==========================================
// UI RENDERING HELPERS
// ==========================================
function renderUserMessage(text, timestamp) {
  const userWrapper = document.createElement("div");
  userWrapper.className = "flex flex-col items-end mb-4";
  userWrapper.innerHTML = `
    <div class="bg-slate-900 border border-slate-800 rounded-lg p-4 max-w-2xl w-full">
      <div class="flex justify-between items-center mb-2 text-xs text-slate-400">
        <span class="font-bold text-blue-400">👤 You</span>
        <span>${timestamp}</span>
      </div>
      <div class="text-slate-200 text-sm whitespace-pre-wrap">${escapeHTML(text)}</div>
    </div>
  `;
  chatContainer.appendChild(userWrapper);
}

function renderJarvisMessage(text) {
  const jarvisWrapper = document.createElement("div");
  jarvisWrapper.className = "flex flex-col items-start mb-4";
  jarvisWrapper.innerHTML = `
    <div class="bg-slate-950 border border-slate-800 rounded-lg p-4 max-w-2xl w-full">
      <div class="flex items-center gap-2 mb-2 text-xs font-bold text-amber-500">
        <span>🤖 JARVIS AI Response</span>
      </div>
      <div class="text-slate-200 text-sm whitespace-pre-wrap leading-relaxed">${escapeHTML(text)}</div>
      <div class="mt-3 pt-2 border-t border-slate-900 text-[10px] text-slate-500 font-mono">
        JARVIS AI Hub • Created by Abdullah waheed
      </div>
    </div>
  `;
  chatContainer.appendChild(jarvisWrapper);
}

function renderLoadingMessage() {
  const tempId = "loading-" + Date.now();
  const loadingWrapper = document.createElement("div");
  loadingWrapper.id = tempId;
  loadingWrapper.className = "flex flex-col items-start mb-4";
  loadingWrapper.innerHTML = `
    <div class="bg-slate-950 border border-slate-800 rounded-lg p-4 max-w-2xl w-full">
      <div class="flex items-center gap-2 mb-2 text-xs font-bold text-amber-500">
        <span>🤖 JARVIS AI Response</span>
      </div>
      <div class="text-slate-400 text-sm animate-pulse">JARVIS is processing your request...</div>
    </div>
  `;
  chatContainer.appendChild(loadingWrapper);
  return tempId;
}

function removeElement(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

function scrollToBottom() {
  if (chatContainer) {
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }
}

function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}
