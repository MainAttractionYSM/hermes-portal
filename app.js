const API_URL = 'https://scanners-modes-maps-laptops.trycloudflare.com/api/chat'; 
const UPLOAD_URL = 'https://scanners-modes-maps-laptops.trycloudflare.com/api/upload';

const chatContainer = document.getElementById('chat-container');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const fileUpload = document.getElementById('file-upload');
const filePreview = document.getElementById('file-preview');

let attachedFiles = [];

// Handle Send
async function handleSend() {
    const text = userInput.value.trim();
    if (!text && attachedFiles.length === 0) return;

    // Clear input
    userInput.value = '';
    userInput.style.height = 'auto';
    
    // User Message Bubble
    appendMessage('user', text);
    
    // Handle File Uploads first
    if (attachedFiles.length > 0) {
        await uploadFiles();
    }
    
    // Send to Agent
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                message: text,
                files: attachedFiles.map(f => f.name)
            })
        });
        const data = await response.json();
        appendMessage('ai', data.response || 'No response from agent.');
    } catch (e) {
        appendMessage('ai', 'Error: Could not connect to Hermes Gateway.');
    }

    attachedFiles = [];
    filePreview.innerHTML = '';
    filePreview.classList.add('hidden');
}

function appendMessage(role, content) {
    const wrap = document.createElement('div');
    wrap.className = 'flex gap-4 max-w-4xl mx-auto ' + (role === 'user' ? 'justify-end' : '');
    
    const avatar = document.createElement('div');
    avatar.className = (role === 'user' ? 'hidden' : 'w-8 h-8 rounded-lg bg-blue-600 flex-shrink-0 flex items-center justify-center text-xs font-bold shadow-lg shadow-blue-600/20');
    avatar.innerText = 'H';

    const bubble = document.createElement('div');
    bubble.className = 'p-4 text-sm leading-relaxed shadow-sm ' + 
        (role === 'user' ? 'chat-bubble-user text-white' : 'chat-bubble-ai');
    bubble.innerText = content;

    if (role === 'user') {
        wrap.appendChild(bubble);
        wrap.appendChild(avatar); // Reversed for user
        avatar.className = 'hidden'; // Keep hidden for now
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
        await fetch(UPLOAD_URL, {
            method: 'POST',
            body: formData
        });
    } catch (e) {
        console.error('Upload failed', e);
    }
}

// File Selection
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
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
    }
};
