// ==========================================
// 1. CONFIGURATION & STATE
// ==========================================
const SECRET_VIP_PASSWORD = "KINGVIP2026"; // Change VIP password on line 4

const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_PUBLIC_CLIENT_KEY",
  authDomain: "your-app.firebaseapp.com",
  projectId: "your-app-id",
  storageBucket: "your-app.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const functions = firebase.functions();

let currentUser = null;
let activeChatId = null;
let isVipUser = false;
let isSignUpMode = false;

// ==========================================
// 2. AUTHENTICATION & MODAL LOGIC
// ==========================================
auth.onAuthStateChanged(async user => {
  const loginBtn = document.getElementById('loginBtn');
  const logoutBtn = document.getElementById('logoutBtn');

  if (user) {
    currentUser = user;
    if (loginBtn) loginBtn.classList.add('hidden');
    if (logoutBtn) logoutBtn.classList.remove('hidden');
    
    document.getElementById('userName').innerText = user.email.split('@')[0];
    document.getElementById('userAvatarContainer').innerHTML = "👑";

    toggleAuthModal(false);
    await loadUserProfile(user);
    syncCloudData();
  } else {
    currentUser = null;
    if (loginBtn) loginBtn.classList.remove('hidden');
    if (logoutBtn) logoutBtn.classList.add('hidden');
    
    document.getElementById('userName').innerText = "Guest User";
    document.getElementById('userAvatarContainer').innerHTML = "👤";
    disableVipUI();
  }
});

function toggleAuthModal(show) {
  const modal = document.getElementById('authModal');
  if (show) modal.classList.remove('hidden');
  else modal.classList.add('hidden');
}

function toggleAuthMode() {
  isSignUpMode = !isSignUpMode;
  const submitBtn = document.getElementById('authSubmitBtn');
  const togglePrompt = document.getElementById('authTogglePrompt');
  const toggleBtn = document.getElementById('authToggleBtn');

  if (isSignUpMode) {
    submitBtn.innerText = "Create Account";
    togglePrompt.innerText = "Already have an account?";
    toggleBtn.innerText = "Sign In";
  } else {
    submitBtn.innerText = "Sign In";
    togglePrompt.innerText = "Don't have an account?";
    toggleBtn.innerText = "Sign Up";
  }
}

async function handleAuthSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value;

  try {
    if (isSignUpMode) {
      await auth.createUserWithEmailAndPassword(email, password);
      alert("🎉 Account created successfully!");
    } else {
      await auth.signInWithEmailAndPassword(email, password);
    }
  } catch (error) {
    alert("❌ Error: " + error.message);
  }
}

function logout() {
  auth.signOut();
}

// ==========================================
// 3. TAB NAVIGATION CONTROLS
// ==========================================
function switchTab(tabName) {
  const tabs = ['tabChat', 'tabImageGen', 'tabMonogram'];
  const navs = ['navChat', 'navImageGen', 'navMonogram'];

  tabs.forEach(t => document.getElementById(t).classList.add('hidden'));
  navs.forEach(n => document.getElementById(n).className = "w-full text-left p-2.5 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-800 flex items-center gap-2");

  if (tabName === 'chat') {
    document.getElementById('tabChat').classList.remove('hidden');
    document.getElementById('navChat').className = "w-full text-left p-2.5 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-2";
  } else if (tabName === 'imageGen') {
    document.getElementById('tabImageGen').classList.remove('hidden');
    document.getElementById('navImageGen').className = "w-full text-left p-2.5 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-2";
  } else if (tabName === 'monogram') {
    document.getElementById('tabMonogram').classList.remove('hidden');
    document.getElementById('navMonogram').className = "w-full text-left p-2.5 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-2";
  }
}

// ==========================================
// 4. VIP PASS LOGIC
// ==========================================
async function loadUserProfile(user) {
  const userRef = db.collection('users').doc(user.uid);
  const doc = await userRef.get();

  if (doc.exists && doc.data().vipPass === true) {
    enableVipUI();
  } else {
    await userRef.set({
      email: user.email,
      vipPass: false,
      lastLogin: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    disableVipUI();
  }
}

async function promptVipPassword() {
  if (isVipUser) {
    alert("✨ Your account already has Lifetime VIP Pass active!");
    return;
  }

  const inputPass = prompt("🔑 Enter the secret VIP Pass Password:");
  if (!inputPass) return;

  if (inputPass.trim() === SECRET_VIP_PASSWORD) {
    if (currentUser) {
      await db.collection('users').doc(currentUser.uid).set({
        vipPass: true,
        vipUnlockedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }
    enableVipUI();
    alert("🎉 VIP Pass Unlocked!");
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
    tag.innerText = currentUser ? "Standard Member" : "Sign in to sync cloud";
  }
}

// ==========================================
// 5. CHAT, 8K IMAGE & MONOGRAM LOGIC
// ==========================================
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
        btn.className = 'w-full text-left p-2 rounded-lg text-xs truncate bg-slate-800 hover:bg-slate-700 text-slate-200 mb-1 flex items-center justify-between';
        btn.innerHTML = `<span>${chat.title || 'Conversation'}</span>`;
        btn.onclick = () => loadCloudChat(doc.id, chat.messages);
        chatList.appendChild(btn);
      });
    });
}

async function handleChatSubmit(e) {
  e.preventDefault();
  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  if (!text) return;

  input.value = '';

  const callGemini = functions.httpsCallable('geminiProxy');
  
  try {
    const result = await callGemini({
      systemInstruction: { parts: [{ text: isVipUser ? "You are KING AI PRO VIP Engine, owned by Abdullah Waheed." : "You are KING AI PRO Standard Engine, owned by Abdullah Waheed." }] },
      contents: [{ parts: [{ text: text }] }]
    });

    const reply = result.data.candidates[0].content.parts[0].text;
    
    if (currentUser) {
      saveMessageToCloud(text, reply);
    } else {
      renderGuestMessage(text, reply);
    }

  } catch (error) {
    console.error("Backend request failed:", error);
  }
}

function renderGuestMessage(userMsg, aiMsg) {
  const container = document.getElementById('chatMessages');
  
  const userDiv = document.createElement('div');
  userDiv.className = 'p-3 rounded-xl bg-slate-800 text-xs ml-auto max-w-md';
  userDiv.innerText = userMsg;
  
  const aiDiv = document.createElement('div');
  aiDiv.className = 'p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-amber-300 mr-auto max-w-md';
  aiDiv.innerText = aiMsg;

  container.appendChild(userDiv);
  container.appendChild(aiDiv);
}

function saveMessageToCloud(userMsg, aiMsg) {
  if (!activeChatId) {
    activeChatId = db.collection('users').doc(currentUser.uid).collection('chats').doc().id;
  }

  const chatRef = db.collection('users').doc(currentUser.uid).collection('chats').doc(activeChatId);
  
  chatRef.set({
    title: userMsg.substring(0, 20) + '...',
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    messages: firebase.firestore.FieldValue.arrayUnion(
      { role: 'user', text: userMsg },
      { role: 'assistant', text: aiMsg }
    )
  }, { merge: true });
}

function createNewChat() {
  activeChatId = null;
  document.getElementById('chatMessages').innerHTML = '';
}

function loadCloudChat(id, messages) {
  activeChatId = id;
  const container = document.getElementById('chatMessages');
  if (!container) return;
  container.innerHTML = '';
  
  messages.forEach(m => {
    const div = document.createElement('div');
    div.className = m.role === 'user' ? 'p-3 rounded-xl bg-slate-800 text-xs ml-auto max-w-md' : 'p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-amber-300 mr-auto max-w-md';
    div.innerText = m.text;
    container.appendChild(div);
  });
}

function generate8KImage() {
  const prompt = document.getElementById('imgPrompt').value;
  if (!prompt) return alert('Please enter a description!');
  const output = document.getElementById('imageOutput');
  output.innerHTML = `<p class="text-xs text-amber-400 font-bold animate-pulse">Generating 8K Ultra-HD Visuals for "${prompt}"...</p>`;
}

function generateMonogram() {
  const initials = document.getElementById('monogramInitials').value;
  if (!initials) return alert('Please enter initials!');
  const output = document.getElementById('monogramOutput');
  output.innerHTML = `<div class="w-32 h-32 rounded-full border-4 border-amber-400 flex items-center justify-center bg-slate-900 gold-gradient-text font-royal text-3xl font-black shadow-lg">${initials.toUpperCase()}</div>`;
}
