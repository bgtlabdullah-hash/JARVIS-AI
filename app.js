// ==========================================
// JARVIS AI HUB - GROQ LLAMA 3.3 ENGINE
// ==========================================

let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
});

async function triggerInstall() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('PWA Installed successfully');
    }
    deferredPrompt = null;
  } else {
    alert("To install JARVIS AI HUB, tap your browser menu (three dots in Chrome/Edge or Share in Safari) and select 'Install app' or 'Add to Home Screen'.");
  }
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(err => console.error(err));
  });
}

// GROQ API CONFIGURATION
const GROQ_API_KEY = "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";
const GROQ_MODEL_ID = "openai/gpt-oss-20b";
const API_ENDPOINT_URL = "https://api.groq.com/openai/v1/chat/completions";

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
let selectedImageBase64 = null;
let isRequestInProgress = false;
let isSidebarCollapsed = false;

let currentUserEmail = localStorage.getItem('jarvis_current_user') || null;
let userDatabase = JSON.parse(localStorage.getItem('jarvis_users_db') || '{}');
let customPasskeys = JSON.parse(localStorage.getItem('jarvis_custom_passkeys') || '[]');
let chatHistory = (currentUserEmail && userDatabase[currentUserEmail]) ? userDatabase[currentUserEmail].history : [];

let dynamicPasskeys = {
  day: "JARVIS-DAY-" + Math.floor(1000 + Math.random() * 9000),
  week: "JARVIS-WK-" + Math.floor(1000 + Math.random() * 9000),
  month: "JARVIS-MO-" + Math.floor(1000 + Math.random() * 9000),
  year: "JARVIS-YR-" + Math.floor(1000 + Math.random() * 9000),
  life: "JARVIS-LIFE-9999"
};

const AI_TOOLS = [
  { id: 1, name: "JARVIS Chat Pro", icon: "fa-robot", placeholder: "Ask Groq Llama 3.3 anything...", instruction: "You are JARVIS AI powered by Groq Llama 3.3. Answer accurately, thoughtfully, and clearly." },
  { id: 2, name: "Ultra 8K Image Studio", icon: "fa-image", placeholder: "Describe image (cars, animals, cell reproduction diagram)...", instruction: "Generate high definition image." },
  { id: 3, name: "All-Type Video Generator", icon: "fa-video", placeholder: "Describe video scene to compile MP4 preview...", instruction: "Generate video simulation." },
  { id: 4, name: "Saved Creations Folder", icon: "fa-folder-open", placeholder: "Access saved projects...", instruction: "Manage outputs." },
  { id: 5, name: "Photo & Document OCR", icon: "fa-file-invoice", placeholder: "Extract text from image...", instruction: "Extract text accurately." },
  { id: 6, name: "Python & Code Writer", icon: "fa-code", placeholder: "Request Python/JS executable scripts...", instruction: "Return clean executable code blocks." },
  { id: 7, name: "Code Cracker & Debugger", icon: "fa-bug", placeholder: "Paste code to debug...", instruction: "Find bugs and fix code." },
  { id: 8, name: "All-Language Translator", icon: "fa-language", placeholder: "Type text to translate...", instruction: "Translate text accurately." },
  { id: 9, name: "Voice Speech Synthesizer", icon: "fa-volume-high", placeholder: "Enter text for speech synthesis...", instruction: "Synthesize speech script." },
  { id: 10, name: "Document Summarizer", icon: "fa-file-lines", placeholder: "Paste document text...", instruction: "Provide a comprehensive summary." },
  { id: 11, name: "Math & Logic Solver", icon: "fa-calculator", placeholder: "Enter math equations (e.g., 3x^2 - 12x + 9 = 0)...", instruction: "You are an expert mathematician and scientist. Always solve math problems step-by-step and write all equations, variables, and formulas using formal LaTeX syntax enclosed in $inline$ or $$display$$ equations." },
  { id: 12, name: "Essay & Content Writer", icon: "fa-pen-nib", placeholder: "Specify topic for essay...", instruction: "Write professional structured content." }
];

let activeTool = AI_TOOLS[0];
let currentSelectedPlan = 'life';
let recognition = null;
let isVoiceActive = false;

function toggleSidebar() {
  const sidebar = document.getElementById('sidebarPanel');
  if (!sidebar) return;
  isSidebarCollapsed = !isSidebarCollapsed;
  sidebar.style.display = isSidebarCollapsed ? 'none' : 'flex';
}

function updateQuotaDisplay() {
  if (isVipActive) {
    document.getElementById('chatQuotaDisplay').innerText = "UNLIMITED (VIP)";
    document.getElementById('tierBadgeLabel').innerText = "GROQ VIP TIER";
    document.getElementById('tierBadgeLabel').className = "bg-emerald-500 text-black px-2 py-0.5 rounded text-[9px] font-bold font-mono tracking-wider";
    document.getElementById('vipTimerLabel').innerText = "ACTIVE";
    document.getElementById('vipTimerLabel').className = "text-emerald-400 font-bold";
  } else {
    document.getElementById('chatQuotaDisplay').innerText = `${chatCount} / ${CHAT_LIMIT}`;
  }
}

function renderAITools() {
  const container = document.getElementById('aiToolsList');
  if (!container) return;
  container.innerHTML = AI_TOOLS.map(tool => {
    const isActive = tool.id === activeTool.id;
    return `
      <button onclick="selectToolFolder(${tool.id})" class="w-full text-left px-2.5 py-2 rounded-xl border ${isActive ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 font-semibold' : 'hover:bg-[#0e1526] text-slate-300 border-transparent'} flex items-center justify-between transition">
        <span class="truncate pr-1"><i class="fa-solid ${tool.icon} mr-2 ${isActive ? 'text-emerald-400' : 'text-slate-400'}"></i>${tool.id}. ${tool.name}</span>
        <span class="${isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'} text-[9px] px-1.5 py-0.5 rounded font-mono shrink-0">Module</span>
      </button>
    `;
  }).join('');
}

function selectToolFolder(toolId) {
  activeTool = AI_TOOLS.find(t => t.id === toolId) || AI_TOOLS[0];
  renderAITools();
  document.getElementById('activeToolBadge').innerText = `${activeTool.id}. ${activeTool.name}`;
  document.getElementById('userInputPrompt').placeholder = activeTool.placeholder;
  document.getElementById('toolWelcomeText').innerText = `Workspace Switched: ${activeTool.name}. Groq Llama 3.3 Ready.`;
  updateQuotaDisplay();
}

function quickPromptClick(text) {
  document.getElementById('userInputPrompt').value = text;
  sendQueryToAI();
}

function saveHistoryEntry(prompt, responseText) {
  const entry = { id: Date.now(), tool: activeTool.name, prompt: prompt, response: responseText };
  chatHistory.unshift(entry);
  if (chatHistory.length > 50) chatHistory.pop();

  if (currentUserEmail && userDatabase[currentUserEmail]) {
    userDatabase[currentUserEmail].history = chatHistory;
    localStorage.setItem('jarvis_users_db', JSON.stringify(userDatabase));
  }
  renderHistoryList();
}

function renderHistoryList() {
  const container = document.getElementById('historyListContainer');
  if (!container) return;
  if (chatHistory.length === 0) {
    container.innerHTML = `<div class="text-slate-500 italic text-[10px] py-1">No saved neural logs yet.</div>`;
    return;
  }
  container.innerHTML = chatHistory.map(item => `
    <div onclick="loadHistoryItem(${item.id})" class="p-2 bg-[#050914] hover:bg-slate-800/80 border border-slate-800/80 rounded-xl cursor-pointer transition">
      <div class="text-[10px] text-emerald-400 font-bold truncate">${item.tool}</div>
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
  renderHistoryList();
}

function openAuthModal() { document.getElementById('authModal').classList.remove('hidden'); }
function closeAuthModal() { document.getElementById('authModal').classList.add('hidden'); }

function handleEmailAuth(e) {
  e.preventDefault();
  const email = document.getElementById('authEmailInput').value.trim();
  const pass = document.getElementById('authPassInput').value;
  if (!email || !pass) return alert("Enter email and password.");

  if (!userDatabase[email]) {
    userDatabase[email] = { password: pass, history: [], isVip: false };
    alert("Cloud Account Registered & Signed In!");
  } else if (userDatabase[email].password !== pass) {
    return alert("Incorrect password.");
  } else {
    alert("Signed in successfully! History synced.");
  }

  currentUserEmail = email;
  localStorage.setItem('jarvis_current_user', email);
  localStorage.setItem('jarvis_users_db', JSON.stringify(userDatabase));
  chatHistory = userDatabase[email].history || [];
  isVipActive = userDatabase[email].isVip || false;
  document.getElementById('userSessionLabel').innerText = email.split('@')[0];
  closeAuthModal();
  renderHistoryList();
  updateQuotaDisplay();
}

function openAdminAuthModal() { document.getElementById('adminAuthModal').classList.remove('hidden'); }
function closeAdminAuthModal() { document.getElementById('adminAuthModal').classList.add('hidden'); }

function verifyAdminPass() {
  if (document.getElementById('adminPassInput').value === "Abdullah waheed123123") {
    closeAdminAuthModal();
    document.getElementById('adminPanelModal').classList.remove('hidden');
    
    const totalSignins = Object.keys(userDatabase).length;
    let totalVips = Object.values(userDatabase).filter(u => u.isVip).length;
    if (isVipActive && currentUserEmail && !userDatabase[currentUserEmail]?.isVip) {
      totalVips++;
    }

    document.getElementById('adminSigninsCount').innerText = totalSignins;
    document.getElementById('adminVipsCount').innerText = totalVips;
    document.getElementById('passkeyDay').innerText = dynamicPasskeys.day;
    document.getElementById('passkeyWeek').innerText = dynamicPasskeys.week;
    document.getElementById('passkeyMonth').innerText = dynamicPasskeys.month;
    document.getElementById('passkeyYear').innerText = dynamicPasskeys.year;
    renderCustomCodesList();
  } else {
    alert("Incorrect password.");
  }
}
function closeAdminPanelModal() { document.getElementById('adminPanelModal').classList.add('hidden'); }

function generateCustomPasskey() {
  const code = document.getElementById('customCodeInput').value.trim().toUpperCase();
  const durationDays = document.getElementById('customCodeDuration').value;
  if (!code) return alert("Enter a custom code string.");

  customPasskeys.push({ code: code, duration: durationDays });
  localStorage.setItem('jarvis_custom_passkeys', JSON.stringify(customPasskeys));
  document.getElementById('customCodeInput').value = "";
  renderCustomCodesList();
  alert(`Custom passkey "${code}" created successfully!`);
}

function renderCustomCodesList() {
  const container = document.getElementById('customCodesListContainer');
  if (!container) return;
  if (customPasskeys.length === 0) {
    container.innerHTML = `<div class="text-slate-500 italic text-[11px]">No custom codes generated yet.</div>`;
    return;
  }
  container.innerHTML = customPasskeys.map(item => `
    <div class="flex items-center justify-between p-2 bg-[#0b0f19] border border-slate-800 rounded-xl text-[11px]">
      <span class="text-emerald-400 font-bold">${item.code}</span>
      <span class="text-slate-300">${item.duration === "9999" ? "Lifetime" : item.duration + " Days"}</span>
    </div>
  `).join('');
}

function triggerVipModal(plan) {
  currentSelectedPlan = plan;
  document.getElementById('vipOptionModal').classList.remove('hidden');
}
function closeVipOptionModal() { document.getElementById('vipOptionModal').classList.add('hidden'); }
function proceedGetCode() { closeVipOptionModal(); window.open(SAFEPAY_LINKS[currentSelectedPlan], '_blank'); }
function proceedApplyCode() { closeVipOptionModal(); document.getElementById('applyCodeModal').classList.remove('hidden'); }
function closeApplyCodeModal() { document.getElementById('applyCodeModal').classList.add('hidden'); }

function validateVipCode() {
  const val = document.getElementById('vipCodeInput').value.trim().toUpperCase();
  const isCustomMatch = customPasskeys.find(cp => cp.code === val);

  if (val === dynamicPasskeys.day || val === dynamicPasskeys.week || val === dynamicPasskeys.month || val === dynamicPasskeys.year || val === dynamicPasskeys.life || isCustomMatch) {
    isVipActive = true;
    if (currentUserEmail && userDatabase[currentUserEmail]) {
      userDatabase[currentUserEmail].isVip = true;
      localStorage.setItem('jarvis_users_db', JSON.stringify(userDatabase));
    }
    updateQuotaDisplay();
    closeApplyCodeModal();
    alert("VIP Pass Activated Successfully!");
  } else {
    alert("Invalid Passkey.");
  }
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
      <img src="${e.target.result}" class="w-8 h-8 object-cover rounded-lg border border-slate-700">
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

function speakText(text) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.replace(/<[^>]*>?/gm, ''));
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  }
}

async function sendQueryToAI() {
  if (isRequestInProgress) return;

  const inputEl = document.getElementById('userInputPrompt');
  if (!inputEl) return;
  const promptText = inputEl.value.trim();
  if (!promptText && !selectedImageBase64) return;

  if (!isVipActive && chatCount >= CHAT_LIMIT) {
    alert("Free quota limit reached (50/50). Upgrade to VIP Pass for unlimited usage.");
    return;
  }

  appendChatMessage(promptText, 'user');
  inputEl.value = "";
  chatCount++;
  updateQuotaDisplay();

  // TOOL #2: Ultra 8K Image Studio
  if (activeTool.id === 2) {
    const loadingMsgId = appendSearchingAnimationMessage("Rendering Ultra 8K Visual via Flux Engine...");
    setTimeout(() => {
      removeLoadingMessage(loadingMsgId);
      let cleanPrompt = promptText.replace(/create (an? )?image (of )?|generate (an? )?image (of )?|show (me )?(an? )?image (of )?/gi, "").trim();
      if (cleanPrompt.toLowerCase().includes("reproduction") || cleanPrompt.toLowerCase().includes("cell") || cleanPrompt.toLowerCase().includes("biology")) {
        cleanPrompt = "Detailed educational scientific diagram showing cellular reproduction, mitosis phases, clear labels, high-resolution vector style";
      }
      const encodedPrompt = encodeURIComponent(cleanPrompt + ", photorealistic, 8k resolution, highly detailed, cinematic lighting");
      const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true&model=flux`;
      const imageHtml = `Generated Visual for: <b>${promptText}</b><br><br>
        <img src="${imageUrl}" class="rounded-2xl max-w-full h-auto border border-emerald-500/30 shadow-2xl mt-2" alt="${promptText}">
        <div class="mt-3 flex gap-2">
          <a href="${imageUrl}" target="_blank" download="jarvis-creation.png" class="px-3 py-1.5 bg-emerald-500 text-black text-[11px] font-bold rounded-xl flex items-center gap-1 shadow"><i class="fa-solid fa-download"></i> Download HD</a>
        </div>`;
      appendChatMessage(imageHtml, 'ai');
      saveHistoryEntry(promptText, `[Generated Image: ${promptText}]`);
    }, 1200);
    return;
  }

  // TOOL #3: All-Type Video Generator
  if (activeTool.id === 3) {
    const loadingMsgId = appendSearchingAnimationMessage("Compiling MP4 Video Animation Scene...");
    setTimeout(() => {
      removeLoadingMessage(loadingMsgId);
      const videoHtml = `Generated AI Video Simulation for: <b>${promptText}</b><br><br>
        <div class="relative rounded-2xl overflow-hidden border border-emerald-500/30 bg-black p-4 text-center shadow-xl">
          <div class="text-emerald-400 font-mono text-xs mb-2"><i class="fa-solid fa-film animate-pulse mr-2"></i>MP4 Render Complete</div>
          <div class="py-12 text-slate-400 italic text-xs bg-slate-900 rounded-xl border border-slate-800">Video sequence compiled successfully for prompt: "${promptText}"</div>
        </div>`;
      appendChatMessage(videoHtml, 'ai');
      saveHistoryEntry(promptText, `[Generated Video: ${promptText}]`);
    }, 1200);
    return;
  }

  const loadingMsgId = appendSearchingAnimationMessage(`JARVIS is executing "${activeTool.name}" via Groq Llama 3.3...`);
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
      const errorMsg = data.error?.message || "Groq API key required or request rejected. Please configure your valid Groq API key in app.js.";
      appendChatMessage(`System Alert: ${errorMsg}`, 'ai');
    }
  } catch (err) {
    removeLoadingMessage(loadingMsgId);
    isRequestInProgress = false;
    appendChatMessage("Connection Error: Check your network connectivity or ensure your Groq API key is configured correctly in app.js.", 'ai');
  }
}

function appendChatMessage(text, sender) {
  const container = document.getElementById('chatOutputContainer');
  if (!container) return;
  const wrapper = document.createElement('div');
  wrapper.className = `flex items-start gap-3 text-xs max-w-3xl ${sender === 'user' ? 'ml-auto flex-row-reverse' : ''}`;

  const avatar = document.createElement('div');
  avatar.className = `w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 font-bold font-mono text-xs ${
    sender === 'user' ? 'bg-slate-700 text-emerald-300' : 'bg-gradient-to-tr from-emerald-600 to-emerald-400 text-black shadow'
  }`;
  avatar.innerText = sender === 'user' ? 'U' : 'J';

  const bubble = document.createElement('div');
  bubble.className = `p-4 rounded-2xl border ${
    sender === 'user' ? 'bg-[#18233c] border-slate-700 text-slate-100' : 'bg-[#0b0f19] border-slate-800/80 text-slate-200 shadow-xl'
  }`;
  
  if (text.includes('<img') || text.includes('<div')) {
    bubble.innerHTML = text;
  } else {
    bubble.innerHTML = text.replace(/\n/g, '<br>');
    if (sender === 'ai') {
      const speakBtn = document.createElement('button');
      speakBtn.className = "mt-2 px-2.5 py-1 bg-[#131b2e] hover:bg-slate-800 text-emerald-400 border border-slate-700 rounded-lg text-[10px] font-mono flex items-center gap-1 transition";
      speakBtn.innerHTML = `<i class="fa-solid fa-volume-high"></i> Listen Aloud`;
      speakBtn.onclick = () => speakText(text);
      bubble.appendChild(speakBtn);
    }
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
  wrapper.className = "flex items-start gap-3 text-xs max-w-3xl";
  wrapper.innerHTML = `
    <div class="w-7 h-7 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-400 text-black flex items-center justify-center shrink-0 mt-0.5 font-bold font-mono text-xs shadow">J</div>
    <div class="p-4 rounded-2xl bg-[#0b0f19] border border-slate-800/80 text-emerald-400 italic font-mono flex items-center gap-2 shadow-xl">
      <i class="fa-solid fa-atom animate-spin"></i> ${customText}
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
      alert("Speech recognition not supported.");
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
    status.innerText = "Click orb to start conversation with JARVIS";
  }
}

function toggleQuickSpeech() {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) return;
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const sr = new SpeechRecognition();
  const icon = document.getElementById('quickVoiceIcon');
  icon.className = "fa-solid fa-spinner animate-spin text-sm";
  sr.onresult = (e) => {
    document.getElementById('userInputPrompt').value = e.results[0][0].transcript;
    icon.className = "fa-solid fa-microphone text-sm";
  };
  sr.onerror = () => { icon.className = "fa-solid fa-microphone text-sm"; };
  sr.start();
}

if (currentUserEmail) {
  document.getElementById('userSessionLabel').innerText = currentUserEmail.split('@')[0];
  if (userDatabase[currentUserEmail]) {
    isVipActive = userDatabase[currentUserEmail].isVip || false;
  }
}
renderAITools();
renderHistoryList();
updateQuotaDisplay();
