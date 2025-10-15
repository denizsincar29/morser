// Morse decoder using k-means clustering
class MorseDecoder {
    constructor() {
        this.durations = []; // Array of {type: 'beep'/'pause', duration: ms}
        this.lastTime = null;
        this.isRecording = false;
        this.decodedText = '';
        this.morsePattern = '';
    }

    startRecording() {
        this.durations = [];
        this.lastTime = null;
        this.isRecording = true;
        this.decodedText = '';
        this.morsePattern = '';
    }

    stopRecording() {
        this.isRecording = false;
        if (this.lastTime !== null) {
            // Add final pause if key was released
            const now = Date.now();
            const duration = now - this.lastTime;
            if (duration > 1) {
                this.durations.push({type: 'pause', duration});
            }
        }
    }

    addBeep(duration) {
        if (!this.isRecording || duration <= 1) return;
        this.durations.push({type: 'beep', duration});
    }

    addPause(duration) {
        if (!this.isRecording || duration <= 1) return;
        this.durations.push({type: 'pause', duration});
    }

    decode() {
        if (this.durations.length < 8) {
            return this.decodedText; // Not enough data
        }

        // Separate beeps and pauses
        const beeps = this.durations.filter(d => d.type === 'beep').map(d => d.duration);
        let pauses = this.durations.filter(d => d.type === 'pause').map(d => d.duration);

        if (beeps.length === 0 || pauses.length === 0) {
            return this.decodedText;
        }

        // Cluster beeps into dots and dashes (2 clusters)
        const beepKmeans = new KMeans(2);
        beepKmeans.fit(beeps);
        const beepCentroids = beepKmeans.getCentroids();
        const beepLabels = beepKmeans.getLabels();

        // Determine which cluster is dot and which is dash
        const dotCluster = beepCentroids[0] < beepCentroids[1] ? 0 : 1;
        const dashCluster = 1 - dotCluster;
        
        // Calculate dot duration from beep clustering
        const dotDuration = beepCentroids[dotCluster];

        // Create enhanced pause dataset for better clustering
        // Add synthetic pauses at standard morse intervals to guide clustering
        let pausesForClustering = [...pauses];
        
        // Add guide pauses based on dot duration
        // Intra-char should be ~1 dot, char should be ~3 dots, word should be ~7 dots
        pausesForClustering.push(dotDuration * 1);      // Intra-char guide
        pausesForClustering.push(dotDuration * 3);      // Char space guide  
        pausesForClustering.push(dotDuration * 7);      // Word space guide

        // Cluster pauses into intra-char, char, and word spaces (3 clusters)
        const pauseKmeans = new KMeans(3);
        pauseKmeans.fit(pausesForClustering);
        const pauseCentroids = pauseKmeans.getCentroids();
        
        // Get labels only for the actual pauses (not the guide ones)
        const pauseLabels = pauses.map(pause => {
            return pauseKmeans.predict(pause);
        });

        // Sort pause centroids to identify space types
        const sortedPauseCentroids = [...pauseCentroids].sort((a, b) => a - b);
        const intraCharCluster = pauseCentroids.indexOf(sortedPauseCentroids[0]);
        const charSpaceCluster = pauseCentroids.indexOf(sortedPauseCentroids[1]);
        const wordSpaceCluster = pauseCentroids.indexOf(sortedPauseCentroids[2]);

        // Build morse pattern
        let morseChars = [];
        let currentChar = '';
        let beepIndex = 0;
        let pauseIndex = 0;

        for (const dur of this.durations) {
            if (dur.type === 'beep') {
                const label = beepLabels[beepIndex];
                currentChar += label === dotCluster ? '.' : '-';
                beepIndex++;
            } else {
                const label = pauseLabels[pauseIndex];
                
                if (label === intraCharCluster) {
                    // Continue current character
                } else if (label === charSpaceCluster) {
                    // End current character
                    if (currentChar) {
                        morseChars.push(currentChar);
                        currentChar = '';
                    }
                } else if (label === wordSpaceCluster) {
                    // End current character and add word space
                    if (currentChar) {
                        morseChars.push(currentChar);
                        currentChar = '';
                    }
                    // Add word space marker (will be converted to 3 spaces)
                    morseChars.push('');
                }
                
                pauseIndex++;
            }
        }

        // Add last character if exists
        if (currentChar) {
            morseChars.push(currentChar);
        }

        // Join morse characters with single space, but use triple space for word separators
        this.morsePattern = morseChars.map((char, idx) => {
            if (char === '' && idx > 0 && idx < morseChars.length - 1) {
                return '  '; // Two extra spaces to make 3 total (one from join)
            }
            return char;
        }).join(' ').replace(/\s{4,}/g, '   ').trim();

        // Decode to text
        this.decodedText = morseData.morseToText(this.morsePattern);

        return this.decodedText;
    }

    getDurations() {
        return this.durations;
    }

    getMorsePattern() {
        return this.morsePattern;
    }

    getDecodedText() {
        return this.decodedText;
    }

    // Get average dot duration for speed calibration
    getAverageDotSpeed() {
        const beeps = this.durations.filter(d => d.type === 'beep').map(d => d.duration);
        if (beeps.length < 2) return null;

        const beepKmeans = new KMeans(2);
        beepKmeans.fit(beeps);
        const centroids = beepKmeans.getCentroids();
        
        return Math.min(...centroids); // Return the shorter duration (dot)
    }

    // Export durations for .morse file
    exportDurations() {
        // Format: positive for beeps, negative for pauses
        return this.durations.map(d => 
            d.type === 'beep' ? d.duration : -d.duration
        );
    }

    // Import durations from .morse file
    importDurations(data) {
        this.durations = data.map(d => ({
            type: d > 0 ? 'beep' : 'pause',
            duration: Math.abs(d)
        }));
    }

    clear() {
        this.durations = [];
        this.lastTime = null;
        this.isRecording = false;
        this.decodedText = '';
        this.morsePattern = '';
    }
}
