const API_URL = 'https://partnership-forests-conf-lewis.trycloudflare.com/api/chat';
const UPLOAD_URL = 'https://partnership-forests-conf-lewis.trycloudflare.com/api/upload';

const chatContainer = document.getElementById('chat-container');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const fileUpload = document.getElementById('file-upload');
const filePreview = document.getElementById('file-preview');

let attachedFiles = [];

async function handleSend() {
    const text = userInput.value.trim();
    if (!text && attachedFiles.length === 0) return;

    userInput.value = '';
    userInput.style.height = 'auto';
    appendMessage('user', text);

    if (attachedFiles.length > 0) await uploadFiles();

    // Show typing indicator
    const typingId = showTyping();

    try {
        const model = window.currentModel || 'gptoss';
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text, model: model, files: attachedFiles.map(f => f.name) })
        });
        const data = await response.json();
        removeTyping(typingId);
        appendMessage('ai', data.response || 'No response from agent.');
    } catch (e) {
        removeTyping(typingId);
        appendMessage('ai', 'Error: Could not connect to Hermes Gateway.');
    }

    attachedFiles = [];
    filePreview.innerHTML = '';
    filePreview.classList.add('hidden');
}

function showTyping() {
    const id = 'typing-' + Date.now();
    const wrap = document.createElement('div');
    wrap.className = 'flex gap-4 max-w-4xl mx-auto';
    wrap.id = id;
    wrap.innerHTML = `
        <div class="w-8 h-8 rounded-lg bg-blue-600 flex-shrink-0 flex items-center justify-center text-xs font-bold">H</div>
        <div class="chat-bubble-ai p-4 flex gap-1 items-center">
            <span class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay:0s"></span>
            <span class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay:0.2s"></span>
            <span class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay:0.4s"></span>
        </div>`;
    chatContainer.appendChild(wrap);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    return id;
}

function removeTyping(id) {
    document.getElementById(id)?.remove();
}

function appendMessage(role, content) {
    const wrap = document.createElement('div');
    wrap.className = 'flex gap-4 max-w-4xl mx-auto ' + (role === 'user' ? 'justify-end' : '');

    const avatar = document.createElement('div');
    avatar.className = 'w-8 h-8 rounded-lg bg-blue-600 flex-shrink-0 flex items-center justify-center text-xs font-bold shadow-lg shadow-blue-600/20';
    avatar.innerText = 'H';

    const bubble = document.createElement('div');
    bubble.className = 'p-4 text-sm leading-relaxed shadow-sm ' + (role === 'user' ? 'chat-bubble-user text-white' : 'chat-bubble-ai');
    bubble.innerText = content;

    if (role === 'user') {
        wrap.appendChild(bubble);
    } else {
        wrap.appendChild(avatar);
        wrap.appendChild(bubble);
    }

    chatContainer.appendChild(wrap);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

async function uploadFiles() {
    const formData = new FormData();
    attachedFiles.forEach(file => formData.append('files', file));
    try {
        await fetch(UPLOAD_URL, { method: 'POST', body: formData });
    } catch (e) {
        console.error('Upload failed', e);
    }
}

fileUpload.onchange = () => {
    const files = Array.from(fileUpload.files);
    attachedFiles.push(...files);
    filePreview.innerHTML = '';
    filePreview.classList.remove('hidden');
    files.forEach(file => {
        const item = document.createElement('div');
        item.className = 'glass p-2 rounded-lg text-xs flex items-center gap-2 text-white';
        item.innerHTML = `<i class="fas fa-file ${getFileIcon(file.name)}"></i> ${file.name}`;
        filePreview.appendChild(item);
    });
};

function getFileIcon(name) {
    if (name.match(/\.(jpg|jpeg|png|gif)$/i)) return 'fa-image text-blue-400';
    if (name.match(/\.(pdf|doc|txt)$/i)) return 'fa-file-pdf text-red-400';
    if (name.match(/\.(py|js|html|css)$/i)) return 'fa-code text-green-400';
    return 'fa-file text-gray-400';
}

sendBtn.onclick = handleSend;
userInput.onkeydown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
};
