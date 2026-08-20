// Array to hold saved items
let savedCreations = JSON.parse(localStorage.getItem('king_ai_saved_creations') || '[]');

// Save current image to Saved Creations
function saveCurrentImage() {
  const imgDisplay = document.getElementById('generatedImageDisplay');
  const promptInput = document.getElementById('imagePromptInput').value.trim();

  if (!imgDisplay.src) return;

  const newItem = {
    id: 'creation_' + Date.now(),
    url: imgDisplay.src,
    prompt: promptInput || 'Generated Image',
    date: new Date().toLocaleDateString()
  };

  savedCreations.unshift(newItem);
  localStorage.setItem('king_ai_saved_creations', JSON.stringify(savedCreations));
  
  updateSavedCount();
  renderSavedCreations();
  alert("✨ Saved to your Creations folder!");
}

// Render items inside MODE 6: Saved Creations
function renderSavedCreations() {
  const container = document.getElementById('savedCreationsList');
  if (!container) return;

  if (savedCreations.length === 0) {
    container.innerHTML = `<div class="text-xs text-slate-400">No saved images or chats yet.</div>`;
    return;
  }

  container.className = "grid grid-cols-2 md:grid-cols-3 gap-3";
  container.innerHTML = savedCreations.map(item => `
    <div class="bg-king-card border border-king-border p-2 rounded-xl space-y-2">
      <img src="${item.url}" class="w-full h-32 object-cover rounded-lg border border-slate-700">
      <p class="text-[10px] text-slate-300 truncate font-semibold">${item.prompt}</p>
      <div class="flex justify-between items-center text-[9px] text-slate-400">
        <span>${item.date}</span>
        <button onclick="deleteSavedCreation('${item.id}')" class="text-red-400 hover:underline font-bold">Delete</button>
      </div>
    </div>
  `).join('');
}

// Delete item from saved creations
function deleteSavedCreation(id) {
  savedCreations = savedCreations.filter(item => item.id !== id);
  localStorage.setItem('king_ai_saved_creations', JSON.stringify(savedCreations));
  updateSavedCount();
  renderSavedCreations();
}

// Update saved badge counter in sidebar
function updateSavedCount() {
  const badge = document.getElementById('savedCount');
  if (badge) badge.innerText = savedCreations.length;
}

// Update generateImage() to update the download link automatically
const originalGenerateImage = generateImage;
generateImage = async function(customPrompt = null) {
  await originalGenerateImage(customPrompt);
  const imgDisplay = document.getElementById('generatedImageDisplay');
  const downloadBtn = document.getElementById('downloadImgLink');
  if (imgDisplay && downloadBtn) {
    downloadBtn.href = imgDisplay.src;
  }
};

// Initialize count on page load
document.addEventListener('DOMContentLoaded', () => {
  updateSavedCount();
  renderSavedCreations();
});
