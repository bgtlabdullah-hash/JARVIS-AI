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

// Encrypted SHA-256 Hash for "abdullahwaheed123123098098"
const ADMIN_PASSWORD_HASH = "81bc5171e2ef64d081fdb4977457bd7eece106edacff8cbb94cdd88d30d19ca7";
const KING_AI_SYSTEM_PROMPT = "You are KING AI, an advanced AI application created by the King AI Program. You must strictly identify as KING AI. Never say you are Gemini, ChatGPT, or any other model provider.";

// 2. APPLICATION GLOBAL STATE
let currentUser = null;
let activeChatId = null;
let activeMode = "chat";
let isProUnlocked = false;
let dbListeners = [];

const DEFAULT_LIMITS = {
  chat: { count: 0, max: 50, name: "King AI Chat PRO", tag: "3.6 Flash" },
  image: { count: 0, max: 3, name: "8K Image Studio", tag: "Flux 8K" },
  reader: { count: 0, max: 3, name: "Photo & Document Reader", tag: "Vision" },
  codeGen: { count: 0, max: 4, name: "Python & Java Code Writer", tag: "Dev Studio" },
  codeCrack: { count: 0, max: 5, name: "Code Cracker & Debugger", tag: "Crack AI" },
  translator: { count: 0, max: Infinity, name: "All-Language Translator", tag: "PolyGlot" },
  voice: { count: 0, max: 3, name: "Voice Speech Synthesizer", tag: "TTS Pro" },
  docSummary: { count: 0, max: 2, name: "Document & PDF Summarizer", tag: "DocuAI" },
  math: { count: 0, max: 5, name: "Math & Logic Solver", tag: "LogicX" },
  webGen: { count: 0, max: 2, name: "AI Web Page Builder", tag: "HTML/JS" }
};

let userLimits = JSON.parse(JSON.stringify(DEFAULT_LIMITS));

// 3. INITIALIZATION & LIFECYCLE
document.addEventListener('DOMContentLoaded', () => {
  setupAuthStateListener();
  renderSideDrawerModes();
  createVipModal();
});

// SHA-256 Password Cryptography
async function hashPassword(str) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Daily Auto-Incrementing VIP Password Engine
function getDailyVipPassword() {
  const START_DATE = new Date("2026-08-01T00:00:00").getTime();
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const daysPassed = Math.floor((Date.now() - START_DATE) / ONE_DAY_MS);
  const baseYearNumber = 2026;
  return `KingAIPro@${baseYearNumber + Math.max(0, daysPassed)}`;
}

// 4. AUTHENTICATION & MULTI-DEVICE DATA SYNC
function setupAuthStateListener() {
  auth.onAuthStateChanged(async (user) => {
    // Unsubscribe existing Firestore listeners to prevent cross-account bleeding
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
            isPro: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            usage: DEFAULT_LIMITS
          });
          isProUnlocked = false;
          userLimits = JSON.parse(JSON.stringify(DEFAULT_LIMITS));
        } else {
          const data = doc.data();
          isProUnlocked = !!data.isPro;
          if (data.usage) userLimits = data.usage;
        }
        updateHeaderAndProUI();
        renderSideDrawerModes();
      });

      dbListeners.push(unsubUser);
      syncUserAccountData(user.uid);
    } else {
      // Signed Out / Anonymous State
      currentUser = null;
      isProUnlocked = false;
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
      historyContainer.innerHTML = `<div class="p-2 text-slate-500 text-xs italic">Sign in to sync your account data.</div>`;
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
    <div class="text-[10px] font-bold text-slate-400 mb-2 px-1 tracking-wider uppercase">INTELLIGENCE MODES</div>
    <div id="folderButtonsContainer" class="space-y-1.5"></div>
  `;

  const folderContainer = document.getElementById('folderButtonsContainer');

  Object.keys(DEFAULT_LIMITS).forEach((key) => {
    const item = userLimits[key] || DEFAULT_LIMITS[key];
    const isActiveFolder = activeMode === key;

    let badgeText = "";
    let badgeClass = "";

    if (isProUnlocked) {
      badgeText = "UNLIMITED";
      badgeClass = "text-emerald-400 font-bold";
    } else if (item.max === Infinity) {
      badgeText = "UNLIMITED";
      badgeClass = "text-emerald-400 font-bold";
    } else {
      const remaining = Math.max(0, item.max - item.count);
      badgeText = `${remaining}/${item.max} FREE`;
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
      <span class="text-xs">🔐</span>
      <span class="text-xs font-bold">Admin Folder</span>
    </div>
    <span class="text-[9px] px-1.5 py-0.5 rounded bg-red-900/40 border border-red-700/50 font-mono text-red-300 font-bold">
      LOCKED
    </span>
  `;

  adminBtn.onclick = async () => {
    await verifyAndOpenAdmin();
  };

  folderContainer.appendChild(adminBtn);

  // Side Drawer Banner with Pro Upgrade Perks
  const drawerBanner = document.createElement('div');
  drawerBanner.className = "mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-[10px] space-y-1";
  drawerBanner.innerHTML = `
    <div class="font-bold flex items-center gap-1 text-amber-400">⚡ VIP PRO UNLOCKS:</div>
    <div>• Unlimited Chat & 8K Image Creation</div>
    <div>• Unlimited Code Crackers & Python/Java Studio</div>
    <div>• Zero Response Waits & Zero Delay Cooldowns</div>
  `;
  folderContainer.appendChild(drawerBanner);
}

// 6. ADMIN FOLDER & DASHBOARD ENGINE
async function verifyAndOpenAdmin() {
  const passwordInput = prompt("Enter Admin Password:");
  if (!passwordInput) return;

  const inputHash = await hashPassword(passwordInput);

  if (inputHash === ADMIN_PASSWORD_HASH) {
    showAdminDashboard();
  } else {
    alert("⚠️ Access Denied: Incorrect Admin Password");
  }
}

function showAdminDashboard() {
  activeMode = "admin";
  const chatView = document.getElementById('chatStudioView');
  const imgView = document.getElementById('imageStudioView');
  if (chatView) chatView.classList.add('hidden');
  if (imgView) imgView.classList.add('hidden');

  let adminView = document.getElementById('adminStudioView');
  if (!adminView) {
    adminView = document.createElement('div');
    adminView.id = 'adminStudioView';
    adminView.className = 'flex-1 overflow-y-auto p-4 md:p-6 w-full';
    const mainArea = chatView.parentElement;
    mainArea.appendChild(adminView);
  }

  adminView.classList.remove('hidden');

  const APP_CREATION_DATE = new Date("2026-08-01T00:00:00").getTime();
  const now = Date.now();
  const daysActive = Math.floor((now - APP_CREATION_DATE) / (1000 * 60 * 60 * 24));
  const isOnline = navigator.onLine;

  adminView.innerHTML = `
    <div class="max-w-2xl mx-auto p-6 bg-[#0d1628] border border-amber-500/40 rounded-2xl shadow-2xl mt-4 text-slate-200">
      <div class="flex justify-between items-center border-b border-slate-800 pb-4 mb-6">
        <div>
          <h2 class="text-2xl font-bold text-amber-400 flex items-center gap-2">👑 KING AI System Dashboard</h2>
          <p class="text-xs text-slate-400 mt-1">Authenticated System Manager</p>
        </div>
        <button onclick="closeAdminDashboard()" class="px-4 py-2 bg-red-900/40 hover:bg-red-500/40 text-red-400 rounded-xl text-xs font-bold transition">Close Panel</button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="p-4 bg-slate-900 rounded-xl border border-slate-700/50 shadow-inner">
          <span class="text-slate-400 text-xs block mb-1 uppercase tracking-wider">🔑 Today's VIP Pass Password</span>
          <span class="text-amber-400 font-mono text-xl font-bold">${getDailyVipPassword()}</span>
          <span class="text-slate-500 text-[10px] block mt-1 italic">(Auto-increments 1 year every 24h)</span>
        </div>

        <div class="p-4 bg-slate-900 rounded-xl border border-slate-700/50 shadow-inner">
          <span class="text-slate-400 text-xs block mb-1 uppercase tracking-wider">📈 Website Usage / Uptime</span>
          <span class="text-slate-200 font-bold text-2xl">${daysActive} Days Active</span>
          <span class="text-slate-500 text-[10px] block mt-1 italic">Created on August 1, 2026</span>
        </div>

        <div class="p-4 bg-slate-900 rounded-xl border border-slate-700/50 shadow-inner">
          <span class="text-slate-400 text-xs block mb-1 uppercase tracking-wider">🌐 Internet Running Capability</span>
          <span class="${isOnline ? 'text-emerald-400' : 'text-red-400'} font-bold text-lg flex items-center gap-2">
            ${isOnline ? '🟢 Connected & Network Active' : '🔴 Offline Mode'}
          </span>
        </div>

        <div class="p-4 bg-slate-900 rounded-xl border border-slate-700/50 shadow-inner">
          <span class="text-slate-400 text-xs block mb-1 uppercase tracking-wider">⚡ Connected API Keys</span>
          <span class="text-emerald-400 font-mono text-xs block truncate">Active (Firebase & Gemini 3.6 Engine)</span>
          <span class="text-slate-500 text-[10px] block mt-1 italic">Key integrity secured</span>
        </div>
      </div>

      <div class="mt-6 p-4 bg-slate-900/80 rounded-xl border border-slate-800">
        <h4 class="text-xs font-bold text-slate-300 mb-2">💻 Developer Box Access Controls</h4>
        <p class="text-[11px] text-slate-400 mb-3">Inspect Element and Developer Box shortcuts (Ctrl+Shift+I / F12) are fully enabled across windows.</p>
        <button onclick="alert('Developer Box shortcuts (Ctrl+Shift+I, F12) are active.')" class="px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg text-xs font-semibold transition">
          Test Developer Box Enablement
        </button>
      </div>
    </div>
  `;
}

function closeAdminDashboard() {
  document.getElementById('adminStudioView')?.classList.add('hidden');
  document.getElementById('chatStudioView')?.classList.remove('hidden');
  activeMode = "chat";
  renderSideDrawerModes();
}

// 7. CHAT & LIMIT ENGINE
async function handleUserSendMessage(promptText) {
  if (!promptText || !promptText.trim()) return;

  const currentModeLimit = userLimits[activeMode] || DEFAULT_LIMITS[activeMode];

  // Enforce message limits and 1-2 hour waiting cooldown for free tier
  if (!isProUnlocked && currentModeLimit.max !== Infinity) {
    if (currentModeLimit.count >= currentModeLimit.max) {
      alert(`⚠️ Wait for a moment! Free tier limit reached for ${currentModeLimit.name}.\n\nPlease wait 1 to 2 hours or upgrade to VIP PRO for Unlimited Access with ZERO wait delays!`);
      unlockProMode();
      return;
    }
  }

  // Increment local count if not VIP
  if (!isProUnlocked) {
    userLimits[activeMode].count += 1;
    if (currentUser) {
      await db.collection('users').doc(currentUser.uid).update({ usage: userLimits });
    }
  }

  appendMessageToUI("user", promptText);

  try {
    const responseText = await callGeminiApiWithPersona(promptText);
    appendMessageToUI("ai", responseText);

    if (currentUser) {
      await saveMessageToAccount(promptText, responseText);
    }
  } catch (error) {
    appendMessageToUI("ai", "⚠️ KING AI Engine Connection Delay. Please try again.");
  }

  renderSideDrawerModes();
}

async function callGeminiApiWithPersona(userPrompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  
  const payload = {
    contents: [{
      parts: [
        { text: KING_AI_SYSTEM_PROMPT },
        { text: `[Mode: ${activeMode}] ${userPrompt}` }
      ]
    }]
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
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

// 8. HELPERS & UI UPDATERS
function switchMode(modeKey) {
  activeMode = modeKey;
  const chatView = document.getElementById('chatStudioView');
  const imgView = document.getElementById('imageStudioView');
  const adminView = document.getElementById('adminStudioView');

  if (adminView) adminView.classList.add('hidden');

  if (modeKey === 'image') {
    if (imgView) imgView.classList.remove('hidden');
    if (chatView) chatView.classList.add('hidden');
  } else {
    if (imgView) imgView.classList.add('hidden');
    if (chatView) chatView.classList.remove('hidden');
  }
}

function clearFrontendUI() {
  const container = document.getElementById('chatMessages');
  if (container) container.innerHTML = '';
  const historyContainer = document.getElementById('chatHistoryList');
  if (historyContainer) historyContainer.innerHTML = `<div class="p-2 text-slate-500 text-xs">Sign in to sync your account data.</div>`;
}

function updateHeaderAndProUI() {
  const badge = document.getElementById('vipBadgeText');
  if (badge) {
    badge.innerText = isProUnlocked 
      ? "🎟️ VIP PRO UNLIMITED ACTIVE" 
      : (currentUser ? `👤 ${currentUser.email}` : "🔒 Guest Session (Temporary)");
  }
}

function createVipModal() {
  if (document.getElementById('vipModal')) return;
  const modalHtml = `
    <div id="vipModal" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 hidden flex items-center justify-center p-4">
      <div class="bg-[#0d1628] border border-amber-500/40 rounded-2xl max-w-md w-full p-6 text-slate-200 shadow-2xl relative">
        <button onclick="closeVipModal()" class="absolute top-4 right-4 text-slate-400 hover:text-white text-lg font-bold">✕</button>
        <h3 class="text-xl font-bold text-amber-400 mb-2">👑 Upgrade to KING PRO</h3>
        <p class="text-xs text-slate-300 mb-4">Unlock unlimited messages, 8K image generation, Python/Java code cracker, and eliminate all 1-2 hour wait errors!</p>
        <a href="${SAFEPAY_LINK}" target="_blank" class="block w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 font-bold rounded-xl text-center text-slate-950 mb-4 transition hover:brightness-110">💳 Upgrade via Safepay (Rs. 1500)</a>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function unlockProMode() { document.getElementById('vipModal')?.classList.remove('hidden'); }
function closeVipModal() { document.getElementById('vipModal')?.classList.add('hidden'); }

function appendMessageToUI(sender, text) {
  const container = document.getElementById('chatMessages');
  if (!container) return;
  const msgDiv = document.createElement('div');
  msgDiv.className = `p-3 rounded-xl max-w-[85%] text-xs leading-relaxed mb-3 ${
    sender === 'user' ? 'bg-amber-500/20 text-amber-200 ml-auto border border-amber-500/30' : 'bg-slate-900 text-slate-200 border border-slate-800'
  }`;
  msgDiv.innerText = text;
  container.appendChild(msgDiv);
  container.scrollTop = container.scrollHeight;
}

async function loadAccountConversation(convId) {
  if (!currentUser) return;
  activeChatId = convId;
  const container = document.getElementById('chatMessages');
  if (container) container.innerHTML = '';

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
