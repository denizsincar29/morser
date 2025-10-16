# Morser - Morse Code Trainer for the Blind

## Overview
Morser is a comprehensive morse code learning and practicing tool designed specifically for blind users. It integrates with screen readers (NVDA), braille displays, and provides audio feedback for an accessible morse code training experience.

## Target Platform: Web/JavaScript Rewrite
This document outlines the features and technical requirements for rewriting the application as a web-based JavaScript application.

---

## Core Features

### 1. Text to Morse Translation
**Functionality:**
- Translate text input to morse code audio
- Translate text files to morse code
- Save translated morse to WAV file

**User Actions:**
- Press Right Shift: Enter text to translate to morse
- Press Right Ctrl: Enter filename/path to translate file to morse
- Press Left Shift + Enter: Save morsed text/file to WAV

**Technical Requirements:**
- Text input handling
- File upload/reading capability
- Morse code encoding (text → dots/dashes)
- Audio synthesis/playback
- WAV file generation and download

---

### 2. Real-Time Morse Input
**Functionality:**
- Type morse code in real time using keyboard
- Visual/audio feedback for each letter
- Braille display integration for tactile feedback

**User Actions:**
- Type letter keys: Direct morse input
- Press Space: Act as morse key (manual dot/dash input)
- Press Tab: Toggle letter announcement
- Press Enter: Replay recent morse

**Technical Requirements:**
- Keyboard event handling
- Real-time morse decoding
- Letter recognition from morse patterns
- Audio playback synchronization
- Screen reader integration (ARIA labels, live regions)
- Braille display output (Web Bluetooth API or similar)

---

### 3. Audio Settings

#### 3.1 Speed Control
**User Actions:**
- Hold Left/Right Arrows: Adjust morse speed
- Release: Play sample at new speed

**Technical Requirements:**
- WPM (words per minute) calculation
- Dynamic audio timing adjustment
- Speed persistence in configuration

#### 3.2 Pitch Control
**User Actions:**
- Hold Up/Down Arrows: Adjust pitch/frequency

**Technical Requirements:**
- Frequency modulation (Hz adjustment)
- Audio oscillator control

#### 3.3 Sound Modes
**User Actions:**
- Press F1: Cycle through morse modes
  1. Standard wave synthesizer
  2. Telegraph sound (using WAV samples)
  3. Braille display only (silent)
- Press F11: Toggle old-school morse keyboard sound
- Press F12: Mute/unmute all sounds

**Technical Requirements:**
- Multiple audio synthesis methods:
  - Web Audio API oscillator (for wave synthesis)
  - Sample playback (for telegraph sounds)
- Audio mode state management
- Pre-recorded sound files: dot.wav, dash.wav, dot2.wav, dash2.wav, dkmstart.wav, dkmend.wav, start.wav, end.wav, beep.ogg

---

### 4. Training Exercises

#### 4.1 Receiving Exercise (F3)
**Functionality:**
- Computer plays random morse code
- User types what they hear
- Performance metrics after 1 minute

**User Actions:**
- Press F3: Start receiving exercise
- Input: Number of letters per group
- Type received letters on keyboard

**Output:**
- Mistakes count
- Letters received per minute
- Accuracy percentage

**Technical Requirements:**
- Random letter/number generation
- Multi-language support (English/Russian)
- Input validation and comparison
- Timer (1 minute session)
- Performance calculation and display

#### 4.2 Keying Exercise (F4)
**Functionality:**
- Computer shows letters/numbers
- User keys them in morse using spacebar
- Performance tracking

**User Actions:**
- Press Ctrl+Space: Choose language (English/Russian)
- Press F4: Start keying exercise
- Input: Number of letters per group
- Key morse on Space bar

**Output:**
- Speed (WPM)
- Mistakes count
- Success rate

**Technical Requirements:**
- Text-to-speech for announcing letters (Web Speech API)
- Countdown timer (5,4,3,2,1)
- Morse input timing analysis
- Real-time letter feedback
- Performance metrics calculation

---

### 5. Morse Notepad (F5)
**Functionality:**
- Write in morse code and save as text
- Edit and manage morse-written content

**User Actions:**
- Press F5: Open morse notepad
- Space: Key morse letters
- Ctrl+C: Copy text
- Ctrl+E: Edit text in input box
- Ctrl+S: Save text to file
- Ctrl+Shift+Enter: Save morse representation

**Technical Requirements:**
- Text buffer management
- Clipboard API integration
- File download capability
- Morse pattern storage format

---

### 6. Scheduled Morsing (F6)
**Functionality:**
- Schedule morse messages at specific times
- Hourly time announcements

**User Actions:**
- Press F6: Set scheduled morse
- Input time format: `hour:minute:second` (e.g., `15:30:0`)
- Enter message to morse at that time

**Configuration File (procs.txt):**
```
time=text
12:30:0=Conference starting
/telltime=The time is /time
```

**Technical Requirements:**
- Time parsing and validation
- Scheduled task execution
- Configuration file parsing
- Special commands:
  - `/time`: Insert current time
  - `/telltime`: Hourly announcements

---

### 7. Speed Calibration (F7)
**Functionality:**
- Analyze user's natural morse keying speed
- Auto-adjust speed settings

**User Actions:**
- Press F7: Start calibration
- Key real words/numbers on spacebar
- After 50 dots: Calibration complete

**Technical Requirements:**
- Timing analysis of dot/dash lengths
- Statistical calculation of average speed
- Automatic speed configuration update

---

### 8. Recording Feature (F2)
**Functionality:**
- Record morse keying session
- Playback and save recordings

**User Actions:**
- Press F2: Start recording (2 beeps)
- Key morse on spacebar
- Press Enter: Play recording
- Press Enter again: Accept, or Escape: Discard
- Press Escape during recording: Cancel

**Technical Requirements:**
- Input stream recording
- Temporary buffer storage
- Playback functionality
- WAV export option

---

### 9. Configuration System

#### 9.1 Morse Dictionary
**Configuration Parameters:**
- `/russian`: Russian alphabet morse mapping
- `/english`: English alphabet morse mapping
- `/numbers`: Numbers 0-9 morse mapping
- `/punct`: Punctuation morse mapping (. , ? !)
- `/replace`: Letter substitution rules
- `/braille`: Braille display patterns
- `/output`: Audio output device

**Technical Requirements:**
- Configuration file format (key=value pairs)
- Dictionary storage and loading
- Character to morse code mapping
- Reverse morse to character lookup

#### 9.2 Audio Output Device
**User Actions:**
- Run selectdevice tool: List available audio devices
- Edit config: Set `/output=device_number`
- Or `/output=def` for default
- Create empty "stream" folder: Prompt for device selection

**Technical Requirements:**
- Audio device enumeration (Web Audio API)
- Device selection UI
- Configuration persistence (localStorage/IndexedDB)

---

### 10. Braille Display Integration
**Functionality:**
- Show morse letters on braille display
- Silent mode with tactile feedback only
- Real-time braille output during morsing

**Configuration:**
- `/braille=----------`: Pattern for braille display
- `/braille=none`: Disable braille

**Technical Requirements:**
- Braille display API integration (Web Bluetooth)
- Character to braille mapping
- Real-time braille updates
- Dot/dash visual representation on braille

---

### 11. Multi-Language Support
**Supported Languages:**
- English
- Russian

**User Actions:**
- Press Ctrl+Space: Toggle language (for exercises)

**Technical Requirements:**
- Language-specific character sets
- Morse code mappings per language
- Unicode support
- Language state management

---

## Technical Architecture for Web/JS Implementation

### 1. Frontend Framework
**Recommendations:**
- React or Vue.js for component structure
- TypeScript for type safety
- Web Audio API for sound generation
- Service Workers for offline capability

### 2. Audio System
**Components:**
- **Morse Synthesizer**: Web Audio API oscillator
- **Sample Player**: HTML5 Audio for WAV files
- **Recorder**: MediaRecorder API
- **WAV Encoder**: Custom or library (e.g., lamejs)

**Sound Files to Keep:**
- `/sounds/beep.ogg`
- `/sounds/dot.wav`
- `/sounds/dash.wav`
- `/sounds/dot2.wav`
- `/sounds/dash2.wav`
- `/sounds/dkmstart.wav`
- `/sounds/dkmend.wav`
- `/sounds/start.wav`
- `/sounds/end.wav`

### 3. Accessibility
**Required APIs:**
- **ARIA**: Live regions for screen reader announcements
- **Web Speech API**: Text-to-speech for exercises
- **Keyboard Events**: Full keyboard navigation
- **Web Bluetooth**: Braille display communication
- **Focus Management**: Logical tab order

### 4. Storage
**Data to Persist:**
- User preferences (speed, pitch, mode, language)
- Configuration (morse mappings, device settings)
- Scheduled tasks (procs.txt equivalent)
- Performance history

**Storage Options:**
- localStorage: Simple key-value (config)
- IndexedDB: Complex data (history, recordings)
- File System Access API: File operations

### 5. Morse Code Engine
**Core Functionality:**
```javascript
// Morse code mappings
const MORSE_CODE = {
  'A': '.-',
  'B': '-...',
  // ... etc
}

// Encoding
function textToMorse(text) { }

// Decoding
function morseToText(morse) { }

// Timing calculations
function calculateTiming(wpm) {
  const dotDuration = 1200 / wpm; // ms
  const dashDuration = dotDuration * 3;
  const intraCharGap = dotDuration;
  const charGap = dotDuration * 3;
  const wordGap = dotDuration * 7;
  return { dotDuration, dashDuration, intraCharGap, charGap, wordGap };
}
```

### 6. Exercise System
**Components:**
- Exercise Manager: Coordinate exercises
- Performance Tracker: Calculate metrics
- Random Generator: Create exercise content
- Timer: 1-minute session management
- Feedback System: Visual/audio results

### 7. File Operations
**Required:**
- Text file import (File API)
- WAV export (Blob API, download)
- Configuration import/export
- Scheduled tasks file (procs.txt equivalent)

### 8. UI Components

#### Main Screen
- Status display (current mode, speed, pitch)
- Quick controls (visual buttons for F-keys)
- Text input area
- Settings panel

#### Exercise Screens
- Exercise selection
- Real-time feedback
- Performance display
- Progress indicators

#### Configuration Screen
- Morse dictionary editor
- Audio settings
- Device selection
- Language settings

---

## Keyboard Shortcuts Reference

| Key | Function |
|-----|----------|
| Right Shift | Translate text to morse |
| Right Ctrl | Translate file to morse |
| Left Shift + Enter | Save to WAV |
| Enter | Replay recent morse |
| Space | Morse key (manual input) |
| Letter keys | Direct morse input |
| Tab | Toggle letter announcement |
| Left/Right Arrows | Adjust speed (hold) |
| Up/Down Arrows | Adjust pitch (hold) |
| F1 | Change morse mode |
| F2 | Record morse |
| F3 | Receiving exercise |
| F4 | Keying exercise |
| F5 | Morse notepad |
| F6 | Schedule morse |
| F7 | Calibrate speed |
| F11 | Toggle keyboard sound |
| F12 | Mute/unmute |
| Ctrl+Space | Toggle language |
| Ctrl+C | Copy (in notepad) |
| Ctrl+E | Edit (in notepad) |
| Ctrl+S | Save (in notepad) |
| Ctrl+Shift+Enter | Save morse representation |

---

## Implementation Phases

### Phase 1: Core Engine
- Morse code encoding/decoding
- Basic audio synthesis
- Keyboard input handling

### Phase 2: Audio System
- Web Audio API integration
- Sample playback
- Speed/pitch controls
- Multiple sound modes

### Phase 3: User Interface
- Main application layout
- Accessibility features
- Settings management
- Visual feedback

### Phase 4: Training Features
- Receiving exercise
- Keying exercise
- Performance tracking
- Morse notepad

### Phase 5: Advanced Features
- Recording system
- Scheduled morsing
- Speed calibration
- Braille display integration

### Phase 6: Configuration & Storage
- Configuration system
- File operations
- Device selection
- Data persistence

---

## Testing Requirements

### Accessibility Testing
- Screen reader compatibility (NVDA, JAWS, VoiceOver)
- Keyboard-only navigation
- Braille display testing
- High contrast mode
- Focus indicators

### Audio Testing
- Different browsers (Chrome, Firefox, Safari, Edge)
- Audio timing accuracy
- Sample playback quality
- Device switching

### Performance Testing
- Real-time morse input responsiveness
- Exercise timing accuracy
- Large file handling
- Memory usage with long sessions

### Cross-Platform Testing
- Windows
- macOS
- Linux
- Mobile browsers (iOS Safari, Chrome Android)

---

## Files to Remove (BGT Implementation)

### BGT Code Files
- `/src/morser.bgt`
- `/src/bip.bgt`
- `/src/netevent.bgt`
- `/src/interpreter/dictserializer.bgt`
- `/src/interpreter/selectdevice.bgt`
- `/src/server/server.bgt`

### Batch Files
- `/src/morser.bat`
- `/src/interpreter/dictserializer.bat`

### BGT Runtime Files
- `/src/interpreter/bgt.exe`
- `/src/interpreter/exec.bin`
- `/src/server/bgt.exe`
- `/src/server/exec.bin`
- `/src/nvdaControllerClient32.dll`

### Compiled/Binary Config Files
- `/src/interpreter/morse.dict`
- `/src/interpreter/source.dict`

---

## Files to Keep

### Sound Assets
- `/src/sounds/beep.ogg`
- `/src/sounds/dot.wav`
- `/src/sounds/dash.wav`
- `/src/sounds/dot2.wav`
- `/src/sounds/dash2.wav`
- `/src/sounds/dkmstart.wav`
- `/src/sounds/dkmend.wav`
- `/src/sounds/start.wav`
- `/src/sounds/end.wav`

### Configuration/Reference
- `/src/procs.txt` (example scheduled tasks)
- `/src/readme english.txt` (reference)
- `/src/readme russian.txt` (reference)

---

## Migration Notes

### From BGT to Web/JS

1. **Audio Generation**
   - BGT: Native audio libraries
   - Web: Web Audio API + HTML5 Audio

2. **File System**
   - BGT: Direct file access
   - Web: File API + File System Access API

3. **Braille Display**
   - BGT: Direct driver access
   - Web: Web Bluetooth API

4. **Screen Reader**
   - BGT: NVDA Controller Client
   - Web: ARIA live regions + Web Speech API

5. **Keyboard Input**
   - BGT: Direct keyboard hooks
   - Web: Keyboard Events API

6. **Configuration**
   - BGT: Binary .dict files
   - Web: JSON in localStorage/IndexedDB

---

## Future Enhancements (from TODO list)

- [ ] Playing .morse files with dots and dashes
- [ ] Creating and sharing .morse files
- [ ] Arduino morse key support (Web Serial API)
- [ ] Q-code exercises
- [ ] Hardware morse transceiver integration
- [ ] Full Russian interface translation
- [ ] Online multiplayer morse practice
- [ ] Progress tracking and achievements
- [ ] Custom exercise creation
- [ ] Import/export settings and progress

---

## Development Guidelines

### Code Quality
- Use TypeScript for type safety
- Write unit tests for morse engine
- Document all functions with JSDoc
- Follow WCAG 2.1 AAA standards
- Use semantic HTML

### Performance
- Optimize audio context reuse
- Implement virtual scrolling for large lists
- Use Web Workers for heavy calculations
- Lazy load exercise modules
- Cache audio samples

### Security
- Sanitize file inputs
- Validate morse patterns
- Limit file sizes
- Use Content Security Policy
- Implement rate limiting for recordings

### Browser Compatibility
- Target modern browsers (last 2 versions)
- Provide fallbacks for Web Audio API
- Test with screen readers
- Ensure mobile responsiveness
- Progressive enhancement approach
