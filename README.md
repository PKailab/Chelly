# Chelly

自然言語でなんでもできるAndroidアプリ

[![Build](https://github.com/RYOITABASHI/Chelly/actions/workflows/build-android.yml/badge.svg)](https://github.com/RYOITABASHI/Chelly/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## What is Chelly?

Chelly turns natural language into action on your Android device.

- **Natural language in, results out** — type what you want, Chelly executes invisible commands and shows you the result in chat
- **No terminal, no shell, no technical knowledge needed** — just talk to it
- **Powered by Gemini (free)** with support for Claude, Groq, Cerebras, Perplexity, and local LLMs
- **Built with Expo + React Native**

## Features

- **Chat-based interface** — conversational UX, no command line
- **Multiple LLM providers** — Gemini (default, free tier), Claude, Groq, Cerebras, Perplexity, local LLMs
- **Arena mode** — compare responses from different LLMs side by side
- **GitHub Actions wizard** — set up CI/CD through conversation
- **Voice input** — speak instead of type
- **File browser** — browse and manage files visually
- **Runtime auto-install** — Python, Node, Git installed on demand
- **Command safety** — destructive commands require explicit confirmation

## Getting Started

1. Download the latest APK from [Releases](https://github.com/RYOITABASHI/Chelly/releases)
2. Open Chelly
3. Get a free Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey)
4. Paste it in and start chatting

## Build from Source

```bash
git clone https://github.com/RYOITABASHI/Chelly.git
cd Chelly
pnpm install
npx expo prebuild --platform android
cd android && ./gradlew :app:assembleDebug
```

## Tech Stack

Expo 54, React Native 0.81, TypeScript, NativeWind, Zustand, JNI (C/Kotlin)

## License

[MIT](LICENSE)

## Related Projects

- [Shelly](https://github.com/RYOITABASHI/Shelly) — Mobile terminal app (Chelly's parent project)
- [Nacre](https://github.com/RYOITABASHI/Nacre) — Developer keyboard IME
