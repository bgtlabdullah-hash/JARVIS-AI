async function sendQueryToGemini() {
  const input = document.getElementById('userInputPrompt');
  const prompt = input.value.trim();
  if (!prompt) return;

  if (!isVipActive) {
    if (activeTool.id === 1) {
      if (chatCount >= CHAT_LIMIT) {
        alert("JARVIS Chat Pro limit reached for Free Tier! Upgrade to VIP for unlimited access.");
        return;
      }
    } else {
      const used = toolUsageMap[activeTool.id] || 0;
      if (used >= 5) {
        alert(`You have reached the limit for '${activeTool.name}' on Free Tier. Upgrade to VIP for unlimited access!`);
        return;
      }
    }
  }

  if (activeTool.id === 1) {
    chatCount++;
  } else {
    toolUsageMap[activeTool.id] = (toolUsageMap[activeTool.id] || 0) + 1;
  }
  updateQuotaDisplay();

  appendChatMessage(prompt, 'user');
  input.value = "";

  if (activeTool.id === 2) {
    const aiMsgDiv = appendChatMessage("<em>Rendering 8K image scene...</em>", 'ai');
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true`;
    
    const img = new Image();
    img.className = "rounded-lg border border-slate-700 mt-2 max-w-full h-auto";
    img.src = imageUrl;
    img.onload = () => {
      aiMsgDiv.querySelector('.flex-1').innerHTML = `<strong>Ultra 8K Image Generated:</strong><br>`;
      aiMsgDiv.querySelector('.flex-1').appendChild(img);
      saveHistoryEntry(prompt, `Generated Ultra 8K Image for "${prompt}"`);
    };
    img.onerror = () => {
      aiMsgDiv.querySelector('.flex-1').innerHTML = "Failed to render image visual.";
    };
  } 
  else if (activeTool.id === 3) {
    const aiMsgDiv = appendChatMessage("<em>Synthesizing AI video frames...</em>", 'ai');
    const videoUrl = `https://gen.pollinations.ai/video/${encodeURIComponent(prompt)}`;

    const videoElem = document.createElement('video');
    videoElem.className = "rounded-lg border border-slate-700 mt-2 max-w-full h-auto w-full max-h-80";
    videoElem.controls = true;
    videoElem.autoplay = true;
    videoElem.loop = true;
    videoElem.src = videoUrl;

    videoElem.onloadeddata = () => {
      aiMsgDiv.querySelector('.flex-1').innerHTML = `<strong>AI MP4 Video Rendered:</strong><br>`;
      aiMsgDiv.querySelector('.flex-1').appendChild(videoElem);
      saveHistoryEntry(prompt, `Generated AI MP4 Video for "${prompt}"`);
    };
    videoElem.onerror = () => {
      aiMsgDiv.querySelector('.flex-1').innerHTML = `
        <div><strong>AI Video Stream Ready:</strong></div>
        <div class="mt-2 p-2 bg-slate-900 rounded border border-slate-800 flex items-center justify-between">
          <span class="text-[11px] text-amber-300">Play / Stream Video</span>
          <a href="${videoUrl}" target="_blank" class="px-2 py-1 bg-amber-500 text-black text-[10px] font-bold rounded">Open Stream</a>
        </div>
      `;
      saveHistoryEntry(prompt, `Generated AI Video Link for "${prompt}"`);
    };
  }
  else {
    const aiMsgDiv = appendChatMessage("<em>JARVIS AI is thinking...</em>", 'ai');
    try {
      const apiReply = await queryGeminiApi(prompt);
      aiMsgDiv.querySelector('.flex-1').innerHTML = apiReply.replaceAll('\n', '<br>');
      
      if (activeTool.id === 11 && window.renderMathInElement) {
        renderMathInElement(aiMsgDiv, {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false }
          ],
          throwOnError: false
        });
      }
      saveHistoryEntry(prompt, apiReply);
    } catch (error) {
      // Clean custom error message hiding internal backend details
      aiMsgDiv.querySelector('.flex-1').innerHTML = `<span class="text-amber-400 font-mono">JARVIS AI servers are currently processing heavy traffic. Please wait 1 minute and try again.</span>`;
    }
  }
}
