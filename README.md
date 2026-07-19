# AI Knowledge RAG Assistant

A static front-end chat interface that connects to an n8n RAG Agent via webhook. Built with pure HTML, CSS, and JavaScript — no frameworks, no build tools.

## Features

- 🤖 AI-powered Q&A from your knowledge base
- 🌓 Dark/Light theme with persistence
- 💬 Multi-conversation management
- 🔍 Chat search
- 📱 Fully responsive (mobile-friendly)
- 📋 Markdown rendering with syntax highlighting
- 💾 LocalStorage persistence

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript (vanilla)
- **Backend:** n8n RAG Agent (webhook)
- **Libraries (CDN):** marked.js, highlight.js, Google Fonts (Inter)
- **Hosting:** GitHub Pages

## Setup

1. Clone this repository.
2. Edit `js/config.js` to set your n8n webhook URLs.
3. Set `USE_TEST: true` for development or `USE_TEST: false` for production.
4. Open `index.html` in a browser or deploy to GitHub Pages.

## File Structure

```
ai-chatbot/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── config.js
│   └── main.js
├── README.md
├── .gitignore
└── favicon.ico
```

## Configuration

In `js/config.js`:
- `WEBHOOK_TEST_URL` — n8n test webhook endpoint
- `WEBHOOK_PROD_URL` — n8n production webhook endpoint
- `USE_TEST` — toggle between test and production

## License

MIT
