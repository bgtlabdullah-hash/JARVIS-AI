// ==========================================
// 1. CONFIGURATION SETTINGS
// ==========================================

// Change your VIP Pass password here:
const SECRET_VIP_PASSWORD = "KING.AI@2026";

// Replace with your actual Firebase Project Configuration:
const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_PUBLIC_CLIENT_KEY",
  authDomain: "your-app.firebaseapp.com",
  projectId: "your-app-id",
  storageBucket: "your-app.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

// ==========================================
// 2. INITIALIZE FIREBASE SERVICES
// ==========================================
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const functions = firebase.functions();

let currentUser = null;
let activeChatId = null;
let isVipUser = false;

// ==========================================
// 3. AUTHENTICATION & PROFILE MANAGEMENT
// ==========================================

// Monitor Auth state without blocking guest app usage
auth.onAuthStateChanged(async user => {
  const loginBtn = document.getElementById('loginBtn');
  const logoutBtn = document.getElementById('logoutBtn');

  if (user) {
    currentUser = user;
    if (loginBtn) loginBtn.classList.add('hidden');
    if (logoutBtn) logoutBtn.classList.remove('hidden');
    
    document.getElementById('userName').innerText = user.displayName;
    document.getElementById('userAvatarContainer').innerHTML = `<img class="w-full h-full rounded-full" src="${user.photoURL}" alt="User">`;

    // Load cloud account and sync data
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

// Load user account from Firestore
async function loadUserProfile(user) {
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
}

// VIP Password Unlock Function
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

function loginWithGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider);
}

function logout() {
  auth.signOut();
}

// ==========================================
// 4. CHAT HANDLING & CLOUD SYNC
// ==========================================

// Real-time Firestore sync for signed-in users
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

// Handle message submission
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

// Render message UI locally for guest users
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

// Save messages into Firestore cloud storage
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
