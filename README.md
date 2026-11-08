# Speakmap

**Think out loud. Watch your ideas take shape.**

Speakmap is a voice-driven mind map built for brainstorming. Hold `Space`, speak your mind, and release. Speakmap interprets your words, updates the map, and brings your ideas to life visually.

Less time organizing. More time thinking.

> **Work in progress** — Speakmap is still under development and isn't ready for use just - yet ;)

## Getting started

You'll need Node.js 20.19+ or 22.12+.

```bash
git clone https://github.com/hprandi/speakmap.git
cd speakmap
npm install
npm run dev
```

Open the local URL shown in your terminal (usually `http://localhost:5173`).

## Browser support

Speakmap uses the Web Speech API for voice recognition.
- **Supported:** Chrome, Edge, Safari
- **Not supported:** Firefox

Speech recognition may rely on external services. In Chrome, audio is sent to Google's servers for processing.

## Your API key, your control

Speakmap runs entirely in your browser. Bring your own Anthropic API key to get started.
Your key is stored locally in your browser and used to communicate directly with the Anthropic API. We recommend using a dedicated key with a spending limit.

## License
Speakmap is open source under the [GPL-3.0 License](LICENSE).