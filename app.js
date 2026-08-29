// ==========================================
// CONFIGURATION & GLOBAL STATE
// ==========================================
let GEMINI_API_KEY = "AQ.Ab8RN6LeXBpo0edNtbZuGfQDgjsZ5e-t5duxuqe9yulXbVetcw"; 

let currentToolId = 1;
let currentUser = null;
let userTier = 'FREE';
let isVoiceActive = false;
let deferredPrompt = null;

// Global variables for image attachment
let selectedImageBase64 = null;
let selectedImageMimeType = null;

const toolNames = {
  1: 'JARVIS CHAT PRO',
  2: 'ULTRA 8K IMAGE STUDIO',
  3: 'ALL-TYPE VIDEO GENERATOR',
  4: 'SAVED CREATIONS FOLDER',
  5: 'PHOTO & DOCUMENT OCR',
  6: 'PYTHON & CODE WRITER',
  7: 'CODE CRACKER & DEBUGGER',
  8: 'ALL-LANGUAGE TRANSLATOR',
  9: 'VOICE SPEECH SYNTHESIZER',
  10: 'DOCUMENT SUMMARIZER',
  11: 'MATH & LOGIC SOLVER',
  12: 'ESSAY & CONTENT WRITER'
};

const workspacePrompts = {
  1: "You are JARVIS, an advanced AI created by Abdullah Waheed. Provide structured answers.",
  2: "Convert input into detailed photorealistic AI image prompts.",
  3: "Provide cinematic scene prompts for video engines like Sora or Runway.",
  4: "Acknowledge saved assets concisely.",
  5: "Extract, clean, and format text or data from documents and photos.",
  6: "Write clean, production-ready Python and JavaScript code.",
  7: "Identify bugs, security flaws, and syntax errors in code.",
  8: "Translate text accurately preserving local tone.",
  9: "Format scripts optimized for Text-To-Speech engines.",
  10: "Synthesize content into clear summaries and key takeaways.",
  11: "Solve math problems and logic puzzles step-by-step.",
  12: "Write compelling articles and structured essays."
};

// ==========================================
// IMAGE SELECTION & PREVIEW HANDLERS
// ==========================================
function handleImageSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  selectedImageMimeType = file.type;
  const reader = new FileReader();

  reader.onload = function(e) {
    const fullDataUrl = e.target.result;
    // Extract base64 encoded string after comma
    selectedImageBase64 = fullDataUrl.split(',')[1];

    const previewContainer = document.getElementById('imagePreviewContainer');
    if (previewContainer) {
      previewContainer.innerHTML = `
        <div class="relative inline-block border border-amber-500/50 rounded-lg p-1 bg-slate-800">
          <img src="${fullDataUrl}" class="h-12 w-12 object-cover rounded" />
          <button onclick="clearSelectedImage()" class="absolute -top-2 -right-2 bg-red-600 hover:bg-red-700 text-white rounded-full w-5 h-5 text-[10px] flex items-center justify-center shadow">✕</button>
        </div>
        <span class="text-[11px] text-slate-400 font-mono">${file.name} attached</span>
      `;
      previewContainer.classList.remove('hidden');
    }
  };

  reader.readAsDataURL(file);
}

function clearSelectedImage() {
  selectedImageBase64 = null;
  selectedImageMimeType = null;
  const fileInput = document.getElementById('imageInput');
  if (fileInput) fileInput.value = '';

  const previewContainer = document.getElementById('imagePreviewContainer');
  if (previewContainer) {
    previewContainer.innerHTML = '';
    previewContainer.classList.add('hidden');
  }
}

// ==========================================
// INITIALIZATION & TOOL SWITCHING
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
  generateDailyVipKeys();
  updateAdminUptime();
});

function switchToolModule(toolId) {
  currentToolId = toolId;
  const badge = document.getElementById('activeWorkspaceBadge');
  if (badge) badge.innerText = toolNames[toolId] || 'JARVIS HUB';

  for (let i = 1; i <= 12; i++) {
    const btn = document.getElementById(`toolBtn-${i}`);
    if (btn) {
      btn.className = (i === toolId) 
        ? "w-full text-left px-3 py-1.5 rounded bg-amber-500/10 border border-amber-500/40 text-amber-300 flex items-center justify-between text-xs font-semibold hover:bg-amber-500/20 transition"
        : "w-full text-left px-3 py-1.5 rounded hover:bg-slate-800/50 text-slate-300 flex items-center justify-between text-xs transition";
    }
  }
}

// ==========================================
// CORE TASK EXECUTION & GEMINI MULTIMODAL API
// ==========================================
async function executeCurrentWorkspaceTask() {
  const promptInput = document.getElementById('userInputPrompt');
  const query = promptInput?.value.trim();

  // Allow sending if there is either text OR an attached image
  if (!query && !selectedImageBase64) return;

  const container = document.getElementById('toolOutputContainer');
  const thinking = document.getElementById('thinkingIndicator');
  const welcomeCard = document.getElementById('welcomeMessageCard');

  if (welcomeCard) welcomeCard.style.display = 'none';

  // Render User Message Bubble
  const userBubble = document.createElement('div');
  userBubble.className = "bg-slate-800/80 border border-slate-700 rounded-xl p-3 text-xs text-white max-w-xl ml-auto font-sans shadow space-y-2";
  
  let userBubbleHTML = '';
  if (selectedImageBase64) {
    userBubbleHTML += `<img src="data:${selectedImageMimeType};base64,${selectedImageBase64}" class="max-h-48 rounded-lg border border-slate-600 object-contain mb-1" />`;
  }
  if (query) {
    userBubbleHTML += `<div>${query}</div>`;
  }
  userBubble.innerHTML = userBubbleHTML;
  container.appendChild(userBubble);

  // Cache sending payload parts
  const currentImageBase64 = selectedImageBase64;
  const currentImageMimeType = selectedImageMimeType;

  // Clear inputs immediately
  promptInput.value = '';
  clearSelectedImage();

  if (thinking) thinking.classList.remove('hidden');

  // API Key Check
  if (!GEMINI_API_KEY || GEMINI_API_KEY === "YOUR_GEMINI_API_KEY") {
    const userKey = prompt("Please enter your Google Gemini API Key:");
    if (userKey) {
      GEMINI_API_KEY = userKey.trim();
    } else {
      if (thinking) thinking.classList.add('hidden');
      renderErrorBubble("API Key is required to communicate with Gemini AI.");
      return;
    }
  }

  // Construct Gemini Multimodal Payload
  const systemPrompt = workspacePrompts[currentToolId] || workspacePrompts[1];
  const partsPayload = [];

  if (query) {
    partsPayload.push({ text: query });
  }

  if (currentImageBase64) {
    partsPayload.push({
      inline_data: {
        mime_type: currentImageMimeType,
        data: currentImageBase64
      }
    });
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemPrompt }]
        },
        contents: [
          {
            role: "user",
            parts: partsPayload
          }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      const errMsg = data.error?.message || "HTTP Error " + response.status;
      renderErrorBubble(`API Error: ${errMsg}`);
      return;
    }

    const aiResponseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response text generated.";
    renderAiBubble(aiResponseText);
    speakText(aiResponseText);

  } catch (err) {
    renderErrorBubble(`Network Failure: ${err.message}`);
  } finally {
    if (thinking) thinking.classList.add('hidden');
    const workspaceContent = document.getElementById('workspaceContent');
    if (workspaceContent) workspaceContent.scrollTop = workspaceContent.scrollHeight;
  }
}

function renderAiBubble(text) {
  const container = document.getElementById('toolOutputContainer');
  const aiBubble = document.createElement('div');
  aiBubble.className = "bg-slate-900/90 border border-amber-500/30 rounded-xl p-3 text-xs text-slate-200 max-w-2xl font-sans shadow-lg space-y-2";
  
  let formattedText = text
    .replace(/```([\s\S]*?)```/g, '<pre class="bg-black/60 p-2.5 rounded border border-slate-700 font-mono text-[11px] overflow-x-auto text-amber-300">$1</pre>')
    .replace(/\n/g, '<br>');

  aiBubble.innerHTML = `
    <div class="flex items-center justify-between border-b border-slate-800 pb-1.5">
      <div class="font-bold text-amber-400">JARVIS AI (${toolNames[currentToolId]})</div>
      <span class="text-[9px] text-slate-500 font-mono">Gemini 2.5 Flash</span>
    </div>
    <div class="leading-relaxed">${formattedText}</div>
  `;
  container.appendChild(aiBubble);
}

function renderErrorBubble(errorMsg) {
  const container = document.getElementById('toolOutputContainer');
  const errorBubble = document.createElement('div');
  errorBubble.className = "bg-red-950/40 border border-red-500/40 rounded-xl p-3 text-xs text-red-300 max-w-xl font-sans shadow-lg";
  errorBubble.innerHTML = `<strong class="text-red-400">System Alert:</strong> ${errorMsg}`;
  container.appendChild(errorBubble);
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================
function generateDailyVipKeys() {
  const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const baseKey = (str) => 'VIP-' + btoa(str).slice(0, 5).toUpperCase();

  if (document.getElementById('keyDisplay1Day')) document.getElementById('keyDisplay1Day').innerText = baseKey(todayStr + '1D');
  if (document.getElementById('keyDisplay1Week')) document.getElementById('keyDisplay1Week').innerText = baseKey(todayStr + '1W');
}

function updateAdminUptime() {
  const launchDate = new Date('2026-08-24T00:00:00');
  const now = new Date();
  const diffDays = Math.floor((now - launchDate) / (1000 * 60 * 60 * 24));
  const uptimeEl = document.getElementById('adminUptimeDisplay');
  if (uptimeEl) uptimeEl.innerText = `Active for ${diffDays >= 0 ? diffDays : 0} days`;
}

function triggerVoiceInput() {
  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.onresult = (e) => {
      document.getElementById('userInputPrompt').value = e.results[0][0].transcript;
    };
    recognition.start();
  }
}

function speakText(text) {
  if (!isVoiceActive || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text.replace(/<[^>]*>?/gm, ''));
  window.speechSynthesis.speak(utterance);
}
