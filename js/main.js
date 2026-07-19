/* ═══════════════════════════════════════════
   AI Knowledge RAG Assistant — Main JS
   ═══════════════════════════════════════════ */

// ── State ──
let chats = JSON.parse(localStorage.getItem('rag_chats') || '[]');
let messages = JSON.parse(localStorage.getItem('rag_msgs') || '{}');
let pinnedChats = JSON.parse(localStorage.getItem('rag_pinned') || '[]');
let activeChat = null;
let isLoading = false;
let sidebarCollapsed = localStorage.getItem('rag_sb') === 'true';
let listenersBound = false;

// ── DOM ──
const $ = (s, p = document) => p.querySelector(s);
const $$ = (s, p = document) => p.querySelectorAll(s);

const sidebar = $('.sidebar');
const chatList = $('.chat-list');
const chatLabel = $('.chat-label');
const searchInput = $('.search-input');
const searchClear = $('.search-clear');
const welcomeScreen = $('.welcome');
const chatView = $('.chat-view');
const messagesContainer = $('.messages');
const messagesInner = $('.messages-inner');
const typingIndicator = $('.typing-indicator');
const headerCenter = $('.main-header-center');
const scrollBottomBtn = $('.scroll-bottom-btn');
const sidebarOverlay = $('.sidebar-overlay');

// Get both textareas & send buttons
const welcomeTextarea = $('#welcome-textarea');
const chatTextarea = $('#chat-textarea');
const welcomeSendBtn = $('#welcome-send-btn');
const chatSendBtn = $('#chat-send-btn');

// ── Init ──
function init() {
    loadTheme();
    if (sidebarCollapsed) sidebar.classList.add('collapsed');
    renderChatList();
    renderVersion();
    if (chats.length > 0) {
        selectChat(chats[0].id);
    }
    if (!listenersBound) {
        setupListeners();
        listenersBound = true;
    }
}

// ── Version ──
function renderVersion() {
    const el = $('.sidebar-version');
    if (el) el.textContent = CONFIG.VERSION;
}

// ── Theme ──
function loadTheme() {
    const t = localStorage.getItem('rag_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', t);
    updateThemeIcon(t);
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('rag_theme', next);
    updateThemeIcon(next);
}

function updateThemeIcon(theme) {
    const btn = $('.theme-btn');
    const sunIcon = `<svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;
    const moonIcon = `<svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
    if (btn) {
        btn.querySelector('.theme-icon-slot').innerHTML = theme === 'dark' ? moonIcon : sunIcon;
    }
}

// ── Sidebar ──
function toggleSidebar() {
    sidebarCollapsed = !sidebarCollapsed;
    sidebar.classList.toggle('collapsed', sidebarCollapsed);
    localStorage.setItem('rag_sb', sidebarCollapsed);
}

function openMobileSidebar() {
    sidebar.classList.add('mobile-open');
    sidebarOverlay.classList.add('visible');
}

function closeMobileSidebar() {
    sidebar.classList.remove('mobile-open');
    sidebarOverlay.classList.remove('visible');
}

// ── Sidebar Views ──
let currentView = 'history'; // 'history', 'pinned', 'search'

function showHistory() {
    currentView = 'history';
    searchInput.value = '';
    searchClear.classList.remove('visible');
    renderChatList();
    updateSidebarIcons();
}

function showPinned() {
    currentView = 'pinned';
    renderChatList();
    updateSidebarIcons();
}

function showSearchView() {
    currentView = 'search';
    searchInput.focus();
    updateSidebarIcons();
}

function updateSidebarIcons() {
    $$('.sidebar-icon-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = $(`.sidebar-icon-btn[data-view="${currentView}"]`);
    if (activeBtn) activeBtn.classList.add('active');
}

// ── Pin/Unpin ──
function togglePin(id, e) {
    if (e) e.stopPropagation();
    if (pinnedChats.includes(id)) {
        pinnedChats = pinnedChats.filter(p => p !== id);
    } else {
        pinnedChats.push(id);
    }
    localStorage.setItem('rag_pinned', JSON.stringify(pinnedChats));
    renderChatList();
}

// ── Chat Management ──
function saveChats() {
    localStorage.setItem('rag_chats', JSON.stringify(chats));
    localStorage.setItem('rag_msgs', JSON.stringify(messages));
}

function genId() {
    return 'c_' + Date.now() + Math.random().toString(36).substr(2, 5);
}

function newChat() {
    // If current active chat is empty, keep it
    if (activeChat && (!messages[activeChat] || messages[activeChat].length === 0)) {
        closeMobileSidebar();
        return;
    }
    // If latest chat is empty, select it
    if (chats.length > 0 && (!messages[chats[0].id] || messages[chats[0].id].length === 0)) {
        selectChat(chats[0].id);
        closeMobileSidebar();
        return;
    }
    const id = genId();
    chats.unshift({ id, title: 'New Chat', ts: Date.now() });
    messages[id] = [];
    saveChats();
    renderChatList();
    selectChat(id);
    closeMobileSidebar();
}

function selectChat(id) {
    activeChat = id;
    const chat = chats.find(c => c.id === id);

    // Show chat view or welcome
    if (messages[id] && messages[id].length > 0) {
        welcomeScreen.classList.add('hidden');
        chatView.classList.add('active');
        renderMessages(id);
        headerCenter.textContent = chat ? chat.title : '';
    } else {
        welcomeScreen.classList.remove('hidden');
        chatView.classList.remove('active');
        headerCenter.textContent = '';
    }

    renderChatList();
    closeMobileSidebar();
}

function deleteChat(id, e) {
    e.stopPropagation();
    chats = chats.filter(c => c.id !== id);
    delete messages[id];
    pinnedChats = pinnedChats.filter(p => p !== id);
    localStorage.setItem('rag_pinned', JSON.stringify(pinnedChats));
    saveChats();
    renderChatList();

    if (activeChat === id) {
        activeChat = null;
        welcomeScreen.classList.remove('hidden');
        chatView.classList.remove('active');
        headerCenter.textContent = '';
        if (chats.length > 0) selectChat(chats[0].id);
    }
}

function clearAll() {
    if (!confirm('Delete all chats?')) return;
    chats = [];
    messages = {};
    pinnedChats = [];
    activeChat = null;
    localStorage.setItem('rag_pinned', JSON.stringify(pinnedChats));
    saveChats();
    renderChatList();
    welcomeScreen.classList.remove('hidden');
    chatView.classList.remove('active');
    headerCenter.textContent = '';
}

// ── Render Chat List ──
function renderChatList() {
    const query = searchInput.value.trim().toLowerCase();
    let filtered;
    let label;

    if (currentView === 'pinned') {
        filtered = chats.filter(c => pinnedChats.includes(c.id));
        label = 'Pinned';
    } else if (query) {
        filtered = chats.filter(c => c.title.toLowerCase().includes(query));
        label = 'Results';
    } else {
        filtered = chats;
        label = 'Recent';
    }

    chatLabel.textContent = label;

    if (filtered.length === 0) {
        const isSearch = !!query;
        const isPinned = currentView === 'pinned';
        chatList.innerHTML = `
            <div class="chat-empty">
                ${isSearch
                    ? `<svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><span>No results</span>`
                    : isPinned
                    ? `<svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/></svg><span>No pinned chats</span>`
                    : `<svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><span>No chats yet</span>`
                }
            </div>`;
        return;
    }

    chatList.innerHTML = filtered.map(c => {
        const isPinned = pinnedChats.includes(c.id);
        return `
        <div class="chat-item ${c.id === activeChat ? 'active' : ''}" onclick="selectChat('${c.id}')">
            <span class="chat-item-icon">
                <svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
            </span>
            <span class="chat-item-title">${escHtml(c.title)}</span>
            <button class="chat-item-pin ${isPinned ? 'pinned' : ''}" onclick="togglePin('${c.id}', event)" title="${isPinned ? 'Unpin' : 'Pin'}">
                <svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="${isPinned ? 'currentColor' : 'none'}">
                    <path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/>
                </svg>
            </button>
            <button class="chat-item-delete" onclick="deleteChat('${c.id}', event)" title="Delete">
                <svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
            </button>
        </div>
    `}).join('');
}

// ── Render Messages ──
function renderMessages(chatId) {
    const msgs = messages[chatId] || [];
    messagesInner.innerHTML = msgs.map(m => createMessageHTML(m)).join('');
    scrollToBottom();
}

function createMessageHTML(msg) {
    const timeStr = msg.time || '';
    if (msg.role === 'user') {
        return `
        <div class="message user">
            <div class="message-avatar">
                <svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                </svg>
            </div>
            <div class="message-bubble">
                ${escHtml(msg.content)}
                <div class="message-time">${timeStr}</div>
            </div>
        </div>`;
    }

    // Assistant
    const rendered = renderMarkdown(msg.content || '');
    let sourcesHtml = '';
    if (msg.sources && msg.sources.length > 0) {
        sourcesHtml = `
        <div class="message-sources">
            <span class="message-sources-label">
                <svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                </svg>
                Sources
            </span>
            ${msg.sources.map(s => `
                <span class="source-tag">
                    <svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                    </svg>
                    ${escHtml(s)}
                </span>
            `).join('')}
        </div>`;
    }

    const contentStr = (msg.content || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');

    return `
    <div class="message assistant">
        <div class="message-avatar">
            <svg viewBox="0 0 24 24"><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1.07A7 7 0 0 1 14 23h-4a7 7 0 0 1-6.93-4H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2zM9.5 16a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm5 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z"/></svg>
        </div>
        <div class="message-bubble">
            <div class="md-content">${rendered}</div>
            ${sourcesHtml}
            <div class="message-actions">
                <button class="copy-btn" onclick="copyMessage(this, '${contentStr}')">
                    <svg class="copy-icon" viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                    </svg>
                    <span>Copy</span>
                </button>
                <span class="message-time">${timeStr}</span>
            </div>
        </div>
    </div>`;
}

// ── Copy ──
function copyMessage(btn, text) {
    const decoded = text.replace(/\\n/g, '\n').replace(/\\'/g, "'").replace(/\\\\/g, '\\');
    navigator.clipboard.writeText(decoded).then(() => {
        const span = btn.querySelector('span');
        span.textContent = 'Copied!';
        btn.querySelector('.copy-icon').innerHTML = `<polyline points="20 6 9 17 4 12"/>`;
        setTimeout(() => {
            span.textContent = 'Copy';
            btn.querySelector('.copy-icon').innerHTML = `<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>`;
        }, 2000);
    });
}

// ── Markdown ──
function renderMarkdown(text) {
    if (typeof marked !== 'undefined') {
        marked.setOptions({
            highlight: function(code, lang) {
                if (typeof hljs !== 'undefined' && lang && hljs.getLanguage(lang)) {
                    return hljs.highlight(code, { language: lang }).value;
                }
                return code;
            },
            breaks: true
        });
        return marked.parse(text);
    }
    return escHtml(text).replace(/\n/g, '<br>');
}

// ── Send Message ──
async function sendMessage(text) {
    text = text.trim();
    if (!text || isLoading) return;

    // Ensure active chat
    if (!activeChat) {
        const id = genId();
        chats.unshift({ id, title: 'New Chat', ts: Date.now() });
        messages[id] = [];
        activeChat = id;
    }

    // Show chat view
    welcomeScreen.classList.add('hidden');
    chatView.classList.add('active');

    // Auto title
    const chat = chats.find(c => c.id === activeChat);
    if (chat && chat.title === 'New Chat') {
        chat.title = text.length > 45 ? text.substring(0, 45) + '…' : text;
        headerCenter.textContent = chat.title;
    }

    // Add user message
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg = { role: 'user', content: text, time };
    if (!messages[activeChat]) messages[activeChat] = [];
    messages[activeChat].push(userMsg);
    saveChats();
    renderChatList();

    messagesInner.innerHTML += createMessageHTML(userMsg);
    scrollToBottom();

    // Reset textareas
    welcomeTextarea.value = '';
    chatTextarea.value = '';
    autoGrow(welcomeTextarea);
    autoGrow(chatTextarea);
    updateSendButtons();

    // Loading
    setLoading(true);
    showTyping(true);

    try {
        const resp = await fetch(CONFIG.WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                message: text,
                sessionId: activeChat
            })
        });

        if (!resp.ok) throw new Error('Non-200 response');

        const data = await resp.json();
        const result = Array.isArray(data) ? data[0] : data;

        let answer = '';
        let sources = [];

        if (typeof result === 'string') {
            answer = result;
        } else if (typeof result === 'object' && result !== null) {
            for (const field of ['output', 'response', 'text', 'answer', 'message', 'result', 'content']) {
                if (result[field] && typeof result[field] === 'string') {
                    answer = result[field];
                    break;
                }
            }
            if (result.sources && Array.isArray(result.sources)) {
                sources = result.sources;
            } else if (result.sourceDocuments && Array.isArray(result.sourceDocuments)) {
                sources = result.sourceDocuments.map(d => d.metadata?.source || d.pageContent?.substring(0, 40) || 'Document');
            }
        }

        if (!answer) answer = JSON.stringify(data);

        const aiMsg = { role: 'assistant', content: answer, sources, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
        messages[activeChat].push(aiMsg);
        saveChats();

        showTyping(false);
        messagesInner.innerHTML += createMessageHTML(aiMsg);
        scrollToBottom();

    } catch (err) {
        console.error('Webhook error:', err);
        showTyping(false);
        const errMsg = { role: 'assistant', content: "I couldn't process your request right now. Please try again later.", sources: [], time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
        messages[activeChat].push(errMsg);
        saveChats();
        messagesInner.innerHTML += createMessageHTML(errMsg);
        scrollToBottom();
    }

    setLoading(false);
}

// ── Loading ──
function setLoading(state) {
    isLoading = state;
    [welcomeSendBtn, chatSendBtn].forEach(btn => {
        btn.classList.toggle('loading', state);
        if (state) btn.classList.add('disabled');
    });
    welcomeTextarea.disabled = state;
    chatTextarea.disabled = state;
    updateSendButtons();
}

function showTyping(show) {
    typingIndicator.classList.toggle('visible', show);
    if (show) scrollToBottom();
}

// ── Scroll ──
function scrollToBottom() {
    requestAnimationFrame(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    });
}

// ── Auto Grow ──
function autoGrow(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 144) + 'px';
}

// ── Send Buttons ──
function updateSendButtons() {
    [{ ta: welcomeTextarea, btn: welcomeSendBtn }, { ta: chatTextarea, btn: chatSendBtn }].forEach(({ ta, btn }) => {
        const hasText = ta.value.trim().length > 0;
        if (hasText && !isLoading) {
            btn.classList.remove('disabled');
            btn.classList.add('enabled');
        } else {
            btn.classList.remove('enabled');
            btn.classList.add('disabled');
        }
    });
}

// ── Escape HTML ──
function escHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ── Listeners ──
function setupListeners() {
    // Textarea events - use named functions to prevent duplicates
    function handleInput(ta) {
        autoGrow(ta);
        updateSendButtons();
    }

    function handleKeydown(ta, e) {
        if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
            e.preventDefault();
            const text = ta.value.trim();
            if (text) sendMessage(text);
        }
    }

    welcomeTextarea.addEventListener('input', () => handleInput(welcomeTextarea));
    chatTextarea.addEventListener('input', () => handleInput(chatTextarea));
    
    welcomeTextarea.addEventListener('keydown', (e) => handleKeydown(welcomeTextarea, e));
    chatTextarea.addEventListener('keydown', (e) => handleKeydown(chatTextarea, e));

    // Send buttons - check loading state
    welcomeSendBtn.addEventListener('click', () => {
        if (!isLoading) sendMessage(welcomeTextarea.value);
    });
    chatSendBtn.addEventListener('click', () => {
        if (!isLoading) sendMessage(chatTextarea.value);
    });

    // Search
    searchInput.addEventListener('input', () => {
        searchClear.classList.toggle('visible', searchInput.value.length > 0);
        currentView = searchInput.value.trim() ? 'search' : 'history';
        renderChatList();
    });
    searchClear.addEventListener('click', () => {
        searchInput.value = '';
        searchClear.classList.remove('visible');
        currentView = 'history';
        renderChatList();
    });

    // Scroll bottom detection
    messagesContainer.addEventListener('scroll', () => {
        const diff = messagesContainer.scrollHeight - messagesContainer.scrollTop - messagesContainer.clientHeight;
        scrollBottomBtn.classList.toggle('visible', diff > 120);
    });

    scrollBottomBtn.addEventListener('click', scrollToBottom);

    // Overlay
    sidebarOverlay.addEventListener('click', closeMobileSidebar);
}

// ── Start ──
document.addEventListener('DOMContentLoaded', init);
