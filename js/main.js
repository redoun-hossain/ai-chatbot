/* ===========================
   STATE
   =========================== */
let chats = JSON.parse(localStorage.getItem('rag_chats') || '[]');
let allMessages = JSON.parse(localStorage.getItem('rag_msgs') || '{}');
let activeChat = null;
let isLoading = false;
let sidebarOpen = localStorage.getItem('rag_sb') !== 'false';

/* ===========================
   DOM ELEMENTS
   =========================== */
const $ = (id) => document.getElementById(id);
const sidebar = $('sidebar');
const logoBtn = $('logoBtn');
const collapseBtn = $('collapseBtn');
const newChatBtn = $('newChatBtn');
const searchInput = $('searchInput');
const searchClear = $('searchClear');
const chatLabel = $('chatLabel');
const chatList = $('chatList');
const emptyState = $('emptyState');
const themeBtn = $('themeBtn');
const clearBtn = $('clearBtn');
const overlay = $('overlay');
const hamburgerBtn = $('hamburgerBtn');
const headerCenter = $('headerCenter');
const welcomeScreen = $('welcomeScreen');
const chatView = $('chatView');
const messagesEl = $('messages');
const scrollBottomBtn = $('scrollBottomBtn');
const welcomeInput = $('welcomeInput');
const welcomeSendBtn = $('welcomeSendBtn');
const chatInput = $('chatInput');
const chatSendBtn = $('chatSendBtn');

/* ===========================
   THEME
   =========================== */
function initTheme() {
    const saved = localStorage.getItem('rag_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
    updateThemeIcons(saved);
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('rag_theme', next);
    updateThemeIcons(next);
}

function updateThemeIcons(theme) {
    const sun = themeBtn.querySelector('.theme-icon-sun');
    const moon = themeBtn.querySelector('.theme-icon-moon');
    if (theme === 'dark') {
        sun.style.display = '';
        moon.style.display = 'none';
    } else {
        sun.style.display = 'none';
        moon.style.display = '';
    }
}

/* ===========================
   SIDEBAR TOGGLE
   =========================== */
function initSidebar() {
    if (!sidebarOpen) sidebar.classList.add('collapsed');
}

function toggleSidebar() {
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
        sidebar.classList.toggle('mobile-open');
        overlay.classList.toggle('visible');
    } else {
        sidebar.classList.toggle('collapsed');
        sidebarOpen = !sidebar.classList.contains('collapsed');
        localStorage.setItem('rag_sb', sidebarOpen);
    }
}

function closeMobileSidebar() {
    sidebar.classList.remove('mobile-open');
    overlay.classList.remove('visible');
}

/* ===========================
   CHAT MANAGEMENT
   =========================== */
function saveChats() {
    localStorage.setItem('rag_chats', JSON.stringify(chats));
}

function saveMessages() {
    localStorage.setItem('rag_msgs', JSON.stringify(allMessages));
}

function createChat() {
    // Reuse empty active chat
    if (activeChat) {
        const msgs = allMessages[activeChat] || [];
        if (msgs.length === 0) return;
    }
    // Reuse latest empty chat
    if (chats.length > 0) {
        const latest = chats[0];
        const msgs = allMessages[latest.id] || [];
        if (msgs.length === 0) {
            selectChat(latest.id);
            return;
        }
    }

    const chat = {
        id: 'c_' + Date.now(),
        title: 'New Chat',
        ts: Date.now()
    };
    chats.unshift(chat);
    allMessages[chat.id] = [];
    saveChats();
    saveMessages();
    selectChat(chat.id);
    renderChatList();
}

function selectChat(id) {
    activeChat = id;
    const msgs = allMessages[id] || [];
    if (msgs.length === 0) {
        showWelcome();
    } else {
        showChat();
        renderMessages();
    }
    updateHeaderCenter();
    renderChatList();
    closeMobileSidebar();
}

function deleteChat(id) {
    chats = chats.filter(c => c.id !== id);
    delete allMessages[id];
    saveChats();
    saveMessages();

    if (activeChat === id) {
        activeChat = null;
        showWelcome();
        updateHeaderCenter();
    }
    renderChatList();
}

function clearAllChats() {
    if (!confirm('Are you sure you want to clear all chat history?')) return;
    chats = [];
    allMessages = {};
    activeChat = null;
    saveChats();
    saveMessages();
    showWelcome();
    updateHeaderCenter();
    renderChatList();
}

/* ===========================
   HEADER CENTER
   =========================== */
function updateHeaderCenter() {
    if (activeChat) {
        const chat = chats.find(c => c.id === activeChat);
        const msgs = allMessages[activeChat] || [];
        if (chat && msgs.length > 0) {
            headerCenter.textContent = chat.title;
            return;
        }
    }
    headerCenter.textContent = '';
}

/* ===========================
   RENDER CHAT LIST
   =========================== */
function renderChatList() {
    const query = searchInput.value.trim().toLowerCase();
    let filtered = chats;
    if (query) {
        filtered = chats.filter(c => c.title.toLowerCase().includes(query));
        chatLabel.textContent = 'Results';
    } else {
        chatLabel.textContent = 'Recent';
    }

    // Remove old items (keep empty state)
    chatList.querySelectorAll('.chat-item').forEach(el => el.remove());

    if (filtered.length === 0) {
        emptyState.style.display = '';
        if (query) {
            emptyState.innerHTML = `
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.25">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <span>No results</span>`;
        } else {
            emptyState.innerHTML = `
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.25">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                <span>No chats yet</span>`;
        }
        return;
    }

    emptyState.style.display = 'none';

    filtered.forEach(chat => {
        const div = document.createElement('div');
        div.className = 'chat-item' + (chat.id === activeChat ? ' active' : '');
        div.innerHTML = `
            <svg class="chat-item-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <span class="chat-item-title">${escapeHTML(chat.title)}</span>
            <button class="chat-item-delete" title="Delete chat">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
            </button>`;

        div.addEventListener('click', (e) => {
            if (e.target.closest('.chat-item-delete')) return;
            selectChat(chat.id);
        });

        div.querySelector('.chat-item-delete').addEventListener('click', (e) => {
            e.stopPropagation();
            deleteChat(chat.id);
        });

        chatList.insertBefore(div, emptyState);
    });
}

/* ===========================
   SEARCH
   =========================== */
function handleSearch() {
    const val = searchInput.value.trim();
    searchClear.classList.toggle('visible', val.length > 0);
    renderChatList();
}

function clearSearch() {
    searchInput.value = '';
    searchClear.classList.remove('visible');
    renderChatList();
}

/* ===========================
   SHOW/HIDE VIEWS
   =========================== */
function showWelcome() {
    welcomeScreen.style.display = '';
    chatView.style.display = 'none';
    welcomeInput.value = '';
    welcomeInput.style.height = 'auto';
    updateSendBtn(welcomeInput, welcomeSendBtn);
}

function showChat() {
    welcomeScreen.style.display = 'none';
    chatView.style.display = '';
    chatInput.value = '';
    chatInput.style.height = 'auto';
    updateSendBtn(chatInput, chatSendBtn);
}

/* ===========================
   RENDER MESSAGES
   =========================== */
function renderMessages() {
    if (!activeChat) return;
    const msgs = allMessages[activeChat] || [];
    messagesEl.innerHTML = '';

    msgs.forEach(msg => {
        messagesEl.appendChild(createMessageEl(msg));
    });

    scrollToBottom();
}

function createMessageEl(msg) {
    const row = document.createElement('div');
    row.className = `message-row ${msg.role}`;

    const avatarSVG = msg.role === 'user'
        ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`
        : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><g transform="translate(3,2)" fill="white"><rect x="2" y="0" width="10" height="2.5" rx="1.25"/><rect x="0.5" y="4" width="13" height="10" rx="2.5"/><circle cx="5" cy="9" r="1.5"/><circle cx="9" cy="9" r="1.5"/><rect x="5" y="12" width="4" height="1.5" rx="0.75"/></g></svg>`;

    const avatarClass = msg.role === 'user' ? 'user-avatar' : 'ai-avatar';

    let contentHTML = '';
    if (msg.role === 'assistant') {
        contentHTML = renderMarkdown(msg.content);
    } else {
        contentHTML = escapeHTML(msg.content);
    }

    let sourcesHTML = '';
    if (msg.sources && msg.sources.length > 0) {
        sourcesHTML = `
            <div class="msg-sources">
                <div class="msg-sources-label">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    Sources
                </div>
                <div class="msg-sources-list">
                    ${msg.sources.map(s => `
                        <span class="source-tag">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                            ${escapeHTML(s)}
                        </span>
                    `).join('')}
                </div>
            </div>`;
    }

    let actionsHTML = '';
    if (msg.role === 'assistant') {
        actionsHTML = `
            <div class="msg-actions">
                <button class="copy-btn" data-content="${escapeAttr(msg.content)}">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    <span>Copy</span>
                </button>
                <span class="msg-timestamp">${msg.time || ''}</span>
            </div>`;
    } else {
        actionsHTML = `<div class="msg-actions"><span></span><span class="msg-timestamp">${msg.time || ''}</span></div>`;
    }

    row.innerHTML = `
        <div class="msg-avatar ${avatarClass}">${avatarSVG}</div>
        <div class="msg-bubble">
            <div class="msg-content">${contentHTML}</div>
            ${sourcesHTML}
            ${actionsHTML}
        </div>`;

    // Copy button handler
    const copyBtn = row.querySelector('.copy-btn');
    if (copyBtn) {
        copyBtn.addEventListener('click', () => copyMessage(copyBtn));
    }

    return row;
}

/* ===========================
   COPY MESSAGE
   =========================== */
function copyMessage(btn) {
    const content = btn.getAttribute('data-content');
    navigator.clipboard.writeText(content).then(() => {
        btn.classList.add('copied');
        btn.querySelector('span').textContent = 'Copied!';
        btn.querySelector('svg').innerHTML = `<polyline points="20 6 9 17 4 12"/>`;
        setTimeout(() => {
            btn.classList.remove('copied');
            btn.querySelector('span').textContent = 'Copy';
            btn.querySelector('svg').innerHTML = `<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>`;
        }, 2000);
    });
}

/* ===========================
   MARKDOWN
   =========================== */
function renderMarkdown(text) {
    if (!text) return '';
    try {
        marked.setOptions({
            highlight: function(code, lang) {
                if (lang && hljs.getLanguage(lang)) {
                    return hljs.highlight(code, { language: lang }).value;
                }
                return hljs.highlightAuto(code).value;
            },
            breaks: true,
            gfm: true
        });
        return marked.parse(text);
    } catch (e) {
        return escapeHTML(text);
    }
}

/* ===========================
   TYPING INDICATOR
   =========================== */
function showTyping() {
    const row = document.createElement('div');
    row.className = 'typing-row';
    row.id = 'typingIndicator';
    row.innerHTML = `
        <div class="msg-avatar ai-avatar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><g transform="translate(3,2)" fill="white"><rect x="2" y="0" width="10" height="2.5" rx="1.25"/><rect x="0.5" y="4" width="13" height="10" rx="2.5"/><circle cx="5" cy="9" r="1.5"/><circle cx="9" cy="9" r="1.5"/><rect x="5" y="12" width="4" height="1.5" rx="0.75"/></g></svg>
        </div>
        <div class="typing-bubble">
            <div class="typing-dots">
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
            </div>
            <span class="typing-text">Thinking…</span>
        </div>`;
    messagesEl.appendChild(row);
    scrollToBottom();
}

function hideTyping() {
    const el = document.getElementById('typingIndicator');
    if (el) el.remove();
}

/* ===========================
   SEND MESSAGE
   =========================== */
async function sendMessage(text) {
    if (!text.trim() || isLoading) return;

    // Ensure active chat exists
    if (!activeChat) {
        const chat = {
            id: 'c_' + Date.now(),
            title: 'New Chat',
            ts: Date.now()
        };
        chats.unshift(chat);
        allMessages[chat.id] = [];
        activeChat = chat.id;
        saveChats();
        saveMessages();
    }

    // Auto title from first message
    const msgs = allMessages[activeChat] || [];
    if (msgs.length === 0) {
        const chat = chats.find(c => c.id === activeChat);
        if (chat) {
            chat.title = text.length > 45 ? text.substring(0, 45) + '…' : text;
            saveChats();
        }
    }

    // Add user message
    const userMsg = {
        role: 'user',
        content: text,
        time: formatTime()
    };
    allMessages[activeChat].push(userMsg);
    saveMessages();

    // Switch to chat view
    showChat();
    renderMessages();
    renderChatList();
    updateHeaderCenter();

    // Loading state
    setLoading(true);
    showTyping();

    try {
        const response = await fetch(CONFIG.WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text })
        });

        if (!response.ok) throw new Error('Network error');

        const data = await response.json();

        // Parse response
        let answer = '';
        let sources = [];

        // Handle array response
        const result = Array.isArray(data) ? data[0] : data;

        // Extract answer (priority order)
        const fields = ['output', 'response', 'text', 'answer', 'message', 'result', 'content'];
        for (const field of fields) {
            if (result[field] && typeof result[field] === 'string') {
                answer = result[field];
                break;
            }
        }

        if (!answer) answer = JSON.stringify(result);

        // Extract sources
        if (result.sources) sources = Array.isArray(result.sources) ? result.sources : [result.sources];
        if (result.sourceDocuments) {
            sources = result.sourceDocuments.map(d => d.metadata?.source || d.pageContent?.substring(0, 50) || 'Document');
        }

        // Add assistant message
        const aiMsg = {
            role: 'assistant',
            content: answer,
            sources: sources,
            time: formatTime()
        };
        allMessages[activeChat].push(aiMsg);
        saveMessages();

    } catch (error) {
        console.error('Webhook error:', error);
        const errorMsg = {
            role: 'assistant',
            content: "I couldn't process your request right now. Please try again later.",
            sources: [],
            time: formatTime()
        };
        allMessages[activeChat].push(errorMsg);
        saveMessages();
    }

    hideTyping();
    setLoading(false);
    renderMessages();
}

/* ===========================
   LOADING STATE
   =========================== */
function setLoading(state) {
    isLoading = state;

    [welcomeInput, chatInput].forEach(input => {
        if (input) input.disabled = state;
    });

    [welcomeSendBtn, chatSendBtn].forEach(btn => {
        if (btn) {
            btn.disabled = state;
            btn.querySelector('.send-icon').style.display = state ? 'none' : '';
            btn.querySelector('.spinner-icon').style.display = state ? '' : 'none';
        }
    });
}

/* ===========================
   TEXTAREA AUTO-GROW
   =========================== */
function autoGrow(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 144) + 'px';
}

function updateSendBtn(textarea, btn) {
    btn.disabled = !textarea.value.trim() || isLoading;
}

function setupTextarea(textarea, sendBtn) {
    textarea.addEventListener('input', () => {
        autoGrow(textarea);
        updateSendBtn(textarea, sendBtn);
    });

    textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (textarea.value.trim() && !isLoading) {
                const text = textarea.value.trim();
                textarea.value = '';
                autoGrow(textarea);
                updateSendBtn(textarea, sendBtn);
                sendMessage(text);
            }
        }
    });

    sendBtn.addEventListener('click', () => {
        if (textarea.value.trim() && !isLoading) {
            const text = textarea.value.trim();
            textarea.value = '';
            autoGrow(textarea);
            updateSendBtn(textarea, sendBtn);
            sendMessage(text);
        }
    });
}

/* ===========================
   SCROLL
   =========================== */
function scrollToBottom() {
    requestAnimationFrame(() => {
        messagesEl.scrollTop = messagesEl.scrollHeight;
    });
}

function handleScroll() {
    const diff = messagesEl.scrollHeight - messagesEl.scrollTop - messagesEl.clientHeight;
    scrollBottomBtn.style.display = diff > 120 ? '' : 'none';
}

/* ===========================
   UTILITIES
   =========================== */
function formatTime() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function escapeAttr(str) {
    return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/* ===========================
   EVENT LISTENERS
   =========================== */
logoBtn.addEventListener('click', toggleSidebar);
collapseBtn.addEventListener('click', toggleSidebar);
newChatBtn.addEventListener('click', createChat);
searchInput.addEventListener('input', handleSearch);
searchClear.addEventListener('click', clearSearch);
themeBtn.addEventListener('click', toggleTheme);
clearBtn.addEventListener('click', clearAllChats);
overlay.addEventListener('click', closeMobileSidebar);
hamburgerBtn.addEventListener('click', toggleSidebar);
scrollBottomBtn.addEventListener('click', scrollToBottom);
messagesEl.addEventListener('scroll', handleScroll);

setupTextarea(welcomeInput, welcomeSendBtn);
setupTextarea(chatInput, chatSendBtn);

/* ===========================
   INIT
   =========================== */
function init() {
    initTheme();
    initSidebar();
    renderChatList();

    // Restore last active chat
    if (chats.length > 0) {
        const lastChat = chats[0];
        const msgs = allMessages[lastChat.id] || [];
        if (msgs.length > 0) {
            selectChat(lastChat.id);
        } else {
            showWelcome();
        }
    } else {
        showWelcome();
    }
}

init();