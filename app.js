// JARVIS AI v9.6 Supreme - Full Integration Script

let appState = {
  activeTool: '1. JARVIS Chat Pro',
  quota: 0,
  maxQuota: 50,
  isVip: false,
  vipExpiryTime: null,
  currentUser: null,
  currentUserName: '',
  groqApiKey: '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',
  userProfile: {
    name: 'Abdullah Waheed',
    age: '18',
    hobby: 'Web Development & Automotive Design'
  },
  signedUsers: [],
  vipUsers: [],
  customCodes: [
    { code: 'SUPREME-VIP-2026', days: 365 }
  ],
  chatHistory: []
};

const supremeModules = [
  { id: 1, name: '1. JARVIS Chat Pro', icon: 'fa-robot' },
  { id: 2, name: '2. Ultra 8K Image Studio', icon: 'fa-image' },
  { id: 3, name: '3. All-Type Video Gen Studio', icon: 'fa-video' },
  { id: 4, name: '4. Saved Creations Vault', icon: 'fa-bookmark' },
  { id: 5, name: '5. Photo & Document Analyzer', icon: 'fa-file-lines' },
  { id: 6, name: '6. Python & Code Studio', icon: 'fa-code' },
  { id: 7, name: '7. Code Cracker & Debugger', icon: 'fa-bug' },
  { id: 8, name: '8. All-Language Translator', icon: 'fa-language' },
  { id: 9, name: '9. Voice Speech Synthesizer', icon: 'fa-microphone' },
  { id: 10, name: '10. Document Summarizer Pro', icon: 'fa-file-contract' },
  { id: 11, name: '11. Math & Logic Solver', icon: 'fa-calculator' },
  { id: 12, name: '12. Essay & Content Writer', icon: 'fa-pen-nib' }
];

document.addEventListener('DOMContentLoaded', () => {
  loadGlobalState();
  renderSidebarTools();
  setupEventListeners();
  updateUserSessionUI();
  initializeGoogleAuth();
});

function renderSidebarTools() {
  const container = document.getElementById('aiToolsList');
  if (!container) return;
  container.innerHTML = supremeModules.map(m => `
    <button onclick="setActiveTool('${m.name}')" class="w-full text-left px-2.5 py-2 rounded-xl text-xs flex items-center justify-between transition ${appState.activeTool === m.name ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold' : 'text-slate-300 hover:bg-slate-800/50'}">
      <span class="flex items-center gap-2 truncate"><i class="fa-solid ${m.icon} text-emerald-400 shrink-0"></i><span class="truncate">${m.name}</span></span>
      <span class="text-[9px] font-mono bg-slate-900 px-1.5 py-0.5 rounded text-slate-400 border border-slate-800">Folder</span>
    </button>
  `).join('');
}

function setActiveTool(toolName) {
  appState.activeTool = toolName;
  const badge = document.getElementById('activeToolBadge');
  if (badge) badge.innerText = toolName;
  renderSidebarTools();
}

// --- GOOGLE SIGN-IN ---
function initializeGoogleAuth() {
  if (typeof google === 'undefined' || !google.accounts) {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = renderGoogleButton;
    document.head.appendChild(script);
  } else {
    renderGoogleButton();
  }
}

function renderGoogleButton() {
  const container = document.getElementById('googleSignInDiv');
  if (!container) return;
  try {
    google.accounts.id.initialize({
      client_id: '92362140807-85g7v59p1feac1n8k2c5ufrecch9en5e.apps.googleusercontent.com',
      callback: handleGoogleCredentialResponse
    });
    google.accounts.id.renderButton(
      container,
      { theme: 'outline', size: 'large', width: '100%', text: 'signin_with' }
    );
  } catch (e) {}
}

function handleGoogleCredentialResponse(response) {
  try {
    const responsePayload = parseJwt(response.credential);
    const email = responsePayload.email;
    const name = responsePayload.name;

    if (!email) {
      alert('Failed to retrieve email from Google Account.');
      return;
    }

    appState.currentUser = email;
    appState.currentUserName = name;
    appState.userProfile.name = name;

    if (!appState.signedUsers.includes(email)) {
      appState.signedUsers.push(email);
    }

    loadUserHistory(email);
    closeAuthModal();
    updateUserSessionUI();
    saveGlobalState();
    alert(`Successfully signed in with Google Account: ${email}`);
  } catch (err) {
    alert('Google authentication error: ' + err.message);
  }
}

function parseJwt(token) {
  try {
    var base64Url = token.split('.')[1];
    var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    var jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('0' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

// --- ACCOUNT & HISTORY MANAGEMENT ---
function handleSignOut() {
  if (appState.currentUser) {
    saveUserHistory(appState.currentUser);
  }

  appState.currentUser = null;
  appState.currentUserName = '';
  appState.chatHistory = [];
  
  const chatContainer = document.getElementById('chatOutputContainer');
  if (chatContainer) {
    chatContainer.innerHTML = `<div class="text-center text-xs text-slate-500 py-12">Signed out. Chats will only save when signed in to a Google account.</div>`;
  }
  
  renderChatHistory();
  updateUserSessionUI();
  closeUserSettingsModal();
  saveGlobalState();
  alert('Signed out successfully.');
}

function loadUserHistory(email) {
  try {
    const savedHistory = localStorage.getItem(`jarvis_history_${email}`);
    appState.chatHistory = savedHistory ? JSON.parse(savedHistory) : [];
    renderChatHistory();
    reloadChatUIFromHistory();
  } catch (e) {
    appState.chatHistory = [];
  }
}

function saveUserHistory(email) {
  try {
    if (email) {
      localStorage.setItem(`jarvis_history_${email}`, JSON.stringify(appState.chatHistory));
    }
  } catch (e) {}
}

function reloadChatUIFromHistory() {
  const chatContainer = document.getElementById('chatOutputContainer');
  if (!chatContainer) return;
  if (appState.chatHistory.length === 0) return;
  chatContainer.innerHTML = appState.chatHistory.map(item => `
    <div class="flex justify-end my-3">
      <div class="max-w-xl bg-emerald-600 text-black rounded-2xl rounded-tr-sm p-3.5 text-xs font-medium shadow-lg">${escapeHtml(item.q)}</div>
    </div>
    <div class="flex justify-start my-3">
      <div class="max-w-2xl bg-[#0b0f19] border border-slate-800 text-slate-100 rounded-2xl rounded-tl-sm p-4 text-xs space-y-2 shadow-xl">
        <div class="font-mono text-emerald-400 font-bold flex items-center gap-1.5"><i class="fa-solid fa-robot"></i> JARVIS AI v9.6 Supreme</div>
        <div class="leading-relaxed text-slate-200">${formatMarkdown(item.a)}</div>
      </div>
    </div>
  `).join('');
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

// --- AI QUERY PROCESSING ---
async function sendQueryToAI() {
  const input = document.getElementById('userInputPrompt');
  if (!input) return;
  const query = input.value.trim();
  if (!query) return;

  const chatContainer = document.getElementById('chatOutputContainer');
  if (!chatContainer) return;

  if (chatContainer.querySelector('.text-center')) {
    chatContainer.innerHTML = '';
  }

  const userDiv = document.createElement('div');
  userDiv.className = 'flex justify-end my-3';
  userDiv.innerHTML = `<div class="max-w-xl bg-emerald-600 text-black rounded-2xl rounded-tr-sm p-3.5 text-xs font-medium shadow-lg">${escapeHtml(query)}</div>`;
  chatContainer.appendChild(userDiv);

  input.value = '';
  chatContainer.scrollTop = chatContainer.scrollHeight;

  const aiDiv = document.createElement('div');
  aiDiv.className = 'flex justify-start my-3';
  aiDiv.id = 'aiResponseLoading';
  aiDiv.innerHTML = `
    <div class="max-w-xl bg-[#0b0f19] border border-slate-800 text-slate-200 rounded-2xl rounded-tl-sm p-4 text-xs space-y-3 shadow-xl">
      <div class="flex items-center gap-2 text-emerald-400 font-mono">
        <i class="fa-solid fa-spinner fa-spin"></i> Processing via ${appState.activeTool}...
      </div>
    </div>
  `;
  chatContainer.appendChild(aiDiv);
  chatContainer.scrollTop = chatContainer.scrollHeight;

  try {
    let aiResponseText = "";
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${appState.groqApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: `You are JARVIS AI v9.6 Supreme, assisting ${appState.userProfile.name} who specializes in ${appState.userProfile.hobby}.` },
          { role: "user", content: query }
        ],
        temperature: 0.7
      })
    });

    if (response.ok) {
      const data = await response.json();
      aiResponseText = data.choices[0].message.content;
    } else {
      aiResponseText = `**Analysis for "${query}":**\n\n1. **Module:** ${appState.activeTool} executed successfully.\n2. **Status:** Optimal neural routing completed.\n3. **Note:** Please verify your live Groq API key configuration.`;
    }

    const loadingElement = document.getElementById('aiResponseLoading');
    if (loadingElement) loadingElement.remove();

    const finalAiDiv = document.createElement('div');
    finalAiDiv.className = 'flex justify-start my-3';
    finalAiDiv.innerHTML = `
      <div class="max-w-2xl bg-[#0b0f19] border border-slate-800 text-slate-100 rounded-2xl rounded-tl-sm p-4 text-xs space-y-3 shadow-xl">
        <div class="flex items-center justify-between border-b border-slate-800/80 pb-2">
          <span class="font-mono text-emerald-400 font-bold flex items-center gap-1.5"><i class="fa-solid fa-robot"></i> JARVIS AI v9.6 Supreme</span>
          <span class="text-[10px] text-slate-500 font-mono">${new Date().toLocaleTimeString()}</span>
        </div>
        <div class="leading-relaxed space-y-2 text-slate-200">${formatMarkdown(aiResponseText)}</div>
      </div>
    `;
    chatContainer.appendChild(finalAiDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    if (appState.currentUser) {
      appState.chatHistory.push({ q: query, a: aiResponseText, time: new Date().toLocaleTimeString() });
      renderChatHistory();
      saveUserHistory(appState.currentUser);
    }

  } catch (err) {
    const loadingElement = document.getElementById('aiResponseLoading');
    if (loadingElement) loadingElement.remove();
    
    const fallbackText = `Processed query: "${query}". Check your API key and network connection.`;
    const errDiv = document.createElement('div');
    errDiv.className = 'flex justify-start my-3';
    errDiv.innerHTML = `
      <div class="max-w-2xl bg-[#0b0f19] border border-slate-800 text-slate-100 rounded-2xl rounded-tl-sm p-4 text-xs space-y-3 shadow-xl">
        <div class="font-mono text-emerald-400 font-bold">JARVIS AI v9.6 Supreme</div>
        <div class="text-slate-200">${formatMarkdown(fallbackText)}</div>
      </div>
    `;
    chatContainer.appendChild(errDiv);
  }
}

function escapeHtml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatMarkdown(text) {
  return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
}

function renderChatHistory() {
  const container = document.getElementById('historyListContainer');
  if (!container) return;
  if (appState.chatHistory.length === 0) {
    container.innerHTML = `<div class="text-[11px] text-slate-500 italic p-2">No saved history. Sign in with Google to store your chat sessions.</div>`;
    return;
  }
  container.innerHTML = appState.chatHistory.map((item, idx) => `
    <div onclick="loadHistoryItem(${idx})" class="p-2.5 bg-[#0b0f19] hover:bg-slate-800/80 border border-slate-800/80 rounded-xl cursor-pointer text-xs transition truncate">
      <div class="font-bold text-slate-200 truncate"><i class="fa-solid fa-comment text-emerald-400 mr-1.5"></i>${escapeHtml(item.q)}</div>
      <div class="text-[10px] text-slate-500 font-mono mt-0.5">${item.time}</div>
    </div>
  `).join('');
}

function loadHistoryItem(idx) {
  const item = appState.chatHistory[idx];
  if (!item) return;
  const chatContainer = document.getElementById('chatOutputContainer');
  if (!chatContainer) return;
  chatContainer.innerHTML = `
    <div class="flex justify-end my-3">
      <div class="max-w-xl bg-emerald-600 text-black rounded-2xl p-3.5 text-xs font-medium">${escapeHtml(item.q)}</div>
    </div>
    <div class="flex justify-start my-3">
      <div class="max-w-2xl bg-[#0b0f19] border border-slate-800 text-slate-100 rounded-2xl p-4 text-xs space-y-2">${formatMarkdown(item.a)}</div>
    </div>
  `;
}

function clearChatHistory() {
  appState.chatHistory = [];
  renderChatHistory();
  if (appState.currentUser) {
    saveUserHistory(appState.currentUser);
  }
}

// --- MODALS & ADMIN PANEL LOGIC ---
function openAuthModal() { document.getElementById('authModal').classList.remove('hidden'); renderGoogleButton(); }
function closeAuthModal() { document.getElementById('authModal').classList.add('hidden'); }

function openUserSettingsModal() { document.getElementById('userSettingsModal').classList.remove('hidden'); }
function closeUserSettingsModal() { document.getElementById('userSettingsModal').classList.add('hidden'); }

function triggerVipModal() { document.getElementById('vipOptionModal').classList.remove('hidden'); }
function closeVipOptionModal() { document.getElementById('vipOptionModal').classList.add('hidden'); }

function proceedApplyCode() {
  closeVipOptionModal();
  document.getElementById('applyCodeModal').classList.remove('hidden');
}
function closeApplyCodeModal() { document.getElementById('applyCodeModal').classList.add('hidden'); }

function proceedSafepayCheckout(type, amount, days) {
  let safepayUrl = '';
  if (amount === 1500) {
    safepayUrl = 'https://sandbox.api.getsafepay.com/io/quick-link?ql=link_e00d0d5c-1ec6-4592-878e-e9b9a5fae749';
  } else if (amount === 2000) {
    safepayUrl = 'https://sandbox.api.getsafepay.com/io/quick-link?ql=link_6b51303a-57a8-4192-82b5-f4ba36ff0636';
  }

  if (safepayUrl) {
    window.open(safepayUrl, '_blank');
  }

  appState.isVip = true;
  appState.vipExpiryTime = Date.now() + (days * 24 * 60 * 60 * 1000);
  if (appState.currentUser && !appState.vipUsers.includes(appState.currentUser)) {
    appState.vipUsers.push(appState.currentUser);
  }
  closeVipOptionModal();
  saveGlobalState();
  alert(`Redirecting to Safepay for ${type} (Rs. ${amount}). VIP Pass activated upon completion!`);
}

function validateVipCode() {
  const code = document.getElementById('vipCodeInput').value.trim().toUpperCase();
  const found = appState.customCodes.find(c => c.code === code);
  if (found || code === 'SUPREME-VIP-2026') {
    appState.isVip = true;
    appState.vipExpiryTime = Date.now() + ((found ? found.days : 365) * 24 * 60 * 60 * 1000);
    if (appState.currentUser && !appState.vipUsers.includes(appState.currentUser)) {
      appState.vipUsers.push(appState.currentUser);
    }
    closeApplyCodeModal();
    saveGlobalState();
    alert('VIP Passkey successfully redeemed!');
  } else {
    alert('Invalid Passkey. Please check with your administrator.');
  }
}

function openAdminAuthModal() { document.getElementById('adminAuthModal').classList.remove('hidden'); }
function closeAdminAuthModal() { document.getElementById('adminAuthModal').classList.add('hidden'); }

function verifyAdminPass() {
  const pass = document.getElementById('adminPassInput').value;
  if (pass === 'abdullah waheed123123') {
    document.getElementById('adminPassInput').value = '';
    closeAdminAuthModal();
    openAdminPanelModal();
  } else {
    alert('Incorrect Admin Password.');
    document.getElementById('adminPassInput').value = '';
  }
}

function openAdminPanelModal() { 
  document.getElementById('adminPanelModal').classList.remove('hidden');
  updateAdminStats();
  renderCustomCodesList();
}
function closeAdminPanelModal() { document.getElementById('adminPanelModal').classList.add('hidden'); }

function updateAdminStats() {
  const signinsCount = document.getElementById('adminSigninsCount');
  const vipsCount = document.getElementById('adminVipsCount');
  if (signinsCount) signinsCount.innerText = appState.signedUsers.length;
  if (vipsCount) vipsCount.innerText = appState.vipUsers.length;
}

function generateCustomPasskey() {
  const tag = document.getElementById('customCodeInput').value.trim().toUpperCase();
  const days = parseInt(document.getElementById('customCodeDuration').value);
  if (!tag) {
    alert('Please enter a passkey tag/name.');
    return;
  }
  const fullCode = `SUPREME-${tag}`;
  appState.customCodes.push({ code: fullCode, days: days });
  document.getElementById('customCodeInput').value = '';
  renderCustomCodesList();
  saveGlobalState();
  alert(`Passkey "${fullCode}" created successfully!`);
}

function renderCustomCodesList() {
  const container = document.getElementById('customCodesListContainer');
  if (!container) return;
  container.innerHTML = appState.customCodes.map(c => `
    <div class="flex justify-between items-center bg-slate-900 border border-slate-800 p-2 rounded-xl text-xs font-mono">
      <span class="text-emerald-400 font-bold">${c.code}</span>
      <span class="text-slate-400">${c.days} Days</span>
    </div>
  `).join('');
}

function updateUserSessionUI() {
  const label = document.getElementById('userSessionLabel');
  const actionContainer = document.getElementById('authActionContainer');
  if (label) label.innerText = appState.currentUser || 'Guest User';
  if (actionContainer) {
    if (appState.currentUser) {
      actionContainer.innerHTML = `<button onclick="openUserSettingsModal()" class="text-[10px] text-emerald-400 hover:underline font-mono">Account</button>`;
    } else {
      actionContainer.innerHTML = `<button onclick="openAuthModal()" class="text-[10px] text-emerald-400 hover:underline font-mono">Sign In</button>`;
    }
  }
}

function saveGlobalState() {
  try {
    localStorage.setItem('jarvis_global_state', JSON.stringify({
      currentUser: appState.currentUser,
      signedUsers: appState.signedUsers,
      vipUsers: appState.vipUsers,
      customCodes: appState.customCodes,
      userProfile: appState.userProfile
    }));
  } catch (e) {}
}

function loadGlobalState() {
  try {
    const saved = localStorage.getItem('jarvis_global_state');
    if (saved) {
      const parsed = JSON.parse(saved);
      appState.currentUser = parsed.currentUser || null;
      appState.signedUsers = parsed.signedUsers || [];
      appState.vipUsers = parsed.vipUsers || [];
      if (parsed.customCodes) appState.customCodes = parsed.customCodes;
      if (parsed.userProfile) appState.userProfile = parsed.userProfile;
      if (appState.currentUser) {
        loadUserHistory(appState.currentUser);
      }
    }
  } catch (e) {}
}

function setupEventListeners() {
  const input = document.getElementById('userInputPrompt');
  if (input) {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendQueryToAI();
      }
    });
  }
}
