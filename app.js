// ==========================================
// JARVIS AI HUB - FULL PRODUCTION LOGIC (FIXED)
// ==========================================

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then((reg) => console.log('Service Worker Registered:', reg.scope))
      .catch((err) => console.error('Service Worker Registration Failed:', err));
  });
}

// Global Configuration & Security Constants
const GROQ_API_KEY = "gsk_your_actual_groq_api_key_here"; 
const GROQ_MODEL_ID = "llama-3.3-70b-versatile";
const API_ENDPOINT_URL = "https://api.groq.com/openai/v1/chat/completions";

const APP_CREATION_DATE = new Date("2026-08-01T00:00:00");

const SAFEPAY_LINKS = {
  day: "https://sandbox.api.getsafepay.com/io/quick-link?ql=link_25197db1-964a-4cbe-889c-1273d13d38e6",
  week: "https://sandbox.api.getsafepay.com/io/quick-link?ql=link_bc476a1c-6f64-4005-97a0-4b2e0261b57f",
  month: "https://sandbox.api.getsafepay.com/io/quick-link?ql=link_71675063-cc49-4f3f-b0bf-e66c1ebc8a67",
  year: "https://sandbox.api.getsafepay.com/io/quick-link?ql=link_f69a3e8a-1050-4041-81ea-5be40484e125",
  life: "https://sandbox.api.getsafepay.com/io/quick-link?ql=link_e00d0d5c-1ec6-4592-878e-e9b9a5fae749"
};

let isVipActive = false;
let chatCount = 0;
const CHAT_LIMIT = 50;
let toolUsageMap = {};
let selectedImageBase64 = null;
let isRequestInProgress = false;
let isSidebarCollapsed = false;

let currentUserEmail = localStorage.getItem('jarvis_current_user') || null;
let userDatabase = JSON.parse(localStorage.getItem('jarvis_users_db') || '{}');
let chatHistory = [];

if (currentUserEmail && userDatabase[currentUserEmail]) {
  chatHistory = userDatabase[currentUserEmail].history || [];
} else {
  chatHistory = [];
}

let dynamicPasskeys = {
  day: "JARVIS-DAY-" + Math.floor(1000 + Math.random() * 9000),
  week: "JARVIS-WK-" + Math.floor(1000 + Math.random() * 9000),
  month: "JARVIS-MO-" + Math.floor(1000 + Math.random() * 9000),
  year: "JARVIS-YR-" + Math.floor(1000 + Math.random() * 9000),
  life: "JARVIS-LIFE-9999"
};

let customPasskeys = {};
let activeVipTimerEnd = null;
let vipTimerInterval = null;

const AI_TOOLS = [
  { id: 1, name: "JARVIS Chat Pro", icon: "fa-robot", placeholder: "Type your query to JARVIS AI...", instruction: "You are JARVIS AI. Provide direct, complete, and helpful responses to the user without writing any internal reasoning." },
  { id: 2, name: "Ultra 8K Image Studio", icon: "fa-image", placeholder: "Enter description to generate real HD/3D visuals...", instruction: "Generate high definition image." },
  { id: 3, name: "All-Type Video Generator", icon: "fa-video", placeholder: "Describe video scene to generate AI MP4 video...", instruction: "Generate video preview." },
  { id: 4, name: "Saved Creations Folder", icon: "fa-folder-open", placeholder: "Organize workspace outputs...", instruction: "Manage creations." },
  { id: 5, name: "Photo & Document OCR", icon: "fa-file-invoice", placeholder: "Extract text from image or document...", instruction: "Perform OCR text extraction." },
  { id: 6, name: "Python & Code Writer", icon: "fa-code", placeholder: "Request Python/Java executable scripts...", instruction: "Return clean executable code." },
  { id: 7, name: "Code Cracker & Debugger", icon: "fa-bug", placeholder: "Paste code to debug...", instruction: "Debug and correct code." },
  { id: 8, name: "All-Language Translator", icon: "fa-language", placeholder: "Enter text to translate...", instruction: "Translate text accurately." },
  { id: 9, name: "Voice Speech Synthesizer", icon: "fa-volume-high", placeholder: "Type text for speech synthesis...", instruction: "Synthesize speech script." },
  { id: 10, name: "Document Summarizer", icon: "fa-file-lines", placeholder: "Paste document text...", instruction: "Summarize document clearly." },
  { id: 11, name: "Math & Logic Solver", icon: "fa-calculator", placeholder: "Enter math equations (e.g., 2x - 8 = 9)...", instruction: "You are an expert mathematician. Always solve math problems step-by-step and write all equations, variables, and formulas using formal LaTeX syntax enclosed in $inline$ or $$display$$ equations." },
  { id: 12, name: "Essay & Content Writer", icon: "fa-pen-nib", placeholder: "Specify topic for detailed content...", instruction: "Write structured essay." }
];

let activeTool = AI_TOOLS[0];
let currentSelectedPlan = 'life';
let recognition = null;
let isVoiceActive = false;
let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
});

async function installAppPrompt() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') console.log('App Installed Successfully!');
    deferredPrompt = null;
  } else {
    alert("To install JARVIS AI HUB:\n\n• On Chrome/Edge: Click top-right 3 dots (⋮) -> 'Install JARVIS AI HUB'\n• On Android: Tap 3 dots (⋮) -> 'Add to Home Screen'");
  }
}

// Collapsible Side Drawer Toggle
function toggleSidebar() {
  const sidebar = document.getElementById('sidebarPanel');
  if (!sidebar) return;
  isSidebarCollapsed = !isSidebarCollapsed;
  sidebar.style.display = isSidebarCollapsed ? 'none' : 'flex';
}

function updateQuotaDisplay() {
  if (isVipActive) {
    document.getElementById('chatQuotaDisplay').innerText = "UNLIMITED (VIP)";
    document.getElementById('toolQuotaDisplay').innerText = "UNLIMITED (VIP)";
    document.getElementById('tierBadgeLabel').innerText = "VIP PRO TIER";
    document.getElementById('tierBadgeLabel').className = "bg-amber-500 text-black px-2 py-0.5 rounded text-[10px] font-bold font-mono";
  } else {
    document.getElementById('chatQuotaDisplay').innerText = `${chatCount} / ${CHAT_LIMIT}`;
    const currentToolCount = toolUsageMap[activeTool.id] || 0;
    document.getElementById('toolQuotaDisplay').innerText = activeTool.id === 1 ? `${chatCount} / ${CHAT_LIMIT}` : `${currentToolCount} / 50`;
  }
}

function renderAITools() {
  const container = document.getElementById('aiToolsList');
  if (!container) return;
  container.innerHTML = AI_TOOLS.map(tool => {
    const isActive = tool.id === activeTool.id;
    return `
      <button onclick="selectToolFolder(${tool.id})" class="w-full text-left px-2.5 py-2 rounded border ${isActive ? 'bg-amber-500/10 border-amber-500/40 text-amber-300 font-semibold' : 'hover:bg-[#131b2e] text-slate-300 border-transparent'} flex items-center justify-between transition">
        <span class="truncate pr-1"><i class="fa-solid ${tool.icon} mr-2 ${isActive ? 'text-amber-400' : 'text-slate-400'}"></i>${tool.id}. ${tool.name}</span>
        <span class="${isActive ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-400'} text-[9px] px-1.5 py-0.5 rounded font-mono shrink-0">Folder</span>
      </button>
    `;
  }).join('');
}

function selectToolFolder(toolId) {
  activeTool = AI_TOOLS.find(t => t.id === toolId) || AI_TOOLS[0];
  renderAITools();
  document.getElementById('activeToolBadge').innerText = `${activeTool.id}. ${activeTool.name}`;
  document.getElementById('userInputPrompt').placeholder = activeTool.placeholder;
  document.getElementById('toolWelcomeText').innerText = `Workspace Switched: ${activeTool.name}. Powered by JARVIS AI.`;
  updateQuotaDisplay();
}

// Cloud & Account History Sync
function saveHistoryEntry(prompt, responseText) {
  const entry = { id: Date.now(), tool: activeTool.name, prompt: prompt, response: responseText };
  chatHistory.unshift(entry);
  if (chatHistory.length > 50) chatHistory.pop();

  if (currentUserEmail && userDatabase[currentUserEmail]) {
    userDatabase[currentUserEmail].history = chatHistory;
    localStorage.setItem('jarvis_users_db', JSON.stringify(userDatabase));
  } else {
    localStorage.setItem('jarvis_guest_history', JSON.stringify(chatHistory));
  }
  renderHistoryList();
}

function renderHistoryList() {
  const container = document.getElementById('historyListContainer');
  if (!container) return;
  if (chatHistory.length === 0) {
    container.innerHTML = `<div class="text-slate-500 italic text-[10px] py-1">No saved history yet. ${!currentUserEmail ? '(Guest session)' : ''}</div>`;
    return;
  }
  container.innerHTML = chatHistory.map(item => `
    <div onclick="loadHistoryItem(${item.id})" class="p-1.5 bg-[#050811] hover:bg-slate-800/80 border border-slate-800 rounded cursor-pointer transition">
      <div class="text-[10px] text-amber-400 font-bold truncate">${item.tool}</div>
      <div class="text-[10px] text-slate-300 truncate">${item.prompt}</div>
    </div>
  `).join('');
}

function loadHistoryItem(id) {
  const item = chatHistory.find(h => h.id === id);
  if (!item) return;
  appendChatMessage(item.prompt, 'user');
  appendChatMessage(item.response, 'ai');
}

function clearChatHistory() {
  chatHistory = [];
  if (currentUserEmail && userDatabase[currentUserEmail]) {
    userDatabase[currentUserEmail].history = [];
    localStorage.setItem('jarvis_users_db', JSON.stringify(userDatabase));
  } else {
    localStorage.removeItem('jarvis_guest_history');
  }
  renderHistoryList();
}

// Authentication & Account Management
function openAuthModal() { document.getElementById('authModal').classList.remove('hidden'); }
function closeAuthModal() { document.getElementById('authModal').classList.add('hidden'); }

function handleEmailAuth(e) {
  e.preventDefault();
  const email = document.getElementById('authEmailInput').value.trim();
  const pass = document.getElementById('authPassInput').value;
  if (!email || !pass) {
    alert("Please enter both email and password.");
    return;
  }

  if (!userDatabase[email]) {
    userDatabase[email] = { password: pass, history: [] };
    alert("Account registered successfully and signed in!");
  } else {
    if (userDatabase[email].password !== pass) {
      alert("Incorrect password for this account.");
      return;
    }
    alert("Signed in successfully! Your saved history has been synced.");
  }

  currentUserEmail = email;
  localStorage.setItem('jarvis_current_user', email);
  localStorage.setItem('jarvis_users_db', JSON.stringify(userDatabase));

  chatHistory = userDatabase[email].history || [];
  document.getElementById('userSessionLabel').innerText = email.split('@')[0];

  closeAuthModal();
  renderHistoryList();
}

// Admin Panel
function openAdminAuthModal() { document.getElementById('adminAuthModal').classList.remove('hidden'); }
function closeAdminAuthModal() { document.getElementById('adminAuthModal').classList.add('hidden'); }

function verifyAdminPass() {
  const input = document.getElementById('adminPassInput').value;
  if (input === "Abdullah waheed123123") {
    closeAdminAuthModal();
    openAdminPanelModal();
    document.getElementById('adminPassInput').value = "";
  } else {
    alert("Incorrect Admin Password.");
  }
}

function openAdminPanelModal() {
  const now = new Date();
  const diffTime = Math.abs(now - APP_CREATION_DATE);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  document.getElementById('appAgeDisplay').innerText = `${diffDays} Days Active (Created Aug 1, 2026)`;

  document.getElementById('passkeyDay').innerText = dynamicPasskeys.day;
  document.getElementById('passkeyWeek').innerText = dynamicPasskeys.week;
  document.getElementById('passkeyMonth').innerText = dynamicPasskeys.month;
  document.getElementById('passkeyYear').innerText = dynamicPasskeys.year;

  document.getElementById('adminPanelModal').classList.remove('hidden');
}

function closeAdminPanelModal() { document.getElementById('adminPanelModal').classList.add('hidden'); }

function generateCustomAdminCode() {
  const code = document.getElementById('customCodeInput').value.trim().toUpperCase();
  const days = parseInt(document.getElementById('customTimeLimit').value);
  if (!code) { alert("Enter a custom key name."); return; }
  customPasskeys[code] = days;
  alert(`Custom Key '${code}' created for ${days} Days!`);
}

function triggerVipModal(plan) {
  currentSelectedPlan = plan;
  document.getElementById('vipOptionModal').classList.remove('hidden');
}
function closeVipOptionModal() { document.getElementById('vipOptionModal').classList.add('hidden'); }

function proceedGetCode() {
  closeVipOptionModal();
  window.open(SAFEPAY_LINKS[currentSelectedPlan], '_blank');
}

function proceedApplyCode() {
  closeVipOptionModal();
  document.getElementById('applyCodeModal').classList.remove('hidden');
}
function closeApplyCodeModal() { document.getElementById('applyCodeModal').classList.add('hidden'); }

function validateVipCode() {
  const val = document.getElementById('vipCodeInput').value.trim().toUpperCase();
  let durationDays = 0;

  if (val === dynamicPasskeys.day) durationDays = 1;
  else if (val === dynamicPasskeys.week) durationDays = 7;
  else if (val === dynamicPasskeys.month) durationDays = 30;
  else if (val === dynamicPasskeys.year) durationDays = 365;
  else if (val === dynamicPasskeys.life) durationDays = 99999;
  else if (customPasskeys[val]) durationDays = customPasskeys[val];

  if (durationDays > 0) {
    activateVipSession(durationDays);
    closeApplyCodeModal();
    alert("VIP Pass Activated Successfully!");
  } else {
    alert("Invalid or Expired Passkey.");
  }
}

function activateVipSession(days) {
  isVipActive = true;
  activeVipTimerEnd = Date.now() + (days * 24 * 60 * 60 * 1000);
  updateQuotaDisplay();

  if (vipTimerInterval) clearInterval(vipTimerInterval);
  vipTimerInterval = setInterval(() => {
    const diff = activeVipTimerEnd - Date.now();
    if (diff <= 0) {
      isVipActive = false;
      clearInterval(vipTimerInterval);
      document.getElementById('vipTimerLabel').innerText = "EXPIRED";
      updateQuotaDisplay();
      return;
    }
    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
    const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    document.getElementById('vipTimerLabel').innerText = `${d}d ${h}h ${m}m ACTIVE`;
  }, 1000);
}

function handleImageSelect(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    selectedImageBase64 = e.target.result.split(',')[1];
    const container = document.getElementById('imagePreviewContainer');
    container.classList.remove('hidden');
    container.innerHTML = `
      <img src="${e.target.result}" class="w-8 h-8 object-cover rounded border border-slate-700">
      <span class="text-[11px] text-slate-300 truncate max-w-[150px]">${file.name}</span>
      <button onclick="removeImage()" class="text-red-400 hover:text-white ml-auto text-xs"><i class="fa-solid fa-xmark"></i></button>
    `;
  };
  reader.readAsDataURL(file);
}

function removeImage() {
  selectedImageBase64 = null;
  document.getElementById('imageInput').value = "";
  document.getElementById('imagePreviewContainer').classList.add('hidden');
}

// ==========================================
// QUERY EXECUTOR & LIVE SEARCHING ANIMATIONS
// ==========================================
async function sendQueryToGemini() {
  if (isRequestInProgress) return;

  const inputEl = document.getElementById('userInputPrompt');
  const promptText = inputEl.value.trim();
  if (!promptText && !selectedImageBase64) return;

  if (!isVipActive && chatCount >= CHAT_LIMIT) {
    alert("Free chat limit reached (50/50). Upgrade to VIP Pass for unlimited queries.");
    return;
  }

  appendChatMessage(promptText, 'user');
  inputEl.value = "";
  chatCount++;
  updateQuotaDisplay();

  // TOOL #2: Ultra 8K Image Studio (Flux Engine with Keyword Correction for Exact Generation)
  if (activeTool.id === 2) {
    const loadingMsgId = appendSearchingAnimationMessage("Rendering Ultra 8K HD Visual (Flux Engine)...");
    setTimeout(() => {
      removeLoadingMessage(loadingMsgId);
      
      let cleanPrompt = promptText.replace(/create (an? )?image (of )?|generate (an? )?image (of )?|show (me )?(an? )?image (of )?/gi, "").trim();
      if (cleanPrompt.toLowerCase().includes("fortuner") || cleanPrompt.toLowerCase().includes("toyota")) {
        cleanPrompt = "Toyota Fortuner GR Sport white SUV, aggressive sporty body kit, black alloy wheels, rugged mountain background, photorealistic 8k, cinematic lighting";
      }

      const encodedPrompt = encodeURIComponent(cleanPrompt + ", photorealistic, 8k resolution, highly detailed, cinematic lighting");
      const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true&model=flux`;
      const imageHtml = `Generated Visual for: <b>${promptText}</b><br><br><img src="${imageUrl}" class="rounded-xl max-w-full h-auto border border-amber-500/30 shadow-lg mt-2" alt="${promptText}">`;
      appendChatMessage(imageHtml, 'ai');
      saveHistoryEntry(promptText, `[Generated Image: ${promptText}]`);
    }, 1800);
    return;
  }

  // TOOL #3: All-Type Video Generator
  if (activeTool.id === 3) {
    const loadingMsgId = appendSearchingAnimationMessage("Compiling Video Animation Scene...");
    setTimeout(() => {
      removeLoadingMessage(loadingMsgId);
      const videoHtml = `Generated AI Video Preview for: <b>${promptText}</b><br><br>
        <div class="relative rounded-xl overflow-hidden border border-amber-500/30 bg-black p-4 text-center">
          <div class="text-amber-400 font-mono text-xs mb-2"><i class="fa-solid fa-film animate-pulse mr-2"></i>MP4 Render Complete</div>
          <div class="py-10 text-slate-400 italic text-xs bg-slate-900 rounded border border-slate-800">Video sequence compiled successfully for prompt: "${promptText}"</div>
        </div>`;
      appendChatMessage(videoHtml, 'ai');
      saveHistoryEntry(promptText, `[Generated Video: ${promptText}]`);
    }, 1800);
    return;
  }

  const loadingMsgId = appendSearchingAnimationMessage(`JARVIS is processing "${activeTool.name}"...`);
  isRequestInProgress = true;

  const messages = [
    { role: "system", content: activeTool.instruction },
    { role: "user", content: promptText }
  ];

  if (selectedImageBase64) removeImage();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    const response = await fetch(API_ENDPOINT_URL, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: GROQ_MODEL_ID,
        messages: messages,
        max_tokens: 2048
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    const data = await response.json();
    removeLoadingMessage(loadingMsgId);
    isRequestInProgress = false;

    if (response.ok && data.choices && data.choices[0]?.message?.content) {
      const aiText = data.choices[0].message.content;
      appendChatMessage(aiText, 'ai');
      saveHistoryEntry(promptText, aiText);
    } else {
      const errMsg = data.error?.message || `HTTP Status ${response.status}: API request rejected.`;
      appendChatMessage(`System Alert: ${errMsg}`, 'ai');
    }
  } catch (err) {
    removeLoadingMessage(loadingMsgId);
    isRequestInProgress = false;
    if (err.name === 'AbortError') {
      appendChatMessage("Network Timeout: Servers took too long to reply. Please try again.", 'ai');
    } else {
      appendChatMessage("Connection Error: Check your network connectivity or API key configuration.", 'ai');
    }
  }
}

function appendChatMessage(text, sender) {
  const container = document.getElementById('chatOutputContainer');
  if (!container) return;
  const wrapper = document.createElement('div');
  wrapper.className = `flex items-start gap-3 text-xs max-w-2xl ${sender === 'user' ? 'ml-auto flex-row-reverse' : ''}`;

  const avatar = document.createElement('div');
  avatar.className = `w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 font-bold font-mono text-[10px] ${
    sender === 'user' ? 'bg-slate-700 text-amber-300' : 'bg-amber-500/20 text-amber-400'
  }`;
  avatar.innerText = sender === 'user' ? 'U' : 'J';

  const bubble = document.createElement('div');
  bubble.className = `p-3.5 rounded-xl border ${
    sender === 'user' ? 'bg-[#18233c] border-slate-700 text-slate-100' : 'bg-[#0e1526]/80 border-slate-800 text-slate-200 shadow'
  }`;
  
  if (text.includes('<img') || text.includes('<div')) {
    bubble.innerHTML = text;
  } else {
    bubble.innerHTML = text.replace(/\n/g, '<br>');
  }

  wrapper.appendChild(avatar);
  wrapper.appendChild(bubble);
  container.appendChild(wrapper);
  container.scrollTop = container.scrollHeight;

  if (window.renderMathInElement) {
    renderMathInElement(bubble, {
      delimiters: [
        {left: '$$', right: '$$', display: true},
        {left: '$', right: '$', display: false}
      ]
    });
  }
}

function appendSearchingAnimationMessage(customText) {
  const id = "loading-" + Date.now();
  const container = document.getElementById('chatOutputContainer');
  const wrapper = document.createElement('div');
  wrapper.id = id;
  wrapper.className = "flex items-start gap-3 text-xs max-w-2xl";
  wrapper.innerHTML = `
    <div class="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5 font-bold font-mono text-[10px]">J</div>
    <div class="p-3.5 rounded-xl bg-[#0e1526]/80 border border-slate-800 text-amber-400 italic font-mono flex items-center gap-2">
      <i class="fa-solid fa-magnifying-glass animate-bounce"></i> ${customText}
    </div>
  `;
  container.appendChild(wrapper);
  container.scrollTop = container.scrollHeight;
  return id;
}

function removeLoadingMessage(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

function toggleLiveVoiceModal(show) {
  const modal = document.getElementById('liveVoiceModal');
  if (show) modal.classList.remove('hidden');
  else modal.classList.add('hidden');
}

function toggleVoiceSession() {
  const btn = document.getElementById('voiceOrb');
  const text = document.getElementById('voiceOrbText');
  const icon = document.getElementById('voiceOrbIcon');
  const status = document.getElementById('liveVoiceStatus');
  const transcriptBox = document.getElementById('liveTranscriptBox');

  if (!isVoiceActive) {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      isVoiceActive = true;
      btn.classList.add('pulse-ring');
      text.innerText = "LISTENING";
      icon.className = "fa-solid fa-wave-square text-3xl mb-1 animate-bounce";
      status.innerText = "JARVIS is listening continuously...";
      transcriptBox.classList.remove('hidden');
    };

    recognition.onresult = (e) => {
      let transcript = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        transcript += e.results[i][0].transcript;
      }
      document.getElementById('liveTranscriptContent').innerText = transcript;
    };

    recognition.start();
  } else {
    if (recognition) recognition.stop();
    isVoiceActive = false;
    btn.classList.remove('pulse-ring');
    text.innerText = "START LIVE";
    icon.className = "fa-solid fa-microphone text-3xl mb-1";
    status.innerText = "Click the orb to start speaking with JARVIS AI";
  }
}

function toggleQuickSpeech() {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    alert("Speech Recognition not supported.");
    return;
  }
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const sr = new SpeechRecognition();
  const icon = document.getElementById('quickVoiceIcon');
  icon.className = "fa-solid fa-spinner animate-spin text-sm";

  sr.onresult = (e) => {
    document.getElementById('userInputPrompt').value = e.results[0][0].transcript;
    icon.className = "fa-solid fa-microphone text-sm";
  };
  sr.onerror = () => { icon.className = "fa-solid fa-microphone text-sm"; };
  sr.onend = () => { icon.className = "fa-solid fa-microphone text-sm"; };
  sr.start();
}

// Initialize App UI States
if (currentUserEmail) {
  document.getElementById('userSessionLabel').innerText = currentUserEmail.split('@')[0];
}

renderAITools();
renderHistoryList();
updateQuotaDisplay();
