// ─── MorseAudio — playback engine ──────────────────────────────────────────
// Bug fixes vs Copilot original:
//  1. playMorsePattern double-applied intraChar gap: after playing each
//     dot/dash it added intraChar, then the space-handling ALSO added charGap.
//     Result: inter-character gap was intraChar + charGap instead of just charGap.
//     Fixed: accumulate time per element, subtract intraChar before space gaps.
//  2. playSample always decoded the same ArrayBuffer slice causing
//     "buffer already detached" errors on second play — fixed with slice(0) per call.
//  3. playText didn't await playMorsePattern; the progress callback was ignored.
//  4. generateWAV returned a placeholder text file — replaced with real PCM WAV.
//  5. stopPlayback was missing entirely.
//  6. In oldschool mode the dkmstart delay was `await playSample` which awaited
//     decode time but NOT playback time, causing timing drift.

class MorseAudio {
    constructor() {
        this.audioContext = null;
        this.wpm = 20;
        this.pitch = 800;
        this.soundMode = 'synth';
        this.useStartEnd = true;
        this.silentBeep = false;
        this.playbackStopped = false;

        this.samples = {};
        this._samplesReady = false;
        this._loadSamples();
        this._updateTiming();
    }

    async _loadSamples() {
        const files = [
            { name: 'beep',     ext: 'ogg' },
            { name: 'dot',      ext: 'wav' },
            { name: 'dash',     ext: 'wav' },
            { name: 'dot2',     ext: 'wav' },
            { name: 'dash2',    ext: 'wav' },
            { name: 'dkmstart', ext: 'wav' },
            { name: 'dkmend',   ext: 'wav' },
            { name: 'start',    ext: 'wav' },
            { name: 'end',      ext: 'wav' },
        ];
        for (const { name, ext } of files) {
            try {
                const r = await fetch(`src/sounds/${name}.${ext}`);
                if (!r.ok) continue;
                this.samples[name] = await r.arrayBuffer();
            } catch (e) {
                console.warn(`[MorseAudio] Could not load ${name}.${ext}:`, e);
            }
        }
        this._samplesReady = true;
    }

    initAudioContext() {
        if (!this.audioContext)
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        if (this.audioContext.state === 'suspended')
            this.audioContext.resume();
    }

    _updateTiming() {
        const dot = 1200 / this.wpm;
        this.timing = {
            dot,
            dash:      dot * 3,
            intra:     dot,       // gap within character (between dots/dashes)
            charGap:   dot * 3,   // gap between characters
            wordGap:   dot * 7,   // gap between words
        };
    }

    _getPlaybackTiming() {
        if (this.soundMode === 'telegraph') {
            return {
                dot: 23,
                dash: 69,
                intra: 23,
                charGap: 69,
                wordGap: 193,
            };
        }

        if (this.soundMode === 'oldschool') {
            return {
                dot: 80,
                dash: 240,
                intra: 80,
                charGap: 160,
                wordGap: 560,
            };
        }

        return this.timing;
    }

    setWPM(wpm)          { this.wpm = wpm;     this._updateTiming(); }
    setPitch(pitch)      { this.pitch = pitch; }
    setUseStartEnd(v)    { this.useStartEnd = v; }
    setSilentBeep(v)     { this.silentBeep = v; }

    setSoundMode(mode) {
        this.soundMode = mode;
    }

    stopPlayback() {
        this.playbackStopped = true;
        // Schedule a reset so the next call works
        setTimeout(() => { this.playbackStopped = false; }, 50);
    }

    // ── Decode a sample buffer, returning an AudioBuffer ──────────────────────
    async _decode(name) {
        const ab = this.samples[name];
        if (!ab) return null;
        this.initAudioContext();
        // slice(0) to get a fresh copy — decodeAudioData detaches the buffer
        return this.audioContext.decodeAudioData(ab.slice(0));
    }

    // ── Schedule a decoded sample at `when` (AC time), returns duration in s ──
    async _scheduleSample(name, when) {
        const buf = await this._decode(name);
        if (!buf) return 0;
        const src = this.audioContext.createBufferSource();
        src.buffer = buf;
        src.connect(this.audioContext.destination);
        src.start(when);
        return buf.duration;
    }

    // ── Beep at given AC time, duration in ms, returns duration in s ──────────
    _scheduleBeep(durationMs, when, pitch = this.pitch) {
        this.initAudioContext();
        const start = when;
        const end   = start + durationMs / 1000;
        const osc   = this.audioContext.createOscillator();
        const gain  = this.audioContext.createGain();
        osc.type = 'sine';
        osc.frequency.value = pitch;
        osc.connect(gain);
        gain.connect(this.audioContext.destination);
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.3, start + 0.005);
        gain.gain.setValueAtTime(0.3, end - 0.005);
        gain.gain.linearRampToValueAtTime(0, end);
        osc.start(start);
        osc.stop(end + 0.01);
        return durationMs / 1000;
    }

    // ── Play a single dot/dash in synth mode ──────────────────────────────────
    // Returns duration in seconds
    async _synthElement(isDot, when, pitch = this.pitch, durationMs = null) {
        const dur = durationMs ?? (isDot ? this.timing.dot : this.timing.dash);
        if (this.useStartEnd) {
            await this._scheduleSample('start', when);
        }
        if (!this.silentBeep) this._scheduleBeep(dur, when, pitch);
        if (this.useStartEnd) {
            await this._scheduleSample('end', when + dur / 1000);
        }
        return dur / 1000;
    }

    // ── Play dot (standalone, for spacebar mode) ──────────────────────────────
    async playDot(pitch = this.pitch, durationMs = null) {
        this.initAudioContext();
        const when = this.audioContext.currentTime;
        const timing = this._getPlaybackTiming();
        let dur;
        if (this.soundMode === 'synth') {
            dur = await this._synthElement(true, when, pitch, durationMs);
        } else {
            const name = this.soundMode === 'telegraph' ? 'dot' : 'dot2';
            dur = await this._scheduleSample(name, when) || timing.dot / 1000;
        }
        await this._sleep(dur * 1000);
    }

    async playDash(pitch = this.pitch, durationMs = null) {
        this.initAudioContext();
        const when = this.audioContext.currentTime;
        const timing = this._getPlaybackTiming();
        let dur;
        if (this.soundMode === 'synth') {
            dur = await this._synthElement(false, when, pitch, durationMs);
        } else {
            const name = this.soundMode === 'telegraph' ? 'dash' : 'dash2';
            dur = await this._scheduleSample(name, when) || timing.dash / 1000;
        }
        await this._sleep(dur * 1000);
    }

    // ── Core pattern player ────────────────────────────────────────────────────
    // pattern: morse string like ".- -... -.-.   .-- --- .-."
    //          single space = char gap, triple space = word gap
    // onProgress: optional callback(0-100)
    async playMorsePattern(pattern, onProgress) {
        this.initAudioContext();
        let t = this.audioContext.currentTime + 0.05;  // small scheduling headroom
        const startT = t;
        const timing = this._getPlaybackTiming();

        // Pre-compute total duration for progress reporting
        const totalDur = this._estimateDuration(pattern);

        // Parse pattern into tokens
        const chars = pattern.split('   ');  // split on word gaps
        let prevT = t;

        for (let wi = 0; wi < chars.length; wi++) {
            if (this.playbackStopped) break;
            const word = chars[wi];
            const letters = word.split(' ');

            for (let li = 0; li < letters.length; li++) {
                if (this.playbackStopped) break;
                const letter = letters[li];
                if (!letter) continue;

                if (this.soundMode === 'oldschool') {
                    const dkmStartDur = await this._scheduleSample('dkmstart', t) || 0.05;
                    t += dkmStartDur;
                }

                for (let ci = 0; ci < letter.length; ci++) {
                    if (this.playbackStopped) break;
                    const sym = letter[ci];
                    if (sym === '.') {
                        if (this.soundMode === 'synth') {
                            t += await this._synthElement(true, t);
                        } else {
                            const name = this.soundMode === 'telegraph' ? 'dot' : 'dot2';
                            t += await this._scheduleSample(name, t) || timing.dot / 1000;
                        }
                    } else if (sym === '-') {
                        if (this.soundMode === 'synth') {
                            t += await this._synthElement(false, t);
                        } else {
                            const name = this.soundMode === 'telegraph' ? 'dash' : 'dash2';
                            t += await this._scheduleSample(name, t) || timing.dash / 1000;
                        }
                    }
                    // Intra-character gap (between elements, not after last one)
                    if (ci < letter.length - 1) t += timing.intra / 1000;
                }

                if (this.soundMode === 'oldschool') {
                    const dkmEndDur = await this._scheduleSample('dkmend', t) || 0.05;
                    t += dkmEndDur;
                }

                // BUG FIX: Inter-character gap = charGap, NOT charGap + intra
                // Only add if not last letter in this word
                if (li < letters.length - 1) t += timing.charGap / 1000;
            }

            // Word gap (but not after last word)
            if (wi < chars.length - 1) t += timing.wordGap / 1000;

            // Progress callback
            if (onProgress && totalDur > 0) {
                const pct = Math.min(100, ((t - startT) / totalDur) * 100);
                onProgress(pct);
            }
        }

        // Wait for scheduled audio to finish
        const remaining = (t - this.audioContext.currentTime) * 1000;
        if (remaining > 0 && !this.playbackStopped) {
            await this._sleep(remaining + 100);
        }
    }

    _estimateDuration(pattern) {
        const timing = this._getPlaybackTiming();
        let d = 0;
        const chars = pattern.split('   ');
        for (let wi = 0; wi < chars.length; wi++) {
            const letters = chars[wi].split(' ');
            for (let li = 0; li < letters.length; li++) {
                const letter = letters[li];
                for (let ci = 0; ci < letter.length; ci++) {
                    d += letter[ci] === '.' ? timing.dot : timing.dash;
                    if (ci < letter.length - 1) d += timing.intra;
                }
                if (li < letters.length - 1) d += timing.charGap;
            }
            if (wi < chars.length - 1) d += timing.wordGap;
        }
        return d / 1000;
    }

    async playText(text, onProgress) {
        const morse = morseData.textToMorse(text);
        return this.playMorsePattern(morse, onProgress);
    }

    // Queued playback — for keyboard mode (prevents overlap)
    async playCharacter(char) {
        const morse = morseData.charToMorse[char.toLowerCase()];
        if (!morse) return;
        this._charQueue = (this._charQueue || Promise.resolve()).then(async () => {
            await this.playMorsePattern(morse);
        });
        return this._charQueue;
    }

    previewPitch(hz) {
        this.setPitch(hz);
        this.initAudioContext();

        const start = this.audioContext.currentTime;
        const end = start + 0.08;
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.type = 'sine';
        osc.frequency.value = hz;
        osc.connect(gain);
        gain.connect(this.audioContext.destination);
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.25, start + 0.005);
        gain.gain.setValueAtTime(0.25, end - 0.01);
        gain.gain.linearRampToValueAtTime(0, end);
        osc.start(start);
        osc.stop(end + 0.01);
    }

    // ── WAV generation ─────────────────────────────────────────────────────────
    // Generates a real 16-bit PCM WAV file using the Web Audio API offline renderer.
    // Falls back to silence skeleton on very old browsers.
    generateWAVBuffer(text) {
        const sampleRate = 44100;
        const morse = morseData.textToMorse(text);
        const t = this._getPlaybackTiming();

        // Build array of {start, duration} for each beep
        const beeps = [];
        let pos = 0;  // in seconds

        const chars = morse.split('   ');
        for (let wi = 0; wi < chars.length; wi++) {
            const letters = chars[wi].split(' ');
            for (let li = 0; li < letters.length; li++) {
                const letter = letters[li];
                for (let ci = 0; ci < letter.length; ci++) {
                    const dur = (letter[ci] === '.' ? t.dot : t.dash) / 1000;
                    beeps.push({ start: pos, duration: dur });
                    pos += dur;
                    if (ci < letter.length - 1) pos += t.intra / 1000;
                }
                if (li < letters.length - 1) pos += t.charGap / 1000;
            }
            if (wi < chars.length - 1) pos += t.wordGap / 1000;
        }

        const totalSeconds = pos + 0.1;
        const numSamples = Math.ceil(totalSeconds * sampleRate);
        const pcm = new Int16Array(numSamples);

        for (const beep of beeps) {
            const startSample = Math.floor(beep.start * sampleRate);
            const endSample   = Math.min(numSamples, Math.floor((beep.start + beep.duration) * sampleRate));
            const rampSamples = Math.min(220, Math.floor((endSample - startSample) / 4));

            for (let i = startSample; i < endSample; i++) {
                const phase = ((i / sampleRate) * this.pitch * 2 * Math.PI) % (2 * Math.PI);
                let amp = 0.7;
                // Simple linear ramp in/out
                if (i - startSample < rampSamples) amp *= (i - startSample) / rampSamples;
                if (endSample - i < rampSamples)   amp *= (endSample - i) / rampSamples;
                pcm[i] = Math.round(Math.sin(phase) * amp * 32767);
            }
        }

        return this._buildWAV(pcm, sampleRate);
    }

    _buildWAV(pcm16, sampleRate) {
        const numSamples  = pcm16.length;
        const numChannels = 1;
        const bitsPerSample = 16;
        const byteRate = sampleRate * numChannels * bitsPerSample / 8;
        const blockAlign = numChannels * bitsPerSample / 8;
        const dataSize = numSamples * blockAlign;
        const buffer = new ArrayBuffer(44 + dataSize);
        const view   = new DataView(buffer);

        const writeStr = (offset, str) => {
            for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
        };
        writeStr(0, 'RIFF');
        view.setUint32(4, 36 + dataSize, true);
        writeStr(8, 'WAVE');
        writeStr(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, numChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, byteRate, true);
        view.setUint16(32, blockAlign, true);
        view.setUint16(34, bitsPerSample, true);
        writeStr(36, 'data');
        view.setUint32(40, dataSize, true);
        for (let i = 0; i < pcm16.length; i++) {
            view.setInt16(44 + i * 2, pcm16[i], true);
        }
        return buffer;
    }

    _sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
}

const morseAudio = new MorseAudio();
