// ==========================================
// 1. CONFIGURATION SETTINGS
// ==========================================

// Change your secret VIP Pass password here:
const SECRET_VIP_PASSWORD = "KINGVIP2026";

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

// Monitor login state across tabs and devices
auth.onAuthStateChanged(async user => {
  if (user) {
    currentUser = user;
    document.getElementById('authScreen').classList.add('hidden');
    document.getElementById('appContainer').classList.remove('hidden');
    document.getElementById('userName').innerText = user.displayName;
    document.getElementById('userAvatar').src = user.photoURL;

    // Load user account and check VIP status in cloud
    await loadUserProfile(user);
    syncCloudData();
  } else {
    document.getElementById('authScreen').classList.remove('hidden');
    document.getElementById('appContainer').classList.add('hidden');
  }
});

// Load account profile from Firestore
async function loadUserProfile(user) {
  const userRef = db.collection('users').doc(user.uid);
  const doc = await userRef.get();

  if (doc.exists && doc.data().vipPass === true) {
    enableVipUI();
  } else {
    // Save new user profile if first time
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
    alert("✨ Your account already has Lifetime VIP Pass active on all devices!");
    return;
  }

  const inputPass = prompt("🔑 Enter the secret VIP Pass Password:");
  if (!inputPass) return;

  if (inputPass.trim() === SECRET_VIP_PASSWORD) {
    // Save VIP Pass directly to user's Cloud account
    await db.collection('users').doc(currentUser.uid).set({
      vipPass: true,
      vipUnlockedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    enableVipUI();
    alert("🎉 VIP Pass Unlocked! It is now permanently saved to your account across all devices.");
  } else {
    alert("❌ Incorrect VIP Password. Access denied.");
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

function loginWithGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider);
}

function logout() {
  auth.signOut();
}

// ==========================================
// 4. CHAT & IMAGE CLOUD SYNC
// ==========================================

// Real-time synchronization for chats and image creations
function syncCloudData() {
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

// Handle Form Submission (Triggers backend proxy)
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
    saveMessageToCloud(text, reply);

  } catch (error) {
    console.error("Backend request failed:", error);
  }
}

// Save messages and image URLs to cloud
function saveMessageToCloud(userMsg, aiMsg, imageUrl = null) {
  if (!activeChatId) {
    activeChatId = db.collection('users').doc(currentUser.uid).collection('chats').doc().id;
  }

  const chatRef = db.collection('users').doc(currentUser.uid).collection('chats').doc(activeChatId);
  
  const payload = {
    role: 'assistant',
    text: aiMsg
  };

  if (imageUrl) {
    payload.image = imageUrl; // Saves image link into cloud chat history
  }

  chatRef.set({
    title: userMsg.substring(0, 20) + '...',
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    messages: firebase.firestore.FieldValue.arrayUnion(
      { role: 'user', text: userMsg },
      payload
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
    
    // Render stored images if present
    if (m.image) {
      const img = document.createElement('img');
      img.src = m.image;
      img.className = 'mt-2 rounded-lg max-w-full border border-slate-700';
      div.appendChild(img);
    }

    container.appendChild(div);
  });
}
