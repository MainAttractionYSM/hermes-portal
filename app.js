const BASE_URL = 'https://noble-oxygen-coated-ala.trycloudflare.com';
const API_URL = `${BASE_URL}/api/chat`;
const UPLOAD_URL = `${BASE_URL}/api/upload`;
const APPROVE_URL = `${BASE_URL}/api/approve`;
const REPOS_URL = `${BASE_URL}/api/repos`;

const chatContainer = document.getElementById('chat-container');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const fileUpload = document.getElementById('file-upload');
const filePreview = document.getElementById('file-preview');

let attachedFiles = [];
let activeRepo = null;

// Load available repos on startup
async function loadRepos() {
    try {
        const res = await fetch(REPOS_URL);
        const data = await res.json();
        const repos = data.repos || {};
        const select = document.getElementById('repo-select');
        select.innerHTML = '<option value="">No repo selected</option>';
        Object.keys(repos).forEach(name => {
            const opt = document.createElement('option');
            opt.value = name;
            opt.textContent = `${name} (${repos[name].file_count} files)`;
            select.appendChild(opt);
        });
    } catch(e) {
        console.error('Could not load repos:', e);
    }
}

function onRepoChange(val) {
    activeRepo = val || null;
    window.activeRepo = activeRepo;
    const label = document.getElementById('active-repo-label');
    const badge = document.getElementById('repo-badge');
    const headerBadge = document.getElementById('header-repo-badge');
    const bannerText = document.getElementById('banner-repo-text');
    if (val) {
        if(label) label.textContent = val;
        if(badge) badge.classList.remove('hidden');
        if(headerBadge) { headerBadge.classList.remove('hidden'); headerBadge.textContent = '📁 ' + val; }
        if(bannerText) bannerText.textContent = `Active repo: ${val}`;
    } else {
        if(badge) badge.classList.add('hidden');
        if(headerBadge) headerBadge.classList.add('hidden');
        if(bannerText) bannerText.textContent = 'General agent mode — optionally select a repo';
    }
}

// Thinking steps for agent mode
const THINKING_STEPS = {
    default: ['🧠 Thinking...', '✏️ Preparing response...'],
    repo: ['📁 Reading repo files...', '🧠 Analyzing code...', '✏️ Writing response...'],
    code: ['🧠 Planning changes...', '✏️ Writing code...', '🧪 Preparing tests...'],
};

function showThinking(hasRepo) {
    const id = 'thinking-' + Date.now();
    const model = window.currentModel || 'gptoss';
    const steps = hasRepo ? THINKING_STEPS.repo : THINKING_STEPS.default;
    
    const wrap = document.createElement('div');
    wrap.className = 'flex gap-4 max-w-4xl mx-auto';
    wrap.id = id;
    wrap.innerHTML = `
        <div class="w-8 h-8 rounded-lg bg-blue-600 flex-shrink-0 flex items-center justify-center text-sm shadow-lg shadow-blue-600/20">${getModelAvatar(model)}</div>
        <div class="chat-bubble-ai p-4 space-y-2 min-w-48">
            <div id="${id}-step" class="text-xs text-gray-400 flex items-center gap-2">
                <span class="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
                <span>${steps[0]}</span>
            </div>
            <div class="flex gap-1 items-center">
                <span class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style="animation-delay:0s"></span>
                <span class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style="animation-delay:0.2s"></span>
                <span class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style="animation-delay:0.4s"></span>
            </div>
        </div>`;
    chatContainer.appendChild(wrap);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    // Cycle through steps
    let stepIdx = 0;
    const interval = setInterval(() => {
        stepIdx = (stepIdx + 1) % steps.length;
        const el = document.getElementById(`${id}-step`);
        if (el) el.querySelector('span:last-child').textContent = steps[stepIdx];
    }, 2000);

    return { id, interval };
}

function removeThinking({ id, interval }) {
    clearInterval(interval);
    document.getElementById(id)?.remove();
}

async function handleSend() {
    const text = userInput.value.trim();
    if (!text && attachedFiles.length === 0) return;

    userInput.value = '';
    userInput.style.height = 'auto';
    appendMessage('user', text);

    if (attachedFiles.length > 0) await uploadFiles();

    const model = window.currentModel || 'gptoss';
    const mode = window.currentMode || 'chat';
    const thinking = showThinking(mode === 'agent' && !!activeRepo);

    try {
        const body = { message: text, model, mode, files: attachedFiles.map(f => f.name) };
        if (mode === 'agent' && activeRepo) body.repo = activeRepo;

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await response.json();
        removeThinking(thinking);

        if (data.needs_repo_selection) {
            appendMessage('ai', data.response);
            showRepoSelector(data.available_repos);
        } else if (data.approval_required) {
            appendMessage('ai', data.response);
            showApprovalCard(data);
        } else {
            appendMessage('ai', data.response || 'No response.');
        }
    } catch (e) {
        removeThinking(thinking);
        appendMessage('ai', 'Error: Could not connect to Hermes Gateway.');
    }

    attachedFiles = [];
    filePreview.innerHTML = '';
    filePreview.classList.add('hidden');
}

function showRepoSelector(repos) {
    const card = document.createElement('div');
    card.className = 'max-w-4xl mx-auto';
    const buttons = repos.map(r => `
        <button onclick="selectRepoFromChat('${r}', this)" 
            class="px-4 py-2 glass rounded-xl text-sm hover:bg-blue-600/30 transition-all border border-white/10 hover:border-blue-500/50">
            📁 ${r}
        </button>`).join('');
    card.innerHTML = `<div class="glass rounded-2xl p-4 border border-blue-500/30 space-y-3">
        <p class="text-sm text-gray-300">Choose a repository to work on:</p>
        <div class="flex flex-wrap gap-2">${buttons}</div>
        <button onclick="this.closest('.max-w-4xl').remove(); appendMessage('ai', 'No repo selected. I will work in general agent mode.')" 
            class="text-xs text-gray-500 hover:text-gray-300 transition-all">
            Skip — work without a repo
        </button>
    </div>`;
    chatContainer.appendChild(card);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function selectRepoFromChat(repo, btn) {
    activeRepo = repo;
    window.activeRepo = repo;
    document.getElementById('repo-select').value = repo;
    onRepoChange(repo);
    btn.closest('.max-w-4xl').remove();
    appendMessage('ai', `Switched to repo: ${repo}. I now have full access to its files. What would you like me to do?`);
}

function showApprovalCard(data) {
    const card = document.createElement('div');
    card.className = 'max-w-4xl mx-auto';
    card.innerHTML = `
        <div class="glass rounded-2xl p-4 border border-yellow-500/30 space-y-3">
            <div class="flex items-center gap-2 text-yellow-400 font-medium text-sm">
                <i class="fas fa-code-branch"></i> Code Ready for Review
            </div>
            <div class="text-xs text-gray-400 font-mono bg-black/30 p-3 rounded-xl whitespace-pre overflow-x-auto">${escapeHtml(data.diff)}</div>
            <div class="text-xs text-gray-400">
                <div class="font-semibold text-gray-300 mb-1">Test Results:</div>
                <div class="font-mono bg-black/30 p-2 rounded-lg whitespace-pre overflow-x-auto">${escapeHtml(data.test_results)}</div>
            </div>
            <div class="flex gap-2 pt-1">
                <button onclick="approveChanges('${data.approval_id}', true, this)"
                    class="flex-1 py-2 px-4 bg-green-600 hover:bg-green-500 text-white text-sm rounded-xl transition-all flex items-center justify-center gap-2">
                    <i class="fas fa-check"></i> Approve & Push
                </button>
                <button onclick="approveChanges('${data.approval_id}', false, this)"
                    class="flex-1 py-2 px-4 bg-red-600/50 hover:bg-red-500 text-white text-sm rounded-xl transition-all flex items-center justify-center gap-2">
                    <i class="fas fa-times"></i> Reject
                </button>
            </div>
        </div>`;
    chatContainer.appendChild(card);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

async function approveChanges(approvalId, approved, btn) {
    const card = btn.closest('.glass');
    card.innerHTML = '<div class="text-center text-gray-400 text-sm py-2"><i class="fas fa-spinner fa-spin mr-2"></i>Processing...</div>';
    try {
        const response = await fetch(APPROVE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ approval_id: approvalId, approved })
        });
        const data = await response.json();
        card.innerHTML = `<div class="text-sm p-2 ${approved ? 'text-green-400' : 'text-red-400'}">${escapeHtml(data.response)}</div>`;
    } catch (e) {
        card.innerHTML = '<div class="text-red-400 text-sm p-2">Error processing approval.</div>';
    }
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function getModelAvatar(model) {
    return model === 'kimi' ? '🌙' : '◼';
}

function escapeHtml(text) {
    return (text || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function appendMessage(role, content) {
    const model = window.currentModel || 'gptoss';
    const wrap = document.createElement('div');
    wrap.className = 'flex gap-4 max-w-4xl mx-auto ' + (role === 'user' ? 'justify-end' : '');
    const avatar = document.createElement('div');
    avatar.className = 'w-8 h-8 rounded-lg bg-blue-600 flex-shrink-0 flex items-center justify-center text-sm shadow-lg shadow-blue-600/20';
    avatar.textContent = getModelAvatar(model);
    const bubble = document.createElement('div');
    bubble.className = 'p-4 text-sm leading-relaxed shadow-sm ' + (role === 'user' ? 'chat-bubble-user text-white' : 'chat-bubble-ai');
    bubble.innerText = content;
    if (role === 'user') { wrap.appendChild(bubble); }
    else { wrap.appendChild(avatar); wrap.appendChild(bubble); }
    chatContainer.appendChild(wrap);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

async function uploadFiles() {
    const formData = new FormData();
    attachedFiles.forEach(file => formData.append('files', file));
    try { await fetch(UPLOAD_URL, { method: 'POST', body: formData }); }
    catch (e) { console.error('Upload failed', e); }
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

loadRepos();
