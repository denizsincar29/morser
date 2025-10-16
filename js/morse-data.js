// Morse data loader and manager
class MorseData {
    constructor() {
        this.currentLanguage = 'en';
        this.languages = {};
        this.morseToChar = {};
        this.charToMorse = {};
    }

    async loadLanguage(code) {
        try {
            const response = await fetch(`languages/${code}.json`);
            const data = await response.json();
            this.languages[code] = data;
            
            if (code === this.currentLanguage) {
                this.buildMaps();
            }
            
            return data;
        } catch (error) {
            console.error(`Failed to load language ${code}:`, error);
            return null;
        }
    }

    async loadAllLanguages() {
        const codes = ['en', 'ru', 'de', 'tr'];
        await Promise.all(codes.map(code => this.loadLanguage(code)));
        this.buildMaps();
    }

    setLanguage(code) {
        if (this.languages[code]) {
            this.currentLanguage = code;
            this.buildMaps();
            return true;
        }
        return false;
    }

    buildMaps() {
        const lang = this.languages[this.currentLanguage];
        if (!lang) return;

        this.charToMorse = {};
        this.morseToChar = {};

        // Combine all character types
        const allChars = {
            ...lang.letters,
            ...lang.numbers,
            ...lang.punctuation
        };

        // Build bidirectional maps
        for (const [char, morse] of Object.entries(allChars)) {
            this.charToMorse[char.toLowerCase()] = morse;
            this.morseToChar[morse] = char.toLowerCase();
        }

        // Add space
        this.charToMorse[' '] = ' ';
        this.morseToChar[' '] = ' ';
    }

    textToMorse(text) {
        return text.toLowerCase()
            .split('')
            .map(char => this.charToMorse[char] || char)
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    morseToText(morse) {
        // Handle word spaces (3 spaces in morse = 1 word space)
        return morse.split('   ')
            .map(word => word.split(' ')
                .map(code => this.morseToChar[code] || code)
                .join(''))
            .join(' ');
    }

    getRandomChar(includeNumbers = true, includePunctuation = false) {
        const lang = this.languages[this.currentLanguage];
        if (!lang) return null;

        let chars = Object.keys(lang.letters);
        
        if (includeNumbers) {
            chars = chars.concat(Object.keys(lang.numbers));
        }
        
        if (includePunctuation) {
            chars = chars.concat(Object.keys(lang.punctuation));
        }

        return chars[Math.floor(Math.random() * chars.length)];
    }

    getRandomGroup(length, includeNumbers = true, includePunctuation = false) {
        const group = [];
        for (let i = 0; i < length; i++) {
            group.push(this.getRandomChar(includeNumbers, includePunctuation));
        }
        return group.join('');
    }
}

// Global instance
const morseData = new MorseData();
