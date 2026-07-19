// ========== DOM ELEMENTS ==========
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const sidebar = $('.sidebar');
const btnCollapse = $('.btn-collapse');
const btnExpand = $('.btn-expand');
const btnHamburger = $('.btn-hamburger');
const mobileOverlay = $('.mobile-overlay');
const btnNewChat = $('.btn-new-chat');
const searchInput = $('#search-input');
const btnSearchClear = $('.btn-search-clear');
const chatLabel = $('.chat-label');
const chatList = $('.chat-list');
const btnTheme = $('.btn-theme');
const btnClearAll = $('.btn-clear-all');

const headerCenter = $('.header-center');
const welcome = $('.welcome');
const chatView = $('.chat-view');
const messagesContainer = $('.messages');
const messagesInner = $('.messages-inner');
const btnScrollBottom = $('.btn-scroll-bottom');

// Composers
const welcomeTextarea = $('#welcome-textarea');
const welcomeSend = $('#welcome-send');
const chatTextarea = $('#chat-textarea');
const chatSend = $('#chat-send');

// ========== STATE ==========
let chats = JSON.parse(localStorage.getItem('rag_chats') || '[]');
let messages = JSON.parse(localStorage.getItem('rag_msgs') || '{}');
let activeChat = null;
let isLoading = false;

// ========== INIT ==========
function init() {
    loadTheme();
    loadSidebarState();
    renderChatList();
    setupEventListeners();
    setupTextareas();
    renderVersion();
}

function renderVersion() {
    const el = document.getElementById('sidebar-version');
    if (el && CONFIG.VERSION) {
        el.textContent = CONFIG.VERSION;
    }
}

// ========== THEME ==========
function loadTheme() {
    const theme = localStorage.getItem('rag_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    updateThemeIcon();
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('rag_theme', next);
    updateThemeIcon();
}

function updateThemeIcon() {
    const theme = document.documentElement.getAttribute('data-theme');
    const sunIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;
    const moonIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
    btnTheme.querySelector('.theme-icon').innerHTML = theme === 'dark' ? sunIcon : moonIcon;
}

// ========== SIDEBAR ==========
function loadSidebarState() {
    const collapsed = localStorage.getItem('rag_sb') === 'true';
    if (collapsed) sidebar.classList.add('collapsed');
}

function toggleSidebar() {
    sidebar.classList.toggle('collapsed');
    localStorage.setItem('rag_sb', sidebar.classList.contains('collapsed'));
}

function openMobileSidebar() {
    sidebar.classList.add('mobile-open');
    mobileOverlay.classList.add('visible');
}

function closeMobileSidebar() {
    sidebar.classList.remove('mobile-open');
    mobileOverlay.classList.remove('visible');
}

// ========== CHAT MANAGEMENT ==========
function saveChats() {
    localStorage.setItem('rag_chats', JSON.stringify(chats));
}

function saveMessages() {
    localStorage.setItem('rag_msgs', JSON.stringify(messages));
}

function generateId() {
    return 'c_' + Date.now();
}

function createNewChat() {
    // If current active chat has no messages, reuse it
    if (activeChat && (!messages[activeChat] || messages[activeChat].length === 0)) {
        return;
    }

    // If latest chat has no messages, select it
    if (chats.length > 0) {
        const latest = chats[0];
        if (!messages[latest.id] || messages[latest.id].length === 0) {
            selectChat(latest.id);
            return;
        }
    }

    const id = generateId();
    const chat = { id, title: 'New Chat', ts: Date.now() };
    chats.unshift(chat);
    messages[id] = [];
    saveChats();
    saveMessages();
    selectChat(id);
    renderChatList();
    closeMobileSidebar();
}

function selectChat(id) {
    activeChat = id;
    const chat = chats.find(c => c.id === id);

    // Show chat view
    welcome.style.display = 'none';
    chatView.classList.add('active');

    // Update header
    headerCenter.textContent = chat ? chat.title : '';

    // Render messages
    renderMessages();
    renderChatList();

    // Focus textarea
    setTimeout(() => chatTextarea.focus(), 100);
}

function deleteChat(id, e) {
    if (e) e.stopPropagation();
    chats = chats.filter(c => c.id !== id);
    delete messages[id];
    saveChats();
    saveMessages();

    if (activeChat === id) {
        activeChat = null;
        welcome.style.display = '';
        chatView.classList.remove('active');
        headerCenter.textContent = '';
    }

    renderChatList();
}

function clearAllChats() {
    if (!confirm('Clear all chats? This cannot be undone.')) return;
    chats = [];
    messages = {};
    activeChat = null;
    saveChats();
    saveMessages();
    welcome.style.display = '';
    chatView.classList.remove('active');
    headerCenter.textContent = '';
    renderChatList();
}

function setAutoTitle(chatId, text) {
    const chat = chats.find(c => c.id === chatId);
    if (!chat || chat.title !== 'New Chat') return;
    let title = text.trim().replace(/\n/g, ' ');
    if (title.length > 45) title = title.substring(0, 45) + '…';
    chat.title = title;
    saveChats();
    headerCenter.textContent = title;
    renderChatList();
}

// ========== RENDER CHAT LIST ==========
function renderChatList() {
    const query = searchInput.value.trim().toLowerCase();
    const filtered = query
        ? chats.filter(c => c.title.toLowerCase().includes(query))
        : chats;

    chatLabel.textContent = query ? 'Results' : 'Recent';

    if (filtered.length === 0) {
        const emptyIcon = query
            ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`
            : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
        const emptyText = query ? 'No results' : 'No chats yet';
        chatList.innerHTML = `<div class="chat-empty">${emptyIcon}<span>${emptyText}</span></div>`;
        return;
    }

    chatList.innerHTML = filtered.map(c => `
        <div class="chat-item ${c.id === activeChat ? 'active' : ''}" data-id="${c.id}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            <span class="chat-item-title">${escapeHtml(c.title)}</span>
            <button class="btn-delete" title="Delete chat">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
        </div>
    `).join('');

    // Attach events
    chatList.querySelectorAll('.chat-item').forEach(el => {
        el.addEventListener('click', () => {
            selectChat(el.dataset.id);
            closeMobileSidebar();
        });
        el.querySelector('.btn-delete').addEventListener('click', (e) => deleteChat(el.dataset.id, e));
    });
}

// ========== RENDER MESSAGES ==========
function renderMessages() {
    if (!activeChat) return;
    const msgs = messages[activeChat] || [];
    messagesInner.innerHTML = msgs.map(m => createMessageHTML(m)).join('');

    // Attach copy buttons
    messagesInner.querySelectorAll('.btn-copy').forEach(btn => {
        btn.addEventListener('click', () => copyMessage(btn));
    });

    scrollToBottom();
}

function createMessageHTML(msg) {
    if (msg.role === 'user') {
        return `
            <div class="msg user">
                <div class="msg-avatar">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </div>
                <div class="msg-bubble">
                    <div class="msg-content">${escapeHtml(msg.content)}</div>
                    <div class="msg-meta">
                        <span class="msg-time">${msg.time || ''}</span>
                    </div>
                </div>
            </div>`;
    }

    // Assistant
    const rendered = renderMarkdown(msg.content);
    let sourcesHtml = '';
    if (msg.sources && msg.sources.length > 0) {
        const tags = msg.sources.map(s => `
            <span class="source-tag">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                ${escapeHtml(s)}
            </span>
        `).join('');
        sourcesHtml = `
            <div class="msg-sources">
                <span class="msg-sources-label">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    Sources
                </span>
                ${tags}
            </div>`;
    }

    return `
        <div class="msg assistant">
            <div class="msg-avatar">
                <svg viewBox="0 0 24 24"><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1.07A7 7 0 0 1 14 23h-4a7 7 0 0 1-6.93-4H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2zM9 15a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm6 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2z"/></svg>
            </div>
            <div class="msg-bubble">
                <div class="msg-content">${rendered}${sourcesHtml}</div>
                <div class="msg-meta">
                    <button class="btn-copy" data-text="${encodeURIComponent(msg.content)}">
                        <svg class="copy-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                        <span class="copy-label">Copy</span>
                    </button>
                    <span class="msg-time">${msg.time || ''}</span>
                </div>
            </div>
        </div>`;
}

function showTypingIndicator() {
    const typing = document.createElement('div');
    typing.className = 'typing';
    typing.id = 'typing-indicator';
    typing.innerHTML = `
        <div class="msg-avatar">
            <svg viewBox="0 0 24 24"><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1.07A7 7 0 0 1 14 23h-4a7 7 0 0 1-6.93-4H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2zM9 15a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm6 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2z"/></svg>
        </div>
        <div class="typing-bubble">
            <div class="typing-dots"><span></span><span></span><span></span></div>
            <span class="typing-text">Thinking…</span>
        </div>`;
    messagesInner.appendChild(typing);
    scrollToBottom();
}

function hideTypingIndicator() {
    const el = document.getElementById('typing-indicator');
    if (el) el.remove();
}

// ========== SEND MESSAGE ==========
async function sendMessage(text) {
    if (!text.trim() || isLoading) return;

    // Create chat if needed
    if (!activeChat) {
        const id = generateId();
        const chat = { id, title: 'New Chat', ts: Date.now() };
        chats.unshift(chat);
        messages[id] = [];
        saveChats();
        activeChat = id;
        welcome.style.display = 'none';
        chatView.classList.add('active');
        renderChatList();
    }

    // Auto title from first message
    const chatMsgs = messages[activeChat] || [];
    if (chatMsgs.length === 0) {
        setAutoTitle(activeChat, text);
    }

    // Add user message
    const now = formatTime();
    const userMsg = { role: 'user', content: text, time: now };
    if (!messages[activeChat]) messages[activeChat] = [];
    messages[activeChat].push(userMsg);
    saveMessages();

    // Render user message
    messagesInner.insertAdjacentHTML('beforeend', createMessageHTML(userMsg));
    scrollToBottom();

    // Clear inputs
    welcomeTextarea.value = '';
    chatTextarea.value = '';
    resetTextarea(welcomeTextarea);
    resetTextarea(chatTextarea);
    updateSendButtons();

    // Loading state
    isLoading = true;
    setLoadingState(true);
    showTypingIndicator();

    try {
        const response = await fetch(CONFIG.WEBHOOK_URL, {
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

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        const result = Array.isArray(data) ? data[0] : data;

        let answer = '';
        let sources = [];

        if (typeof result === 'string') {
            answer = result;
        } else if (typeof result === 'object' && result !== null) {
            // Priority order field check
            for (const field of ['output', 'response', 'text', 'answer', 'message', 'result', 'content']) {
                if (result[field] && typeof result[field] === 'string') {
                    answer = result[field];
                    break;
                }
            }
            // Sources
            if (result.sources && Array.isArray(result.sources)) {
                sources = result.sources;
            } else if (result.sourceDocuments && Array.isArray(result.sourceDocuments)) {
                sources = result.sourceDocuments.map(d => d.metadata?.source || d.pageContent?.substring(0, 40) || 'Document');
            }
        }

        if (!answer) answer = typeof result === 'string' ? result : JSON.stringify(result);

        const aiMsg = { role: 'assistant', content: answer, sources, time: formatTime() };
        messages[activeChat].push(aiMsg);
        saveMessages();

        hideTypingIndicator();
        messagesInner.insertAdjacentHTML('beforeend', createMessageHTML(aiMsg));

        // Attach copy
        const lastCopy = messagesInner.querySelector('.msg:last-child .btn-copy');
        if (lastCopy) lastCopy.addEventListener('click', () => copyMessage(lastCopy));

        scrollToBottom();

    } catch (err) {
        console.error('Webhook error:', err);
        hideTypingIndicator();

        const errMsg = { role: 'assistant', content: "I couldn't process your request right now. Please try again later.", sources: [], time: formatTime() };
        messages[activeChat].push(errMsg);
        saveMessages();

        messagesInner.insertAdjacentHTML('beforeend', createMessageHTML(errMsg));
        scrollToBottom();
    } finally {
        isLoading = false;
        setLoadingState(false);
    }
}

function setLoadingState(loading) {
    const btns = [welcomeSend, chatSend];
    const areas = [welcomeTextarea, chatTextarea];

    btns.forEach(btn => {
        if (loading) {
            btn.classList.add('loading');
            btn.classList.remove('enabled');
            btn.classList.add('disabled');
        } else {
            btn.classList.remove('loading');
            updateSendButtons();
        }
    });

    areas.forEach(ta => {
        ta.disabled = loading;
    });
}

// ========== COPY ==========
function copyMessage(btn) {
    const text = decodeURIComponent(btn.dataset.text);
    navigator.clipboard.writeText(text).then(() => {
        const label = btn.querySelector('.copy-label');
        const icon = btn.querySelector('.copy-icon');
        label.textContent = 'Copied!';
        icon.innerHTML = `<polyline points="20 6 9 17 4 12"/>`;
        setTimeout(() => {
            label.textContent = 'Copy';
            icon.innerHTML = `<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>`;
        }, 2000);
    });
}

// ========== MARKDOWN ==========
function renderMarkdown(text) {
    if (typeof marked !== 'undefined') {
        marked.setOptions({
            highlight: function(code, lang) {
                if (typeof hljs !== 'undefined' && lang && hljs.getLanguage(lang)) {
                    return hljs.highlight(code, { language: lang }).value;
                }
                return typeof hljs !== 'undefined' ? hljs.highlightAuto(code).value : code;
            },
            breaks: true,
            gfm: true
        });
        return marked.parse(text);
    }
    return escapeHtml(text).replace(/\n/g, '<br>');
}

// ========== HELPERS ==========
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function formatTime() {
    return new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function scrollToBottom() {
    setTimeout(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, 50);
}

// ========== TEXTAREA AUTO-GROW ==========
function setupTextareas() {
    [welcomeTextarea, chatTextarea].forEach(ta => {
        ta.addEventListener('input', () => {
            autoGrow(ta);
            updateSendButtons();
        });
        ta.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage(ta.value);
            }
        });
    });
}

function autoGrow(ta) {
    ta.style.height = '24px';
    ta.style.height = Math.min(ta.scrollHeight, 144) + 'px';
}

function resetTextarea(ta) {
    ta.style.height = '24px';
}

function updateSendButtons() {
    const wVal = welcomeTextarea.value.trim();
    const cVal = chatTextarea.value.trim();

    welcomeSend.classList.toggle('enabled', wVal.length > 0 && !isLoading);
    welcomeSend.classList.toggle('disabled', wVal.length === 0 || isLoading);

    chatSend.classList.toggle('enabled', cVal.length > 0 && !isLoading);
    chatSend.classList.toggle('disabled', cVal.length === 0 || isLoading);
}

// ========== SCROLL BUTTON ==========
function setupScrollButton() {
    messagesContainer.addEventListener('scroll', () => {
        const diff = messagesContainer.scrollHeight - messagesContainer.scrollTop - messagesContainer.clientHeight;
        btnScrollBottom.classList.toggle('visible', diff > 120);
    });
    btnScrollBottom.addEventListener('click', scrollToBottom);
}

// ========== SEARCH ==========
function setupSearch() {
    searchInput.addEventListener('input', () => {
        btnSearchClear.classList.toggle('visible', searchInput.value.length > 0);
        renderChatList();
    });
    btnSearchClear.addEventListener('click', () => {
        searchInput.value = '';
        btnSearchClear.classList.remove('visible');
        renderChatList();
    });
}

// ========== EVENT LISTENERS ==========
function setupEventListeners() {
    btnCollapse.addEventListener('click', toggleSidebar);
    btnExpand.addEventListener('click', toggleSidebar);
    btnHamburger.addEventListener('click', openMobileSidebar);
    mobileOverlay.addEventListener('click', closeMobileSidebar);
    btnNewChat.addEventListener('click', createNewChat);
    btnTheme.addEventListener('click', toggleTheme);
    btnClearAll.addEventListener('click', clearAllChats);

    welcomeSend.addEventListener('click', () => sendMessage(welcomeTextarea.value));
    chatSend.addEventListener('click', () => sendMessage(chatTextarea.value));

    setupSearch();
    setupScrollButton();
    updateSendButtons();
}

// ========== START ==========
document.addEventListener('DOMContentLoaded', init);
