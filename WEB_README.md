# Morser Web App

A Progressive Web App (PWA) for learning and practicing Morse code, designed with accessibility in mind.

## Features

### Text to Morse Translation
- Enter text and convert it to Morse code
- Play Morse audio
- Download audio files

### Real-time Morse Input
- **Keyboard Mode**: Type letters directly and hear them in Morse
- **Spacebar Mode**: Use spacebar to key Morse manually
  - Short press = dot
  - Long press = dash
  - Arrow keys for direct dot/dash input

### Morse Decoder with K-Means Clustering
- Record Morse input using spacebar or arrow keys
- Automatic decoding using k-means clustering algorithm
- Download recordings as `.morse` files
- Export decoded text

### Audio Modes
1. **Sine Wave (Synth)**: Pure tone with adjustable pitch
   - Optional start/end sounds
   - Silent beep mode (start/end only)
   
2. **Telegraph Sound**: Pre-recorded dot/dash sounds

3. **Old School Telegraph**: Classic telegraph key sounds
   - Uses dkmstart.wav, dot2/dash2, dkmend.wav

### Training Exercises
- **Receiving Exercise**: Listen to random Morse and type what you hear
- Performance tracking (accuracy, speed, mistakes)

### Scheduled Morse Messages
- Schedule messages to play at specific times
- Supports hourly announcements

### Multi-Language Support
- English
- Russian
- German
- Turkish
- Easy to add more languages via JSON files

## Installation

### Run Locally
1. Clone the repository
2. Serve the files using a local web server:
   ```bash
   python -m http.server 8000
   # or
   npx serve
   ```
3. Open http://localhost:8000 in your browser

### Install as PWA
1. Open the app in a supported browser (Chrome, Edge, Safari)
2. Click "Install" or "Add to Home Screen"
3. The app can now run offline

## Usage

### Audio Settings
- **Language**: Select your preferred language for Morse translation
- **Sound Mode**: Choose between synth, telegraph, or old school sounds
- **Speed (WPM)**: Adjust Morse code speed (5-40 words per minute)
- **Pitch (Hz)**: Change tone frequency (synth mode only)

### Keyboard Shortcuts
- In Realtime mode:
  - Keyboard typing: Press any letter key
  - Spacebar mode: Hold spacebar for dots/dashes
  - Arrow keys: Left = dot, Right = dash

### File Formats

#### .morse Files
JSON array of durations in milliseconds:
- Positive numbers = beep duration
- Negative numbers = pause duration

Example:
```json
[100, -50, 300, -50, 100, -200, ...]
```

## Accessibility

- Full keyboard navigation
- ARIA live regions for screen reader announcements
- High contrast mode support
- Braille display compatibility (via NVDA auto-translation)
- Reduced motion support

## Technical Details

### Technologies Used
- Vanilla JavaScript (no frameworks required)
- Web Audio API for sound synthesis
- Service Workers for offline capability
- LocalStorage for settings persistence
- K-means clustering for Morse decoding

### Browser Support
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers with PWA support

## Development

### File Structure
```
morser/
├── index.html          # Main HTML file
├── styles.css          # Styles
├── manifest.json       # PWA manifest
├── sw.js              # Service worker
├── js/
│   ├── app.js         # Main application logic
│   ├── morse-data.js  # Morse code data management
│   ├── morse-audio.js # Audio generation
│   ├── morse-decoder.js # K-means based decoder
│   └── kmeans.js      # K-means clustering algorithm
├── languages/         # Language JSON files
│   ├── en.json
│   ├── ru.json
│   ├── de.json
│   └── tr.json
└── src/sounds/        # Audio samples
    ├── beep.ogg
    ├── dot.wav
    ├── dash.wav
    └── ...
```

### Adding a New Language

Create a JSON file in `/languages/` with this structure:

```json
{
  "name": "Language Name",
  "code": "xx",
  "letters": {
    "a": ".-",
    "b": "-..."
  },
  "numbers": {
    "1": ".----",
    "2": "..---"
  },
  "punctuation": {
    ".": ".-.-.-",
    ",": "--..--"
  }
}
```

Then add the language code to the select dropdown in `index.html` and the loader in `morse-data.js`.

## License

See LICENSE file for details.

## Credits

- K-means clustering algorithm adapted from [morse_decoder](https://github.com/denizsincar29/morse_decoder)
- Original BGT implementation by denizsincar29
