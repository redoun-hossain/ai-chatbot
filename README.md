# AI Knowledge RAG Assistant

A sleek, responsive AI chatbot interface that connects to an n8n RAG (Retrieval-Augmented Generation) agent via webhook.

## Features

- 🤖 **RAG-powered AI Chat** — Ask questions from your knowledge base
- 🌗 **Dark/Light Theme** — Toggle with persistent preference
- 💬 **Multi-chat Support** — Create, search, and manage conversations
- 📱 **Fully Responsive** — Works on desktop, tablet, and mobile
- 📋 **Markdown Rendering** — Full markdown with syntax-highlighted code blocks
- 🔄 **Persistent Storage** — All chats saved in LocalStorage
- 📄 **Source Attribution** — Shows source documents from RAG pipeline

## Tech Stack

- **Frontend:** Pure HTML, CSS, JavaScript (no framework)
- **Styling:** Custom CSS with CSS Variables
- **Markdown:** marked.js (CDN)
- **Code Highlighting:** highlight.js (CDN)
- **Font:** Inter (Google Fonts)
- **Backend:** n8n Webhook (RAG Agent)

## Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/ai-chatbot.git
   cd ai-chatbot
   ```

2. Configure the webhook URL in `js/config.js`:
   ```javascript
   const CONFIG = {
       WEBHOOK_TEST_URL: 'your-test-webhook-url',
       WEBHOOK_PROD_URL: 'your-production-webhook-url',
       USE_TEST: true, // true for testing, false for production
       VERSION: 'V-2.0'
   };
   ```

3. Deploy to GitHub Pages or open `index.html` directly in a browser.

## Configuration

### Switching between Test and Production

Edit `js/config.js`:
- `USE_TEST: true` → Uses the test webhook URL
- `USE_TEST: false` → Uses the production webhook URL

### Version

Update `VERSION` in `js/config.js` to change the version displayed in the sidebar footer.

## n8n Webhook Setup

Your n8n workflow should:
1. Use a **Webhook** node (POST method)
2. Accept JSON body with `message` and `sessionId` fields
3. Return a response with one of: `output`, `response`, `text`, `answer`, `message`, `result`, or `content`
4. Optionally include `sources` or `sourceDocuments` array

## File Structure

```
ai-chatbot/
├── index.html          # Main HTML file
├── css/
│   └── style.css       # All styles with CSS variables
├── js/
│   ├── config.js       # Webhook URLs & configuration
│   └── main.js         # Application logic
├── README.md           # This file
├── .gitignore          # Git ignore rules
└── favicon.ico         # Browser tab icon
```

## License

MIT License
