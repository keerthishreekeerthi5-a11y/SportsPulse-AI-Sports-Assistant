# 🏆 SportsPulse – AI-Powered Global Sports Assistant

<p align="center">
  <strong>Your intelligent companion for everything happening in the world of sports.</strong>
</p>

<p align="center">
  Live Sports Search • AI Conversations • Image & Video Analysis • Voice Interaction
</p>

---

## 📌 About the Project

**SportsPulse** is an AI-powered sports assistant designed to provide users with information about sports happening around the world.

It combines Generative AI, live web search, multimodal AI capabilities, and voice interaction to create an interactive sports information platform.

Users can ask questions about live match scores, tournament standings, player performance, upcoming fixtures, sports news, and official rules through text or voice.

SportsPulse also allows users to upload match images, video clips, and article links for AI-powered analysis.


## ✨ Key Features

### 🏏 1. Live Sports Information
- Live match scores and results.
- Tournament standings and rankings.
- Upcoming fixtures and match schedules.
- Latest sports news and updates.
- Player statistics and performance information.

### 🌍 2. Multi-Sport Support

SportsPulse supports multiple sports, including:

- Cricket
- Football
- Tennis
- Basketball
- Formula 1
- Badminton
- And other sports.

### 🤖 3. AI-Powered Sports Chatbot
- Natural language conversations.
- Sports-related question answering.
- Explanation of sports rules and terminology.
- Context-aware conversations.
- Structured and readable AI responses.

### 🖼️ 4. Multimodal AI Analysis
- Upload sports-related images.
- Analyze match photographs and scorecards.
- Upload video clips for analysis.
- Inspect sports articles and external links.

### 🎙️ 5. Real-Time Voice Interaction
- Interact with the assistant using voice.
- AI-powered voice conversations.
- Audio-based sports assistance.

### 🔎 6. Live Web Search
- Retrieve recent sports information.
- Search for match updates and results.
- Provide relevant source links when available.

### 💬 7. Chat Management
- Conversation history.
- Start new conversations.
- Clear existing chats.
- Copy AI-generated responses.

---

### Application Flow

1. User enters a sports-related question or uploads media.
2. The React frontend sends the request to the backend.
3. The backend processes the request using the appropriate AI service.
4. The AI generates a response.
5. The frontend displays the response to the user.

---

## ⚙️ Installation and Setup

Follow these steps to run SportsPulse locally.

### Prerequisites

Make sure you have installed:

- Node.js
- npm
- Git
- VS Code (recommended)

### Step 1: Clone the Repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
```

### Step 2: Navigate to the Project

```bash
cd SportsPulse
```

### Step 3: Install Dependencies

```bash
npm install
```

### Step 4: Configure Environment Variables

Create a `.env.local` file in the root directory.

Add the following configuration:

```env
GROQ_API_KEY=your_groq_api_key
GEMINI_API_KEY=your_gemini_api_key
APP_URL=http://localhost:3000
```

Obtain API keys from:

- Groq: https://console.groq.com/
- Google AI Studio: https://aistudio.google.com/

**Important:** Never upload your actual API keys to GitHub.

### Step 5: Run the Application

```bash
npm run dev
```

Open the local URL displayed in your terminal.

---

## 📂 Project Structure

```text
SportsPulse/
│
├── public/
│   └── assets/
│
├── src/
│   ├── components/
│   │   ├── ChatHeader.tsx
│   │   ├── ComposerBar.tsx
│   │   ├── EmptyState.tsx
│   │   ├── HistorySidebar.tsx
│   │   ├── MarkdownContent.tsx
│   │   ├── MessageBubble.tsx
│   │   └── VoicePanel.tsx
│   │
│   ├── hooks/
│   │   └── useVoiceChat.ts
│   │
│   ├── services/
│   │   └── sportsApi.ts
│   │
│   ├── types/
│   │   └── chat.ts
│   │
│   ├── assets/
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
│
├── docs/
│   └── screenshots/
│
├── server.ts
├── serverLive.ts
├── serverMultimodal.ts
├── package.json
├── vite.config.ts
├── tsconfig.json
├── .env.example
└── README.md
```

---

## 🚀 Future Enhancements

- Personalized sports notifications.
- Favorite teams and player tracking.
- Match prediction and performance analytics.
- Interactive sports statistics dashboards.
- Multilingual voice assistance.
- Personalized tournament updates.

---

## 🎯 Project Objective

The objective of SportsPulse is to make sports information more accessible through Generative AI and real-time interaction.

Instead of navigating multiple websites to find sports updates, users can interact with one intelligent assistant to explore sports information through text, images, videos, links, and voice.

---

## 👩‍💻 Developed With

**SportsPulse – AI-Powered Global Sports Assistant**

Built using React, TypeScript, Groq API, Google Gemini API, and modern web technologies.

---

⭐ If you find this project interesting, consider giving the repository a star!
