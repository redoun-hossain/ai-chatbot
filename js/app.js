/**
 * AI Knowledge RAG Assistant
 * Pure HTML/CSS/JavaScript Version
 */

// ========================================
// Configuration
// ========================================

const CONFIG = {
  // ================================================
  // API Mode: 'proxy' or 'direct'
  // ================================================
  // 'proxy'  → Uses /api/chat (Next.js backend) — No CORS issue ✅
  // 'direct' → Calls n8n webhook directly from browser — May have CORS issue ⚠️
  //
  // For GitHub Pages deployment: use 'direct' and set WEBHOOK_URL
  // For same-server deployment: use 'proxy'
  API_MODE: 'direct',

  // Proxy API endpoint (when API_MODE = 'proxy')
  PROXY_URL: '/api/chat',

  // n8n Webhook URL (when API_MODE = 'direct')
  // Test:       https://arfinsami178.app.n8n.cloud/webhook-test/ai-chatbot-rag-agent
  // Production: https://arfinsami178.app.n8n.cloud/webhook/ai-chatbot-rag-agent
  WEBHOOK_URL: 'https://n8n.srv1106977.hstgr.cloud/webhook-test/ai-chatbot-rag-agent',

  // Local storage keys
  STORAGE_KEYS: {
    CONVERSATIONS: 'rag_conversations',
    MESSAGES: 'rag_messages',
    THEME: 'rag_theme',
    SIDEBAR: 'rag_sidebar'
  }
};

// ========================================
// State Management
// ========================================

const state = {
  conversations: [],
  messages: {},
  activeConversationId: null,
  isLoading: false,
  searchQuery: '',
  sidebarExpanded: true,
  theme: 'dark'
};

// ========================================
// DOM Elements
// ========================================

const elements = {
  sidebar: document.getElementById('sidebar'),
  logoBtn: document.getElementById('logo-btn'),
  searchHeaderBtn: document.getElementById('search-header-btn'),
  collapseBtn: document.getElementById('collapse-btn'),
  searchInput: document.getElementById('search-input'),
  searchClearBtn: document.getElementById('search-clear-btn'),
  collapsedSearchBtn: document.getElementById('collapsed-search-btn'),
  newChatBtn: document.getElementById('new-chat-btn'),
  chatsLabelText: document.getElementById('chats-label-text'),
  conversationsList: document.getElementById('conversations-list'),
  themeToggleBtn: document.getElementById('theme-toggle-btn'),
  clearHistoryBtn: document.getElementById('clear-history-btn'),
  welcomeScreen: document.getElementById('welcome-screen'),
  welcomeInput: document.getElementById('welcome-input'),
  welcomeSendBtn: document.getElementById('welcome-send-btn'),
  messagesContainer: document.getElementById('messages-container'),
  messagesList: document.getElementById('messages-list'),
  inputArea: document.getElementById('input-area'),
  messageInput: document.getElementById('message-input'),
  sendBtn: document.getElementById('send-btn'),
  scrollBottomBtn: document.getElementById('scroll-bottom-btn'),
  mobileOverlay: document.getElementById('mobile-overlay')
};

// ========================================
// Utilities
// ========================================

function generateId() {
  return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function formatTime(date) {
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// ========================================
// Storage
// ========================================

function saveToStorage() {
  localStorage.setItem(CONFIG.STORAGE_KEYS.CONVERSATIONS, JSON.stringify(state.conversations));
  localStorage.setItem(CONFIG.STORAGE_KEYS.MESSAGES, JSON.stringify(state.messages));
}

function loadFromStorage() {
  try {
    const conversations = localStorage.getItem(CONFIG.STORAGE_KEYS.CONVERSATIONS);
    const messages = localStorage.getItem(CONFIG.STORAGE_KEYS.MESSAGES);
    const theme = localStorage.getItem(CONFIG.STORAGE_KEYS.THEME);
    const sidebar = localStorage.getItem(CONFIG.STORAGE_KEYS.SIDEBAR);

    if (conversations) state.conversations = JSON.parse(conversations);
    if (messages) state.messages = JSON.parse(messages);
    if (theme) state.theme = theme;
    if (sidebar !== null) state.sidebarExpanded = sidebar === 'true';
  } catch (e) {
    console.error('Error loading from storage:', e);
  }
}

// ========================================
// Theme Management
// ========================================

function setTheme(theme) {
  state.theme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(CONFIG.STORAGE_KEYS.THEME, theme);
  
  // Update button text
  const btnText = elements.themeToggleBtn.querySelector('.expanded-only');
  if (btnText) {
    btnText.textContent = theme === 'dark' ? 'Light Mode' : 'Dark Mode';
  }
}

function toggleTheme() {
  setTheme(state.theme === 'dark' ? 'light' : 'dark');
}

// ========================================
// Sidebar Management
// ========================================

function setSidebarExpanded(expanded) {
  state.sidebarExpanded = expanded;
  
  if (expanded) {
    elements.sidebar.classList.remove('collapsed');
    elements.sidebar.classList.add('expanded');
  } else {
    elements.sidebar.classList.remove('expanded');
    elements.sidebar.classList.add('collapsed');
  }
  
  localStorage.setItem(CONFIG.STORAGE_KEYS.SIDEBAR, expanded);
  elements.mobileOverlay.classList.toggle('visible', expanded && isMobile());
}

function toggleSidebar() {
  setSidebarExpanded(!state.sidebarExpanded);
}

function isMobile() {
  return window.innerWidth < 768;
}

// ========================================
// Conversations Management
// ========================================

function createConversation() {
  // Check if current conversation is empty
  if (state.activeConversationId) {
    const currentMessages = state.messages[state.activeConversationId] || [];
    if (currentMessages.length === 0) {
      return state.activeConversationId;
    }
  }

  // Check if latest conversation is empty
  if (state.conversations.length > 0) {
    const latestConv = state.conversations[0];
    const latestMessages = state.messages[latestConv.id] || [];
    if (latestMessages.length === 0) {
      selectConversation(latestConv.id);
      return latestConv.id;
    }
  }

  const conversation = {
    id: generateId(),
    title: 'New Chat',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  state.conversations.unshift(conversation);
  state.messages[conversation.id] = [];
  saveToStorage();
  
  selectConversation(conversation.id);
  renderConversations();
  
  return conversation.id;
}

function selectConversation(id) {
  state.activeConversationId = id;
  state.searchQuery = '';
  elements.searchInput.value = '';
  
  renderConversations();
  renderMessages();
  updateUIState();
  
  if (isMobile()) {
    setSidebarExpanded(false);
  }
}

function deleteConversation(id) {
  state.conversations = state.conversations.filter(c => c.id !== id);
  delete state.messages[id];
  
  if (state.activeConversationId === id) {
    state.activeConversationId = null;
    renderMessages();
    updateUIState();
  }
  
  saveToStorage();
  renderConversations();
}

function clearAllConversations() {
  if (!confirm('Are you sure you want to clear all chat history?')) return;
  
  state.conversations = [];
  state.messages = {};
  state.activeConversationId = null;
  
  saveToStorage();
  renderConversations();
  renderMessages();
  updateUIState();
}

function updateConversationTitle(id, title) {
  const conv = state.conversations.find(c => c.id === id);
  if (conv && conv.title === 'New Chat') {
    conv.title = title.length > 50 ? title.substring(0, 50) + '...' : title;
    conv.updatedAt = new Date().toISOString();
    saveToStorage();
    renderConversations();
  }
}

function getFilteredConversations() {
  if (!state.searchQuery.trim()) {
    return state.conversations;
  }
  const query = state.searchQuery.toLowerCase();
  return state.conversations.filter(c => 
    c.title.toLowerCase().includes(query)
  );
}

// ========================================
// Messages Management
// ========================================

function addMessage(conversationId, role, content, sources = null) {
  const message = {
    id: generateId(),
    role,
    content,
    sources,
    createdAt: new Date().toISOString()
  };

  if (!state.messages[conversationId]) {
    state.messages[conversationId] = [];
  }
  
  state.messages[conversationId].push(message);
  saveToStorage();
  
  return message;
}

function updateMessage(conversationId, messageId, updates) {
  const messages = state.messages[conversationId];
  if (!messages) return;
  
  const index = messages.findIndex(m => m.id === messageId);
  if (index !== -1) {
    messages[index] = { ...messages[index], ...updates };
    saveToStorage();
  }
}

// ========================================
// API Communication
// ========================================

async function sendMessage(content) {
  if (state.isLoading || !content.trim()) return;
  
  state.isLoading = true;
  updateUIState();

  // Create conversation if needed
  let convId = state.activeConversationId;
  if (!convId) {
    convId = createConversation();
  }

  // For proxy mode: create server-side conversation too
  let serverConvId = convId;
  if (CONFIG.API_MODE === 'proxy') {
    try {
      const convRes = await fetch('/api/conversations', { method: 'POST' });
      if (convRes.ok) {
        const convData = await convRes.json();
        serverConvId = convData.id;
      }
    } catch (e) {
      console.error('Failed to create server conversation:', e);
    }
  }

  // Add user message
  const userMessage = addMessage(convId, 'user', content);
  renderMessages();
  scrollToBottom();

  // Update conversation title with first message
  updateConversationTitle(convId, content);

  // Add typing indicator
  showTypingIndicator();

  try {
    if (CONFIG.API_MODE === 'proxy') {
      // ===== PROXY MODE: Use /api/chat with SSE streaming =====
      const response = await fetch(CONFIG.PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          conversationId: serverConvId
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      hideTypingIndicator();

      // Create assistant message placeholder for streaming
      const assistantMsg = addMessage(convId, 'assistant', '', null);
      renderMessages();
      scrollToBottom();

      // Read SSE stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      let sources = [];
      let done = false;

      while (!done) {
        const { value, done: streamDone } = await reader.read();
        if (streamDone) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.done) {
              done = true;
              sources = data.sources || [];
            } else if (data.token) {
              fullContent += data.token;
              // Update message in DOM for streaming effect
              updateMessage(convId, assistantMsg.id, { content: fullContent });
              const bubbleEl = document.querySelector(`[data-msg-id="${assistantMsg.id}"] .message-bubble`);
              if (bubbleEl) {
                bubbleEl.innerHTML = renderMarkdown(fullContent) + '<span class="streaming-cursor"></span>';
                scrollToBottom();
              }
            }
          } catch (e) {
            // skip parse errors
          }
        }
      }

      // Final update with sources
      updateMessage(convId, assistantMsg.id, { content: fullContent, sources: sources.length > 0 ? sources : null });
      renderMessages();
      scrollToBottom();

    } else {
      // ===== DIRECT MODE: Call n8n webhook directly =====
      const response = await fetch(CONFIG.WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          conversationId: convId,
          query: content,
          question: content,
          input: content
        })
      });

      hideTypingIndicator();

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      // Extract answer from various possible response formats
      let answer = data.output || data.response || data.text || data.answer || data.message || data.result || data.content;
      
      // Handle array response
      if (Array.isArray(data) && data.length > 0) {
        const first = data[0];
        answer = first.output || first.response || first.text || first.answer || first.message || '';
      }

      if (!answer) {
        answer = "I couldn't process your request right now. Please try again later.";
      }

      // Extract sources
      const sources = data.sources || data.sourceDocuments || data.documents || data.citations || [];

      // Add assistant message
      addMessage(convId, 'assistant', answer, sources);
      renderMessages();
      scrollToBottom();
    }

  } catch (error) {
    console.error('API Error:', error);
    hideTypingIndicator();
    
    // Add error message
    addMessage(convId, 'assistant', "I couldn't process your request right now. Please try again later.");
    renderMessages();
    scrollToBottom();
  } finally {
    state.isLoading = false;
    updateUIState();
  }
}

// ========================================
// Rendering
// ========================================

function renderConversations() {
  const conversations = getFilteredConversations();
  
  // Update label
  elements.chatsLabelText.textContent = state.searchQuery ? 'Search Results' : 'Recent Chats';
  
  if (conversations.length === 0) {
    elements.conversationsList.innerHTML = `
      <div class="empty-conversations">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
          ${state.searchQuery 
            ? '<circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>'
            : '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>'}
        </svg>
        <p>${state.searchQuery ? 'No matching chats' : 'No conversations yet'}</p>
      </div>
    `;
    return;
  }

  elements.conversationsList.innerHTML = conversations.map(conv => `
    <div class="conversation-item ${conv.id === state.activeConversationId ? 'active' : ''}" 
         data-id="${conv.id}">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
      <span class="conversation-title expanded-only">${escapeHtml(conv.title)}</span>
      <button class="conversation-delete expanded-only" data-id="${conv.id}" title="Delete">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        </svg>
      </button>
    </div>
  `).join('');

  // Add event listeners
  elements.conversationsList.querySelectorAll('.conversation-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (!e.target.closest('.conversation-delete')) {
        selectConversation(item.dataset.id);
      }
    });
  });

  elements.conversationsList.querySelectorAll('.conversation-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteConversation(btn.dataset.id);
    });
  });
}

function renderMessages() {
  const messages = state.activeConversationId 
    ? (state.messages[state.activeConversationId] || [])
    : [];

  if (messages.length === 0) {
    elements.welcomeScreen.classList.remove('hidden');
    elements.messagesContainer.classList.remove('active');
    elements.inputArea.classList.remove('active');
    return;
  }

  elements.welcomeScreen.classList.add('hidden');
  elements.messagesContainer.classList.add('active');
  elements.inputArea.classList.add('active');

  elements.messagesList.innerHTML = messages.map(msg => renderMessage(msg)).join('');

  // Add copy button listeners
  elements.messagesList.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', () => copyToClipboard(btn));
  });

  // Highlight code blocks
  elements.messagesList.querySelectorAll('pre code').forEach(block => {
    hljs.highlightElement(block);
  });
}

function renderMessage(msg) {
  const isUser = msg.role === 'user';
  const formattedContent = isUser ? escapeHtml(msg.content) : renderMarkdown(msg.content);
  
  let sourcesHtml = '';
  if (msg.sources && msg.sources.length > 0) {
    sourcesHtml = `
      <div class="message-sources">
        <div class="sources-label">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          Sources
        </div>
        <div class="sources-list">
          ${msg.sources.map(src => `
            <a href="${src.url || '#'}" target="_blank" rel="noopener" class="source-link">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
              ${escapeHtml(src.title)}
            </a>
          `).join('')}
        </div>
      </div>
    `;
  }

  return `
    <div class="message ${msg.role}" data-msg-id="${msg.id}">
      <div class="message-avatar">
        ${isUser ? `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
        ` : `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
            <path d="M12 2a4 4 0 0 1 4 4v1h1a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-6a3 3 0 0 1 3-3h1V6a4 4 0 0 1 4-4z"/>
            <circle cx="9" cy="13" r="1" fill="white"/>
            <circle cx="15" cy="13" r="1" fill="white"/>
          </svg>
        `}
      </div>
      <div class="message-content">
        <div class="message-bubble">${formattedContent}</div>
        ${sourcesHtml}
        <div class="message-actions">
          ${!isUser ? `
            <button class="action-btn copy-btn" data-content="${escapeHtml(msg.content)}" title="Copy">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
              <span class="copy-tooltip">Copied!</span>
            </button>
          ` : ''}
          <span class="message-time">${formatTime(msg.createdAt)}</span>
        </div>
      </div>
    </div>
  `;
}

function renderMarkdown(content) {
  if (typeof marked !== 'undefined') {
    marked.setOptions({
      breaks: true,
      gfm: true,
      highlight: function(code, lang) {
        if (typeof hljs !== 'undefined' && lang && hljs.getLanguage(lang)) {
          return hljs.highlight(code, { language: lang }).value;
        }
        return code;
      }
    });
    return marked.parse(content);
  }
  return escapeHtml(content).replace(/\n/g, '<br>');
}

function showTypingIndicator() {
  const indicator = document.createElement('div');
  indicator.className = 'typing-indicator';
  indicator.id = 'typing-indicator';
  indicator.innerHTML = `
    <div class="message-avatar">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
        <path d="M12 2a4 4 0 0 1 4 4v1h1a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-6a3 3 0 0 1 3-3h1V6a4 4 0 0 1 4-4z"/>
        <circle cx="9" cy="13" r="1" fill="white"/>
        <circle cx="15" cy="13" r="1" fill="white"/>
      </svg>
    </div>
    <div class="typing-dots">
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <span class="typing-text">Thinking...</span>
    </div>
  `;
  indicator.querySelector('.message-avatar').style.background = 'linear-gradient(135deg, var(--color-primary), var(--color-accent))';
  indicator.querySelector('.message-avatar').style.borderRadius = '12px';
  elements.messagesList.appendChild(indicator);
  scrollToBottom();
}

function hideTypingIndicator() {
  const indicator = document.getElementById('typing-indicator');
  if (indicator) indicator.remove();
}

// ========================================
// UI State
// ========================================

function updateUIState() {
  // Input states
  const welcomeHasText = elements.welcomeInput.value.trim().length > 0;
  const mainHasText = elements.messageInput.value.trim().length > 0;
  
  elements.welcomeSendBtn.disabled = !welcomeHasText || state.isLoading;
  elements.sendBtn.disabled = !mainHasText || state.isLoading;
  elements.messageInput.disabled = state.isLoading;
  
  // Loading state on send button
  elements.sendBtn.classList.toggle('loading', state.isLoading);
  
  // Search clear button
  elements.searchClearBtn.style.display = state.searchQuery ? 'flex' : 'none';
}

function scrollToBottom() {
  elements.messagesContainer.scrollTop = elements.messagesContainer.scrollHeight;
}

function copyToClipboard(btn) {
  const content = btn.dataset.content;
  navigator.clipboard.writeText(content).then(() => {
    btn.classList.add('copied');
    btn.querySelector('svg').innerHTML = '<polyline points="20 6 9 17 4 12"/>';
    setTimeout(() => {
      btn.classList.remove('copied');
      btn.querySelector('svg').innerHTML = '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>';
    }, 2000);
  });
}

function autoResizeTextarea(textarea) {
  textarea.style.height = 'auto';
  const maxHeight = 144; // 6 lines approx
  textarea.style.height = Math.min(textarea.scrollHeight, maxHeight) + 'px';
}

// ========================================
// Event Handlers
// ========================================

function handleSendFromWelcome() {
  const content = elements.welcomeInput.value.trim();
  if (content) {
    elements.welcomeInput.value = '';
    sendMessage(content);
  }
}

function handleSendFromInput() {
  const content = elements.messageInput.value.trim();
  if (content) {
    elements.messageInput.value = '';
    elements.messageInput.style.height = 'auto';
    sendMessage(content);
  }
}

function handleKeyDown(e, isWelcome = false) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    if (isWelcome) {
      handleSendFromWelcome();
    } else {
      handleSendFromInput();
    }
  }
}

// ========================================
// Scroll Detection
// ========================================

function handleMessagesScroll() {
  const { scrollTop, scrollHeight, clientHeight } = elements.messagesContainer;
  const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
  elements.scrollBottomBtn.classList.toggle('visible', !isNearBottom);
}

// ========================================
// Initialize
// ========================================

function init() {
  // Load state
  loadFromStorage();
  
  // Apply theme
  setTheme(state.theme);
  
  // Apply sidebar state
  setSidebarExpanded(state.sidebarExpanded);
  
  // Render
  renderConversations();
  updateUIState();
  
  // Event Listeners
  
  // Sidebar
  elements.logoBtn.addEventListener('click', () => {
    if (!state.sidebarExpanded) toggleSidebar();
  });
  elements.collapseBtn.addEventListener('click', toggleSidebar);
  elements.collapsedSearchBtn.addEventListener('click', () => {
    setSidebarExpanded(true);
    setTimeout(() => elements.searchInput.focus(), 100);
  });
  elements.searchHeaderBtn.addEventListener('click', () => {
    elements.searchInput.focus();
  });
  elements.mobileOverlay.addEventListener('click', () => {
    setSidebarExpanded(false);
  });
  
  // Search
  elements.searchInput.addEventListener('input', debounce((e) => {
    state.searchQuery = e.target.value;
    renderConversations();
    updateUIState();
  }, 150));
  elements.searchClearBtn.addEventListener('click', () => {
    state.searchQuery = '';
    elements.searchInput.value = '';
    renderConversations();
    elements.searchInput.focus();
  });
  
  // New Chat
  elements.newChatBtn.addEventListener('click', createConversation);
  
  // Theme
  elements.themeToggleBtn.addEventListener('click', toggleTheme);
  
  // Clear History
  elements.clearHistoryBtn.addEventListener('click', clearAllConversations);
  
  // Welcome Input
  elements.welcomeInput.addEventListener('input', () => {
    autoResizeTextarea(elements.welcomeInput);
    updateUIState();
  });
  elements.welcomeInput.addEventListener('keydown', (e) => handleKeyDown(e, true));
  elements.welcomeSendBtn.addEventListener('click', handleSendFromWelcome);
  
  // Main Input
  elements.messageInput.addEventListener('input', () => {
    autoResizeTextarea(elements.messageInput);
    updateUIState();
  });
  elements.messageInput.addEventListener('keydown', (e) => handleKeyDown(e, false));
  elements.sendBtn.addEventListener('click', handleSendFromInput);
  
  // Scroll
  elements.messagesContainer.addEventListener('scroll', debounce(handleMessagesScroll, 100));
  elements.scrollBottomBtn.addEventListener('click', scrollToBottom);
  
  // Resize
  window.addEventListener('resize', debounce(() => {
    if (isMobile() && state.sidebarExpanded) {
      // Keep overlay logic
      elements.mobileOverlay.classList.add('visible');
    } else {
      elements.mobileOverlay.classList.remove('visible');
    }
  }, 100));
  
  console.log('🤖 AI Knowledge RAG Assistant initialized');
}

// Start
document.addEventListener('DOMContentLoaded', init);
