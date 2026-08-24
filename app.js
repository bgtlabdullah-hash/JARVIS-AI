// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyCtQ0mFr-Sj2yxkIWFKal4tuvi9HrjvUGc",
  authDomain: "king-ai-pro.firebaseapp.com",
  projectId: "king-ai-pro",
  storageBucket: "king-ai-pro.firebasestorage.app",
  messagingSenderId: "1031703957787",
  appId: "1:1031703957787:web:6bd7a28e6a9d2252e4c3be",
  measurementId: "G-412V3TL038"
};

// Initialize Firebase Services
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// API & Payment Credentials
const GEMINI_API_KEY = atob("QVEuQWI4Uk42SkhUY2NBYUNlV3FKaEJOV3hTenEtaDZ0NVBVYy1Mc2FwbWV4NGFUa0tUWEE=");
const SAFEPAY_LINK = "https://sandbox.api.getsafepay.com/io/quick-link?ql=link_4be624f5-369c-43b5-9e69-082072b78c79";

let currentUser = null;
let activeChatId = null;
let guestChats = [];
let attachedImageBase64 = null;

// LocalStorage Tracking Counters
let msgCount = parseInt(localStorage.getItem('king_msg_count') || '0', 10);
let imgCount = parseInt(localStorage.getItem('king_img_count') || '0', 10);
let codeGenCount = parseInt(localStorage.getItem('king_code_gen_count') || '0', 10);
let codeCrackCount = parseInt(localStorage.getItem('king_code_crack_count') || '0', 10);
let voiceCount = parseInt(localStorage.getItem('king_voice_count') || '0', 10);
let docSummaryCount = parseInt(localStorage.getItem('king_doc_count') || '0', 10);
let mathSolveCount = parseInt(localStorage.getItem('king_math_count') || '0', 10);
let webGenCount = parseInt(localStorage.getItem('king_web_gen_count') || '0', 10);
let isProUnlocked = localStorage.getItem('king_pro_unlocked') === 'true';

// Calculate Daily Password Increment (Base: KingAI@2026)
function getTodaysVipCode() {
  const baseYear = 2026;
  const startDate = new Date(2026, 7, 24);
  const today = new Date();
  const diffDays = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
  const dynamicYear = baseYear + (diffDays > 0 ? diffDays : 0);
  return `KingAI@${dynamicYear}`;
}

document.addEventListener('DOMContentLoaded', () => {
  if (!auth.currentUser) {
    localStorage.removeItem('king_msg_count');
    localStorage.removeItem('king_img_count');
    localStorage.removeItem('king_code_gen_count');
    localStorage.removeItem('king_code_crack_count');
    localStorage.removeItem('king_voice_count');
    localStorage.removeItem('king_doc_count');
    localStorage.removeItem('king_math_count');
    localStorage.removeItem('king_web_gen_count');
    localStorage.removeItem('king_pro_unlocked');
    msgCount = imgCount = codeGenCount = codeCrackCount = voiceCount = docSummaryCount = mathSolveCount = webGenCount = 0;
    isProUnlocked = false;
  }

  updateProUI();
  injectMediaInputControls();
  createVipModal();
  renderSideDrawerFeatures();
});

// Render Side Drawer VIP Features Breakdown
function renderSideDrawerFeatures() {
  const drawerContainer = document.getElementById('chatHistoryList')?.parentElement;
  if (!drawerContainer || document.getElementById('drawerVipFeatures')) return;

  const featuresDiv = document.createElement('div');
  featuresDiv.id = 'drawerVipFeatures';
  featuresDiv.className = "mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs space-y-1.5 text-amber-300";
  featuresDiv.innerHTML = `
    <div class="font-bold text-amber-400 mb-1">👑 KING AI Power-Ups & Limits:</div>
    <div>💬 General Chat (50 Free / ♾️ VIP)</div>
    <div>🎨 4K Image Generator (3 Free / ♾️ VIP)</div>
    <div>📁 Photo & Document Reader (3 Free / ♾️ VIP)</div>
    <div>💻 Code Generator (4 Free / ♾️ VIP)</div>
    <div>🔓 Code Cracker & Debugger (5 Free / ♾️ VIP)</div>
    <div>🌐 Multi-Language Translator (♾️ Unlimited)</div>
    <div>🎙️ AI Voice Speech Synthesizer (3 Free / ♾️ VIP)</div>
    <div>📑 PDF & Doc Summarizer (2 Free / ♾️ VIP)</div>
    <div>🧮 Math & Logic Solver (5 Free / ♾️ VIP)</div>
    <div>🚀 AI Web Page Builder (2 Free / ♾️ VIP)</div>
    <div>⚡ Zero Response Delays & Instant Processing</div>
  `;
  drawerContainer.appendChild(featuresDiv);
}

// VIP Upgrade Modal
function createVipModal() {
  if (document.getElementById('vipModal')) return;

  const modalHtml = `
    <div id="vipModal" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 hidden flex items-center justify-center p-4">
      <div class="bg-[#0d1628] border border-amber-500/40 rounded-2xl max-w-md w-full p-6 text-slate-200 shadow-2xl relative">
        <button onclick="closeVipModal()" class="absolute top-4 right-4 text-slate-400 hover:text-white text-lg font-bold">✕</button>
        <h3 class="text-xl font-bold text-amber-400 mb-2 flex items-center gap-2">👑 Upgrade to KING AI PRO</h3>
        <p class="text-xs text-slate-300 mb-4">Unlock zero waiting delays, unlimited coding, web page creation, image generation, voice speech, and math solving.</p>
        
        <div class="space-y-3 mb-6">
          <a href="${SAFEPAY_LINK}" target="_blank" class="block w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold rounded-xl text-center shadow-lg transition">
            💳 Pay via Safepay Checkout
          </a>
        </div>

        <div class="border-t border-slate-800 pt-4">
          <label class="block text-xs font-semibold text-amber-300/80 mb-2">Have Daily VIP Pass Key?</label>
          <div class="flex gap-2">
            <input type="password" id="vipPassInput" placeholder="Enter Daily Pass Code" class="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white w-full focus:outline-none focus:border-amber-500">
            <button onclick="verifyVipCode()" class="bg-amber-500/20 border border-amber-500/50 text-amber-300 px-4 py-2 rounded-lg text-xs font-bold hover:bg-amber-500/30 transition">Activate</button>
          </div>
          <p id="vipErrorMsg" class="text-[11px] text-red-400 mt-2 hidden">❌ Invalid Pass Code. Passes increment daily.</p>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function unlockProMode() {
  const modal = document.getElementById('vipModal');
  if (modal) modal.classList.remove('hidden');
}

function closeVipModal() {
  const modal = document.getElementById('vipModal');
  if (modal) modal.classList.add('hidden');
}

function verifyVipCode() {
  const code = document.getElementById('vipPassInput').value.trim();
  const err = document.getElementById('vipErrorMsg');

  if (code === getTodaysVipCode()) {
    isProUnlocked = true;
    localStorage.setItem('king_pro_unlocked', 'true');
    
    if (currentUser) {
      db.collection('users').doc(currentUser.uid).set({ isVIP: true }, { merge: true });
    }

    updateProUI();
    closeVipModal();
    alert("🎉 King AI VIP Pass activated! Unlimited access granted for all features.");
  } else {
    if (err) err.classList.remove('hidden');
  }
}

function updateProUI() {
  const btn = document.getElementById('proStatusBtn');
  const badge = document.getElementById('vipBadgeText');

  if (isProUnlocked) {
    if (btn) {
      btn.className = "bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 text-xs font-bold px-3 py-1.5 rounded-lg";
      btn.innerHTML = "📺 VIP UNLIMITED ACTIVE";
      btn.onclick = () => alert("VIP Active! Unlimited messages, code, web generation, and speech synthesizer.");
    }
    if (badge) badge.innerText = "🎟️ VIP Pass Active (Unlimited Access)";
  } else {
    if (btn) {
      btn.className = "bg-amber-500/20 border border-amber-500/50 text-amber-400 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-amber-500/30 transition cursor-pointer";
      btn.innerHTML = "⚡ Upgrade to PRO";
      btn.onclick = unlockProMode;
    }
    const remainingMsgs = Math.max(0, 50 - msgCount);
    if (badge) badge.innerText = `🔒 Free Tier (${remainingMsgs} Msgs left)`;
  }
}

// Media Controls
function injectMediaInputControls() {
  const chatForm = document.getElementById('chatForm') || document.querySelector('form');
  if (!chatForm || document.getElementById('chatImageUpload')) return;

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.id = 'chatImageUpload';
  fileInput.accept = 'image/*';
  fileInput.style.display = 'none';

  const cameraInput = document.createElement('input');
  cameraInput.type = 'file';
  cameraInput.id = 'chatCameraUpload';
  cameraInput.accept = 'image/*';
  cameraInput.capture = 'environment';
  cameraInput.style.display = 'none';

  const mediaBtnGroup = document.createElement('div');
  mediaBtnGroup.className = "flex items-center gap-1 mr-2";
  mediaBtnGroup.innerHTML = `
    <button type="button" onclick="document.getElementById('chatImageUpload').click()" title="Upload Photo" class="p-2 text-slate-400 hover:text-amber-400 bg-slate-800/80 rounded-lg text-sm">📁</button>
    <button type="button" onclick="document.getElementById('chatCameraUpload').click()" title="Take Photo" class="p-2 text-slate-400 hover:text-amber-400 bg-slate-800/80 rounded-lg text-sm">📸</button>
  `;

  chatForm.insertBefore(mediaBtnGroup, chatForm.firstChild);
  document.body.appendChild(fileInput);
  document.body.appendChild(cameraInput);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        attachedImageBase64 = event.target.result.split(',')[1];
        appendMessage('user', `📷 Attached File: ${file.name}`);
      };
      reader.readAsDataURL(file);
    }
  };

  fileInput.addEventListener('change', handleFileSelect);
  cameraInput.addEventListener('change', handleFileSelect);
}

// Auth Listener
auth.onAuthStateChanged(async (user) => {
  const signInBtn = document.getElementById('signInBtn');
  const signOutBtn = document.getElementById('signOutBtn');

  if (user) {
    currentUser = user;
    if (signInBtn) signInBtn.classList.add('hidden');
    if (signOutBtn) signOutBtn.classList.remove('hidden');

    document.getElementById('userNameDisplay').innerText = user.displayName || "Abdullah Waheed";
    document.getElementById('userEmailDisplay').innerText = user.email || "Official User";

    const userDocRef = db.collection('users').doc(user.uid);
    const doc = await userDocRef.get();
    
    if (doc.exists && doc.data().isVIP) {
      isProUnlocked = true;
      localStorage.setItem('king_pro_unlocked', 'true');
    } else if (!doc.exists) {
      await userDocRef.set({ isVIP: isProUnlocked, email: user.email, name: user.displayName });
    }

    updateProUI();
    syncUserData();
  } else {
    currentUser = null;
    activeChatId = null;

    if (signInBtn) signInBtn.classList.remove('hidden');
    if (signOutBtn) signOutBtn.classList.add('hidden');

    document.getElementById('userNameDisplay').innerText = "Abdullah Waheed";
    document.getElementById('userEmailDisplay').innerText = "Official App Owner & Creator";

    renderGuestHistory();
  }
});

function loginWithGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider).catch(err => alert("Google Sign-In Error: " + err.message));
}

function logout() {
  auth.signOut();
  localStorage.clear();
  location.reload();
}

function syncUserData() {
  if (!currentUser) return;

  db.collection('users').doc(currentUser.uid).collection('chats')
    .orderBy('updatedAt', 'desc')
    .onSnapshot(snapshot => {
      const chatList = document.getElementById('chatHistoryList');
      if (!chatList) return;
      chatList.innerHTML = '';

      let count = 0;
      snapshot.forEach(doc => {
        count++;
        const chat = doc.data();
        const div = document.createElement('div');
        div.className = "p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex justify-between items-center cursor-pointer mb-1";
        div.innerHTML = `<span class="truncate">${chat.title || 'Conversation'}</span><span onclick="deleteChat('${doc.id}', event)" class="text-slate-500 hover:text-red-400 text-[10px]">✕</span>`;
        div.onclick = () => loadCloudChat(doc.id, chat.messages);
        chatList.appendChild(div);
      });

      if (document.getElementById('savedCreationsCount')) {
        document.getElementById('savedCreationsCount').innerText = count;
      }
    });
}

function renderGuestHistory() {
  const chatList = document.getElementById('chatHistoryList');
  if (!chatList) return;
  chatList.innerHTML = '';

  guestChats.forEach((chat, idx) => {
    const div = document.createElement('div');
    div.className = "p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex justify-between items-center cursor-pointer mb-1";
    div.innerHTML = `<span class="truncate">${chat.title}</span><span onclick="deleteGuestChat(${idx}, event)" class="text-slate-500 hover:text-red-400 text-[10px]">✕</span>`;
    div.onclick = () => loadGuestChat(idx);
    chatList.appendChild(div);
  });
}

// Chat & Feature Limit Manager
async function handleChatSubmit(e) {
  e.preventDefault();
  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  if (!text && !attachedImageBase64) return;

  const lowerText = text.toLowerCase();

  const isCodePrompt = lowerText.includes("code") || lowerText.includes("python") || lowerText.includes("java") || lowerText.includes("script") || lowerText.includes("html");
  const isCrackPrompt = lowerText.includes("crack") || lowerText.includes("debug") || lowerText.includes("fix code") || lowerText.includes("decompile");
  const isVoicePrompt = lowerText.startsWith("speak") || lowerText.startsWith("say in voice") || lowerText.startsWith("read aloud");
  const isDocPrompt = lowerText.includes("summarize doc") || lowerText.includes("pdf summary") || lowerText.includes("summarize document");
  const isMathPrompt = lowerText.includes("solve math") || lowerText.includes("equation") || lowerText.includes("calculate");
  const isWebPrompt = lowerText.includes("build website") || lowerText.includes("generate page") || lowerText.includes("create web app");

  // Check Feature Limits
  if (!isProUnlocked) {
    if (isCodePrompt && codeGenCount >= 4) {
      alert("⚠️ Free Limit Reached! 4 free code generation prompts used. Upgrade to VIP!");
      unlockProMode();
      return;
    }
    if (isCrackPrompt && codeCrackCount >= 5) {
      alert("⚠️ Free Limit Reached! 5 free code cracking prompts used. Upgrade to VIP!");
      unlockProMode();
      return;
    }
    if (isVoicePrompt && voiceCount >= 3) {
      alert("⚠️ Free Limit Reached! 3 free voice synthesis prompts used. Upgrade to VIP!");
      unlockProMode();
      return;
    }
    if (isDocPrompt && docSummaryCount >= 2) {
      alert("⚠️ Free Limit Reached! 2 free document summarizer prompts used. Upgrade to VIP!");
      unlockProMode();
      return;
    }
    if (isMathPrompt && mathSolveCount >= 5) {
      alert("⚠️ Free Limit Reached! 5 free math solver prompts used. Upgrade to VIP!");
      unlockProMode();
      return;
    }
    if (isWebPrompt && webGenCount >= 2) {
      alert("⚠️ Free Limit Reached! 2 free AI web page builder prompts used. Upgrade to VIP!");
      unlockProMode();
      return;
    }
    if (msgCount >= 50) {
      alert("⚠️ Free Limit Reached! 50 messages used. Upgrade to VIP!");
      unlockProMode();
      return;
    }
  }

  // Handle Image Requests
  if (lowerText.startsWith("generate image") || lowerText.startsWith("make image") || lowerText.startsWith("draw")) {
    if (!isProUnlocked && imgCount >= 3) {
      alert("⚠️ Free Tier Limit Reached! Upgrade to VIP / PRO for unlimited images!");
      unlockProMode();
      return;
    }

    input.value = '';
    const prompt = text.replace(/(generate image|make image|draw)/i, '').trim();
    appendMessage('user', text);
    appendMessage('assistant', `🎨 Generating image for: "${prompt}"...`);
    generateImageFromText(prompt);

    if (!isProUnlocked) {
      imgCount++;
      localStorage.setItem('king_img_count', imgCount);
      updateProUI();
    }
    return;
  }

  input.value = '';
  if (text) appendMessage('user', text);

  if (!isProUnlocked) {
    msgCount++;
    localStorage.setItem('king_msg_count', msgCount);
    if (isCodePrompt) { codeGenCount++; localStorage.setItem('king_code_gen_count', codeGenCount); }
    if (isCrackPrompt) { codeCrackCount++; localStorage.setItem('king_code_crack_count', codeCrackCount); }
    if (isVoicePrompt) { voiceCount++; localStorage.setItem('king_voice_count', voiceCount); }
    if (isDocPrompt) { docSummaryCount++; localStorage.setItem('king_doc_count', docSummaryCount); }
    if (isMathPrompt) { mathSolveCount++; localStorage.setItem('king_math_count', mathSolveCount); }
    if (isWebPrompt) { webGenCount++; localStorage.setItem('king_web_gen_count', webGenCount); }
    updateProUI();
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent`;
    const systemPrompt = "You are KING AI, an advanced AI suite created by Abdullah Waheed. You excel in programming, code cracking, math solving, document analysis, voice generation, and web design. You are strictly King AI.";

    const parts = [{ text: `${systemPrompt}\n\nUser Prompt: ${text}` }];
    if (attachedImageBase64) {
      parts.push({
        inline_data: { mime_type: "image/jpeg", data: attachedImageBase64 }
      });
      attachedImageBase64 = null;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY },
      body: JSON.stringify({ contents: [{ parts: parts }] })
    });

    const data = await response.json();
    
    if (response.ok && data.candidates && data.candidates[0].content && data.candidates[0].content.parts[0].text) {
      const reply = data.candidates[0].content.parts[0].text;
      appendMessage('assistant', reply);

      if (isVoicePrompt && 'speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(reply.substring(0, 200));
        window.speechSynthesis.speak(utterance);
      }

      if (currentUser) saveMessageToCloud(text, reply);
      else saveGuestChat(text, reply);
    } else {
      const errDetail = data.error ? data.error.message : "API configuration error.";
      appendMessage('assistant', `👑 King AI Error: ${errDetail}`);
    }
  } catch (err) {
    appendMessage('assistant', "👑 King AI: Connection error. Please verify network.");
  }
}

function appendMessage(role, text) {
  const container = document.getElementById('chatMessages');
  if (!container) return;
  const div = document.createElement('div');
  div.className = role === 'user' 
    ? "p-3 bg-slate-800 rounded-xl text-white ml-auto max-w-md shadow whitespace-pre-wrap" 
    : "p-3 bg-[#0d1628] border border-slate-800 rounded-xl text-amber-300 mr-auto max-w-md shadow whitespace-pre-wrap";
  div.innerText = text;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

async function generateImageFromText(promptText) {
  const seed = Math.floor(Math.random() * 1000000);
  const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(promptText)}?width=1280&height=720&nologo=true&seed=${seed}`;
  
  const container = document.getElementById('chatMessages');
  if (!container) return;

  const div = document.createElement('div');
  div.className = "p-3 bg-[#0d1628] border border-slate-800 rounded-xl text-amber-300 mr-auto max-w-md shadow";
  div.innerHTML = `<img src="${imageUrl}" class="w-full h-auto rounded-lg shadow-md mb-2" alt="Generated Image"><p class="text-xs text-amber-400/80">✨ ${promptText}</p>`;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function switchMode(mode) {
  const imgView = document.getElementById('imageStudioView');
  const chatView = document.getElementById('chatStudioView');

  if (mode === 'image') {
    if (imgView) imgView.classList.remove('hidden');
    if (chatView) chatView.classList.add('hidden');
  } else {
    if (imgView) imgView.classList.add('hidden');
    if (chatView) chatView.classList.remove('hidden');
  }
}

function saveMessageToCloud(userMsg, aiMsg) {
  if (!currentUser) return;
  if (!activeChatId) {
    activeChatId = db.collection('users').doc(currentUser.uid).collection('chats').doc().id;
  }
  const chatRef = db.collection('users').doc(currentUser.uid).collection('chats').doc(activeChatId);
  chatRef.set({
    title: userMsg.substring(0, 18) + '...',
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    messages: firebase.firestore.FieldValue.arrayUnion(
      { role: 'user', text: userMsg },
      { role: 'assistant', text: aiMsg }
    )
  }, { merge: true });
}

function saveGuestChat(userMsg, aiMsg) {
  guestChats.push({ title: userMsg.substring(0, 18) + '...', messages: [{ role: 'user', text: userMsg }, { role: 'assistant', text: aiMsg }] });
  renderGuestHistory();
}

function loadCloudChat(id, messages) {
  activeChatId = id;
  const container = document.getElementById('chatMessages');
  if (!container) return;
  container.innerHTML = '';
  if (Array.isArray(messages)) {
    messages.forEach(m => appendMessage(m.role, m.text));
  }
  switchMode('chat');
}

function loadGuestChat(idx) {
  const container = document.getElementById('chatMessages');
  if (!container) return;
  container.innerHTML = '';
  if (guestChats[idx] && guestChats[idx].messages) {
    guestChats[idx].messages.forEach(m => appendMessage(m.role, m.text));
  }
  switchMode('chat');
}

function createNewChat() {
  activeChatId = null;
  const container = document.getElementById('chatMessages');
  if (container) container.innerHTML = '<div class="p-4 bg-[#0d1628] border border-slate-800 rounded-2xl text-amber-300 max-w-xl shadow-lg">👑 New Session Started</div>';
  switchMode('chat');
}

function deleteChat(id, e) {
  e.stopPropagation();
  if (!currentUser) return;
  db.collection('users').doc(currentUser.uid).collection('chats').doc(id).delete();
}

function deleteGuestChat(idx, e) {
  e.stopPropagation();
  guestChats.splice(idx, 1);
  renderGuestHistory();
}

function clearHistory() {
  if (currentUser) {
    db.collection('users').doc(currentUser.uid).collection('chats').get().then(snap => {
      snap.forEach(doc => doc.ref.delete());
    });
  } else {
    guestChats = [];
    renderGuestHistory();
  }
  createNewChat();
}
