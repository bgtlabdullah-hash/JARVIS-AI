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

// Track usage in LocalStorage
let msgCount = parseInt(localStorage.getItem('king_msg_count') || '0', 10);
let imgCount = parseInt(localStorage.getItem('king_img_count') || '0', 10);
let isProUnlocked = localStorage.getItem('king_pro_unlocked') === 'true';

document.addEventListener('DOMContentLoaded', () => {
  updateProUI();
  injectMediaInputControls();
  createVipModal();
});

// Create Interactive VIP Modal Interface
function createVipModal() {
  if (document.getElementById('vipModal')) return;

  const modalHtml = `
    <div id="vipModal" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 hidden flex items-center justify-center p-4">
      <div class="bg-[#0d1628] border border-amber-500/40 rounded-2xl max-w-md w-full p-6 text-slate-200 shadow-2xl relative">
        <button onclick="closeVipModal()" class="absolute top-4 right-4 text-slate-400 hover:text-white text-lg font-bold">✕</button>
        <h3 class="text-xl font-bold text-amber-400 mb-2 flex items-center gap-2">👑 Upgrade to KING AI PRO</h3>
        <p class="text-xs text-slate-300 mb-4">Unlock unlimited chat messages, unlimited 4K image generations, and priority processing.</p>
        
        <div class="space-y-3 mb-6">
          <a href="${SAFEPAY_LINK}" target="_blank" class="block w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold rounded-xl text-center shadow-lg transition">
            💳 Pay via Safepay Checkout
          </a>
        </div>

        <div class="border-t border-slate-800 pt-4">
          <label class="block text-xs font-semibold text-amber-300/80 mb-2">Already have a VIP Pass Code?</label>
          <div class="flex gap-2">
            <input type="password" id="vipPassInput" placeholder="Enter VIP Pass Code" class="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white w-full focus:outline-none focus:border-amber-500">
            <button onclick="verifyVipCode()" class="bg-amber-500/20 border border-amber-500/50 text-amber-300 px-4 py-2 rounded-lg text-xs font-bold hover:bg-amber-500/30 transition">Activate</button>
          </div>
          <p id="vipErrorMsg" class="text-[11px] text-red-400 mt-2 hidden">❌ Invalid Pass Code. Try again!</p>
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

  if (code === "KingAI@2026") {
    isProUnlocked = true;
    localStorage.setItem('king_pro_unlocked', 'true');
    updateProUI();
    closeVipModal();
    alert("🎉 King AI PRO / VIP Pass activated successfully! Unlimited access granted.");
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
      btn.onclick = () => alert("VIP Pass active! You have unlimited messages and image generations.");
    }
    if (badge) badge.innerText = "🎟️ VIP Pass Active (Unlimited)";
  } else {
    if (btn) {
      btn.className = "bg-amber-500/20 border border-amber-500/50 text-amber-400 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-amber-500/30 transition cursor-pointer";
      btn.innerHTML = "⚡ Upgrade to PRO";
      btn.onclick = unlockProMode;
    }
    const remainingMsgs = Math.max(0, 50 - msgCount);
    const remainingImgs = Math.max(0, 3 - imgCount);
    if (badge) badge.innerText = `🔒 Free Tier (${remainingMsgs} Msgs, ${remainingImgs} Imgs left)`;
  }
}

// Inject Upload & Camera buttons beside Chat Input
function injectMediaInputControls() {
  const chatForm = document.getElementById('chatForm') || document.querySelector('form');
  if (!chatForm) return;

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
        appendMessage('user', `📷 Attached Image: ${file.name}`);
      };
      reader.readAsDataURL(file);
    }
  };

  fileInput.addEventListener('change', handleFileSelect);
  cameraInput.addEventListener('change', handleFileSelect);
}

// Authentication Listener
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
    if (!doc.exists) {
      await userDocRef.set({ isVIP: false, email: user.email, name: user.displayName });
    }
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

// Direct Chat & Generation Handler
async function handleChatSubmit(e) {
  e.preventDefault();
  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  if (!text && !attachedImageBase64) return;

  // Handle Image Creation Requests
  if (text.toLowerCase().startsWith("generate image") || text.toLowerCase().startsWith("make image") || text.toLowerCase().startsWith("draw")) {
    if (!isProUnlocked && imgCount >= 3) {
      alert("⚠️ Free Tier Limit Reached! You have used your 3 free image creations. Upgrade to PRO for unlimited images!");
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

  // Handle Chat Message Limits
  if (!isProUnlocked && msgCount >= 50) {
    alert("⚠️ Free Tier Limit Reached! You have used all 50 free messages. Upgrade to PRO for unlimited access!");
    unlockProMode();
    return;
  }

  input.value = '';
  if (text) appendMessage('user', text);

  if (!isProUnlocked) {
    msgCount++;
    localStorage.setItem('king_msg_count', msgCount);
    updateProUI();
  }

  if (text.toLowerCase().includes("route") || text.toLowerCase().includes("map") || text.toLowerCase().includes("directions to")) {
    appendLocationCard(text);
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent`;
    
    const parts = [{ text: `You are KING AI PRO created by Abdullah Waheed. ${text}` }];
    if (attachedImageBase64) {
      parts.push({
        inline_data: {
          mime_type: "image/jpeg",
          data: attachedImageBase64
        }
      });
      attachedImageBase64 = null;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY
      },
      body: JSON.stringify({ contents: [{ parts: parts }] })
    });

    const data = await response.json();
    
    if (response.ok && data.candidates && data.candidates[0].content && data.candidates[0].content.parts[0].text) {
      const reply = data.candidates[0].content.parts[0].text;
      appendMessage('assistant', reply);

      if (currentUser) {
        saveMessageToCloud(text, reply);
      } else {
        saveGuestChat(text, reply);
      }
    } else {
      const errDetail = data.error ? data.error.message : "API configuration error.";
      appendMessage('assistant', `👑 King AI Error: ${errDetail}`);
    }
  } catch (err) {
    appendMessage('assistant', "👑 King AI: Connection error. Please verify your network setup.");
  }
}

function appendMessage(role, text) {
  const container = document.getElementById('chatMessages');
  if (!container) return;
  const div = document.createElement('div');
  div.className = role === 'user' 
    ? "p-3 bg-slate-800 rounded-xl text-white ml-auto max-w-md shadow" 
    : "p-3 bg-[#0d1628] border border-slate-800 rounded-xl text-amber-300 mr-auto max-w-md shadow";
  div.innerText = text;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function appendLocationCard(queryText) {
  const container = document.getElementById('chatMessages');
  if (!container) return;

  const destination = encodeURIComponent(queryText.replace(/(route to|map|directions to|location)/gi, '').trim());
  
  const div = document.createElement('div');
  div.className = "p-4 bg-[#0a1120] border border-amber-500/30 rounded-2xl text-slate-200 mr-auto max-w-lg shadow-xl my-2";
  
  div.innerHTML = `
    <div class="font-bold text-amber-400 mb-2 flex items-center gap-2">📍 Navigation Router</div>
    <p class="text-xs text-slate-300 mb-3">Routes for: <strong>${decodeURIComponent(destination)}</strong></p>
    <div class="grid grid-cols-4 gap-2 mb-3">
      <a href="https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving" target="_blank" class="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-center text-amber-300 text-xs font-semibold">🚗 Drive</a>
      <a href="https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=bicycling" target="_blank" class="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-center text-amber-300 text-xs font-semibold">🏍️ Bike</a>
      <a href="https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=walking" target="_blank" class="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-center text-amber-300 text-xs font-semibold">🚶 Walk</a>
      <a href="https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=transit" target="_blank" class="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-center text-amber-300 text-xs font-semibold">✈️ Transit</a>
    </div>
    <iframe width="100%" height="200" style="border:0; border-radius: 12px;" loading="lazy" allowfullscreen src="https://maps.google.com/maps?q=${destination}&t=&z=13&ie=UTF8&iwloc=&output=embed"></iframe>
  `;

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

async function generateImage() {
  if (!isProUnlocked && imgCount >= 3) {
    alert("⚠️ Free Limit Reached! You have used your 3 free image creations. Upgrade to PRO!");
    unlockProMode();
    return;
  }

  const promptInput = document.getElementById('imagePrompt');
  if (!promptInput) return;
  const prompt = promptInput.value.trim();
  if (!prompt) return;

  const overlay = document.getElementById('loadingOverlay');
  const img = document.getElementById('generatedImage');
  if (overlay) overlay.classList.remove('hidden');

  const seed = Math.floor(Math.random() * 1000000);
  const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1280&height=720&nologo=true&seed=${seed}`;
  
  img.src = imageUrl;
  img.onload = () => {
    if (overlay) overlay.classList.add('hidden');
    if (!isProUnlocked) {
      imgCount++;
      localStorage.setItem('king_img_count', imgCount);
      updateProUI();
    }
  };
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
