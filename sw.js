// KING AI PRO — Core Engine Scripts
// Owned by Abdullah Waheed

const SECRET_VIP_PASSWORD = "KING.AI@2026";

// Firebase Configuration Credentials
const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_PUBLIC_CLIENT_KEY",
  authDomain: "your-app.firebaseapp.com",
  projectId: "your-app-id",
  storageBucket: "your-app.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

// Initialize Firebase Services
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();
const functions = firebase.functions();

// Global Application State Variables
let currentUser = null;
let activeChatId = null;
let isVipUser = false;

// Initialize App Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  // Monitor Auth State & Auto-Restore User Cloud Session
  auth.onAuthStateChanged(async (user) => {
    if (user) {
      currentUser = user;
      document.getElementById('authScreen').classList.add('hidden');
      document.getElementById('appContainer').classList.remove('hidden');
      document.getElementById('userName').innerText = user.displayName || 'User';
      document.getElementById('userAvatar').src = user.photoURL || 'https://via.placeholder.com/40';

      await loadUserProfile(user);
      syncCloudData();
    } else {
      document.getElementById('authScreen').classList.remove('hidden');
      document.getElementById('appContainer').classList.add('hidden');
    }
  });
});

// Authentication Handlers
function loginWithGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider).catch((err) => {
    alert("Sign-in failed: " + err.message);
  });
}

function logout() {
  auth.signOut();
}

// User Profile & VIP Status
async function loadUserProfile(user) {
  try {
    const userRef = db.collection('users').doc(user.uid);
    const doc = await userRef.get();

    if (doc.exists && doc.data().vipPass === true) {
      enableVipUI();
    } else {
      await userRef.set({
        name: user.displayName,
        email: user.email,
        vipPass: false,
        lastLogin: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      disableVipUI();
    }
  } catch (error) {
    console.error("Profile sync error:", error);
  }
}

async function promptVipPassword() {
  if (isVipUser) {
    alert("✨ Lifetime VIP Pass is active on your account across all tabs!");
    return;
  }

  const inputPass = prompt("🔑 Enter the secret VIP Pass Password:");
  if (!inputPass) return;

  if (inputPass.trim() === SECRET_VIP_PASSWORD) {
    try {
      await db.collection('users').doc(currentUser.uid).set({
        vipPass: true,
        vipUnlockedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      enableVipUI();
      alert("🎉 VIP Pass Unlocked permanently!");
    } catch (error) {
      alert("Failed to unlock VIP status: " + error.message);
    }
  } else {
    alert("❌ Incorrect VIP Password.");
  }
}

function enableVipUI() {
  isVipUser = true;
  const badgeBtn = document.getElementById('vipBadgeBtn');
  const badgeText = document.getElementById('vipBadgeText');
  const tag = document.getElementById('userVipTag');

  if (badgeBtn) badgeBtn.className = "px-3 py-1.5 rounded-xl vip-badge-active text-slate-950 font-black text-xs flex items-center gap-1";
  if (badgeText) badgeText.innerText = "🎟️ VIP ACTIVE";
  if (tag) {
    tag.className = "text-[10px] text-emerald-400 font-bold";
    tag.innerText = "🌟 Lifetime VIP Pass";
  }
}

function disableVipUI() {
  isVipUser = false;
  const badgeBtn = document.getElementById('vipBadgeBtn');
  const badgeText = document.getElementById('vipBadgeText');
  const tag = document.getElementById('userVipTag');

  if (badgeBtn) badgeBtn.className = "px-3 py-1.5 rounded-xl vip-badge-locked text-slate-300 font-bold text-xs flex items-center gap-1 hover:border-amber-400 transition";
  if (badgeText) badgeText.innerText = "🎟️ Unlock VIP Pass";
  if (tag) {
    tag.className = "text-[10px] text-slate-400 font-semibold";
    tag.innerText = "Standard Member";
  }
}

// Navigation Tab Switcher
function switchTab(tabName) {
  const tabs = ['tabChat', 'tabImageGen', 'tabMonogram'];
  const navs = ['navChat', 'navImageGen', 'navMonogram'];

  tabs.forEach(t => document.getElementById(t)?.classList.add('hidden'));
  navs.forEach(n => {
    const el = document.getElementById(n);
    if (el) el.className = "w-full text-left p-2.5 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-800 flex items-center gap-2";
  });

  const activeTab = document.getElementById(`tab${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`);
  const activeNav = document.getElementById(`nav${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`);

  if (activeTab) activeTab.classList.remove('hidden');
  if (activeNav) activeNav.className = "w-full text-left p-2.5 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-2";
}

// Real-time Cloud Chat History Sync
function syncCloudData() {
  if (!currentUser) return;

  db.collection('users').doc(currentUser.uid).collection('chats')
    .orderBy('updatedAt', 'desc')
    .onSnapshot(snapshot => {
      const chatList = document.getElementById('cloudChatList');
      if (!chatList) return;
      
      chatList.innerHTML = '';
      snapshot.forEach(doc => {
        const chat = doc.data();
        const btn = document.createElement('button');
        btn.className = 'w-full text-left p-2 rounded-lg text-xs truncate bg-slate-800 hover:bg-slate-700 text-slate-200 mb-1 flex items-center justify-between transition';
        btn.innerHTML = `<span class="truncate">${chat.title || 'Conversation'}</span>`;
        btn.onclick = () => loadCloudChat(doc.id, chat.messages);
        chatList.appendChild(btn);
      });
    }, err => console.error("Cloud chat sync error:", err));
}

// AI Chat Engine Handlers
async function handleChatSubmit(e) {
  e.preventDefault();
  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  if (!text) return;

  input.value = '';
  appendMessage('user', text);

  // Show loading indicator
  const loadingDiv = appendLoadingIndicator();

  try {
    const callGemini = functions.httpsCallable('geminiProxy');
    const result = await callGemini({
      systemInstruction: {
        parts: [{ text: isVipUser ? "You are KING AI PRO VIP Engine, owned by Abdullah Waheed. Deliver detailed, high-tier responses." : "You are KING AI PRO Standard Engine, owned by Abdullah Waheed." }]
      },
      contents: [{ parts: [{ text: text }] }]
    });

    loadingDiv.remove();
    const reply = result.data.candidates[0].content.parts[0].text;
    appendMessage('assistant', reply);
    saveMessageToCloud(text, reply);

  } catch (error) {
    loadingDiv.remove();
    console.error("Backend request failed:", error);
    appendMessage('assistant', "⚠️ System Error: Unable to fetch response. Please verify backend configurations.");
  }
}

function appendMessage(role, content) {
  const container = document.getElementById('chatMessages');
  if (!container) return;

  const div = document.createElement('div');
  div.className = role === 'user' 
    ? 'p-3 rounded-xl bg-slate-800 text-xs text-white ml-auto max-w-lg shadow-md mb-3' 
    : 'p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs text-amber-200 mr-auto max-w-xl shadow-md mb-3 prose prose-invert';

  if (role === 'assistant' && typeof marked !== 'undefined') {
    div.innerHTML = marked.parse(content);
  } else {
    div.innerText = content;
  }

  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function appendLoadingIndicator() {
  const container = document.getElementById('chatMessages');
  const div = document.createElement('div');
  div.className = 'p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs text-amber-400 mr-auto max-w-md animate-pulse mb-3 flex items-center gap-2';
  div.innerHTML = `<span>👑 King AI is processing...</span>`;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  return div;
}

function saveMessageToCloud(userMsg, aiMsg) {
  if (!currentUser) return;

  if (!activeChatId) {
    activeChatId = db.collection('users').doc(currentUser.uid).collection('chats').doc().id;
  }

  const chatRef = db.collection('users').doc(currentUser.uid).collection('chats').doc(activeChatId);
  
  chatRef.set({
    title: userMsg.substring(0, 24) + '...',
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    messages: firebase.firestore.FieldValue.arrayUnion(
      { role: 'user', text: userMsg },
      { role: 'assistant', text: aiMsg }
    )
  }, { merge: true });
}

function createNewChat() {
  activeChatId = null;
  const container = document.getElementById('chatMessages');
  if (container) container.innerHTML = '';
}

function loadCloudChat(id, messages) {
  activeChatId = id;
  const container = document.getElementById('chatMessages');
  if (!container) return;

  container.innerHTML = '';
  if (Array.isArray(messages)) {
    messages.forEach(m => appendMessage(m.role, m.text));
  }
}

// 8K Image Generator Studio
function generate8KImage() {
  const promptInput = document.getElementById('imgPrompt');
  const prompt = promptInput ? promptInput.value.trim() : '';
  if (!prompt) return alert('Please enter an image prompt description!');

  const output = document.getElementById('imageOutput');
  output.innerHTML = `
    <div class="flex flex-col items-center justify-center space-y-3 py-6">
      <div class="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
      <p class="text-xs text-amber-400 font-bold">Rendering 8K Ultra-HD Visuals for "${prompt}"...</p>
    </div>
  `;

  setTimeout(() => {
    const encodedPrompt = encodeURIComponent(prompt);
    const imageUrl = `https://pollinations.ai/p/${encodedPrompt}?width=1280&height=720&seed=${Math.floor(Math.random() * 1000)}`;
    
    output.innerHTML = `
      <div class="space-y-3 text-center">
        <img src="${imageUrl}" alt="${prompt}" class="w-full max-h-[450px] object-cover rounded-xl border border-slate-800 shadow-2xl">
        <a href="${imageUrl}" target="_blank" download="king-ai-8k.jpg" class="inline-block gold-gradient-bg text-slate-950 px-4 py-2 rounded-xl text-xs font-black shadow-lg hover:opacity-90">Download 8K Visual</a>
      </div>
    `;
  }, 1200);
}

// Monogram Studio Engine
function generateMonogram() {
  const input = document.getElementById('monogramInitials');
  const initials = input ? input.value.trim() : '';
  if (!initials) return alert('Please enter initials!');

  const output = document.getElementById('monogramOutput');
  output.innerHTML = `
    <div class="flex flex-col items-center justify-center p-8 space-y-4">
      <div class="w-36 h-36 rounded-full border-4 border-amber-400 flex items-center justify-center bg-slate-900 gold-gradient-text font-royal text-4xl font-black shadow-2xl tracking-widest border-double ring-4 ring-amber-500/20">
        ${initials.toUpperCase()}
      </div>
      <p class="text-xs text-amber-300 font-semibold">Royal Seal Monogram Generated</p>
    </div>
  `;
}
