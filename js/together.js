// ─── Together Mode — WebRTC P2P co-morsing ──────────────────────────────────
// Architecture: each peer captures explicit press-start / press-stop timing.
// On keydown: broadcast {type:'morse_start', startedAt} to all peers
// On keyup:   broadcast {type:'morse_end', endedAt, duration} to all peers
// Peers reconstruct the sender's rhythm from those timestamps.
// ─────────────────────────────────────────────────────────────────────────────

const SIGNAL_URL = (room, peer) => {
    // CONFIGURE THIS — point at your WebSocket signaling server
    const host  = window.MORSER_SIGNAL_HOST || location.hostname;
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    return `${proto}://${host}/signal?room=${encodeURIComponent(room)}&peer=${encodeURIComponent(peer)}`;
};

const ICE_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
];

// ─────────────────────────────────────────────────────────────────────────────

class TogetherMode {
    constructor() {
        this.ws        = null;
        this.myId      = null;
        this.myName    = 'Anon';
        this.roomName  = null;
        this.peers     = new Map();   // id → { pc, dc, name, keyDownTime, morseBuffer }
        this.connected = false;
        this._manualLeave = false;

        this._decoderTimeout = null;
        this._myMorseBuffer  = [];   // [{type:'beep'|'pause', duration}]
        this._myKeyDown      = null;
        this._myLastUp       = null;
        this._pingSeq        = 0;
        this._pingPending    = new Map(); // id → { started, peerId }

        this._setupUI();
    }

    // ── UI wiring ────────────────────────────────────────────────────────────

    _setupUI() {
        document.getElementById('connect-room-btn').addEventListener('click', () => this._connectRoom());
        document.getElementById('copy-link-btn').addEventListener('click',   () => this._copyLink());
        document.getElementById('leave-room-btn').addEventListener('click',  () => this.leave());
        document.getElementById('ping-test-btn').addEventListener('click',   () => this._runPingTest());

        const keyPad = document.getElementById('together-key-pad');
        keyPad.addEventListener('keydown',  e => this._onKeyPadDown(e));
        keyPad.addEventListener('keyup',    e => this._onKeyPadUp(e));
        keyPad.addEventListener('pointerdown', e => { e.preventDefault(); this._startSignal(); });
        keyPad.addEventListener('pointerup',   e => { e.preventDefault(); this._endSignal(); });
        keyPad.addEventListener('pointerleave', e => { if (this._myKeyDown) this._endSignal(); });

        document.getElementById('chat-send-btn').addEventListener('click',  () => this._sendChat());
        document.getElementById('chat-input').addEventListener('keydown', e => {
            if (e.key === 'Enter') this._sendChat();
        });
        document.getElementById('clear-transcript-btn').addEventListener('click', () => {
            document.getElementById('transcript-output').textContent = '';
        });

        this._setSignalNoticeVisible(false);

        // Auto-fill room from URL
        const urlRoom = new URLSearchParams(location.search).get('room');
        if (urlRoom) {
            document.getElementById('room-name-input').value = urlRoom;
            document.getElementById('room-link-area').hidden = false;
            document.getElementById('room-link-display').value = this._buildLink(urlRoom);
        }
    }

    async _connectRoom() {
        const roomInput = document.getElementById('room-name-input').value.trim();
        const callsign  = document.getElementById('my-callsign').value.trim() || 'Anon';
        const room      = roomInput || this._generateRoomName();

        if (!roomInput) {
            document.getElementById('room-name-input').value = room;
        }

        this.myName  = callsign;
        this.roomName = room;

        const link = this._buildLink(room);
        document.getElementById('room-link-display').value = link;
        document.getElementById('room-link-area').hidden = true;

        this._togetherStatus('Connecting…', 'warning');
        this._setSignalNoticeVisible(false);

        try {
            await this._connect(room);
        } catch (e) {
            this._togetherStatus(`Could not connect to signaling server: ${e.message}`, 'error');
            this._setSignalNoticeVisible(true);
        }
    }

    _generateRoomName() {
        const adj  = ['swift', 'quiet', 'delta', 'echo', 'foxtrot', 'lima', 'oscar', 'sierra'];
        const noun = ['bravo', 'charlie', 'kilo', 'mike', 'victor', 'whiskey', 'yankee'];
        const a = adj[Math.floor(Math.random() * adj.length)];
        const n = noun[Math.floor(Math.random() * noun.length)];
        return `${a}-${n}`;
    }

    _buildLink(room) {
        const u = new URL(location.href);
        u.searchParams.set('room', room);
        return u.toString();
    }

    _copyLink() {
        const val = document.getElementById('room-link-display').value;
        navigator.clipboard?.writeText(val).then(() => {
            document.getElementById('copy-link-btn').textContent = 'Copied!';
            setTimeout(() => { document.getElementById('copy-link-btn').textContent = 'Copy'; }, 2000);
        });
    }

    _showSession() {
        document.getElementById('together-connect-ui').hidden = true;
        document.getElementById('together-session-ui').hidden = false;
        document.getElementById('session-room-label').textContent = `Room: ${this.roomName}`;
        document.getElementById('self-name-display').textContent  = `${this.myName} (you)`;
        this._updatePeerCount();
    }

    _hideSession() {
        document.getElementById('together-connect-ui').hidden = false;
        document.getElementById('together-session-ui').hidden = true;
    }

    _togetherStatus(msg, type = '') {
        const el = document.getElementById('together-status');
        el.textContent = msg;
        el.className = 'together-status ' + type;
    }

    _updatePeerCount() {
        const open = [...this.peers.values()].filter(p => p.dc?.readyState === 'open').length;
        document.getElementById('peer-count-badge').textContent =
            open === 0 ? 'waiting for peers…' : `${open} peer${open > 1 ? 's' : ''} connected`;
    }

    _addParticipant(id, name) {
        const list = document.getElementById('participants-list');
        if (document.getElementById(`peer-${id}`)) return;
        const div = document.createElement('div');
        div.className = 'participant';
        div.id = `peer-${id}`;
        div.innerHTML = `<span class="participant-name">${this._esc(name || id.slice(0,6))}</span>
                         <span class="participant-morse" id="pm-${id}"></span>`;
        list.appendChild(div);
        this._addChatMsg(`${name || id.slice(0,6)} joined`, 'system');
    }

    _removeParticipant(id) {
        const el = document.getElementById(`peer-${id}`);
        const name = el?.querySelector('.participant-name')?.textContent || id.slice(0,6);
        el?.remove();
        this._addChatMsg(`${name} left`, 'system');
    }

    _setPeerMorse(id, text) {
        const el = document.getElementById(`pm-${id}`);
        if (el) el.textContent = text;
        const row = document.getElementById(`peer-${id}`);
        if (row) row.classList.toggle('active', text.length > 0);
    }

    _setMyMorse(text) {
        document.getElementById('self-morse-display').textContent = text;
    }

    _addChatMsg(text, type = '') {
        const msgs = document.getElementById('chat-messages');
        const div = document.createElement('div');
        div.className = `chat-msg ${type}`;
        div.textContent = text;
        msgs.appendChild(div);
        msgs.scrollTop = msgs.scrollHeight;
    }

    _addChatMsgFrom(name, text) {
        const msgs = document.getElementById('chat-messages');
        const div = document.createElement('div');
        div.className = 'chat-msg';
        div.innerHTML = `<span class="chat-from">${this._esc(name)}: </span>${this._esc(text)}`;
        msgs.appendChild(div);
        msgs.scrollTop = msgs.scrollHeight;
    }

    _sendChat() {
        const input = document.getElementById('chat-input');
        const text = input.value.trim();
        if (!text) return;
        input.value = '';
        this._broadcast({ type: 'chat', name: this.myName, text });
        this._addChatMsgFrom(`${this.myName} (you)`, text);
    }

    _esc(str) {
        return String(str)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // ── Morse key pad ─────────────────────────────────────────────────────────

    _onKeyPadDown(e) {
        if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            this._startSignal();
        }
    }
    _onKeyPadUp(e) {
        if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            this._endSignal();
        }
    }

    _startSignal() {
        if (this._myKeyDown) return;
        const startedAt = performance.now();
        this._myKeyDown = startedAt;
        const poorConnectionMode = this._usesPoorConnectionMode();

        // Add pause since last key-up if applicable
        if (this._myLastUp) {
            const pause = startedAt - this._myLastUp;
            this._myMorseBuffer.push({ type: 'pause', duration: pause });
        }

        // Live audio feedback
        morseAudio.initAudioContext();
        const osc  = morseAudio.audioContext.createOscillator();
        const gain = morseAudio.audioContext.createGain();
        osc.type = 'sine'; osc.frequency.value = morseAudio.pitch;
        osc.connect(gain); gain.connect(morseAudio.audioContext.destination);
        gain.gain.setValueAtTime(0, morseAudio.audioContext.currentTime);
        gain.gain.linearRampToValueAtTime(0.3, morseAudio.audioContext.currentTime + 0.005);
        osc.start();
        this._liveOsc = osc; this._liveGain = gain;

        document.getElementById('together-key-pad').classList.add('keying');
        document.getElementById('together-key-pad').setAttribute('aria-pressed', 'true');

        this._broadcast({
            type: 'morse_start',
            name: this.myName,
            pitch: morseAudio.pitch,
            ...(poorConnectionMode ? { startedAt } : {}),
        });
    }

    _endSignal() {
        if (!this._myKeyDown) return;
        const endedAt = performance.now();
        const duration = endedAt - this._myKeyDown;
        const poorConnectionMode = this._usesPoorConnectionMode();
        this._myKeyDown = null;
        this._myLastUp  = endedAt;

        // Stop live audio
        if (this._liveOsc) {
            const ctx = morseAudio.audioContext;
            this._liveGain.gain.setValueAtTime(0.3, ctx.currentTime);
            this._liveGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.005);
            this._liveOsc.stop(ctx.currentTime + 0.01);
            this._liveOsc = null; this._liveGain = null;
        }

        document.getElementById('together-key-pad').classList.remove('keying');
        document.getElementById('together-key-pad').setAttribute('aria-pressed', 'false');

        const symbol = duration < 200 ? '·' : '—';
        if (morseAudio.useKMeansDecoding) {
            document.getElementById('together-letter-display').textContent = symbol;
            this._setMyMorse(symbol);
        } else {
            document.getElementById('together-letter-display').textContent = '';
            this._setMyMorse('');
        }
        this._myMorseBuffer.push({ type: 'beep', duration, startedAt: endedAt - duration, endedAt });

        this._broadcast({
            type: 'morse_end',
            name: this.myName,
            pitch: morseAudio.pitch,
            ...(poorConnectionMode ? { startedAt: endedAt - duration, endedAt, duration } : {}),
        });

        // Schedule decode of self's buffer only when decoding is enabled.
        clearTimeout(this._decoderTimeout);
        if (morseAudio.useKMeansDecoding) {
            this._decoderTimeout = setTimeout(() => {
                this._decodeAndAppendTranscript('You', this._myMorseBuffer);
                this._myMorseBuffer = [];
                this._myLastUp = null;
                this._setMyMorse('');
                document.getElementById('together-letter-display').textContent = '';
            }, 2000);
        } else {
            this._myMorseBuffer = [];
            this._myLastUp = null;
            this._setMyMorse('');
            document.getElementById('together-letter-display').textContent = '';
        }
    }

    _decodeAndAppendTranscript(name, buffer) {
        if (!morseAudio.useKMeansDecoding) return;
        if (!buffer || buffer.length === 0) return;

        const beeps = buffer.filter(e => e.type === 'beep');
        if (beeps.length === 0) return;

        let text;

        if (!morseAudio.useKMeansDecoding || beeps.length < 4) {
            // Not enough beeps for K-means to cluster reliably.
            // Fall back to simple threshold: <200ms = dot, >=200ms = dash.
            // Build a single morse letter from the beeps and decode it.
            const dotDash = beeps.map(b => b.duration < 200 ? '.' : '-').join('');
            text = morseData.morseToChar[dotDash] || dotDash;
        } else {
            const dec = new MorseDecoder();
            dec.startRecording();
            for (const ev of buffer) {
                if (ev.type === 'beep')  dec.addBeep(ev.duration);
                if (ev.type === 'pause') dec.addPause(ev.duration);
            }
            dec.stopRecording();
            text = dec.decode();
        }

        if (!text) return;

        const out = document.getElementById('transcript-output');
        const line = document.createElement('div');
        line.innerHTML = `<span style="color:var(--accent)">${this._esc(name)}:</span> ${this._esc(text)}`;
        out.appendChild(line);
        out.scrollTop = out.scrollHeight;
    }

    _usesPoorConnectionMode() {
        return !!window.morserApp?.poorConnectionMode;
    }

    _startPeerTone(peer, pitch) {
        if (peer._toneOsc) return;
        morseAudio.initAudioContext();
        const osc = morseAudio.audioContext.createOscillator();
        const gain = morseAudio.audioContext.createGain();
        osc.type = 'sine';
        osc.frequency.value = pitch;
        osc.connect(gain);
        gain.connect(morseAudio.audioContext.destination);
        gain.gain.setValueAtTime(0, morseAudio.audioContext.currentTime);
        gain.gain.linearRampToValueAtTime(0.3, morseAudio.audioContext.currentTime + 0.005);
        osc.start();
        peer._toneOsc = osc;
        peer._toneGain = gain;
    }

    _stopPeerTone(peer) {
        if (!peer._toneOsc) return;
        const ctx = morseAudio.audioContext;
        peer._toneGain.gain.setValueAtTime(0.3, ctx.currentTime);
        peer._toneGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.005);
        peer._toneOsc.stop(ctx.currentTime + 0.01);
        peer._toneOsc = null;
        peer._toneGain = null;
    }

    async _runPingTest() {
        if (!this.connected) return;

        const openPeers = [...this.peers.entries()].filter(([, peer]) => peer.dc?.readyState === 'open');

        if (openPeers.length === 0) {
            this._togetherStatus('Ping test needs at least one connected peer.', 'warning');
            return;
        }

        const reports = [];

        for (let index = 0; index < openPeers.length; index++) {
            const [peerId, peer] = openPeers[index];
            const label = peer.name || peerId.slice(0, 6);
            this._togetherStatus(`Ping test running: peer ${index + 1}/${openPeers.length} (${label})…`, 'warning');

            const samples = [];
            for (let i = 0; i < 10; i++) {
                const rtt = await this._pingPeer(peerId);
                if (typeof rtt === 'number') samples.push(rtt);
            }

            if (samples.length === 0) {
                reports.push(`${label}: no pong received`);
                continue;
            }

            const average = samples.reduce((sum, value) => sum + value, 0) / samples.length;
            const min = Math.min(...samples);
            const max = Math.max(...samples);
            const range = max - min;
            const instability = Math.sqrt(samples.reduce((sum, value) => sum + Math.pow(value - average, 2), 0) / samples.length);

            reports.push(
                `${label}: avg ${average.toFixed(1)} ms, range ${range.toFixed(1)} ms (${min.toFixed(1)}-${max.toFixed(1)} ms), instability ${instability.toFixed(1)} ms`
            );
        }

        this._togetherStatus(`P2P ping done. ${reports.join(' | ')}`, 'connected');
    }

    _pingPeer(peerId) {
        const peer = this.peers.get(peerId);
        if (!peer?.dc || peer.dc.readyState !== 'open') {
            return Promise.resolve(null);
        }

        const pingId = `${this.myId}-${++this._pingSeq}-${Date.now()}`;
        const started = performance.now();

        return new Promise(resolve => {
            const timeout = setTimeout(() => {
                this._pingPending.delete(pingId);
                resolve(null);
            }, 2000);

            this._pingPending.set(pingId, { started, peerId, timeout, resolve });
            peer.dc.send(JSON.stringify({ type: 'ping', id: pingId, from: this.myId, started }));
        });
    }

    // ── Broadcast ─────────────────────────────────────────────────────────────

    _broadcast(msg) {
        if (!this.connected) return;
        const raw = JSON.stringify(msg);
        for (const peer of this.peers.values()) {
            if (peer.dc?.readyState === 'open') peer.dc.send(raw);
        }
    }

    // ── Incoming data ─────────────────────────────────────────────────────────

    _handleData(raw, fromId) {
        let msg;
        try { msg = JSON.parse(raw); } catch { return; }

        const peer = this.peers.get(fromId);
        if (!peer) return;

        if (msg.type === 'hello') {
            peer.name = msg.name || fromId.slice(0,6);
            this._addParticipant(fromId, peer.name);
            this._updatePeerCount();
            return;
        }

        if (msg.type === 'morse_start') {
            const timestamped = typeof msg.startedAt === 'number';
            const startedAt = timestamped ? msg.startedAt : performance.now();
            peer.keyDownTime = startedAt;
            if (typeof msg.pitch === 'number') peer.pitch = msg.pitch;
            if (peer.lastKeyUpTime) {
                peer.morseBuffer = peer.morseBuffer || [];
                peer.morseBuffer.push({ type: 'pause', duration: startedAt - peer.lastKeyUpTime });
            }
            if (!timestamped) {
                this._startPeerTone(peer, peer.pitch);
            }
            this._setPeerMorse(fromId, '▌');
            return;
        }

        if (msg.type === 'morse_end') {
            const timestamped = typeof msg.endedAt === 'number' || typeof msg.startedAt === 'number';
            const endedAt = typeof msg.endedAt === 'number' ? msg.endedAt : performance.now();
            const duration = typeof msg.duration === 'number'
                ? msg.duration
                : (endedAt - (typeof peer.keyDownTime === 'number' ? peer.keyDownTime : endedAt));
            const pitch = typeof msg.pitch === 'number' ? msg.pitch : (peer.pitch || morseAudio.pitch);
            peer.pitch = pitch;
            peer.keyDownTime = null;
            peer.lastKeyUpTime = endedAt;
            peer.morseBuffer = peer.morseBuffer || [];
            peer.morseBuffer.push({ type: 'beep', duration });

            if (!timestamped) {
                this._stopPeerTone(peer);
            }

            this._setPeerMorse(fromId, duration < 200 ? '·' : '—');

            if (timestamped) {
                // Play the sender's press length after release when poor connection mode is used.
                peer.playbackQueue = (peer.playbackQueue || Promise.resolve()).then(async () => {
                    if (duration < 200) await morseAudio.playDot(pitch, duration);
                    else                await morseAudio.playDash(pitch, duration);
                }).catch(err => console.error('[Together] remote playback:', err));
            }

            // Schedule decode
            clearTimeout(peer._decodeTimeout);
            if (morseAudio.useKMeansDecoding) {
                peer._decodeTimeout = setTimeout(() => {
                    if (peer.morseBuffer?.length >= 2) {
                        this._decodeAndAppendTranscript(peer.name || fromId.slice(0,6), peer.morseBuffer);
                    }
                    peer.morseBuffer = [];
                    peer.lastKeyUpTime = null;
                    this._setPeerMorse(fromId, '');
                }, 2000);
            } else {
                peer.morseBuffer = [];
                peer.lastKeyUpTime = null;
                this._setPeerMorse(fromId, '');
            }
            return;
        }

        if (msg.type === 'chat') {
            this._addChatMsgFrom(msg.name || fromId.slice(0,6), msg.text);
            return;
        }

        if (msg.type === 'ping') {
            const peer = this.peers.get(fromId);
            if (peer?.dc?.readyState === 'open') {
                peer.dc.send(JSON.stringify({ type: 'pong', id: msg.id, from: this.myId, started: msg.started }));
            }
            return;
        }

        if (msg.type === 'pong') {
            const pending = this._pingPending.get(msg.id);
            if (!pending) return;

            clearTimeout(pending.timeout);
            this._pingPending.delete(msg.id);
            pending.resolve(performance.now() - pending.started);
            return;
        }
    }

    // ── WebRTC + WebSocket ─────────────────────────────────────────────────────

    async _connect(room) {
        this._manualLeave = false;
        this.myId = crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);
        this.myId = this.myId.replace(/-/g, '').slice(0, 12);

        const url = SIGNAL_URL(room, this.myId);
        console.info('[Together] Connecting to signaling server:', url);
        const ws  = new WebSocket(url);
        this.ws   = ws;

        await new Promise((resolve, reject) => {
            const t = setTimeout(() => reject(new Error(`Timeout connecting to ${url}`)), 8000);
            ws.onopen  = () => { clearTimeout(t); resolve(); };
            ws.onerror = (event) => {
                clearTimeout(t);
                console.error('[Together] WebSocket error for signaling server:', url, event);
                reject(new Error(`WebSocket error for ${url}`));
            };
            ws.onclose = (event) => {
                if (ws.readyState !== WebSocket.OPEN) {
                    clearTimeout(t);
                    console.error('[Together] WebSocket closed before connect:', url, {
                        code: event.code,
                        reason: event.reason,
                        wasClean: event.wasClean,
                    });
                    reject(new Error(`WebSocket closed before connect (${event.code}${event.reason ? `: ${event.reason}` : ''})`));
                }
            };
        });

        ws.onmessage = async ({ data }) => {
            try { await this._handleSignal(JSON.parse(data)); } catch(e) { console.error(e); }
        };
        ws.onclose = () => {
            if (!this._manualLeave) this._togetherStatus('Connection lost', 'error');
        };

        // Heartbeat
        this._heartbeat = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN)
                ws.send(JSON.stringify({ type: 'keepalive', from: this.myId }));
        }, 25000);

        this._wsSend({ type: 'join', from: this.myId });
        document.getElementById('room-link-area').hidden = false;
        const linkInput = document.getElementById('room-link-display');
        linkInput.focus();
        linkInput.select();
        this._togetherStatus(`Joined room "${room}" — waiting for peers…`, 'connected');
        this.connected = true;
        this._showSession();
    }

    async applyUrlParams(params = new URLSearchParams(location.search)) {
        const room = params.get('room')?.trim();
        const callsign = params.get('callsign')?.trim();

        if (!room && !callsign) return;

        if (callsign) {
            document.getElementById('my-callsign').value = callsign;
            this.myName = callsign;
        }

        if (!room) return;

        document.getElementById('room-name-input').value = room;

        if (window.morserApp?.togglePanel) {
            window.morserApp.togglePanel('together-panel', 'together-btn');
        }

        await this._connectRoom();

        const keyPad = document.getElementById('together-key-pad');
        keyPad?.focus();
    }

    _setSignalNoticeVisible(visible) {
        const notice = document.getElementById('signaling-notice');
        if (notice) notice.hidden = !visible;
    }

    _wsSend(obj) {
        if (this.ws?.readyState === WebSocket.OPEN)
            this.ws.send(JSON.stringify(obj));
    }

    async _handleSignal(msg) {
        if (msg.from === this.myId) return;
        if (msg.to && msg.to !== this.myId) return;

        if (msg.type === 'join') {
            const peer = this._getOrCreatePeer(msg.from, false /* impolite — we make the offer */);
            this._createDataChannel(peer);
            try {
                peer.makingOffer = true;
                await peer.pc.setLocalDescription();
                this._wsSend({ type:'sdp', from:this.myId, to:msg.from, sdp: peer.pc.localDescription });
            } catch(e) { console.error('join offer:', e); }
            finally { peer.makingOffer = false; }
            return;
        }

        if (msg.type === 'sdp') {
            const peer = this._getOrCreatePeer(msg.from, true /* polite */);
            const desc = msg.sdp;
            const collision = desc.type === 'offer' && (peer.makingOffer || peer.pc.signalingState !== 'stable');
            peer.ignoreOffer = !peer.isPolite && collision;
            if (peer.ignoreOffer) return;
            await peer.pc.setRemoteDescription(desc);
            for (const c of peer.pendingICE) {
                try { await peer.pc.addIceCandidate(c); } catch {}
            }
            peer.pendingICE = [];
            if (desc.type === 'offer') {
                await peer.pc.setLocalDescription();
                this._wsSend({ type:'sdp', from:this.myId, to:msg.from, sdp: peer.pc.localDescription });
            }
            return;
        }

        if (msg.type === 'ice') {
            const peer = this.peers.get(msg.from);
            if (!peer) return;
            try {
                if (peer.pc.remoteDescription) await peer.pc.addIceCandidate(msg.candidate ?? null);
                else if (msg.candidate) peer.pendingICE.push(msg.candidate);
            } catch(e) { if (!peer.ignoreOffer) console.error('addICE:', e); }
        }
    }

    _getOrCreatePeer(remoteId, isPolite) {
        if (this.peers.has(remoteId)) return this.peers.get(remoteId);
        const state = {
            pc: null, dc: null,
            isPolite, makingOffer: false, ignoreOffer: false,
            pendingICE: [],
            name: remoteId.slice(0, 6),
            morseBuffer: [], keyDownTime: null, lastKeyUpTime: null,
            pitch: morseAudio.pitch,
            playbackQueue: Promise.resolve(),
        };
        this.peers.set(remoteId, state);

        const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS, bundlePolicy: 'max-bundle' });
        state.pc = pc;

        pc.onnegotiationneeded = async () => {
            try {
                state.makingOffer = true;
                await pc.setLocalDescription();
                this._wsSend({ type:'sdp', from:this.myId, to:remoteId, sdp: pc.localDescription });
            } catch(e) { console.error('negotiation:', e); }
            finally { state.makingOffer = false; }
        };

        pc.onicecandidate = ({ candidate }) => {
            if (candidate) this._wsSend({ type:'ice', from:this.myId, to:remoteId, candidate });
        };

        pc.onconnectionstatechange = () => {
            const s = pc.connectionState;
            if (s === 'connected') {
                this._updatePeerCount();
                this._togetherStatus(`Connected to peer ${remoteId.slice(0,6)}`, 'connected');
            }
            if (s === 'failed' || s === 'closed') {
                this._stopPeerTone(state);
                for (const [id, pending] of this._pingPending) {
                    if (pending.peerId === remoteId) {
                        clearTimeout(pending.timeout);
                        pending.resolve(null);
                        this._pingPending.delete(id);
                    }
                }
                this._removeParticipant(remoteId);
                this.peers.delete(remoteId);
                this._updatePeerCount();
            }
        };

        pc.ondatachannel = ({ channel }) => {
            state.dc = channel;
            this._setupDC(state, remoteId);
        };

        return state;
    }

    _createDataChannel(state) {
        const remoteId = [...this.peers.entries()].find(([, v]) => v === state)?.[0];
        state.dc = state.pc.createDataChannel('morse', { ordered: true });
        this._setupDC(state, remoteId);
    }

    _setupDC(state, remoteId) {
        const dc = state.dc;
        dc.onopen = () => {
            // Send our hello
            dc.send(JSON.stringify({ type: 'hello', name: this.myName }));
            this._updatePeerCount();
        };
        dc.onmessage = ({ data }) => this._handleData(data, remoteId);
        dc.onclose   = () => { this._updatePeerCount(); };
        dc.onerror   = e  => console.error('[DC]', e);
    }

    async leave() {
        this._manualLeave = true;
        this.connected = false;
        clearInterval(this._heartbeat);
        for (const [, pending] of this._pingPending) {
            clearTimeout(pending.timeout);
            pending.resolve(null);
        }
        this._pingPending.clear();
        this.ws?.close(); this.ws = null;
        for (const [id, p] of this.peers) {
            this._stopPeerTone(p);
            p.dc?.close(); p.pc?.close();
            this._removeParticipant(id);
        }
        this.peers.clear();
        this._hideSession();
        this._togetherStatus('Left the room');

        // Remove participants from DOM except self
        document.querySelectorAll('.participant:not(.self)').forEach(e => e.remove());
    }
}

// Boot after DOM ready
document.addEventListener('DOMContentLoaded', () => {
    window.togetherMode = new TogetherMode();
});
