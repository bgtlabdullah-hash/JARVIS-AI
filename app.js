// ==========================================
// CONFIGURATION & GLOBAL STATE
// ==========================================
// Replace with your Google AI Studio API Key (https://aistudio.google.com/)
let GEMINI_API_KEY = "AQ.Ab8RN6LeXBpo0edNtbZuGfQDgjsZ5e-t5duxuqe9yulXbVetcw"; 

let currentToolId = 1;
let currentUser = null;
let userTier = 'FREE'; // 'FREE' or 'VIP'
let isVoiceActive = false;
let deferredPrompt = null;

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

// System instruction behaviors based on active workspace folder
const workspacePrompts = {
  1: "You are JARVIS, an advanced, highly intelligent AI assistant created by Abdullah Waheed. Provide clear, accurate, and structured answers.",
  2: "You are an expert Image Generation Specialist. Convert user text inputs into highly detailed, 8K hyper-realistic photorealistic AI image generation prompts.",
  3: "You are an AI Video Director. Provide structured scene-by-scene prompts and cinematic visual camera movements for AI video generators like Sora or Runway.",
  4: "You are managing the user's saved gallery assets. Acknowledge saved creations concisely.",
  5: "You are an OCR and Document Parsing Assistant. Extract, clean, and format all text, structured tables, or data from raw photo/document inputs.",
  6: "You are an expert Senior Python & Full-Stack Code Writer. Provide production-ready, clean, modular code with comments and structural explanations.",
  7: "You are a Code Cracker & Debugger. Identify bugs, syntax errors, security flaws, and performance bottlenecks in code snippets, and provide fixed code.",
  8: "You are a professional Multilingual Translator. Translate text accurately while preserving local nuance, context, and tone.",
  9: "You are a Speech Synthesizer Assistant. Format responses into natural-sounding spoken dialogue script suitable for Text-To-Speech (TTS) engines.",
  10: "You are a Executive Document Summarizer. Synthesize texts into clear executive summaries, bullet points, key takeaways, and action items.",
  11: "You are a Mathematics & Logic Solver. Solve math problems, equations, and logic puzzles step-by-step showing full derivation.",
  12: "You are an Essay & Content Writer. Craft compelling, well-structured articles, essays, and written content tailored to the requested length and style."
};

// ==========================================
// INITIALIZATION & EVENT LISTENERS
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
  generateDailyVipKeys();
  updateAdminUptime();
});

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const pwaBtn = document.getElementById('pwaInstallBtn');
  if (pwaBtn) pwaBtn.classList.remove('hidden');
});

// ==========================================
// SIDEBAR & WORKSPACE NAVIGATION
// ==========================================
function toggleSidebarDrawer() {
  const sidebar = document.getElementById('sidebar');
  if (sidebar) sidebar.classList.toggle('collapsed');
}

function switchToolModule(toolId) {
  currentToolId = toolId;
  const badge = document.getElementById('activeWorkspaceBadge');
  if (badge) badge.innerText = toolNames[toolId] || 'JARVIS HUB';

  // Highlight selected button
  for (let i = 1; i <= 12; i++) {
    const btn = document.getElementById(`toolBtn-${i}`);
    if (btn) {
      if (i === toolId) {
        btn.className = "w-full text-left px-3 py-1.5 rounded bg-amber-500/10 border border-amber-500/40 text-amber-300 flex items-center justify-between text-xs font-semibold hover:bg-amber-500/20 transition";
      } else {
        btn.className = "w-full text-left px-3 py-1.5 rounded hover:bg-slate-800/50 text-slate-300 flex items-center justify-between text-xs transition";
      }
    }
  }
}

function startNewChatFolder() {
  if (!currentUser) {
    openAuthModal();
    return;
  }
  const container = document.getElementById('historyListContainer');
  if (!container) return;
  
  const div = document.createElement('div');
  div.className = "p-2 bg-slate-900 border border-slate-800 rounded text-slate-300 flex items-center justify-between cursor-pointer hover:border-amber-500/40 transition";
  div.innerHTML = `<span class="truncate">📁 Chat Folder ${Date.now().toString().slice(-4)}</span><i class="fa-solid fa-chevron-right text-[10px] text-slate-500"></i>`;
  
  const emptyState = container.querySelector('.italic');
  if (emptyState) emptyState.remove();
  
  container.prepend(div);
}

// ==========================================
// AUTHENTICATION MODALS & USER SESSIONS
// ==========================================
function openAuthModal() {
  document.getElementById('authModal')?.classList.remove('hidden');
}

function closeAuthModal() {
  document.getElementById('authModal')?.classList.add('hidden');
}

function openGoogleAccountChooser() {
  closeAuthModal();
  document.getElementById('googleChooserModal')?.classList.remove('hidden');
}

function closeGoogleChooser() {
  document.getElementById('googleChooserModal')?.classList.add('hidden');
}

function selectGoogleAccount(name, email) {
  currentUser = { name, email };
  const nameEl = document.getElementById('userDisplayName');
  const dotEl = document.getElementById('sessionStatusDot');
  const authBtn = document.getElementById('authBtn');

  if (nameEl) nameEl.innerText = name;
  if (dotEl) dotEl.className = 'w-2.5 h-2.5 rounded-full bg-emerald-400';
  if (authBtn) {
    authBtn.innerText = 'Sign Out';
    authBtn.onclick = logoutUser;
  }
  closeGoogleChooser();
}

function promptCustomGoogleAccount() {
  const email = prompt('Enter your Google email address:');
  if (email && email.includes('@')) {
    selectGoogleAccount(email.split('@')[0], email);
  }
}

function logoutUser() {
  currentUser = null;
  const nameEl = document.getElementById('userDisplayName');
  const dotEl = document.getElementById('sessionStatusDot');
  const authBtn = document.getElementById('authBtn');

  if (nameEl) nameEl.innerText = 'Guest Session';
  if (dotEl) dotEl.className = 'w-2.5 h-2.5 rounded-full bg-slate-500';
  if (authBtn) {
    authBtn.innerText = 'Sign In / Register';
    authBtn.onclick = openAuthModal;
  }
}

function simulateAppleSignIn() {
  selectGoogleAccount('Apple User', 'user@icloud.com');
  closeAuthModal();
}

function showPhoneAuthForm() {
  closeAuthModal();
  document.getElementById('phoneOtpModal')?.classList.remove('hidden');
}

function closePhoneModal() {
  document.getElementById('phoneOtpModal')?.classList.add('hidden');
}

function verifyPhoneOtp() {
  const phone = document.getElementById('phoneNumInput')?.value || '+923000000000';
  const otp = document.getElementById('phoneOtpInput')?.value;
  if (otp && otp.length >= 4) {
    selectGoogleAccount(`Phone User (${phone.slice(-4)})`, phone);
    closePhoneModal();
  } else {
    alert('Please enter a valid 4-digit security code.');
  }
}

function handleEmailAuth(e) {
  e.preventDefault();
  const email = document.getElementById('authEmailInput')?.value;
  if (email) {
    selectGoogleAccount(email.split('@')[0], email);
    closeAuthModal();
  }
}

// ==========================================
// VIP PASS & PAYMENTS
// ==========================================
function openVipCodeModal(tier, title, price) {
  const titleEl = document.getElementById('vipModalTitle');
  if (titleEl) titleEl.innerText = `${title} (${price} PKR)`;
  document.getElementById('vipActivationModal')?.classList.remove('hidden');
}

function closeVipModal() {
  document.getElementById('vipActivationModal')?.classList.add('hidden');
}

function verifyEnteredVipCode() {
  const inputEl = document.getElementById('vipCodeInputField');
  const code = inputEl?.value.trim().toUpperCase();
  
  if (code && (code.startsWith('VIP-') || code === 'PRO2026')) {
    userTier = 'VIP';
    const tierBadge = document.getElementById('tierBadge');
    if (tierBadge) {
      tierBadge.innerText = 'VIP TIER';
      tierBadge.className = 'text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded font-mono font-bold uppercase';
    }
    alert('VIP Pass Activated Successfully!');
    closeVipModal();
  } else {
    alert('Invalid activation key. Check the Admin Panel for active dynamic keys.');
  }
}

function redirectToSafepayPayment() {
  window.open('https://www.getsafepay.com/', '_blank');
}

// ==========================================
// ADMIN PANEL CONTROL & SECURITY
// ==========================================
function promptAdminAccess() {
  const pwd = prompt('Enter Admin Access Code:');
  if (pwd === 'admin123' || pwd === 'abdullah') {
    document.getElementById('adminPanelModal')?.classList.remove('hidden');
    updateAdminUptime();
  } else if (pwd !== null) {
    alert('Access Denied: Invalid Security Password.');
  }
}

function closeAdminModal() {
  document.getElementById('adminPanelModal')?.classList.add('hidden');
}

function updateAdminUptime() {
  const launchDate = new Date('2026-08-24T00:00:00');
  const now = new Date();
  const diffDays = Math.floor((now - launchDate) / (1000 * 60 * 60 * 24));
  const uptimeEl = document.getElementById('adminUptimeDisplay');
  if (uptimeEl) uptimeEl.innerText = `Active for ${diffDays >= 0 ? diffDays : 0} days`;
}

function generateDailyVipKeys() {
  const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const baseKey = (str) => 'VIP-' + btoa(str).slice(0, 5).toUpperCase();

  if (document.getElementById('keyDisplay1Day')) document.getElementById('keyDisplay1Day').innerText = baseKey(todayStr + '1D');
  if (document.getElementById('keyDisplay1Week')) document.getElementById('keyDisplay1Week').innerText = baseKey(todayStr + '1W');
  if (document.getElementById('keyDisplay1Month')) document.getElementById('keyDisplay1Month').innerText = baseKey(todayStr + '1M');
  if (document.getElementById('keyDisplay1Year')) document.getElementById('keyDisplay1Year').innerText = baseKey(todayStr + '1Y');
}

// ==========================================
// VOICE ENGINE (STT & TTS)
// ==========================================
function toggleVoiceSystem() {
  isVoiceActive = !isVoiceActive;
  const indicator = document.getElementById('voicePulseIndicator');
  if (indicator) {
    if (isVoiceActive) {
      indicator.className = 'w-2 h-2 rounded-full bg-emerald-400 animate-ping';
      alert('Voice Direct Speech Output Enabled!');
    } else {
      indicator.className = 'w-2 h-2 rounded-full bg-cyan-400 animate-pulse';
    }
  }
}

function triggerVoiceInput() {
  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    
    recognition.onstart = () => {
      const input = document.getElementById('userInputPrompt');
      if (input) input.placeholder = "Listening... Speak now...";
    };
    
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      const input = document.getElementById('userInputPrompt');
      if (input) {
        input.value = transcript;
        input.placeholder = "Type your query to JARVIS...";
      }
    };

    recognition.onerror = () => {
      const input = document.getElementById('userInputPrompt');
      if (input) input.placeholder = "Speech recognition error. Try typing.";
    };

    recognition.start();
  } else {
    alert('Voice recognition is not supported by your browser.');
  }
}

function speakText(text) {
  if (!isVoiceActive || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const cleanText = text.replace(/<[^>]*>?/gm, ''); // Remove HTML tags
  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  window.speechSynthesis.speak(utterance);
}

// ==========================================
// CORE AI INTEGRATION (GEMINI API FETCH)
// ==========================================
async function executeCurrentWorkspaceTask() {
  const promptInput = document.getElementById('userInputPrompt');
  const query = promptInput?.value.trim();
  if (!query) return;

  const container = document.getElementById('toolOutputContainer');
  const thinking = document.getElementById('thinkingIndicator');
  const welcomeCard = document.getElementById('welcomeMessageCard');

  if (welcomeCard) welcomeCard.style.display = 'none';

  // Render User Message Bubble
  const userBubble = document.createElement('div');
  userBubble.className = "bg-slate-800/80 border border-slate-700 rounded-xl p-3 text-xs text-white max-w-xl ml-auto font-sans shadow";
  userBubble.innerText = query;
  container.appendChild(userBubble);

  promptInput.value = '';
  if (thinking) thinking.classList.remove('hidden');

  // Prompt for key if missing
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

  const systemPrompt = workspacePrompts[currentToolId] || workspacePrompts[1];
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
            parts: [{ text: query }]
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
  
  // Format basic linebreaks and code blocks
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
// PWA INSTALLATION TRIGGER
// ==========================================
function installPWAApp() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(() => {
      deferredPrompt = null;
      document.getElementById('pwaInstallBtn')?.classList.add('hidden');
    });
  }
}
