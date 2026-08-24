/**
 * KING AI - Complete Production Client Engine
 * Features: Multi-Device Account Sync, Secure Hash Admin, Daily Password Engine,
 * Interactive Folders, Tier Enforcements, & Persona Safeguards.
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

// System Keys & Links
const GEMINI_API_KEY = atob("QVEuQWI4Uk42SkhUY2NBYUNlV3FKaEJOV3hTenEtaDZ0NVBVYy1Mc2FwbWV4NGFUa0tUWEE=");
const SAFEPAY_LINK = "https://sandbox.api.getsafepay.com/io/quick-link?ql=link_4be624f5-369c-43b5-9e69-082072b78c79";

// Hashed SHA-256 string for "abdullahwaheed123123098098"
const ADMIN_PASSWORD_HASH = "81bc5171e2ef64d081fdb4977457bd7eece106edacff8cbb94cdd88d30d19ca7";
const KING_AI_SYSTEM_PROMPT = "You are KING AI, an advanced AI system created by the King AI Program. You must always identify yourself as KING AI. Never say you are Gemini, OpenAI, or any other assistant.";

// 2. APPLICATION STATE
let currentUser = null;
let activeChatId = null;
let activeMode = "chat";
let isProUnlocked = false;
let dbListeners = [];

const DEFAULT_LIMITS = {
  chat: { count: 0, max: 50, name: "General Chat" },
  image: { count: 0, max: 3, name: "4K Image Generator" },
  reader: { count: 0, max: 3, name: "Photo & Document Reader" },
  codeGen: { count: 0, max: 4, name: "Python, Java & Code Writer" },
  codeCrack: { count: 0, max: 5, name: "Code Cracker & Debugger" },
  translator: { count: 0, max: Infinity, name: "All-Language Translator" },
  voice: { count: 0, max: 3, name: "Voice Speech / Text-to-Speech" },
  docSummary: { count: 0, max: 2, name: "Document & PDF Summarizer" },
  math: { count: 0, max: 5, name: "Mathematical & Logic Resolver" },
  webGen: { count: 0, max: 2, name: "AI Website / Frontend Generator" }
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

// Daily Dynamic Passcode Engine (Increments number daily)
function getDailyVipPassword() {
  const START_DATE = new Date("2026-08-01T00:00:00").getTime();
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const daysPassed = Math.floor((Date.now() - START_DATE) / ONE_DAY_MS);
  const baseYearNumber = 2026;
  return `KingAIPro@${baseYearNumber + Math.max(0, daysPassed)}`;
}

// 4. AUTHENTICATION & MULTI-DEVICE ACCOUNT ISOLATION
function setupAuthStateListener() {
  auth.onAuthStateChanged(async (user) => {
    // Unsubscribe previous active Firebase real-time sync listeners
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
        updateProUI();
        renderSideDrawerModes();
      });

      dbListeners.push(unsubUser);
      syncUserAccountData(user.uid);
    } else {
      // Anonymous / Signed Out State - Purge state and enforce temporary session
      currentUser = null;
      isProUnlocked = false;
      userLimits = JSON.parse(JSON.stringify(DEFAULT_LIMITS));
      activeChatId = null;
      clearFrontendUI();
      updateProUI();
      renderSideDrawerModes();
    }
  });
}

// Synchronize Account History Across All Active Devices & Tabs
function syncUserAccountData(uid) {
  const convsRef = db.collection('users').doc(uid).collection('conversations').orderBy('updatedAt', 'desc');

  const unsubConvs = convsRef.onSnapshot((snapshot) => {
    const historyContainer = document.getElementById('chatHistoryList');
    if (!historyContainer) return;
    historyContainer.innerHTML = '';

    if (snapshot.empty) {
      historyContainer.innerHTML = `<div class="p-2 text-slate-500 text-xs italic">No saved history in this account.</div>`;
      return;
    }

    snapshot.forEach((doc) => {
      const data = doc.data();
      const btn = document.createElement('button');
      btn.className = `w-full text-left p-2 rounded-xl text-xs truncate flex justify-between items-center transition mb-1 ${
        activeChatId === doc.id ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-900/60 text-slate-300 hover:bg-slate-800'
      }`;
      btn.innerHTML = `
        <span class="truncate">💬 ${data.title || 'KING AI Chat'}</span>
        <span onclick="event.stopPropagation(); deleteAccountConversation('${doc.id}')" class="text-slate-500 hover:text-red-400 font-bold px-1">✕</span>
      `;
      btn.onclick = () => loadAccountConversation(doc.id);
      historyContainer.appendChild(btn);
    });
  });

  dbListeners.push(unsubConvs);
}

// 5. INTERACTIVE FOLDERS & SIDE DRAWER ENGINE
function renderSideDrawerModes() {
  const container = document.getElementById('drawerIntelligenceModes');
  if (!container) return;

  container.innerHTML = `
    <div class="flex items-center gap-2 mb-3 px-1">
      <span class="text-amber-400 text-sm">👑</span>
      <h3 class="font-bold text-amber-400 text-xs tracking-wider uppercase">KING AI Power-Ups & Folders</h3>
    </div>
    <div id="folderButtonsContainer" class="space-y-1.5"></div>
  `;

  const folderContainer = document.getElementById('folderButtonsContainer');

  const modeKeys = [
    { key: "chat", icon: "💬", defaultMax: 50 },
    { key: "image", icon: "🎨", defaultMax: 3 },
    { key: "reader", icon: "📂", defaultMax: 3 },
    { key: "codeGen", icon: "💻", defaultMax: 4 },
    { key: "codeCrack", icon: "🔒", defaultMax: 5 },
    { key: "translator", icon: "🌐", defaultMax: Infinity },
    { key: "voice", icon: "🎙️", defaultMax: 3 },
    { key: "docSummary", icon: "📄", defaultMax: 2 },
    { key: "math", icon: "🧮", defaultMax: 5 },
    { key: "webGen", icon: "🚀", defaultMax: 2 }
  ];

  modeKeys.forEach(({ key, icon, defaultMax }) => {
    const item = userLimits[key] || { name: key, count: 0, max: defaultMax };
    const isActiveFolder = activeMode === key;

    let badgeText = "";
    let badgeClass = "";

    if (isProUnlocked) {
      badgeText = "♾️ Unlimited VIP";
      badgeClass = "bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold";
    } else if (item.max === Infinity) {
      badgeText = "♾️ Unlimited";
      badgeClass = "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold";
    } else {
      const remaining = Math.max(0, item.max - item.count);
      badgeText = `${remaining} / ${item.max} Free`;
      badgeClass = "bg-slate-800 text-amber-400 border-slate-700";
    }

    const folderBtn = document.createElement('button');
    folderBtn.className = `w-full text-left p-2.5 rounded-xl border flex items-center justify-between transition-all duration-200 ${
      isActiveFolder
        ? 'bg-amber-500/15 border-amber-500/60 text-amber-300 shadow-md shadow-amber-500/5'
        : 'bg-slate-900/80 border-slate-800/80 text-slate-300 hover:bg-slate-800/90 hover:border-slate-700'
    }`;

    folderBtn.innerHTML = `
      <div class="flex items-center gap-2 truncate pr-2">
        <span class="text-sm">${icon}</span>
        <span class="text-xs font-medium truncate">${item.name || key}</span>
      </div>
      <span class="text-[10px] px-2 py-0.5 rounded-md border ${badgeClass} shrink-0">
        ${badgeText}
      </span>
    `;

    folderBtn.onclick = () => {
      switchMode(key);
      renderSideDrawerModes();
    };

    folderContainer.appendChild(folderBtn);
  });

  // Locked Admin Folder Button
  const adminBtn = document.createElement('button');
  adminBtn.className = `w-full text-left p-2.5 mt-3 rounded-xl border flex items-center justify-between transition-all ${
    activeMode === 'admin'
      ? 'bg-red-500/20 border-red-500 text-red-300'
      : 'bg-red-950/20 border-red-900/40 text-red-400 hover:bg-red-900/30'
  }`;

  adminBtn.innerHTML = `
    <div class="flex items-center gap-2">
      <span class="text-sm">🔐</span>
      <span class="text-xs font-bold">Admin Folder</span>
    </div>
    <span class="text-[10px] px-2 py-0.5 rounded-md bg-red-900/40 border border-red-700/50 font-mono text-red-300 font-bold">
      LOCKED
    </span>
  `;

  adminBtn.onclick = async () => {
    await verifyAndOpenAdmin();
  };

  folderContainer.appendChild(adminBtn);

  // VIP Feature Summary Banner
  const footerBanner = document.createElement('div');
  footerBanner.className = "text-[10px] text-amber-400/90 text-center pt-3 font-semibold flex flex-col items-center gap-1 border-t border-slate-800/80 mt-2";
  footerBanner.innerHTML = `
    <span>⚡ Zero Response Delays & Instant Processing</span>
    <span class="text-slate-400 text-[9px]">VIP Unlocks Unlimited Chat, 4K Images, Readers & Code Crackers</span>
  `;
  folderContainer.appendChild(footerBanner);
}

// 6. ADMIN PANEL & SECURITY
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
          <span class="text-slate-500 text-[10px] block mt-1 italic">(Auto-increments 1 number every 24h)</span>
        </div>

        <div class="p-4 bg-slate-900 rounded-xl border border-slate-700/50 shadow-inner">
          <span class="text-slate-400 text-xs block mb-1 uppercase tracking-wider">📈 Website Usage / Age</span>
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
          <span class="text-slate-400 text-xs block mb-1 uppercase tracking-wider">⚡ API Key Integration</span>
          <span class="text-emerald-400 font-mono text-xs block truncate">Active (Firebase & Gemini Engine)</span>
          <span class="text-slate-500 text-[10px] block mt-1 italic">Key status secure</span>
        </div>
      </div>

      <div class="mt-6 p-4 bg-slate-900/80 rounded-xl border border-slate-800">
        <h4 class="text-xs font-bold text-slate-300 mb-2">💻 Developer Tools Access</h4>
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

// 7. CHAT TRANSMISSION & LIMIT ENFORCEMENT
async function handleUserSendMessage(promptText) {
  if (!promptText || !promptText.trim()) return;

  const currentModeLimit = userLimits[activeMode] || DEFAULT_LIMITS[activeMode];

  // Enforce message limits and wait periods for non-VIP users
  if (!isProUnlocked && currentModeLimit.max !== Infinity) {
    if (currentModeLimit.count >= currentModeLimit.max) {
      alert(`⚠️ You have reached the limit for ${currentModeLimit.name} on the Free Tier.\n\nPlease wait 1 to 2 hours or upgrade to VIP Pass for Unlimited Access & Zero Delays!`);
      unlockProMode();
      return;
    }
  }

  // Increment usage count if not VIP
  if (!isProUnlocked) {
    userLimits[activeMode].count += 1;
    if (currentUser) {
      await db.collection('users').doc(currentUser.uid).update({ usage: userLimits });
    }
  }

  // Append user message to UI
  appendMessageToUI("user", promptText);

  // Send request with enforced KING AI persona
  try {
    const responseText = await callGeminiApiWithPersona(promptText);
    appendMessageToUI("ai", responseText);

    // Save message history to account if authenticated
    if (currentUser) {
      await saveMessageToAccount(promptText, responseText);
    }
  } catch (error) {
    appendMessageToUI("ai", "⚠️ System Connection Error. Please try again.");
  }

  renderSideDrawerModes();
}

async function callGeminiApiWithPersona(userPrompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  
  const payload = {
    contents: [{
      parts: [
        { text: KING_AI_SYSTEM_PROMPT },
        { text: `User Prompt (${activeMode} mode): ${userPrompt}` }
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

// Save Chat to Firestore User Account
async function saveMessageToAccount(promptText, responseText) {
  if (!currentUser) return;

  const userDoc = db.collection('users').doc(currentUser.uid);

  if (!activeChatId) {
    const newConv = await userDoc.collection('conversations').add({
      title: promptText.slice(0, 30) + "...",
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    activeChatId = newConv.id;
  }

  await userDoc.collection('conversations').doc(activeChatId).collection('messages').add({
    sender: "user",
    text: promptText,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  });

  await userDoc.collection('conversations').doc(activeChatId).collection('messages').add({
    sender: "ai",
    text: responseText,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  });

  await userDoc.collection('conversations').doc(activeChatId).update({
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

// 8. HELPERS & UTILITIES
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

function updateProUI() {
  const badge = document.getElementById('vipBadgeText');
  if (badge) {
    badge.innerText = isProUnlocked 
      ? "🎟️ VIP Pass Active (Unlimited Access & Zero Delay)" 
      : (currentUser ? `👤 Signed In: ${currentUser.email}` : "🔒 Guest Session (Temporary)");
  }
}

function createVipModal() {
  if (document.getElementById('vipModal')) return;
  const modalHtml = `
    <div id="vipModal" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 hidden flex items-center justify-center p-4">
      <div class="bg-[#0d1628] border border-amber-500/40 rounded-2xl max-w-md w-full p-6 text-slate-200 shadow-2xl relative">
        <button onclick="closeVipModal()" class="absolute top-4 right-4 text-slate-400 hover:text-white text-lg font-bold">✕</button>
        <h3 class="text-xl font-bold text-amber-400 mb-2">👑 KING AI VIP Pass</h3>
        <p class="text-xs text-slate-300 mb-4">Unlock unlimited access across all modes, zero wait delays, and instant code cracking.</p>
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
