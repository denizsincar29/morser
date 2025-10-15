# Morser

A comprehensive morse code learning and practicing tool for the blind, now available as a Progressive Web App (PWA)!

## 🎉 Web/JavaScript Implementation Complete

This repository contains a fully functional web-based Morse code trainer built with modern JavaScript and PWA standards.

## Quick Start

### Option 1: Run Locally
```bash
# Clone the repository
git clone https://github.com/denizsincar29/morser.git
cd morser

# Start a local server
python -m http.server 8000
# or
npx serve

# Open http://localhost:8000 in your browser
```

### Option 2: Install as PWA
1. Open the app in a supported browser (Chrome, Edge, Safari)
2. Click "Install" or "Add to Home Screen"
3. Use offline whenever you need!

## Features

✅ **Text to Morse Translation** - Convert any text to Morse code audio
✅ **Real-time Morse Input** - Type with keyboard or use spacebar/arrow keys
✅ **Intelligent Decoder** - K-means clustering for accurate Morse recognition
✅ **3 Audio Modes** - Synth wave, telegraph sounds, or old-school telegraph
✅ **Training Exercises** - Practice receiving Morse code
✅ **Multi-Language** - English, Russian, German, Turkish
✅ **Scheduled Messages** - Set Morse messages to play at specific times
✅ **Fully Accessible** - Screen reader compatible, braille display support
✅ **Offline Capable** - Works without internet once installed

## Documentation

- **[WEB_README.md](WEB_README.md)** - Complete web app documentation and usage guide
- **[FEATURES.md](FEATURES.md)** - Original technical specification
- **[src/readme english.txt](src/readme%20english.txt)** - Original BGT documentation (reference)
- **[src/readme russian.txt](src/readme%20russian.txt)** - Original BGT documentation (reference)

## Project Structure

```
morser/
├── index.html           # Main application
├── styles.css          # Styling
├── manifest.json       # PWA manifest
├── sw.js              # Service worker
├── js/                # JavaScript modules
│   ├── app.js         # Main app logic
│   ├── morse-data.js  # Data management
│   ├── morse-audio.js # Audio engine
│   ├── morse-decoder.js # K-means decoder
│   └── kmeans.js      # Clustering algorithm
├── languages/         # Language definitions
│   ├── en.json
│   ├── ru.json
│   ├── de.json
│   └── tr.json
└── src/sounds/        # Audio samples
```

## Technologies

- **Vanilla JavaScript** - No frameworks, fast and lightweight
- **Web Audio API** - High-quality audio synthesis
- **Service Workers** - Offline functionality
- **K-Means Clustering** - Intelligent Morse decoding
- **PWA Standards** - Installable and offline-ready

## Accessibility

- Full keyboard navigation
- ARIA live regions for screen readers
- Braille display support (auto-translated by NVDA)
- High contrast mode
- Reduced motion support

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers with PWA support

## Credits

- K-means decoder based on [morse_decoder](https://github.com/denizsincar29/morse_decoder)
- Original concept and BGT implementation by denizsincar29
- Web/PWA rewrite using modern web standards
