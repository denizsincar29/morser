// ─── Morser App — main application logic ────────────────────────────────────
// Bugs fixed vs Copilot original:
//  1. downloadAudio wrote .txt content to a file named .wav — now generates real WAV
//  2. playMorsePattern double-counted intraChar gap after dots/dashes AND at spaces
//  3. spacebar keying had the oscillator leak: keydown guard used `!this.keyDownTime`
//     but keyDownTime was never reset on repeat-key; added `this.currentOscillator` guard
//  4. exercise timer fired finishExercise even when already stopped (double-fire)
//  5. checkAndNextExercise called playNextGroup even after exercise stopped
//  6. modal.querySelector('.modal-content').focus() — modal-content isn't focusable by default
//  7. loadSettings ignored errors silently but left UI in broken state on bad JSON
//  8. textToMorse produced double-spaces between words; now normalised correctly

class MorserApp {
    constructor() {
        this.decoder = new MorseDecoder();
        this.keyDownTime = null;
        this.currentOscillator = null;
        this.exerciseActive = false;
        this.exerciseGroups = [];
        this.currentGroup = '';
        this.exerciseTimer = null;
        this.typedBuffer = '';  // for keyboard mode display

        this.init();
    }

    async init() {
        await morseData.loadAllLanguages();
        this.setupControls();
        this.setupPanels();
        this.setupTranslate();
        this.setupRealtime();
        this.setupExercise();
        this.loadSettings();
        this.setStatus('Ready');
    }

    // ── Status ─────────────────────────────────────────────────────────────────

    setStatus(msg, type = '') {
        const bar = document.getElementById('status-bar');
        bar.textContent = msg;
        bar.className = type;
        document.getElementById('status-message').textContent = msg;
    }

    // ── Settings ───────────────────────────────────────────────────────────────

    setupControls() {
        document.getElementById('language-select').addEventListener('change', e => {
            morseData.setLanguage(e.target.value);
            this.saveSettings();
        });

        document.getElementById('sound-mode').addEventListener('change', e => {
            morseAudio.setSoundMode(e.target.value);
            this.updateSoundModeUI(e.target.value);
            this.saveSettings();
        });

        document.getElementById('speed-slider').addEventListener('input', e => {
            const wpm = parseInt(e.target.value);
            document.getElementById('speed-value').textContent = wpm;
            morseAudio.setWPM(wpm);
            this.saveSettings();
        });

        document.getElementById('pitch-slider').addEventListener('input', e => {
            const hz = parseInt(e.target.value);
            document.getElementById('pitch-value').textContent = hz;
            morseAudio.setPitch(hz);
            this.saveSettings();
        });

        document.getElementById('use-start-end').addEventListener('change', e => {
            morseAudio.setUseStartEnd(e.target.checked);
            this.saveSettings();
        });

        document.getElementById('silent-beep').addEventListener('change', e => {
            morseAudio.setSilentBeep(e.target.checked);
            this.saveSettings();
        });
    }

    updateSoundModeUI(mode) {
        const pitchControl = document.getElementById('pitch-control');
        const synthOptions = document.getElementById('synth-options');
        const speedControl = document.getElementById('speed-control');

        if (mode === 'synth') {
            pitchControl.style.display = '';
            synthOptions.style.display = '';
            speedControl.style.display = '';
            if (this._savedSynthWPM) {
                morseAudio.setWPM(this._savedSynthWPM);
                document.getElementById('speed-slider').value = this._savedSynthWPM;
                document.getElementById('speed-value').textContent = this._savedSynthWPM;
            }
        } else {
            if (morseAudio.soundMode === 'synth') this._savedSynthWPM = morseAudio.wpm;
            pitchControl.style.display = 'none';
            synthOptions.style.display = 'none';
            // Speed slider stays but is read-only indication
            const fixedWPM = mode === 'telegraph' ? 26 : 14;
            document.getElementById('speed-value').textContent = fixedWPM;
        }
    }

    saveSettings() {
        try {
            localStorage.setItem('morser-settings', JSON.stringify({
                language:    morseData.currentLanguage,
                soundMode:   morseAudio.soundMode,
                wpm:         morseAudio.wpm,
                pitch:       morseAudio.pitch,
                useStartEnd: morseAudio.useStartEnd,
                silentBeep:  morseAudio.silentBeep,
            }));
        } catch (e) { /* storage disabled in some contexts */ }
    }

    loadSettings() {
        let settings;
        try {
            const raw = localStorage.getItem('morser-settings');
            if (!raw) return;
            settings = JSON.parse(raw);
        } catch (e) {
            // Bad JSON — wipe and start fresh
            try { localStorage.removeItem('morser-settings'); } catch {}
            return;
        }

        if (settings.language && morseData.languages[settings.language]) {
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
    }

    // ── Panel management ───────────────────────────────────────────────────────

    setupPanels() {
        const panels = {
            'translate-btn':  'translate-panel',
            'realtime-btn':   'realtime-panel',
            'exercise-btn':   'exercise-panel',
            'together-btn':   'together-panel',
        };

        for (const [btnId, panelId] of Object.entries(panels)) {
            document.getElementById(btnId).addEventListener('click', () => {
                this.togglePanel(panelId, btnId);
            });
        }

        // Close buttons
        document.querySelectorAll('.close-btn[data-closes]').forEach(btn => {
            btn.addEventListener('click', () => {
                const panelId = btn.getAttribute('data-closes');
                this.closePanel(panelId);
                // Find associated mode-btn
                const entry = Object.entries(panels).find(([, pid]) => pid === panelId);
                if (entry) document.getElementById(entry[0]).setAttribute('aria-expanded', 'false');
            });
        });
    }

    togglePanel(panelId, btnId) {
        const panel = document.getElementById(panelId);
        const btn   = document.getElementById(btnId);
        const isOpen = !panel.hidden;

        if (isOpen) {
            this.closePanel(panelId);
            btn.setAttribute('aria-expanded', 'false');
        } else {
            // Close all others
            document.querySelectorAll('.panel').forEach(p => { p.hidden = true; });
            document.querySelectorAll('.mode-card').forEach(b => b.setAttribute('aria-expanded', 'false'));
            panel.hidden = false;
            btn.setAttribute('aria-expanded', 'true');
            // Focus first focusable element in panel
            setTimeout(() => {
                const first = panel.querySelector('textarea, input, select, button:not(.close-btn)');
                first?.focus();
            }, 80);
        }
    }

    closePanel(panelId) {
        document.getElementById(panelId).hidden = true;
    }

    // ── Text → Morse ────────────────────────────────────────────────────────────

    setupTranslate() {
        document.getElementById('generate-morse-btn').addEventListener('click', () => this.playMorse());
        document.getElementById('stop-morse-btn').addEventListener('click', () => this.stopMorse());
        document.getElementById('download-audio-btn').addEventListener('click', () => this.downloadWAV());

        // Keyboard shortcut: Enter in textarea
        document.getElementById('translate-text').addEventListener('keydown', e => {
            if (e.key === 'Enter' && e.ctrlKey) { e.preventDefault(); this.playMorse(); }
        });
    }

    async playMorse() {
        const text = document.getElementById('translate-text').value.trim();
        if (!text) { this.setStatus('Enter some text first', 'warn'); return; }

        const morse = morseData.textToMorse(text);
        document.getElementById('morse-output').textContent = morse;

        document.getElementById('generate-morse-btn').disabled = true;
        document.getElementById('stop-morse-btn').disabled = false;
        document.getElementById('play-progress').hidden = false;
        document.getElementById('play-progress-bar').style.width = '0%';

        this.setStatus('Playing…');
        morseAudio.stopPlayback();
        morseAudio.playbackStopped = false;

        try {
            await morseAudio.playText(text, pct => {
                document.getElementById('play-progress-bar').style.width = `${pct}%`;
            });
        } catch {}

        document.getElementById('generate-morse-btn').disabled = false;
        document.getElementById('stop-morse-btn').disabled = true;
        document.getElementById('download-audio-btn').disabled = false;
        document.getElementById('play-progress-bar').style.width = '100%';
        this.setStatus('Done playing', 'ok');
    }

    stopMorse() {
        morseAudio.stopPlayback();
        document.getElementById('generate-morse-btn').disabled = false;
        document.getElementById('stop-morse-btn').disabled = true;
        this.setStatus('Stopped');
    }

    downloadWAV() {
        const text = document.getElementById('translate-text').value.trim();
        if (!text) { this.setStatus('No text to download', 'warn'); return; }
        const wav = morseAudio.generateWAVBuffer(text);
        const blob = new Blob([wav], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'morse.wav'; a.click();
        URL.revokeObjectURL(url);
        this.setStatus('WAV downloaded', 'ok');
    }

    // ── Real-time input ─────────────────────────────────────────────────────────

    setupRealtime() {
        const inputArea   = document.getElementById('morse-input-area');
        const letterDisp  = document.getElementById('letter-display');
        const typedOut    = document.getElementById('typed-output');
        const inputMode   = document.getElementById('input-mode');
        const decoderCtrl = document.getElementById('decoder-controls');
        const hintBox     = document.getElementById('key-hint');

        const modeHints = {
            keyboard: '<strong>Keyboard mode:</strong> Just type — each letter is played in morse.<br>Press <kbd>Backspace</kbd> to clear.',
            spacebar: '<strong>Spacebar mode:</strong> Hold <kbd>Space</kbd> — short = dot, long = dash.<br><kbd>←</kbd> forces dot, <kbd>→</kbd> forces dash. <kbd>Enter</kbd> submits letter.',
            decoder:  '<strong>Decoder mode:</strong> Record your keying then decode it using K-means.<br>Press ⏺ Record, then key with <kbd>Space</kbd>.',
        };

        inputMode.addEventListener('change', e => {
            const mode = e.target.value;
            decoderCtrl.hidden = mode !== 'decoder';
            hintBox.innerHTML = modeHints[mode] || '';
            letterDisp.textContent = '';
            typedOut.textContent = '';
            this.typedBuffer = '';
        });

        // Record/stop buttons
        document.getElementById('start-recording-btn').addEventListener('click', () => this.startDecoding());
        document.getElementById('stop-recording-btn').addEventListener('click',  () => this.stopDecoding());
        document.getElementById('clear-recording-btn').addEventListener('click', () => {
            this.decoder.startRecording();
            document.getElementById('decoded-output').textContent = '';
            document.getElementById('decoder-download-row').hidden = true;
            document.getElementById('stop-recording-btn').disabled = true;
            document.getElementById('clear-recording-btn').disabled = true;
        });

        document.getElementById('download-morse-btn').addEventListener('click', () => {
            const blob = new Blob([JSON.stringify(this.decoder.exportDurations())], { type: 'application/json' });
            const url = URL.createObjectURL(blob); const a = document.createElement('a');
            a.href = url; a.download = 'recording.morse'; a.click(); URL.revokeObjectURL(url);
        });
        document.getElementById('download-decoded-btn').addEventListener('click', () => {
            const text = this.decoder.getDecodedText();
            const blob = new Blob([text], { type: 'text/plain' });
            const url = URL.createObjectURL(blob); const a = document.createElement('a');
            a.href = url; a.download = 'decoded.txt'; a.click(); URL.revokeObjectURL(url);
        });

        // ── Keyboard events ──────────────────────────────────────────────────
        inputArea.addEventListener('keydown', async e => {
            const mode = inputMode.value;

            if (mode === 'keyboard') {
                if (e.key === 'Backspace') {
                    e.preventDefault();
                    this.typedBuffer = this.typedBuffer.slice(0, -1);
                    typedOut.textContent = this.typedBuffer;
                    return;
                }
                if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
                    e.preventDefault();
                    const char = e.key.toLowerCase();
                    if (morseData.charToMorse[char]) {
                        this.typedBuffer += char;
                        typedOut.textContent = this.typedBuffer;
                        letterDisp.textContent = char.toUpperCase();
                        await morseAudio.playCharacter(char);
                    }
                }
                return;
            }

            // spacebar / decoder modes
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                letterDisp.textContent = '·';
                await morseAudio.playDot();
                return;
            }
            if (e.key === 'ArrowRight') {
                e.preventDefault();
                letterDisp.textContent = '—';
                await morseAudio.playDash();
                return;
            }
            if (e.key === ' ') {
                e.preventDefault();
                // BUG FIX: guard against repeat keydown with already-active oscillator
                if (this.currentOscillator) return;
                if (!this.keyDownTime) {
                    this.keyDownTime = Date.now();

                    if (mode === 'decoder' && this.isDecoderRecording && this.lastKeyUpTime) {
                        this.decoder.addPause(this.keyDownTime - this.lastKeyUpTime);
                    }

                    morseAudio.initAudioContext();
                    const osc  = morseAudio.audioContext.createOscillator();
                    const gain = morseAudio.audioContext.createGain();
                    osc.type = 'sine';
                    osc.frequency.value = morseAudio.pitch;
                    osc.connect(gain);
                    gain.connect(morseAudio.audioContext.destination);
                    gain.gain.setValueAtTime(0, morseAudio.audioContext.currentTime);
                    gain.gain.linearRampToValueAtTime(0.3, morseAudio.audioContext.currentTime + 0.005);
                    osc.start();
                    this.currentOscillator = osc;
                    this.currentGain = gain;
                    inputArea.classList.add('keying');
                }
            }
        });

        inputArea.addEventListener('keyup', e => {
            const mode = inputMode.value;
            if (e.key === ' ' && (mode === 'spacebar' || mode === 'decoder')) {
                e.preventDefault();
                this._stopSpacebar(mode, letterDisp);
            }
        });

        // Touch / pointer for mobile
        inputArea.addEventListener('pointerdown', e => {
            const mode = inputMode.value;
            if (mode === 'spacebar' || mode === 'decoder') {
                e.preventDefault();
                inputArea.focus();
                if (!this.keyDownTime && !this.currentOscillator) {
                    this.keyDownTime = Date.now();
                    morseAudio.initAudioContext();
                    const osc  = morseAudio.audioContext.createOscillator();
                    const gain = morseAudio.audioContext.createGain();
                    osc.type = 'sine'; osc.frequency.value = morseAudio.pitch;
                    osc.connect(gain); gain.connect(morseAudio.audioContext.destination);
                    gain.gain.setValueAtTime(0, morseAudio.audioContext.currentTime);
                    gain.gain.linearRampToValueAtTime(0.3, morseAudio.audioContext.currentTime + 0.005);
                    osc.start();
                    this.currentOscillator = osc; this.currentGain = gain;
                    inputArea.classList.add('keying');
                }
            }
        });
        inputArea.addEventListener('pointerup', e => {
            const mode = inputMode.value;
            if (mode === 'spacebar' || mode === 'decoder') {
                e.preventDefault();
                this._stopSpacebar(mode, letterDisp);
            }
        });
    }

    _stopSpacebar(mode, letterDisp) {
        if (this.currentOscillator) {
            const ctx = morseAudio.audioContext;
            this.currentGain.gain.setValueAtTime(0.3, ctx.currentTime);
            this.currentGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.005);
            this.currentOscillator.stop(ctx.currentTime + 0.01);
            this.currentOscillator = null;
            this.currentGain = null;
        }
        document.getElementById('morse-input-area').classList.remove('keying');

        if (!this.keyDownTime) return;
        const duration = Date.now() - this.keyDownTime;
        this.keyDownTime = null;

        if (mode === 'spacebar') {
            const isDot = duration < 200;
            letterDisp.textContent = isDot ? '·' : '—';
        } else if (mode === 'decoder' && this.isDecoderRecording) {
            this.decoder.addBeep(duration);
            this.lastKeyUpTime = Date.now();
            clearTimeout(this._decodeTimeout);
            this._decodeTimeout = setTimeout(() => {
                const decoded = this.decoder.decode();
                document.getElementById('decoded-output').textContent = decoded;
            }, 500);
        }
    }

    startDecoding() {
        this.decoder.startRecording();
        this.isDecoderRecording = true;
        this.lastKeyUpTime = null;
        document.getElementById('start-recording-btn').disabled = true;
        document.getElementById('stop-recording-btn').disabled = false;
        document.getElementById('clear-recording-btn').disabled = false;
        document.getElementById('decoded-output').textContent = '';
        document.getElementById('decoder-download-row').hidden = true;
        this.setStatus('Recording — key with spacebar', 'warn');
    }

    stopDecoding() {
        this.decoder.stopRecording();
        this.isDecoderRecording = false;
        const decoded = this.decoder.decode();
        document.getElementById('decoded-output').textContent = decoded || '(nothing decoded)';
        document.getElementById('start-recording-btn').disabled = false;
        document.getElementById('stop-recording-btn').disabled = true;
        document.getElementById('decoder-download-row').hidden = false;
        this.setStatus(`Decoded ${decoded.length} characters`, 'ok');
    }

    // ── Exercise ────────────────────────────────────────────────────────────────

    setupExercise() {
        document.getElementById('start-exercise-btn').addEventListener('click',  () => this.startExercise());
        document.getElementById('stop-exercise-btn').addEventListener('click',   () => this.stopExercise());
        document.getElementById('repeat-group-btn').addEventListener('click',    () => this.repeatGroup());

        document.getElementById('exercise-input').addEventListener('input', e => {
            if (!this.exerciseActive) return;
            if (e.target.value.length >= (this.currentGroup?.length || Infinity)) {
                setTimeout(() => {
                    if (this.exerciseActive && document.getElementById('exercise-input').value.length >= (this.currentGroup?.length || 0)) {
                        this.checkAndNext();
                    }
                }, 400);
            }
        });
    }

    async startExercise() {
        const lpg = parseInt(document.getElementById('letters-per-group').value) || 5;
        const dur = parseInt(document.getElementById('exercise-duration').value) || 60;

        this.exerciseActive = true;
        this.exerciseGroups = [];
        this.exerciseStartTime = Date.now();
        this._exerciseDuration = dur;

        document.getElementById('start-exercise-btn').disabled = true;
        document.getElementById('stop-exercise-btn').disabled = false;
        document.getElementById('repeat-group-btn').disabled = false;
        document.getElementById('exercise-input-area').hidden = false;
        document.getElementById('exercise-timer-display').hidden = false;
        document.getElementById('exercise-feedback').textContent = '';
        document.getElementById('exercise-results').textContent = '';
        document.getElementById('exercise-input').value = '';

        this._updateExerciseTimer(dur);
        this.exerciseTimer = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.exerciseStartTime) / 1000);
            const remaining = Math.max(0, dur - elapsed);
            this._updateExerciseTimer(remaining);
            if (remaining <= 0) this.finishExercise();
        }, 500);

        await this.playNextGroup(lpg);
    }

    _updateExerciseTimer(seconds) {
        document.getElementById('exercise-timer').textContent = seconds;
    }

    async playNextGroup(lpg) {
        if (!this.exerciseActive) return;
        const chars = morseData.getRandomGroup(lpg, true, false);
        this.currentGroup = chars;
        this.setStatus(`Listen: ${chars.length} characters`, 'warn');
        await morseAudio.playText(chars);
        if (this.exerciseActive) document.getElementById('exercise-input').focus();
    }

    repeatGroup() {
        if (!this.exerciseActive || !this.currentGroup) return;
        morseAudio.playText(this.currentGroup);
    }

    async checkAndNext() {
        if (!this.exerciseActive) return;
        const input    = document.getElementById('exercise-input').value.trim().toLowerCase();
        const expected = (this.currentGroup || '').toLowerCase();

        let mistakes = 0;
        for (let i = 0; i < Math.max(input.length, expected.length); i++) {
            if (input[i] !== expected[i]) mistakes++;
        }
        const accuracy = expected.length
            ? Math.round(((expected.length - mistakes) / expected.length) * 100)
            : 0;

        this.exerciseGroups.push({ expected, typed: input, mistakes, accuracy });

        const fb = document.getElementById('exercise-feedback');
        if (mistakes === 0) {
            fb.textContent = '✓ Perfect!'; fb.className = 'exercise-feedback good';
        } else {
            fb.textContent = `✗ ${mistakes} error${mistakes > 1 ? 's' : ''}  (${accuracy}%)`;
            fb.className = 'exercise-feedback bad';
        }

        document.getElementById('exercise-input').value = '';
        const lpg = parseInt(document.getElementById('letters-per-group').value) || 5;
        // BUG FIX: guard exerciseActive BEFORE awaiting audio
        if (this.exerciseActive) await this.playNextGroup(lpg);
    }

    finishExercise() {
        if (!this.exerciseActive) return;   // BUG FIX: prevent double-fire
        this.exerciseActive = false;
        clearInterval(this.exerciseTimer);
        this.exerciseTimer = null;

        document.getElementById('start-exercise-btn').disabled = false;
        document.getElementById('stop-exercise-btn').disabled = true;
        document.getElementById('repeat-group-btn').disabled = true;
        document.getElementById('exercise-input-area').hidden = true;
        document.getElementById('exercise-timer-display').hidden = true;
        document.getElementById('exercise-feedback').textContent = '';

        const total   = this.exerciseGroups.length;
        const errors  = this.exerciseGroups.reduce((s, g) => s + g.mistakes, 0);
        const avgAcc  = total ? (this.exerciseGroups.reduce((s, g) => s + g.accuracy, 0) / total).toFixed(1) : 0;

        let out = `=== Exercise complete ===\n`;
        out += `Groups: ${total}  ·  Errors: ${errors}  ·  Avg accuracy: ${avgAcc}%\n\n`;
        this.exerciseGroups.forEach((g, i) => {
            const mark = g.mistakes === 0 ? '✓' : '✗';
            out += `${mark} ${String(i + 1).padStart(2)}. Expected "${g.expected}"  typed "${g.typed}"  ${g.accuracy}%\n`;
        });

        document.getElementById('exercise-results').textContent = out;
        this.setStatus(`Finished — ${avgAcc}% average accuracy`, 'ok');
    }

    stopExercise() { this.finishExercise(); }
}

// ── Boot ────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => { window.morserApp = new MorserApp(); });
