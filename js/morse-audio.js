// Morse audio generator and player
class MorseAudio {
    constructor() {
        this.audioContext = null;
        this.oscillator = null;
        this.gainNode = null;
        
        this.wpm = 20; // Words per minute
        this.pitch = 800; // Hz
        this.soundMode = 'synth'; // 'synth', 'telegraph', 'oldschool'
        this.useStartEnd = true;
        this.silentBeep = false;
        
        // Queue for sequential playback
        this.playbackQueue = Promise.resolve();
        
        // Preload samples
        this.samples = {};
        this.loadSamples();
        
        // Calculate timing
        this.updateTiming();
    }

    async loadSamples() {
        const sampleFiles = [
            'beep', 'dot', 'dash', 'dot2', 'dash2', 
            'dkmstart', 'dkmend', 'start', 'end'
        ];
        
        for (const name of sampleFiles) {
            const ext = name === 'beep' ? 'ogg' : 'wav';
            const path = `src/sounds/${name}.${ext}`;
            
            try {
                const response = await fetch(path);
                const arrayBuffer = await response.arrayBuffer();
                this.samples[name] = arrayBuffer;
            } catch (error) {
                console.error(`Failed to load ${name}:`, error);
            }
        }
    }

    initAudioContext() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        // Resume if suspended (for browser autoplay policies)
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }

    updateTiming() {
        // Standard morse timing (PARIS standard)
        const dotDuration = 1200 / this.wpm; // ms per dot
        
        this.timing = {
            dot: dotDuration,
            dash: dotDuration * 3,
            intraChar: dotDuration, // gap within character
            charGap: dotDuration * 3, // gap between characters
            wordGap: dotDuration * 7  // gap between words
        };
    }

    setWPM(wpm) {
        this.wpm = wpm;
        this.updateTiming();
    }

    setPitch(pitch) {
        this.pitch = pitch;
    }

    setSoundMode(mode) {
        this.soundMode = mode;
        
        // Set fixed WPM for telegraph modes
        if (mode === 'telegraph') {
            this.setWPM(26);
        } else if (mode === 'oldschool') {
            this.setWPM(14);
        }
    }

    setUseStartEnd(use) {
        this.useStartEnd = use;
    }

    setSilentBeep(silent) {
        this.silentBeep = silent;
    }

    async playSample(name, when = 0) {
        if (!this.samples[name]) return 0;
        
        this.initAudioContext();
        
        const audioBuffer = await this.audioContext.decodeAudioData(
            this.samples[name].slice(0)
        );
        
        const source = this.audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(this.audioContext.destination);
        source.start(when);
        
        return audioBuffer.duration;
    }

    async playBeep(duration, when = 0) {
        this.initAudioContext();
        
        const startTime = when || this.audioContext.currentTime;
        const endTime = startTime + duration / 1000;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.value = this.pitch;
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        // Envelope for smooth start/stop
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.005);
        gainNode.gain.setValueAtTime(0.3, endTime - 0.005);
        gainNode.gain.linearRampToValueAtTime(0, endTime);
        
        oscillator.start(startTime);
        oscillator.stop(endTime);
        
        return duration / 1000;
    }

    async playDot(when = 0) {
        if (this.soundMode === 'synth') {
            if (this.useStartEnd) await this.playSample('start', when);
            if (!this.silentBeep) await this.playBeep(this.timing.dot, when);
            if (this.useStartEnd) await this.playSample('end', when);
            return this.timing.dot / 1000;
        } else if (this.soundMode === 'telegraph') {
            await this.playSample('dot', when);
            return this.timing.dot / 1000;
        } else if (this.soundMode === 'oldschool') {
            await this.playSample('dot2', when);
            return this.timing.dot / 1000;
        }
    }

    async playDash(when = 0) {
        if (this.soundMode === 'synth') {
            if (this.useStartEnd) await this.playSample('start', when);
            if (!this.silentBeep) await this.playBeep(this.timing.dash, when);
            if (this.useStartEnd) await this.playSample('end', when);
            return this.timing.dash / 1000;
        } else if (this.soundMode === 'telegraph') {
            await this.playSample('dash', when);
            return this.timing.dash / 1000;
        } else if (this.soundMode === 'oldschool') {
            await this.playSample('dash2', when);
            return this.timing.dash / 1000;
        }
    }

    async playMorsePattern(pattern, useOldschoolSounds = true) {
        this.initAudioContext();
        
        let currentTime = this.audioContext.currentTime;
        
        // Split pattern into characters for oldschool mode
        if (this.soundMode === 'oldschool' && useOldschoolSounds) {
            const chars = pattern.split('   '); // Split by word spaces (triple space)
            
            for (let wordIdx = 0; wordIdx < chars.length; wordIdx++) {
                const word = chars[wordIdx];
                const letters = word.split(' '); // Split by character spaces
                
                for (let letterIdx = 0; letterIdx < letters.length; letterIdx++) {
                    const letterPattern = letters[letterIdx];
                    if (!letterPattern) continue;
                    
                    // Play dkmstart
                    await this.playSample('dkmstart', currentTime);
                    currentTime += 0.05; // Small delay for dkmstart
                    
                    // Play dots and dashes
                    for (let i = 0; i < letterPattern.length; i++) {
                        if (letterPattern[i] === '.') {
                            await this.playSample('dot2', currentTime);
                            currentTime += this.timing.dot / 1000;
                        } else if (letterPattern[i] === '-') {
                            await this.playSample('dash2', currentTime);
                            currentTime += this.timing.dash / 1000;
                        }
                        // Intra-character pause
                        if (i < letterPattern.length - 1) {
                            currentTime += this.timing.intraChar / 1000;
                        }
                    }
                    
                    // Play dkmend
                    await this.playSample('dkmend', currentTime);
                    currentTime += 0.05; // Small delay for dkmend
                    
                    // Character gap (if not last letter in word)
                    if (letterIdx < letters.length - 1) {
                        currentTime += this.timing.charGap / 1000;
                    }
                }
                
                // Word gap (if not last word)
                if (wordIdx < chars.length - 1) {
                    currentTime += this.timing.wordGap / 1000;
                }
            }
        } else {
            // Standard playback for synth/telegraph modes or spacebar mode
            let i = 0;
            
            while (i < pattern.length) {
                const char = pattern[i];
                if (char === '.') {
                    await this.playDot(currentTime);
                    currentTime += this.timing.dot / 1000 + this.timing.intraChar / 1000;
                    i++;
                } else if (char === '-') {
                    await this.playDash(currentTime);
                    currentTime += this.timing.dash / 1000 + this.timing.intraChar / 1000;
                    i++;
                } else if (char === ' ') {
                    // Check for triple space (word gap)
                    if (i + 2 < pattern.length && pattern[i+1] === ' ' && pattern[i+2] === ' ') {
                        currentTime += this.timing.wordGap / 1000;
                        i += 3; // Skip all three spaces
                    } else {
                        currentTime += this.timing.charGap / 1000;
                        i++;
                    }
                } else {
                    i++;
                }
            }
        }
        
        const duration = (currentTime - this.audioContext.currentTime) * 1000;
        
        // Wait for audio to finish if using synth mode
        if (this.soundMode === 'synth' && duration > 0) {
            await new Promise(resolve => setTimeout(resolve, duration));
        }
        
        return duration;
    }

    async playText(text) {
        const morse = morseData.textToMorse(text);
        return this.playMorsePattern(morse, true); // Use oldschool sounds for text-to-morse
    }

    async playCharacter(char) {
        const morse = morseData.charToMorse[char.toLowerCase()];
        if (!morse) return;
        
        // Queue the playback to prevent overlapping
        this.playbackQueue = this.playbackQueue.then(async () => {
            await this.playMorsePattern(morse, false); // Don't use oldschool dkm sounds for individual characters in keyboard mode
            
            // Add character gap pause
            await new Promise(resolve => setTimeout(resolve, this.timing.charGap));
        });
        
        return this.playbackQueue;
    }

    // Generate WAV file from morse text
    async generateWAV(text) {
        // This is a simplified version - full WAV generation would be more complex
        const morse = morseData.textToMorse(text);
        const duration = await this.playMorsePattern(morse);
        
        // For now, return a placeholder
        // In a full implementation, this would render the audio to a WAV buffer
        return {
            duration,
            morse,
            // wav: audioBuffer
        };
    }
}

// Global instance
const morseAudio = new MorseAudio();
