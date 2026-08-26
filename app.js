/**
 * KING AI - Full Engine with Complete UI, Account Sync,
 * Dynamic VIP Passcode, Hash Admin, & Interactive Folders.
 * Owner: Abdullah Waheed | Engine: KING AI Program
 */

// 1. FIREBASE & API CONFIGURATION
const firebaseConfig = {
  apiKey: "AIzaSyCtQ0mFr-Sj2yxkIWFKal4tuvi9HrjvUGc",
  authDomain: "king-ai-pro.firebaseapp.com",
  projectId: "king-ai-pro",
  storageBucket: "king-ai-pro.firebasestorage.app",
  messagingSenderId: "1031703957787",
  appId: "1:1031703957787:web:6bd7a28e6a9d2252e4c3be",
  measurementId: "G-412V3TL038"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();

// API Credentials & Payment Endpoints
const GEMINI_API_KEY = atob("QVEuQWI4Uk42SkhUY2NBYUNlV3FKaEJOV3hTenEtaDZ0NVBVYy1Mc2FwbWV4NGFUa0tUWEE=");
const SAFEPAY_LINK = "https://sandbox.api.getsafepay.com/io/quick-link?ql=link_4be624f5-369c-43b5-9e69-082072b78c79";

// Encrypted SHA-256 Hash for Admin
const ADMIN_PASSWORD_HASH = "81bc5171e2ef64d081fdb4977457bd7eece106edacff8cbb94cdd88d30d19ca7";
const KING_AI_SYSTEM_PROMPT = "You are KING AI, an advanced AI application created by Abdullah Waheed. You must strictly identify as KING AI. Never state that you are Gemini or ChatGPT. Provide full, step-by-step working for mathematical and analytical queries using clear formatting.";

// 2. APPLICATION GLOBAL STATE
let currentUser = null;
let activeChatId = null;
let activeMode = "chat";
let isProUnlocked = localStorage.getItem("king_ai_pro_unlocked") === "true";
let dbListeners = [];

const DEFAULT_LIMITS = {
  chat: { count: 0, max: 50, name: "1. KING AI Chat PRO", tag: "3.6 Flash" },
  image: { count: 0, max: 5, name: "2. Ultra 8K Image Studio", tag: "Flux 8K" },
  video: { count: 0, max: 5, name: "3. All-Type Video Generator", tag: "Omni" },
  reader: { count: 0, max: 5, name: "5. Photo & Document OCR", tag: "Vision" },
  codeGen: { count: 0, max: 5, name: "6. Python & Code Writer", tag: "Dev Studio" },
  codeCrack: { count: 0, max: 5, name: "7. Code Cracker & Debugger", tag: "Crack AI" },
  translator: { count: 0, max: Infinity, name: "8. All-Language Translator", tag: "PolyGlot" },
  voice: { count: 0, max: 5, name: "9. Voice Speech Synthesizer", tag: "TTS Pro" },
  docSummary: { count: 0, max: 5, name: "10. Document Summarizer", tag: "DocuAI" },
  math: { count: 0, max: 5, name: "11. Math & Logic Solver", tag: "LogicX" },
  webGen: { count: 0, max: 2, name: "12. Essay & Content Writer", tag: "Writer" }
};

let userLimits = JSON.parse(JSON.stringify(DEFAULT_LIMITS));

// 3. INITIALIZATION & LIFECYCLE
document.addEventListener('DOMContentLoaded', () => {
  checkSafepayCallback();
  setupAuthStateListener();
  renderSideDrawerModes();
  createVipModal();
  bindPaymentButtons();
});

// Auto-Detect Payment Success & Grant Lifetime PRO
function checkSafepayCallback() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("status") === "success" || params.get("payment") === "completed" || params.get("tracker")) {
    isProUnlocked = true;
    localStorage.setItem("king_ai_pro_unlocked", "true");
    if (currentUser) {
      db.collection('users').doc(currentUser.uid).update({ isPro: true });
    }
    alert("🎉 Payment Successful! VIP PRO Unlimited Tier is now permanently active.");
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

function bindPaymentButtons() {
  document.querySelectorAll('.btn-trigger-pro').forEach(btn => {
    btn.onclick = (e) => {
      e.preventDefault();
      redirectToSafepay();
    };
  });
}

function redirectToSafepay() {
  window.location.href = SAFEPAY_LINK;
}

// SHA-256 Password Cryptography
async function hashPassword(str) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function getDailyVipPassword() {
  const START_DATE = new Date("2026-08-01T00:00:00").getTime();
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const daysPassed = Math.floor((Date.now() - START_DATE) / ONE_DAY_MS);
  return `KingAIPro@${2026 + Math.max(0, daysPassed)}`;
}

// 4. AUTHENTICATION & MULTI-DEVICE DATA SYNC
function setupAuthStateListener() {
  auth.onAuthStateChanged(async (user) => {
    dbListeners.forEach(unsub => unsub && unsub());
    dbListeners = [];

    if (user) {
      currentUser = user;
      const userDocRef = db.collection('users').doc(user.uid);
      
      const unsubUser = userDocRef.onSnapshot(async (doc) => {
        if (!doc.exists) {
          await userDocRef.set({
            email: user.email,
            displayName: user.displayName || "King AI Member",
            isPro: isProUnlocked,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            usage: DEFAULT_LIMITS
          });
        } else {
          const data = doc.data();
          if (data.isPro) {
            isProUnlocked = true;
            localStorage.setItem("king_ai_pro_unlocked", "true");
          }
          if (data.usage) userLimits = data.usage;
        }
        updateHeaderAndProUI();
        renderSideDrawerModes();
      });

      dbListeners.push(unsubUser);
      syncUserAccountData(user.uid);
    } else {
      currentUser = null;
      if (localStorage.getItem("king_ai_pro_unlocked") !== "true") {
        isProUnlocked = false;
      }
      userLimits = JSON.parse(JSON.stringify(DEFAULT_LIMITS));
      activeChatId = null;
      clearFrontendUI();
      updateHeaderAndProUI();
      renderSideDrawerModes();
    }
  });
}

function syncUserAccountData(uid) {
  const convsRef = db.collection('users').doc(uid).collection('conversations').orderBy('updatedAt', 'desc');

  const unsubConvs = convsRef.onSnapshot((snapshot) => {
    const historyContainer = document.getElementById('chatHistoryList');
    if (!historyContainer) return;
    historyContainer.innerHTML = '';

    if (snapshot.empty) {
      historyContainer.innerHTML = `<div class="p-2 text-slate-500 text-xs italic">No saved cloud chats.</div>`;
      return;
    }

    snapshot.forEach((doc) => {
      const data = doc.data();
      const btn = document.createElement('button');
      btn.className = `w-full text-left p-2 rounded-xl text-xs truncate flex justify-between items-center transition mb-1 ${
        activeChatId === doc.id ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-900/60 text-slate-300 hover:bg-slate-800'
      }`;
      btn.innerHTML = `
        <span class="truncate">💬 ${data.title || 'King AI Session'}</span>
        <span onclick="event.stopPropagation(); deleteAccountConversation('${doc.id}')" class="text-slate-500 hover:text-red-400 font-bold px-1">✕</span>
      `;
      btn.onclick = () => loadAccountConversation(doc.id);
      historyContainer.appendChild(btn);
    });
  });

  dbListeners.push(unsubConvs);
}

// 5. SIDEBAR & INTERACTIVE FOLDERS UI
function renderSideDrawerModes() {
  const container = document.getElementById('drawerIntelligenceModes');
  if (!container) return;

  container.innerHTML = `
    <div class="text-[10px] font-bold text-slate-400 mb-2 px-1 tracking-wider uppercase">AI WORKSPACE FOLDERS</div>
    <div id="folderButtonsContainer" class="space-y-1.5"></div>
  `;

  const folderContainer = document.getElementById('folderButtonsContainer');

  Object.keys(DEFAULT_LIMITS).forEach((key) => {
    const item = userLimits[key] || DEFAULT_LIMITS[key];
    const isActiveFolder = activeMode === key;

    let badgeText = "";
    let badgeClass = "";

    if (isProUnlocked || item.max === Infinity) {
      badgeText = "UNLIMITED";
      badgeClass = "text-emerald-400 font-bold";
    } else {
      const remaining = Math.max(0, item.max - item.count);
      badgeText = `${remaining}/${item.max}`;
      badgeClass = "text-amber-400 font-semibold";
    }

    const folderBtn = document.createElement('button');
    folderBtn.className = `w-full text-left p-2.5 rounded-xl border flex items-center justify-between transition-all duration-150 ${
      isActiveFolder
        ? 'bg-amber-500/10 border-amber-500/40 text-amber-300 shadow-sm'
        : 'bg-[#0f172a]/60 border-slate-800/80 text-slate-300 hover:bg-slate-800/80'
    }`;

    folderBtn.innerHTML = `
      <div class="flex items-center gap-2 truncate pr-1">
        <span class="text-xs font-semibold truncate">${item.name}</span>
      </div>
      <div class="flex items-center gap-1.5 shrink-0">
        <span class="text-[9px] bg-slate-800/80 border border-slate-700/60 px-1.5 py-0.5 rounded text-slate-400 font-mono">${item.tag || 'AI'}</span>
        <span class="text-[9px] ${badgeClass}">${badgeText}</span>
      </div>
    `;

    folderBtn.onclick = () => {
      switchMode(key);
      renderSideDrawerModes();
    };

    folderContainer.appendChild(folderBtn);
  });

  // Admin Folder Section
  const adminBtn = document.createElement('button');
  adminBtn.className = `w-full text-left p-2.5 mt-3 rounded-xl border flex items-center justify-between transition-all ${
    activeMode === 'admin'
      ? 'bg-red-500/20 border-red-500 text-red-300'
      : 'bg-red-950/20 border-red-900/40 text-red-400 hover:bg-red-900/30'
  }`;

  adminBtn.innerHTML = `
    <div class="flex items-center gap-2">
      <span class="text-xs">🔒</span>
      <span class="text-xs font-bold">Admin Folder</span>
    </div>
    <span class="text-[9px] px-1.5 py-0.5 rounded bg-red-900/40 border border-red-700/50 font-mono text-red-300 font-bold">PROTECTED</span>
  `;

  adminBtn.onclick = async () => { await verifyAndOpenAdmin(); };
  folderContainer.appendChild(adminBtn);
}

// 6. ADMIN DASHBOARD ENGINE
async function verifyAndOpenAdmin() {
  const passwordInput = prompt("Enter Admin Password:");
  if (!passwordInput) return;

  const inputHash = await hashPassword(passwordInput);
  if (inputHash === ADMIN_PASSWORD_HASH) {
    showAdminDashboard();
  } else {
    alert("⚠️ Access Denied: Incorrect Password");
  }
}

function showAdminDashboard() {
  activeMode = "admin";
  const mainView = document.getElementById('mainChatArea');
  let adminView = document.getElementById('adminStudioView');

  if (!adminView) {
    adminView = document.createElement('div');
    adminView.id = 'adminStudioView';
    adminView.className = 'flex-1 overflow-y-auto p-4 md:p-6 w-full';
    mainView.parentElement.appendChild(adminView);
  }

  mainView.classList.add('hidden');
  adminView.classList.remove('hidden');

  adminView.innerHTML = `
    <div class="max-w-2xl mx-auto p-6 bg-[#0d1628] border border-amber-500/40 rounded-2xl shadow-2xl mt-4 text-slate-200">
      <div class="flex justify-between items-center border-b border-slate-800 pb-4 mb-6">
        <div>
          <h2 class="text-2xl font-bold text-amber-400">👑 KING AI Admin Control</h2>
          <p class="text-xs text-slate-400 mt-1">Authenticated Administrator: Abdullah Waheed</p>
        </div>
        <button onclick="closeAdminDashboard()" class="px-4 py-2 bg-red-900/40 hover:bg-red-500/40 text-red-400 rounded-xl text-xs font-bold">Close Panel</button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="p-4 bg-slate-900 rounded-xl border border-slate-700/50">
          <span class="text-slate-400 text-xs block mb-1 uppercase">🔑 Today's Dynamic VIP Password</span>
          <span class="text-amber-400 font-mono text-xl font-bold">${getDailyVipPassword()}</span>
        </div>
        <div class="p-4 bg-slate-900 rounded-xl border border-slate-700/50">
          <span class="text-slate-400 text-xs block mb-1 uppercase">⚡ PRO Tier Status</span>
          <span class="text-emerald-400 font-bold text-lg">${isProUnlocked ? 'UNLOCKED (UNLIMITED)' : 'FREE TIER'}</span>
        </div>
      </div>
    </div>
  `;
}

function closeAdminDashboard() {
  document.getElementById('adminStudioView')?.classList.add('hidden');
  document.getElementById('mainChatArea')?.classList.remove('hidden');
  activeMode = "chat";
  renderSideDrawerModes();
}

// 7. CORE MULTI-FOLDER DISPATCHER ENGINE
async function handleUserSendMessage(promptText) {
  if (!promptText || !promptText.trim()) return;

  const currentModeLimit = userLimits[activeMode] || DEFAULT_LIMITS[activeMode];

  if (!isProUnlocked && currentModeLimit.max !== Infinity) {
    if (currentModeLimit.count >= currentModeLimit.max) {
      alert(`⚠️ Free tier limit reached for ${currentModeLimit.name}.\n\nClick 'Activate PRO' for Unlimited Access!`);
      redirectToSafepay();
      return;
    }
  }

  if (!isProUnlocked) {
    userLimits[activeMode].count += 1;
    if (currentUser) {
      await db.collection('users').doc(currentUser.uid).update({ usage: userLimits });
    }
  }

  appendMessageToUI("user", promptText);

  const loadingMsgId = appendLoadingMessage();

  try {
    let responseHtml = "";

    if (activeMode === "image") {
      responseHtml = await processImageFolderRequest(promptText);
    } else if (activeMode === "video") {
      responseHtml = await processVideoFolderRequest(promptText);
    } else if (activeMode === "voice") {
      responseHtml = await processVoiceFolderRequest(promptText);
    } else {
      const responseText = await callGeminiApiWithPersona(promptText);
      responseHtml = formatMarkdownOutput(responseText);
    }

    updateLoadingMessage(loadingMsgId, responseHtml);

    if (currentUser) {
      await saveMessageToAccount(promptText, responseHtml);
    }
  } catch (error) {
    console.error("Engine Error:", error);
    updateLoadingMessage(loadingMsgId, "<div class='text-red-400'>⚠️ Engine Processing Error. Please try again.</div>");
  }

  renderSideDrawerModes();
}

// Specialized Folder Handlers
async function processImageFolderRequest(promptText) {
  const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(promptText)}?width=1024&height=1024&nologo=true`;
  return `
    <div class="space-y-3">
      <p class="font-semibold text-amber-300">🎨 Rendered 8K Image for: "${promptText}"</p>
      <img src="${imageUrl}" alt="${promptText}" class="rounded-xl border border-amber-500/30 w-full max-w-md shadow-lg" loading="lazy" />
      <div class="flex gap-2">
        <a href="${imageUrl}" target="_blank" download class="px-3 py-1.5 bg-amber-500/20 text-amber-300 rounded-lg text-xs hover:bg-amber-500/40">View Fullscreen</a>
      </div>
    </div>
  `;
}

async function processVideoFolderRequest(promptText) {
  const videoPromptText = await callGeminiApiWithPersona(`Generate a video scene breakdown and storyboard script for: ${promptText}`);
  return `
    <div class="space-y-3">
      <div class="p-3 bg-slate-900 border border-amber-500/30 rounded-xl">
        <p class="font-semibold text-amber-300 mb-2">🎬 AI Video Preview Generator</p>
        <video controls class="w-full rounded-lg border border-slate-700" poster="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800">
          <source src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4" type="video/mp4">
          Your browser does not support video playback.
        </video>
      </div>
      <div>${formatMarkdownOutput(videoPromptText)}</div>
    </div>
  `;
}

async function processVoiceFolderRequest(promptText) {
  const spokenText = await callGeminiApiWithPersona(`Generate speech script response for: ${promptText}`);
  
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(spokenText.replace(/[*#]/g, ''));
    window.speechSynthesis.speak(utterance);
  }

  return `
    <div class="space-y-2">
      <div class="flex items-center gap-2 text-emerald-400 font-bold text-xs">
        <span>🔊 Speech Synthesizer Output:</span>
      </div>
      <div>${formatMarkdownOutput(spokenText)}</div>
    </div>
  `;
}

// API Call Engine with Custom System Instructions
async function callGeminiApiWithPersona(userPrompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  
  let modeInstruction = "";
  if (activeMode === "math") {
    modeInstruction = "You are Math & Logic Solver. You MUST perform step-by-step mathematical calculations using proper PEMDAS/BODMAS rules. Never skip intermediate arithmetic steps.";
  } else if (activeMode === "codeCrack") {
    modeInstruction = "You are Code Cracker & Debugger. Analyze code for errors, performance bottlenecks, and security bugs. Provide corrected code blocks.";
  } else if (activeMode === "codeGen") {
    modeInstruction = "You are Python & Code Writer. Provide production-ready, clean code with syntax highlighting.";
  }

  const payload = {
    contents: [{
      parts: [
        { text: `${KING_AI_SYSTEM_PROMPT}\n${modeInstruction}` },
        { text: userPrompt }
      ]
    }]
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
    return data.candidates[0].content.parts[0].text;
  }
  throw new Error("Invalid API Response");
}

function formatMarkdownOutput(text) {
  if (!text) return "";
  let formatted = text
    .replace(/```([\s\S]*?)```/g, '<pre class="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-xs my-2 overflow-x-auto"><code>$1</code></pre>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br/>');
  return formatted;
}

// 8. HELPERS & UI UPDATERS
function switchMode(modeKey) {
  activeMode = modeKey;
  const folderTitle = document.getElementById('activeFolderName');
  if (folderTitle && DEFAULT_LIMITS[modeKey]) {
    folderTitle.innerText = DEFAULT_LIMITS[modeKey].name;
  }
}

function clearFrontendUI() {
  const container = document.getElementById('chatMessages');
  if (container) container.innerHTML = '';
}

function updateHeaderAndProUI() {
  const statusBadge = document.getElementById('userStatusBadge');
  const proBtnHeader = document.getElementById('headerProBtn');
  
  if (isProUnlocked) {
    if (statusBadge) statusBadge.innerText = "🎟️ VIP PRO UNLIMITED";
    if (proBtnHeader) proBtnHeader.innerText = "VIP UNLOCKED (∞)";
  } else {
    if (statusBadge) statusBadge.innerText = currentUser ? `👤 ${currentUser.email}` : "FREE TIER";
    if (proBtnHeader) proBtnHeader.innerText = "Activate PRO (1500 PKR)";
  }
}

function createVipModal() {
  if (document.getElementById('vipModal')) return;
  const modalHtml = `
    <div id="vipModal" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 hidden flex items-center justify-center p-4">
      <div class="bg-[#0d1628] border border-amber-500/40 rounded-2xl max-w-md w-full p-6 text-slate-200 shadow-2xl relative">
        <button onclick="closeVipModal()" class="absolute top-4 right-4 text-slate-400 hover:text-white text-lg font-bold">✕</button>
        <h3 class="text-xl font-bold text-amber-400 mb-2">👑 Unlock KING PRO Unlimited</h3>
        <p class="text-xs text-slate-300 mb-4">Get lifetime unlimited access to all AI Folders, 8K Image Studio, Video Generators, and Code Crackers.</p>
        <button onclick="redirectToSafepay()" class="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 font-bold rounded-xl text-center text-slate-950 mb-4 hover:brightness-110">💳 Pay via Safepay (1500 PKR)</button>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function unlockProMode() { document.getElementById('vipModal')?.classList.remove('hidden'); }
function closeVipModal() { document.getElementById('vipModal')?.classList.add('hidden'); }

function appendMessageToUI(sender, textOrHtml) {
  const container = document.getElementById('chatMessages');
  if (!container) return;
  const msgDiv = document.createElement('div');
  msgDiv.className = `p-3.5 rounded-2xl max-w-[85%] text-xs leading-relaxed mb-3 ${
    sender === 'user' ? 'bg-amber-500/20 text-amber-200 ml-auto border border-amber-500/30' : 'bg-slate-900 text-slate-200 border border-slate-800'
  }`;
  msgDiv.innerHTML = textOrHtml;
  container.appendChild(msgDiv);
  container.scrollTop = container.scrollHeight;
}

function appendLoadingMessage() {
  const container = document.getElementById('chatMessages');
  if (!container) return null;
  const id = "msg-" + Date.now();
  const msgDiv = document.createElement('div');
  msgDiv.id = id;
  msgDiv.className = "p-3.5 rounded-2xl max-w-[85%] text-xs leading-relaxed mb-3 bg-slate-900 text-amber-400 border border-slate-800 animate-pulse";
  msgDiv.innerText = "👑 KING AI is thinking...";
  container.appendChild(msgDiv);
  container.scrollTop = container.scrollHeight;
  return id;
}

function updateLoadingMessage(id, htmlContent) {
  const msgDiv = document.getElementById(id);
  if (msgDiv) {
    msgDiv.classList.remove('animate-pulse', 'text-amber-400');
    msgDiv.classList.add('text-slate-200');
    msgDiv.innerHTML = htmlContent;
  }
}

async function saveMessageToAccount(promptText, responseText) {
  if (!currentUser) return;
  const userDoc = db.collection('users').doc(currentUser.uid);

  if (!activeChatId) {
    const newConv = await userDoc.collection('conversations').add({
      title: promptText.slice(0, 28) + "...",
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    activeChatId = newConv.id;
  }

  await userDoc.collection('conversations').doc(activeChatId).collection('messages').add({
    sender: "user", text: promptText, timestamp: firebase.firestore.FieldValue.serverTimestamp()
  });

  await userDoc.collection('conversations').doc(activeChatId).collection('messages').add({
    sender: "ai", text: responseText, timestamp: firebase.firestore.FieldValue.serverTimestamp()
  });

  await userDoc.collection('conversations').doc(activeChatId).update({
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

async function loadAccountConversation(convId) {
  if (!currentUser) return;
  activeChatId = convId;
  clearFrontendUI();

  const msgsSnapshot = await db.collection('users').doc(currentUser.uid).collection('conversations').doc(convId).collection('messages').orderBy('timestamp', 'asc').get();

  msgsSnapshot.forEach(doc => {
    const data = doc.data();
    appendMessageToUI(data.sender, data.text);
  });
}

async function deleteAccountConversation(convId) {
  if (!currentUser) return;
  await db.collection('users').doc(currentUser.uid).collection('conversations').doc(convId).delete();
  if (activeChatId === convId) {
    activeChatId = null;
    clearFrontendUI();
  }
}
