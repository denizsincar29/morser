// Main application logic
class MorserApp {
    constructor() {
        this.decoder = new MorseDecoder();
        this.keyDownTime = null;
        this.decodeTimeout = null;
        this.exerciseActive = false;
        this.exerciseChars = '';
        this.exerciseStartTime = null;
        this.exerciseMistakes = 0;
        
        this.init();
    }

    async init() {
        // Load all languages
        await morseData.loadAllLanguages();
        
        // Setup event listeners
        this.setupControls();
        this.setupModals();
        this.setupRealtime();
        this.setupExercise();
        
        // Load settings from localStorage
        this.loadSettings();
        
        this.updateStatus('Ready to use Morser!');
    }

    setupControls() {
        // Language selector
        document.getElementById('language-select').addEventListener('change', (e) => {
            morseData.setLanguage(e.target.value);
            this.saveSettings();
            // Removed status update - NVDA announces it automatically
        });

        // Sound mode
        document.getElementById('sound-mode').addEventListener('change', (e) => {
            morseAudio.setSoundMode(e.target.value);
            this.saveSettings();
            this.updateSoundModeUI(e.target.value);
            // Removed status update - NVDA announces it automatically
        });

        // Speed slider
        document.getElementById('speed-slider').addEventListener('input', (e) => {
            const wpm = parseInt(e.target.value);
            document.getElementById('speed-value').textContent = wpm;
            morseAudio.setWPM(wpm);
            this.saveSettings();
        });

        // Pitch slider
        document.getElementById('pitch-slider').addEventListener('input', (e) => {
            const pitch = parseInt(e.target.value);
            document.getElementById('pitch-value').textContent = pitch;
            morseAudio.setPitch(pitch);
            this.saveSettings();
        });

        // Start/end sounds
        document.getElementById('use-start-end').addEventListener('change', (e) => {
            morseAudio.setUseStartEnd(e.target.checked);
            this.saveSettings();
        });

        // Silent beep
        document.getElementById('silent-beep').addEventListener('change', (e) => {
            morseAudio.setSilentBeep(e.target.checked);
            this.saveSettings();
        });
    }

    updateSoundModeUI(mode) {
        const pitchControl = document.getElementById('pitch-control');
        const synthOptions = document.getElementById('synth-options');
        const speedControl = document.getElementById('speed-control');
        
        if (mode === 'synth') {
            pitchControl.style.display = 'block';
            synthOptions.style.display = 'block';
            if (speedControl) speedControl.style.display = 'block';
            
            // Restore saved synth WPM if available
            if (this.savedSynthWPM) {
                morseAudio.setWPM(this.savedSynthWPM);
                document.getElementById('speed-slider').value = this.savedSynthWPM;
                document.getElementById('speed-value').textContent = this.savedSynthWPM;
            }
        } else {
            // Save current synth WPM before switching
            if (morseAudio.soundMode === 'synth') {
                this.savedSynthWPM = morseAudio.wpm;
            }
            
            pitchControl.style.display = 'none';
            synthOptions.style.display = 'none';
            if (speedControl) speedControl.style.display = 'none';
            
            // Set fixed WPM values
            if (mode === 'telegraph') {
                document.getElementById('speed-value').textContent = '26';
            } else if (mode === 'oldschool') {
                document.getElementById('speed-value').textContent = '14';
            }
        }
    }

    setupModals() {
        // Text to Morse
        document.getElementById('translate-btn').addEventListener('click', () => {
            this.openModal('translate-modal');
        });

        document.getElementById('close-translate-btn').addEventListener('click', () => {
            this.closeModal('translate-modal');
        });

        document.getElementById('generate-morse-btn').addEventListener('click', () => {
            this.generateMorse();
        });

        document.getElementById('download-audio-btn').addEventListener('click', () => {
            this.downloadAudio();
        });

        // Real-time Input
        document.getElementById('realtime-btn').addEventListener('click', () => {
            this.openModal('realtime-modal');
        });

        document.getElementById('close-realtime-btn').addEventListener('click', () => {
            this.closeModal('realtime-modal');
        });

        // Exercise
        document.getElementById('exercise-btn').addEventListener('click', () => {
            this.openModal('exercise-modal');
        });

        document.getElementById('close-exercise-btn').addEventListener('click', () => {
            this.closeModal('exercise-modal');
        });

        // Scheduler
    }

    openModal(id) {
        // Close all other modals first
        const allModals = document.querySelectorAll('.modal');
        allModals.forEach(modal => {
            if (modal.id !== id) {
                modal.hidden = true;
            }
        });
        
        const modal = document.getElementById(id);
        modal.hidden = false;
        modal.querySelector('.modal-content').focus();
    }

    closeModal(id) {
        document.getElementById(id).hidden = true;
    }

    async generateMorse() {
        const text = document.getElementById('translate-text').value;
        if (!text) return;

        const morse = morseData.textToMorse(text);
        document.getElementById('morse-output').textContent = morse;

        // Play the morse
        await morseAudio.playText(text);

        // Enable download button
        document.getElementById('download-audio-btn').disabled = false;
        
        this.updateStatus('Morse generated and played');
    }

    downloadAudio() {
        // Placeholder for WAV generation
        const text = document.getElementById('translate-text').value;
        const morse = morseData.textToMorse(text);
        
        const blob = new Blob([morse], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'morse.txt';
        a.click();
        URL.revokeObjectURL(url);
        
        this.updateStatus('Morse pattern downloaded');
    }

    setupRealtime() {
        const inputArea = document.getElementById('morse-input-area');
        const letterDisplay = document.getElementById('letter-display');
        const inputMode = document.getElementById('input-mode');
        const decoderControls = document.getElementById('decoder-controls');

        // Handle mode changes
        inputMode.addEventListener('change', (e) => {
            if (e.target.value === 'decoder') {
                decoderControls.style.display = 'block';
                letterDisplay.textContent = '';
            } else {
                decoderControls.style.display = 'none';
                document.getElementById('decoded-output-realtime').textContent = '';
            }
        });

        // Setup decoder buttons
        document.getElementById('start-recording-realtime-btn').addEventListener('click', () => {
            this.startRealtimeDecoding();
        });

        document.getElementById('stop-recording-realtime-btn').addEventListener('click', () => {
            this.stopRealtimeDecoding();
        });

        document.getElementById('download-morse-realtime-btn').addEventListener('click', () => {
            const durations = this.decoder.exportDurations();
            const blob = new Blob([JSON.stringify(durations)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'recording.morse';
            a.click();
            URL.revokeObjectURL(url);
        });

        document.getElementById('download-text-realtime-btn').addEventListener('click', () => {
            const text = this.decoder.getDecodedText();
            const blob = new Blob([text], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'decoded.txt';
            a.click();
            URL.revokeObjectURL(url);
        });

        inputArea.addEventListener('keydown', async (e) => {
            const mode = inputMode.value;

            if (mode === 'keyboard') {
                // Direct character input
                if (e.key.length === 1 && !e.ctrlKey && !e.altKey) {
                    e.preventDefault();
                    const char = e.key.toLowerCase();
                    // Play the morse audio (no letter announcement)
                    await morseAudio.playCharacter(char);
                }
            } else if (mode === 'spacebar' || mode === 'decoder') {
                // Spacebar/arrow keying (with optional decoding)
                if (e.key === ' ' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                    e.preventDefault();
                    if (!this.keyDownTime) {
                        this.keyDownTime = Date.now();
                        
                        // Add pause for decoder mode
                        if (mode === 'decoder' && this.isDecoderRecording && this.lastKeyUpTime) {
                            const pause = this.keyDownTime - this.lastKeyUpTime;
                            this.decoder.addPause(pause);
                        }
                        
                        if (e.key === 'ArrowLeft') {
                            await morseAudio.playDot();
                            if (mode === 'spacebar') letterDisplay.textContent = '.';
                        } else if (e.key === 'ArrowRight') {
                            await morseAudio.playDash();
                            if (mode === 'spacebar') letterDisplay.textContent = '-';
                        } else {
                            // Spacebar - play based on duration
                            morseAudio.initAudioContext();
                            const oscillator = morseAudio.audioContext.createOscillator();
                            const gainNode = morseAudio.audioContext.createGain();
                            oscillator.type = 'sine';
                            oscillator.frequency.value = morseAudio.pitch;
                            oscillator.connect(gainNode);
                            gainNode.connect(morseAudio.audioContext.destination);
                            gainNode.gain.value = 0.3;
                            oscillator.start();
                            this.currentOscillator = oscillator;
                            this.currentGain = gainNode;
                        }
                    }
                }
            }
        });

        inputArea.addEventListener('keyup', (e) => {
            const mode = inputMode.value;

            if ((mode === 'spacebar' || mode === 'decoder') && e.key === ' ') {
                e.preventDefault();
                
                if (this.currentOscillator) {
                    this.currentOscillator.stop();
                    this.currentOscillator = null;
                    this.currentGain = null;
                }
                
                if (this.keyDownTime) {
                    const duration = Date.now() - this.keyDownTime;
                    
                    if (mode === 'spacebar') {
                        letterDisplay.textContent = duration < 200 ? '.' : '-';
                    } else if (mode === 'decoder' && this.isDecoderRecording) {
                        // Add beep to decoder
                        this.decoder.addBeep(duration);
                        this.lastKeyUpTime = Date.now();
                        
                        // Decode after 500ms pause
                        clearTimeout(this.decodeTimeout);
                        this.decodeTimeout = setTimeout(() => {
                            const decoded = this.decoder.decode();
                            document.getElementById('decoded-output-realtime').textContent = decoded;
                        }, 500);
                    }
                    
                    this.keyDownTime = null;
                }
            }
        });
    }

    startRealtimeDecoding() {
        this.decoder.startRecording();
        this.isDecoderRecording = true;
        this.lastKeyUpTime = null;
        
        document.getElementById('start-recording-realtime-btn').disabled = true;
        document.getElementById('stop-recording-realtime-btn').disabled = false;
        document.getElementById('decoded-output-realtime').textContent = '';
        
        this.updateStatus('Recording started - use spacebar or arrow keys');
    }

    stopRealtimeDecoding() {
        this.decoder.stopRecording();
        this.isDecoderRecording = false;
        const decoded = this.decoder.decode();
        
        document.getElementById('start-recording-realtime-btn').disabled = false;
        document.getElementById('stop-recording-realtime-btn').disabled = true;
        document.getElementById('download-morse-realtime-btn').disabled = false;
        document.getElementById('download-text-realtime-btn').disabled = false;
        
        document.getElementById('decoded-output-realtime').textContent = decoded || 'No text decoded';
        
        this.updateStatus(`Decoded: ${decoded.length} characters`);
    }

    setupExercise() {
        document.getElementById('start-exercise-btn').addEventListener('click', () => {
            this.startExercise();
        });

        document.getElementById('stop-exercise-btn').addEventListener('click', () => {
            this.stopExercise();
        });

        // Auto-advance when user types enough characters (no Enter key needed)
        document.getElementById('exercise-input').addEventListener('input', (e) => {
            if (!this.exerciseActive) return;
            
            const input = e.target.value;
            const expected = this.currentGroup || '';
            
            // Check if user typed enough characters
            if (input.length >= expected.length) {
                // Wait 500ms then check and advance
                setTimeout(() => {
                    if (this.exerciseActive && document.getElementById('exercise-input').value.length >= expected.length) {
                        this.checkAndNextExercise();
                    }
                }, 500);
            }
        });
    }

    async startExercise() {
        const lettersPerGroup = parseInt(document.getElementById('letters-per-group').value);
        
        this.exerciseStartTime = Date.now();
        this.exerciseGroups = [];
        this.exerciseActive = true;
        this.currentGroupIndex = 0;
        
        document.getElementById('start-exercise-btn').disabled = true;
        document.getElementById('stop-exercise-btn').disabled = false;
        document.getElementById('exercise-input-area').hidden = false;
        document.getElementById('exercise-input').value = '';
        document.getElementById('exercise-results').textContent = 'Exercise started! Listen and type what you hear.';
        
        // Start the 1-minute timer
        this.exerciseTimer = setTimeout(() => {
            this.finishExercise();
        }, 60000); // 1 minute
        
        // Play first group
        await this.playNextGroup(lettersPerGroup);
    }

    async playNextGroup(lettersPerGroup) {
        if (!this.exerciseActive) return;
        
        const chars = morseData.getRandomGroup(lettersPerGroup, true, false);
        this.currentGroup = chars;
        
        // Play the morse
        await morseAudio.playText(chars);
        
        document.getElementById('exercise-input').focus();
    }

    async checkAndNextExercise() {
        const input = document.getElementById('exercise-input').value.trim().toLowerCase();
        const expected = this.currentGroup.toLowerCase();
        
        // Calculate mistakes
        let mistakes = 0;
        for (let i = 0; i < Math.max(input.length, expected.length); i++) {
            if (input[i] !== expected[i]) mistakes++;
        }
        
        const accuracy = expected.length > 0 ? ((expected.length - mistakes) / expected.length * 100).toFixed(0) : 0;
        
        // Store result
        this.exerciseGroups.push({
            expected: expected,
            typed: input,
            mistakes: mistakes,
            accuracy: accuracy
        });
        
        // Give feedback
        const feedback = document.getElementById('exercise-feedback');
        if (mistakes === 0) {
            feedback.textContent = '✓ Good job!';
        } else if (mistakes === 1) {
            feedback.textContent = '✗ 1 error!';
        } else {
            feedback.textContent = `✗ ${mistakes} errors!`;
        }
        
        // Clear input for next group
        document.getElementById('exercise-input').value = '';
        
        // Play next group
        const lettersPerGroup = parseInt(document.getElementById('letters-per-group').value);
        await this.playNextGroup(lettersPerGroup);
    }

    finishExercise() {
        if (!this.exerciseActive) return;
        
        this.exerciseActive = false;
        clearTimeout(this.exerciseTimer);
        
        document.getElementById('start-exercise-btn').disabled = false;
        document.getElementById('stop-exercise-btn').disabled = true;
        document.getElementById('exercise-input-area').hidden = true;
        
        // Calculate statistics
        const totalGroups = this.exerciseGroups.length;
        const totalMistakes = this.exerciseGroups.reduce((sum, g) => sum + g.mistakes, 0);
        const avgAccuracy = totalGroups > 0 
            ? (this.exerciseGroups.reduce((sum, g) => sum + parseFloat(g.accuracy), 0) / totalGroups).toFixed(1)
            : 0;
        
        // Build detailed statistics
        let stats = `\n=== Exercise Complete ===\n`;
        stats += `Time: 1 minute\n`;
        stats += `Groups completed: ${totalGroups}\n`;
        stats += `Total mistakes: ${totalMistakes}\n`;
        stats += `Average accuracy: ${avgAccuracy}%\n\n`;
        stats += `Details:\n`;
        
        this.exerciseGroups.forEach((group, idx) => {
            stats += `${idx + 1}. Expected: "${group.expected}" | Typed: "${group.typed}" | Accuracy: ${group.accuracy}%\n`;
        });
        
        document.getElementById('exercise-results').textContent = stats;
        document.getElementById('exercise-feedback').textContent = '';
    }

    stopExercise() {
        this.finishExercise();
    }

    updateStatus(message) {
        document.getElementById('status-message').textContent = message;
    }

    saveSettings() {
        const settings = {
            language: morseData.currentLanguage,
            soundMode: morseAudio.soundMode,
            wpm: morseAudio.wpm,
            pitch: morseAudio.pitch,
            useStartEnd: morseAudio.useStartEnd,
            silentBeep: morseAudio.silentBeep
        };
        
        localStorage.setItem('morser-settings', JSON.stringify(settings));
    }

    loadSettings() {
        const saved = localStorage.getItem('morser-settings');
        if (!saved) return;
        
        try {
            const settings = JSON.parse(saved);
            
            if (settings.language) {
                morseData.setLanguage(settings.language);
                document.getElementById('language-select').value = settings.language;
            }
            
            if (settings.soundMode) {
                morseAudio.setSoundMode(settings.soundMode);
                document.getElementById('sound-mode').value = settings.soundMode;
                this.updateSoundModeUI(settings.soundMode);
            }
            
            if (settings.wpm) {
                morseAudio.setWPM(settings.wpm);
                document.getElementById('speed-slider').value = settings.wpm;
                document.getElementById('speed-value').textContent = settings.wpm;
            }
            
            if (settings.pitch) {
                morseAudio.setPitch(settings.pitch);
                document.getElementById('pitch-slider').value = settings.pitch;
                document.getElementById('pitch-value').textContent = settings.pitch;
            }
            
            if (settings.useStartEnd !== undefined) {
                morseAudio.setUseStartEnd(settings.useStartEnd);
                document.getElementById('use-start-end').checked = settings.useStartEnd;
            }
            
            if (settings.silentBeep !== undefined) {
                morseAudio.setSilentBeep(settings.silentBeep);
                document.getElementById('silent-beep').checked = settings.silentBeep;
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new MorserApp();
    });
} else {
    new MorserApp();
}
