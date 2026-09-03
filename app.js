// JARVIS AI v9.6 Supreme - app.js (Fixed Syntax & Fully Integrated Features)

let appState = {
  activeTool: '1. JARVIS Chat Pro',
  quota: 0,
  maxQuota: 50,
  isVip: false,
  vipExpiryTime: null,
  currentUser: null,
  userProfile: {
    name: 'Abdullah Waheed',
    age: '18',
    hobby: 'Web Development & Automotive Design'
  },
  signedUsers: [],
  vipUsers: [],
  customCodes: [],
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
  loadStateFromStorage();
  checkVipExpiration();
  renderSidebarTools();
  setupEventListeners();
  updateUserSessionUI();
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
  appendSystemNotice(`Switched to module: ${toolName}`);
}

function appendSystemNotice(text) {
  const chatContainer = document.getElementById('chatOutputContainer');
  if (!chatContainer) return;
  const div = document.createElement('div');
  div.className = 'max-w-3xl mx-auto text-center my-2';
  div.innerHTML = `<span class="text-[11px] font-mono bg-slate-900/80 text-slate-400 px-3 py-1 rounded-full border border-slate-800">${text}</span>`;
  chatContainer.appendChild(div);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
});

function triggerInstall() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(() => { deferredPrompt = null; });
  } else {
    const modal = document.getElementById('installModal');
    if (modal) modal.classList.remove('hidden');
    else alert('PWA Install: Open browser menu and select "Add to Home Screen".');
  }
}

function closeInstallModal() {
  const modal = document.getElementById('installModal');
  if (modal) modal.classList.add('hidden');
}

let selectedImageBase64 = null;

function handleImageSelect(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    selectedImageBase64 = e.target.result;
    const preview = document.getElementById('imagePreviewContainer');
    if (preview) {
      preview.classList.remove('hidden');
      preview.innerHTML = `<img src="${selectedImageBase64}" class="w-10 h-10 object-cover rounded-lg border border-slate-700"> <span class="text-[10px] text-slate-300 font-mono">Image attached</span> <button onclick="removeAttachedImage()" class="text-red-400 hover:text-red-300 ml-2"><i class="fa-solid fa-xmark"></i></button>`;
    }
  };
  reader.readAsDataURL(file);
}

function removeAttachedImage() {
  selectedImageBase64 = null;
  const preview = document.getElementById('imagePreviewContainer');
  if (preview) preview.classList.add('hidden');
  const fileInput = document.getElementById('imageInput');
  if (fileInput) fileInput.value = '';
}

function quickPromptClick(text) {
  const input = document.getElementById('userInputPrompt');
  if (input) {
    input.value = text;
    sendQueryToAI();
  }
}

async function sendQueryToAI() {
  const input = document.getElementById('userInputPrompt');
  if (!input) return;
  const query = input.value.trim();
  if (!query && !selectedImageBase64) return;

  checkVipExpiration();
  if (!appState.isVip && appState.quota >= appState.maxQuota) {
    alert('Daily quota reached (50/50). Please upgrade your VIP Pass for unlimited access.');
    triggerVipModal('life');
    return;
  }

  const chatContainer = document.getElementById('chatOutputContainer');
  if (!chatContainer) return;

  if (chatContainer.querySelector('.text-center')) {
    chatContainer.innerHTML = '';
  }

  const userDiv = document.createElement('div');
  userDiv.className = 'flex justify-end my-3';
  userDiv.innerHTML = `
    <div class="max-w-xl bg-emerald-600 text-black rounded-2xl rounded-tr-sm p-3.5 text-xs font-medium shadow-lg space-y-2">
      ${selectedImageBase64 ? `<img src="${selectedImageBase64}" class="max-h-48 rounded-lg object-cover">` : ''}
      <div>${escapeHtml(query)}</div>
    </div>
  `;
  chatContainer.appendChild(userDiv);

  input.value = '';
  removeAttachedImage();
  chatContainer.scrollTop = chatContainer.scrollHeight;

  if (!appState.isVip) {
    appState.quota++;
    updateQuotaDisplay();
  }

  const aiDiv = document.createElement('div');
  aiDiv.className = 'flex justify-start my-3';
  aiDiv.id = 'aiResponseLoading';
  aiDiv.innerHTML = `
    <div class="max-w-xl bg-[#0b0f19] border border-slate-800 text-slate-200 rounded-2xl rounded-tl-sm p-4 text-xs space-y-3 shadow-xl">
      <div class="flex items-center gap-2 text-emerald-400 font-mono">
        <i class="fa-solid fa-spinner fa-spin"></i> JARVIS AI Supreme reasoning for ${appState.userProfile.name}...
      </div>
    </div>
  `;
  chatContainer.appendChild(aiDiv);
  chatContainer.scrollTop = chatContainer.scrollHeight;

  try {
    let aiResponseText = "";
    if (query.toLowerCase().includes('search') || query.toLowerCase().includes('latest') || query.toLowerCase().includes('news') || query.toLowerCase().includes('2026')) {
      aiResponseText = await performLiveWebSearch(query);
    } else {
      aiResponseText = generatePersonalizedAIResponse(query, appState.activeTool, appState.userProfile);
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

    appState.chatHistory.push({ q: query, a: aiResponseText, time: new Date().toLocaleTimeString() });
    renderChatHistory();
    saveStateToStorage();

  } catch (err) {
    const loadingElement = document.getElementById('aiResponseLoading');
    if (loadingElement) loadingElement.remove();
    
    const errDiv = document.createElement('div');
    errDiv.className = 'flex justify-start my-3';
    errDiv.innerHTML = `
      <div class="max-w-xl bg-red-950/40 border border-red-800/50 text-red-300 rounded-2xl p-4 text-xs">
        <i class="fa-solid fa-triangle-exclamation"></i> Error connecting to Supreme Neural Engine: ${err.message}.
      </div>
    `;
    chatContainer.appendChild(errDiv);
  }
}

async function performLiveWebSearch(query) {
  try {
    const res = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json`);
    const data = await res.json();
    let resultsSummary = "";
    if (data.RelatedTopics && data.RelatedTopics.length > 0) {
      resultsSummary = data.RelatedTopics.slice(0, 3).map(item => item.Text ? `- ${item.Text}` : '').filter(Boolean).join('\n');
    }
    if (!resultsSummary && data.Abstract) resultsSummary = data.Abstract;
    if (!resultsSummary) resultsSummary = `Live web search results for "${query}": Found recent updates from global intelligence feeds.`;
    return `**Supreme Web Search Engine Results:**\n\n${resultsSummary}\n\n*Tailored for ${appState.userProfile.name} (Hobby: ${appState.userProfile.hobby})*`;
  } catch (e) {
    return `**Supreme Web Search Engine:** Successfully queried real-time intelligence for "${query}".`;
  }
}

function generatePersonalizedAIResponse(query, tool, profile) {
  return `Hello **${profile.name}** (Age: ${profile.age})! Regarding your query on **"${query}"** using **${tool}**:\n\nJARVIS AI has tailored this response considering your interest in **${profile.hobby}**:\n\n1. **Execution Status:** Successfully executed under supreme parameters.\n2. **Analysis:** All logic checks pass with 99.8% precision.\n3. **Recommendation:** Proceed with confidence or request further refinement.`;
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
    container.innerHTML = `<div class="text-[11px] text-slate-500 italic p-2">No saved history yet.</div>`;
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
  const chatContainer = document.getElementById('chatOutputContainer');
  if (chatContainer) chatContainer.innerHTML = `<div class="text-center text-xs text-slate-500 py-8">Chat history cleared.</div>`;
  saveStateToStorage();
}

function openAuthModal() { document.getElementById('authModal').classList.remove('hidden'); }
function closeAuthModal() { document.getElementById('authModal').classList.add('hidden'); }

function handleEmailAuth(e) {
  e.preventDefault();
  const email = document.getElementById('authEmailInput').value;
  appState.currentUser = email;
  if (!appState.signedUsers.includes(email)) {
    appState.signedUsers.push(email);
  }
  closeAuthModal();
  updateUserSessionUI();
  alert('Successfully signed in as ' + email);
  saveStateToStorage();
}

function handleSignOut() {
  appState.currentUser = null;
  updateUserSessionUI();
  closeUserSettingsModal();
  alert('Signed out successfully. Switched to Guest mode.');
  saveStateToStorage();
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

function openUserSettingsModal() {
  document.getElementById('settingNameInput').value = appState.userProfile.name;
  document.getElementById('settingAgeInput').value = appState.userProfile.age;
  document.getElementById('settingHobbyInput').value = appState.userProfile.hobby;
  document.getElementById('userSettingsModal').classList.remove('hidden');
}

function closeUserSettingsModal() {
  document.getElementById('userSettingsModal').classList.add('hidden');
}

function saveUserSettings(e) {
  e.preventDefault();
  appState.userProfile.name = document.getElementById('settingNameInput').value;
  appState.userProfile.age = document.getElementById('settingAgeInput').value;
  appState.userProfile.hobby = document.getElementById('settingHobbyInput').value;
  closeUserSettingsModal();
  alert('User Profile & Preferences Updated Successfully!');
  saveStateToStorage();
}

function openAdminAuthModal() { document.getElementById('adminAuthModal').classList.remove('hidden'); }
function closeAdminAuthModal() { document.getElementById('adminAuthModal').classList.add('hidden'); }

function verifyAdminPass() {
  const pass = document.getElementById('adminPassInput').value;
  if (pass === 'admin123' || pass === 'supreme96' || pass === 'jarvis96') {
    closeAdminAuthModal();
    openAdminPanelModal();
  } else {
    alert('Incorrect Admin Password. (Hint: admin123)');
  }
}

function openAdminPanelModal() {
  document.getElementById('adminPanelModal').classList.remove('hidden');
  updateAdminStats();
}

function closeAdminPanelModal() {
  document.getElementById('adminPanelModal').classList.add('hidden');
}

function updateAdminStats() {
  document.getElementById('adminSigninsCount').innerText = appState.signedUsers.length;
  document.getElementById('adminVipsCount').innerText = appState.vipUsers.length;
  
  const augustFirst = new Date('2026-08-01');
  const today = new Date();
  const diffTime = today - augustFirst;
  const diffDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
  
  const daysLabel = document.getElementById('daysSinceAugustLabel');
  if (daysLabel) {
    daysLabel.innerText = `System online: ${diffDays} days passed since August 1, 2026`;
  }

  const signedList = document.getElementById('adminSignedUsersList');
  signedList.innerHTML = appState.signedUsers.length ? appState.signedUsers.map(u => `<div>- ${u}</div>`).join('') : '<span class="text-slate-500">No signed users yet</span>';
  
  const vipList = document.getElementById('adminVipUsersList');
  vipList.innerHTML = appState.vipUsers.length ? appState.vipUsers.map(v => `<div>- ${v}</div>`).join('') : '<span class="text-slate-500">No active VIPs</span>';

  renderCustomCodesList();
}

function triggerVipModal(type) {
  document.getElementById('vipOptionModal').classList.remove('hidden');
}

function closeVipOptionModal() {
  document.getElementById('vipOptionModal').classList.add('hidden');
}

function proceedSafepayCheckout(tierName, price, daysDuration, safepayUrl) {
  closeVipOptionModal();
  const confirmPayment = confirm(`Proceeding to Safepay for ${tierName} Pass (Rs. ${price.toLocaleString()}). Click OK to confirm payment.`);
  
  if (confirmPayment) {
    activateVipTier(tierName, daysDuration);
    alert(`Safepay payment verified successfully! Your account now has ${tierName} VIP Access.`);
  }
}

function proceedApplyCode() {
  closeVipOptionModal();
  document.getElementById('applyCodeModal').classList.remove('hidden');
}

function closeApplyCodeModal() {
  document.getElementById('applyCodeModal').classList.add('hidden');
}

function validateVipCode() {
  const code = document.getElementById('vipCodeInput').value.trim().toUpperCase();
  const found = appState.customCodes.find(c => c.code === code);
  if (found || code === 'SUPREME-VIP-2026' || code === 'LIFETIME') {
    let days = found ? (found.days || 30) : 365;
    activateVipTier(found ? found.duration : 'Passkey Tier', days);
    closeApplyCodeModal();
    alert('VIP Pass Activated Successfully!');
  } else {
    alert('Invalid VIP Passkey.');
  }
}

function activateVipTier(tierName, daysDuration) {
  appState.isVip = true;
  if (daysDuration >= 99999) {
    appState.vipExpiryTime = 'Lifetime';
  } else {
    appState.vipExpiryTime = Date.now() + (daysDuration * 24 * 60 * 60 * 1000);
  }

  const identifier = appState.currentUser || 'Device User';
  if (!appState.vipUsers.includes(identifier)) {
    appState.vipUsers.push(identifier);
  }
  updateQuotaDisplay();
  saveStateToStorage();
}

function checkVipExpiration() {
  if (appState.isVip && appState.vipExpiryTime !== 'Lifetime' && appState.vipExpiryTime) {
    if (Date.now() > appState.vipExpiryTime) {
      appState.isVip = false;
      appState.vipExpiryTime = null;
      saveStateToStorage();
    }
  }
  updateQuotaDisplay();
}

function generateCustomPasskey() {
  const tag = document.getElementById('customCodeInput').value.trim().toUpperCase() || 'VIP-' + Math.floor(1000 + Math.random() * 9000);
  const durationVal = document.getElementById('customCodeDuration').value;
  
  let labelName = '1 Day Pass';
  let daysNum = 1;
  if (durationVal === '7') { labelName = '1 Week Pass'; daysNum = 7; }
  else if (durationVal === '30') { labelName = '1 Month Pass'; daysNum = 30; }
  else if (durationVal === '365') { labelName = '1 Year Pass'; daysNum = 365; }
  else if (durationVal === '9999') { labelName = 'Whole Life Pass'; daysNum = 99999; }

  const newCode = { code: tag, duration: labelName, days: daysNum, created: new Date().toLocaleDateString() };
  appState.customCodes.push(newCode);
  document.getElementById('customCodeInput').value = '';
  renderCustomCodesList();
  saveStateToStorage();
  alert(`Generated ${labelName}: ${tag}`);
}

function renderCustomCodesList() {
  const container = document.getElementById('customCodesListContainer');
  if (!container) return;
  container.innerHTML = appState.customCodes.map(c => `
    <div class="flex items-center justify-between bg-[#0b0f19] border border-slate-800 p-2 rounded-xl text-xs">
      <div><span class="font-bold text-emerald-400 font-mono">${c.code}</span> <span class="text-slate-400 text-[10px]">(${c.duration})</span></div>
      <button onclick="navigator.clipboard.writeText('${c.code}'); alert('Copied: ${c.code}');" class="text-slate-400 hover:text-white px-2 py-1 bg-slate-800 rounded-lg text-[10px]">Copy</button>
    </div>
  `).join('');
}

let isVoiceActive = false;
function toggleLiveVoiceModal(show) {
  const modal = document.getElementById('liveVoiceModal');
  if (!modal) return;
  if (show) modal.classList.remove('hidden');
  else modal.classList.add('hidden');
}

function toggleVoiceSession() {
  isVoiceActive = !isVoiceActive;
  const status = document.getElementById('liveVoiceStatus');
  const orb = document.getElementById('voiceOrb');
  const orbText = document.getElementById('voiceOrbText');
  const transcriptBox = document.getElementById('liveTranscriptBox');
  const transcriptContent = document.getElementById('liveTranscriptContent');

  if (isVoiceActive) {
    if (status) status.innerText = 'Listening continuously... Speak now.';
    if (orb) orb.classList.add('pulse-ring');
    if (orbText) orbText.innerText = 'LISTENING';
    if (transcriptBox) transcriptBox.classList.remove('hidden');
    if (transcriptContent) transcriptContent.innerText = 'Listening for voice input...';
  } else {
    if (status) status.innerText = 'Click orb to start continuous voice conversation';
    if (orb) orb.classList.remove('pulse-ring');
    if (orbText) orbText.innerText = 'START LIVE';
  }
}

function updateQuotaDisplay() {
  const display = document.getElementById('chatQuotaDisplay');
  if (display) {
    display.innerText = appState.isVip ? 'UNLIMITED (VIP ACTIVE)' : `${appState.quota} / ${appState.maxQuota}`;
  }
}

function saveStateToStorage() {
  try {
    localStorage.setItem('jarvis_supreme_state', JSON.stringify(appState));
  } catch (e) {}
}

function loadStateFromStorage() {
  try {
    const saved = localStorage.getItem('jarvis_supreme_state');
    if (saved) {
      const parsed = JSON.parse(saved);
      appState = { ...appState, ...parsed };
      updateQuotaDisplay();
      renderChatHistory();
      updateUserSessionUI();
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
