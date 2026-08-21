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
const functions = firebase.functions();

let currentUser = null;
let activeChatId = null;

let guestChats = [];
let guestSavedCount = 0;

// Authentication State Observer
auth.onAuthStateChanged(async (user) => {
  const signInBtn = document.getElementById('signInBtn');
  const signOutBtn = document.getElementById('signOutBtn');

  if (user) {
    currentUser = user;
    if (signInBtn) signInBtn.classList.add('hidden');
    if (signOutBtn) signOutBtn.classList.remove('hidden');

    document.getElementById('userNameDisplay').innerText = user.displayName || "Abdullah Waheed";
    document.getElementById('userEmailDisplay').innerText = user.email || "Official User";
    document.getElementById('userAvatarImg').src = user.photoURL || "https://via.placeholder.com/40";

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
    document.getElementById('userAvatarImg').src = "https://via.placeholder.com/40?text=👑";

    renderGuestHistory();
  }
});

// Authentication Handlers
function loginWithGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider).catch(err => alert("Google Sign-In Failed: " + err.message));
}

function logout() {
  auth.signOut();
}

// Sync Firestore Data
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

      document.getElementById('savedCreationsCount').innerText = count;
    });
}

function renderGuestHistory() {
  const chatList = document.getElementById('chatHistoryList');
  if (!chatList) return;
  chatList.innerHTML = '';

  if (guestChats.length === 0) {
    document.getElementById('savedCreationsCount').innerText = "0";
  } else {
    guestChats.forEach((chat, idx) => {
      const div = document.createElement('div');
      div.className = "p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex justify-between items-center cursor-pointer mb-1";
      div.innerHTML = `<span class="truncate">${chat.title}</span><span onclick="deleteGuestChat(${idx}, event)" class="text-slate-500 hover:text-red-400 text-[10px]">✕</span>`;
      div.onclick = () => loadGuestChat(idx);
      chatList.appendChild(div);
    });
    document.getElementById('savedCreationsCount').innerText = guestSavedCount;
  }
}

// UI Navigation / View Switching
function switchMode(mode) {
  const imgView = document.getElementById('imageStudioView');
  const chatView = document.getElementById('chatStudioView');
  const navImg = document.getElementById('navImageBtn');
  const navChat = document.getElementById('navChatBtn');

  if (mode === 'image') {
    imgView.classList.remove('hidden');
    chatView.classList.add('hidden');
    navImg.className = "w-full p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between font-semibold shadow-inner";
    navChat.className = "w-full p-2.5 rounded-xl bg-[#0d1626] hover:bg-slate-800 text-slate-300 text-xs flex items-center justify-between border border-slate-800 transition";
  } else {
    imgView.classList.add('hidden');
    chatView.classList.remove('hidden');
    navChat.className = "w-full p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between font-semibold shadow-inner";
    navImg.className = "w-full p-2.5 rounded-xl bg-[#0d1626] hover:bg-slate-800 text-slate-300 text-xs flex items-center justify-between border border-slate-800 transition";
  }
}

// Image Generation
async function generateImage() {
  const prompt = document.getElementById('imagePrompt').value.trim();
  if (!prompt) return;

  const overlay = document.getElementById('loadingOverlay');
  const img = document.getElementById('generatedImage');
  overlay.classList.remove('hidden');

  try {
    const callProxy = functions.httpsCallable('geminiProxy');
    const res = await callProxy({ mode: "image", prompt: prompt });
    if (res.data && res.data.imageUrl) {
      img.src = res.data.imageUrl;
    }
  } catch (err) {
    const encoded = encodeURIComponent(prompt);
    img.src = `https://image.pollinations.ai/prompt/${encoded}?width=800&height=800&nologo=true&seed=${Math.floor(Math.random()*1000000)}`;
  } finally {
    img.onload = () => overlay.classList.add('hidden');
  }

  if (!currentUser) {
    guestSavedCount++;
    document.getElementById('savedCreationsCount').innerText = guestSavedCount;
  }
}

// Chat Handling
async function handleChatSubmit(e) {
  e.preventDefault();
  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  if (!text) return;

  input.value = '';
  appendMessage('user', text);

  try {
    const callProxy = functions.httpsCallable('geminiProxy');
    const res = await callProxy({
      mode: "text",
      systemInstruction: { parts: [{ text: "You are KING AI PRO, owned by Abdullah Waheed." }] },
      contents: [{ parts: [{ text: text }] }]
    });

    const reply = res.data.candidates[0].content.parts[0].text;
    appendMessage('assistant', reply);

    if (currentUser) {
      saveMessageToCloud(text, reply);
    } else {
      saveGuestChat(text, reply);
    }
  } catch (err) {
    appendMessage('assistant', "⚠️ Error executing request.");
  }
}

function appendMessage(role, text) {
  const container = document.getElementById('chatMessages');
  const div = document.createElement('div');
  div.className = role === 'user' 
    ? "p-3 bg-slate-800 rounded-xl text-white ml-auto max-w-md shadow" 
    : "p-3 bg-[#0d1626] border border-slate-800 rounded-xl text-amber-300 mr-auto max-w-md shadow";
  div.innerText = text;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
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
  const title = userMsg.substring(0, 18) + '...';
  guestChats.push({ title, messages: [{ role: 'user', text: userMsg }, { role: 'assistant', text: aiMsg }] });
  renderGuestHistory();
}

function loadCloudChat(id, messages) {
  activeChatId = id;
  const container = document.getElementById('chatMessages');
  container.innerHTML = '';
  if (Array.isArray(messages)) {
    messages.forEach(m => appendMessage(m.role, m.text));
  }
  switchMode('chat');
}

function loadGuestChat(idx) {
  const container = document.getElementById('chatMessages');
  container.innerHTML = '';
  if (guestChats[idx] && guestChats[idx].messages) {
    guestChats[idx].messages.forEach(m => appendMessage(m.role, m.text));
  }
  switchMode('chat');
}

function createNewChat() {
  activeChatId = null;
  document.getElementById('chatMessages').innerHTML = '<div class="p-3 bg-[#0d1626] rounded-xl text-amber-300">👑 New Session Started</div>';
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
    guestSavedCount = 0;
    renderGuestHistory();
  }
  createNewChat();
}
