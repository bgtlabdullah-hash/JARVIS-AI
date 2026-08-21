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

// Active Google AI Key
const GEMINI_API_KEY = "AIzaSyD_AqRf3875g0oaJdy2Ymp6867RUp8riCo";

let currentUser = null;
let activeChatId = null;
let guestChats = [];
let isProUnlocked = localStorage.getItem('king_pro_unlocked') === 'true';

// Initialize PRO UI state on load
document.addEventListener('DOMContentLoaded', () => {
  updateProUI();
});

// Password Activation Logic
function unlockProMode() {
  if (isProUnlocked) {
    alert("King AI PRO is already activated!");
    return;
  }

  const inputPass = prompt("Enter the King AI PRO Activation Password:");
  if (inputPass === "KingAIPro@2026") {
    isProUnlocked = true;
    localStorage.setItem('king_pro_unlocked', 'true');
    updateProUI();
    alert("🎉 King AI PRO successfully activated!");
  } else if (inputPass !== null) {
    alert("❌ Invalid Activation Password!");
  }
}

function updateProUI() {
  const btn = document.getElementById('proStatusBtn');
  const badge = document.getElementById('vipBadgeText');

  if (isProUnlocked) {
    if (btn) {
      btn.className = "bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 text-xs font-bold px-3 py-1.5 rounded-lg";
      btn.innerHTML = "📺 VIP ACTIVE";
    }
    if (badge) {
      badge.innerText = "🎟️ VIP Pass Active";
    }
  } else {
    if (btn) {
      btn.className = "bg-amber-500/20 border border-amber-500/50 text-amber-400 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-amber-500/30 transition";
      btn.innerHTML = "🔒 Activate PRO";
    }
    if (badge) {
      badge.innerText = "🔒 Free Tier (Enter Password)";
    }
  }
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
      await userDocRef.set({ isVIP: true, email: user.email, name: user.displayName });
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

// Data Syncing
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

// Direct Chat Handler
async function handleChatSubmit(e) {
  e.preventDefault();
  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  if (!text) return;

  input.value = '';
  appendMessage('user', text);

  // Auto-detect image requests inside text chat
  if (text.toLowerCase().startsWith("generate image") || text.toLowerCase().startsWith("make image") || text.toLowerCase().startsWith("draw")) {
    const prompt = text.replace(/(generate image|make image|draw)/i, '').trim();
    appendMessage('assistant', `🎨 Generating image for: "${prompt}"...`);
    generateImageFromText(prompt);
    return;
  }

  // Auto-detect location/navigation requests inside text chat
  if (text.toLowerCase().includes("route") || text.toLowerCase().includes("map") || text.toLowerCase().includes("directions to")) {
    appendLocationCard(text);
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `You are KING AI PRO created by Abdullah Waheed. ${text}`
              }
            ]
          }
        ]
      })
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
      const errDetail = data.error ? data.error.message : "Engine authorization error. Check API key restrictions.";
      appendMessage('assistant', `👑 King AI Error: ${errDetail}`);
    }
  } catch (err) {
    appendMessage('assistant', "👑 King AI: Connection error. Please check your network connection.");
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

// Multi-Modal Location Router Component
function appendLocationCard(queryText) {
  const container = document.getElementById('chatMessages');
  if (!container) return;

  const destination = encodeURIComponent(queryText.replace(/(route to|map|directions to|location)/gi, '').trim());
  
  const div = document.createElement('div');
  div.className = "p-4 bg-[#0a1120] border border-amber-500/30 rounded-2xl text-slate-200 mr-auto max-w-lg shadow-xl my-2";
  
  div.innerHTML = `
    <div class="font-bold text-amber-400 mb-2 flex items-center gap-2">📍 Navigation Router</div>
    <p class="text-xs text-slate-300 mb-3">View live routes and options for: <strong>${decodeURIComponent(destination)}</strong></p>
    
    <div class="grid grid-cols-4 gap-2 mb-3">
      <a href="https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving" target="_blank" class="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-center text-amber-300 text-xs font-semibold hover:bg-amber-500/20">🚗 Drive</a>
      <a href="https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=bicycling" target="_blank" class="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-center text-amber-300 text-xs font-semibold hover:bg-amber-500/20">🏍️ Bike</a>
      <a href="https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=walking" target="_blank" class="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-center text-amber-300 text-xs font-semibold hover:bg-amber-500/20">🚶 Walk</a>
      <a href="https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=transit" target="_blank" class="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-center text-amber-300 text-xs font-semibold hover:bg-amber-500/20">✈️ Transit</a>
    </div>

    <iframe 
      width="100%" 
      height="200" 
      style="border:0; border-radius: 12px;" 
      loading="lazy" 
      allowfullscreen 
      src="https://maps.google.com/maps?q=${destination}&t=&z=13&ie=UTF8&iwloc=&output=embed">
    </iframe>
  `;

  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

// Image Generation Engines
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
