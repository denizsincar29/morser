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
        this.scheduledTasks = [];
        
        this.init();
    }

    async init() {
        // Load all languages
        await morseData.loadAllLanguages();
        
        // Setup event listeners
        this.setupControls();
        this.setupModals();
        this.setupRealtime();
        this.setupDecoder();
        this.setupExercise();
        this.setupScheduler();
        
        // Load settings from localStorage
        this.loadSettings();
        
        // Start scheduler check
        this.checkScheduledTasks();
        
        this.updateStatus('Ready to use Morser!');
    }

    setupControls() {
        // Language selector
        document.getElementById('language-select').addEventListener('change', (e) => {
            morseData.setLanguage(e.target.value);
            this.saveSettings();
            this.updateStatus(`Language changed to ${e.target.options[e.target.selectedIndex].text}`);
        });

        // Sound mode
        document.getElementById('sound-mode').addEventListener('change', (e) => {
            morseAudio.setSoundMode(e.target.value);
            this.saveSettings();
            this.updateSoundModeUI(e.target.value);
            this.updateStatus(`Sound mode: ${e.target.options[e.target.selectedIndex].text}`);
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
        
        if (mode === 'synth') {
            pitchControl.style.display = 'block';
            synthOptions.style.display = 'block';
        } else {
            pitchControl.style.display = 'none';
            synthOptions.style.display = 'none';
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

        // Decoder
        document.getElementById('decoder-btn').addEventListener('click', () => {
            this.openModal('decoder-modal');
        });

        document.getElementById('close-decoder-btn').addEventListener('click', () => {
            this.closeModal('decoder-modal');
        });

        // Exercise
        document.getElementById('exercise-btn').addEventListener('click', () => {
            this.openModal('exercise-modal');
        });

        document.getElementById('close-exercise-btn').addEventListener('click', () => {
            this.closeModal('exercise-modal');
        });

        // Scheduler
        document.getElementById('scheduler-btn').addEventListener('click', () => {
            this.openModal('scheduler-modal');
            this.displayScheduledTasks();
        });

        document.getElementById('close-scheduler-btn').addEventListener('click', () => {
            this.closeModal('scheduler-modal');
        });
    }

    openModal(id) {
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

        inputArea.addEventListener('keydown', async (e) => {
            const mode = inputMode.value;

            if (mode === 'keyboard') {
                // Direct character input
                if (e.key.length === 1 && !e.ctrlKey && !e.altKey) {
                    e.preventDefault();
                    const char = e.key.toLowerCase();
                    await morseAudio.playCharacter(char);
                    letterDisplay.textContent = char.toUpperCase();
                }
            } else if (mode === 'spacebar') {
                // Spacebar/arrow keying
                if (e.key === ' ' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                    e.preventDefault();
                    if (!this.keyDownTime) {
                        this.keyDownTime = Date.now();
                        
                        if (e.key === 'ArrowLeft') {
                            await morseAudio.playDot();
                        } else if (e.key === 'ArrowRight') {
                            await morseAudio.playDash();
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

            if (mode === 'spacebar' && e.key === ' ') {
                e.preventDefault();
                
                if (this.currentOscillator) {
                    this.currentOscillator.stop();
                    this.currentOscillator = null;
                    this.currentGain = null;
                }
                
                if (this.keyDownTime) {
                    const duration = Date.now() - this.keyDownTime;
                    letterDisplay.textContent = duration < 200 ? '.' : '-';
                    this.keyDownTime = null;
                }
            }
        });
    }

    setupDecoder() {
        const startBtn = document.getElementById('start-recording-btn');
        const stopBtn = document.getElementById('stop-recording-btn');
        const decodedOutput = document.getElementById('decoded-output');
        const statusDiv = document.getElementById('decoder-status');

        startBtn.addEventListener('click', () => {
            this.decoder.startRecording();
            startBtn.disabled = true;
            stopBtn.disabled = false;
            statusDiv.textContent = 'Recording... Use spacebar or arrow keys';
            decodedOutput.textContent = '';
            
            // Setup key listeners
            this.setupDecoderKeys();
        });

        stopBtn.addEventListener('click', () => {
            this.decoder.stopRecording();
            const decoded = this.decoder.decode();
            
            startBtn.disabled = false;
            stopBtn.disabled = false;
            document.getElementById('download-morse-btn').disabled = false;
            document.getElementById('download-text-btn').disabled = false;
            
            decodedOutput.textContent = decoded || 'No text decoded';
            statusDiv.textContent = `Decoded: ${decoded.length} characters`;
            
            // Remove key listeners
            this.removeDecoderKeys();
        });

        document.getElementById('download-morse-btn').addEventListener('click', () => {
            const durations = this.decoder.exportDurations();
            const blob = new Blob([JSON.stringify(durations)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'recording.morse';
            a.click();
            URL.revokeObjectURL(url);
        });

        document.getElementById('download-text-btn').addEventListener('click', () => {
            const text = this.decoder.getDecodedText();
            const blob = new Blob([text], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'decoded.txt';
            a.click();
            URL.revokeObjectURL(url);
        });
    }

    setupDecoderKeys() {
        this.decoderKeyDown = async (e) => {
            if (e.key === ' ' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                e.preventDefault();
                
                if (!this.keyDownTime) {
                    this.keyDownTime = Date.now();
                    
                    // Add pause since last key if exists
                    if (this.lastKeyUpTime) {
                        const pause = this.keyDownTime - this.lastKeyUpTime;
                        this.decoder.addPause(pause);
                    }
                }
            }
        };

        this.decoderKeyUp = (e) => {
            if (e.key === ' ' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                e.preventDefault();
                
                if (this.keyDownTime) {
                    const duration = Date.now() - this.keyDownTime;
                    this.decoder.addBeep(duration);
                    this.lastKeyUpTime = Date.now();
                    this.keyDownTime = null;
                    
                    // Decode after 500ms pause
                    clearTimeout(this.decodeTimeout);
                    this.decodeTimeout = setTimeout(() => {
                        const decoded = this.decoder.decode();
                        document.getElementById('decoded-output').textContent = decoded;
                    }, 500);
                }
            }
        };

        document.addEventListener('keydown', this.decoderKeyDown);
        document.addEventListener('keyup', this.decoderKeyUp);
    }

    removeDecoderKeys() {
        if (this.decoderKeyDown) {
            document.removeEventListener('keydown', this.decoderKeyDown);
        }
        if (this.decoderKeyUp) {
            document.removeEventListener('keyup', this.decoderKeyUp);
        }
    }

    setupExercise() {
        document.getElementById('start-exercise-btn').addEventListener('click', () => {
            this.startExercise();
        });

        document.getElementById('stop-exercise-btn').addEventListener('click', () => {
            this.stopExercise();
        });

        document.getElementById('exercise-input').addEventListener('input', (e) => {
            if (this.exerciseActive) {
                this.checkExerciseInput(e.target.value);
            }
        });
    }

    async startExercise() {
        const lettersPerGroup = parseInt(document.getElementById('letters-per-group').value);
        
        this.exerciseChars = morseData.getRandomGroup(lettersPerGroup, true, false);
        this.exerciseStartTime = Date.now();
        this.exerciseMistakes = 0;
        this.exerciseActive = true;
        
        document.getElementById('start-exercise-btn').disabled = true;
        document.getElementById('stop-exercise-btn').disabled = false;
        document.getElementById('exercise-input-area').hidden = false;
        document.getElementById('exercise-input').value = '';
        document.getElementById('exercise-results').textContent = '';
        
        // Play the morse
        await morseAudio.playText(this.exerciseChars);
        
        document.getElementById('exercise-input').focus();
    }

    checkExerciseInput(input) {
        const expected = this.exerciseChars.substring(0, input.length);
        if (input !== expected) {
            this.exerciseMistakes++;
        }
        
        if (input.length >= this.exerciseChars.length) {
            this.stopExercise();
        }
    }

    stopExercise() {
        if (!this.exerciseActive) return;
        
        const duration = (Date.now() - this.exerciseStartTime) / 1000;
        const input = document.getElementById('exercise-input').value;
        const accuracy = ((this.exerciseChars.length - this.exerciseMistakes) / this.exerciseChars.length * 100).toFixed(1);
        
        this.exerciseActive = false;
        
        document.getElementById('start-exercise-btn').disabled = false;
        document.getElementById('stop-exercise-btn').disabled = true;
        
        const results = `
            Expected: ${this.exerciseChars}
            You typed: ${input}
            Time: ${duration.toFixed(1)}s
            Mistakes: ${this.exerciseMistakes}
            Accuracy: ${accuracy}%
        `;
        
        document.getElementById('exercise-results').textContent = results;
    }

    setupScheduler() {
        document.getElementById('add-schedule-btn').addEventListener('click', () => {
            this.addScheduledTask();
        });
    }

    addScheduledTask() {
        const timeStr = document.getElementById('schedule-time').value;
        const text = document.getElementById('schedule-text').value;
        
        if (!timeStr || !text) return;
        
        const parts = timeStr.split(':');
        if (parts.length !== 3) {
            alert('Invalid time format. Use HH:MM:SS');
            return;
        }
        
        const task = {
            id: Date.now(),
            hour: parseInt(parts[0]),
            minute: parseInt(parts[1]),
            second: parseInt(parts[2]),
            text: text,
            enabled: true
        };
        
        this.scheduledTasks.push(task);
        this.saveScheduledTasks();
        this.displayScheduledTasks();
        
        document.getElementById('schedule-time').value = '';
        document.getElementById('schedule-text').value = '';
    }

    displayScheduledTasks() {
        const list = document.getElementById('schedules');
        list.innerHTML = '';
        
        this.scheduledTasks.forEach(task => {
            const li = document.createElement('li');
            li.textContent = `${task.hour}:${task.minute}:${task.second} - ${task.text}`;
            
            const removeBtn = document.createElement('button');
            removeBtn.textContent = 'Remove';
            removeBtn.addEventListener('click', () => {
                this.scheduledTasks = this.scheduledTasks.filter(t => t.id !== task.id);
                this.saveScheduledTasks();
                this.displayScheduledTasks();
            });
            
            li.appendChild(removeBtn);
            list.appendChild(li);
        });
    }

    checkScheduledTasks() {
        setInterval(() => {
            const now = new Date();
            const currentHour = now.getHours();
            const currentMinute = now.getMinutes();
            const currentSecond = now.getSeconds();
            
            this.scheduledTasks.forEach(async task => {
                if (task.enabled && 
                    task.hour === currentHour && 
                    task.minute === currentMinute && 
                    task.second === currentSecond) {
                    
                    task.enabled = false; // Prevent repeated firing
                    await morseAudio.playText(task.text);
                    
                    setTimeout(() => {
                        task.enabled = true;
                    }, 1000);
                }
            });
        }, 1000);
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

    saveScheduledTasks() {
        localStorage.setItem('morser-scheduled', JSON.stringify(this.scheduledTasks));
    }

    loadScheduledTasks() {
        const saved = localStorage.getItem('morser-scheduled');
        if (saved) {
            try {
                this.scheduledTasks = JSON.parse(saved);
            } catch (error) {
                console.error('Failed to load scheduled tasks:', error);
            }
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
