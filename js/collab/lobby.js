/* Optional classic-script adapter. Loading this file does not contact the Worker. */
async function initLobby() {
    if (lobby || APP_CONFIG.collab?.enabled !== true) return;
    const config = APP_CONFIG.collab;
    const server = new URL(config.serverUrl);
    if (server.username || server.password || server.search || server.hash ||
        (server.protocol !== 'https:' && !(server.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(server.hostname)))) {
        throw new Error('Lobby server must use HTTPS (HTTP is allowed only on localhost).');
    }
    const base = server.href.replace(/\/$/, '');
    const P = await import(versionRuntimeAsset(new URL('js/collab/protocol.mjs', BASE_PATH).href));
    const { createReplicaClass } = await import(versionRuntimeAsset(new URL('js/collab/replica.mjs', BASE_PATH).href));
    const Replica = createReplicaClass(P);
    const textKeys = {
        title: 'lobbyTitle', name: 'lobbyNameLabel', invite: 'lobbyInviteLabel', create: 'lobbyCreate', join: 'lobbyJoin',
        include: 'lobbyIncludeSavedTargets', privacy: 'lobbyPrivacy', copy: 'lobbyCopyInvite', leave: 'lobbyLeave', close: 'lobbyCloseForEveryone',
        reconnect: 'lobbyReconnect', export: 'lobbyExportRecovery', idle: 'lobbyStatusIdle', connecting: 'lobbyStatusConnecting', ready: 'lobbyStatusReady',
        pending: 'lobbyStatusPending', offline: 'lobbyStatusOffline', failed: 'lobbyStatusFailed', conflict: 'lobbyStatusConflict', quota: 'lobbyStatusQuota',
        invalid: 'lobbyStatusInvalid', copied: 'lobbyStatusCopied', closeConfirm: 'lobbyCloseConfirm', leaveConfirm: 'lobbyLeaveConfirm',
        reconnectConfirm: 'lobbyReconnectConfirm', closed: 'lobbyStatusClosed', map: 'lobbyMapFixed', remaining: 'lobbyBatchesRemaining', expires: 'lobbyExpires',
        budget: 'lobbyStatusBudget', limited: 'lobbyStatusLimited', challenge: 'lobbyStatusChallenge', security: 'lobbyStatusSecurity',
        admissionLimit: 'lobbyStatusAdmissionLimit', fallback: 'lobbyParticipantFallback', recovery: 'lobbyRecoveryAvailable',
        artilleryShort: 'lobbyArtilleryShort', targetShort: 'lobbyTargetShort'
    };
    const t = key => tr(textKeys[key] || key);
    const root = document.createElement('div');
    root.id = 'lobbyControls';
    root.className = 'lobby-controls';
    // Static markup only. Names, URLs and server data always use textContent/value.
    root.innerHTML = `
        <section id="lobbyPanel" class="lobby-panel" aria-labelledby="lobbyHeading" hidden>
            <h3 id="lobbyHeading" data-lobby-text="title"></h3>
            <p class="lobby-status" role="status" aria-live="polite"></p>
            <div class="lobby-setup">
                <label><span data-lobby-text="name"></span><input class="lobby-name" maxlength="24" autocomplete="nickname"></label>
                <label><span data-lobby-text="invite"></span><input class="lobby-invite" maxlength="2000" autocomplete="off" spellcheck="false"></label>
                <button type="button" data-action="join" data-lobby-text="join"></button>
                <label class="lobby-check"><input type="checkbox" class="lobby-include"><span data-lobby-text="include"></span></label>
                <div class="lobby-turnstile" hidden></div>
                <button type="button" data-action="create" data-lobby-text="create"></button>
            </div>
            <div class="lobby-session" hidden>
                <p class="lobby-count"></p><p class="lobby-map"></p><ul class="lobby-peers"></ul>
                <p class="lobby-budget"></p><p class="lobby-expires"></p>
                <label><span data-lobby-text="invite"></span><input class="lobby-link" readonly></label>
                <div class="lobby-actions">
                    <button type="button" data-action="copy" data-lobby-text="copy"></button>
                    <button type="button" data-action="reconnect" data-lobby-text="reconnect"></button>
                    <button type="button" data-action="leave" data-lobby-text="leave"></button>
                    <button type="button" data-action="close" data-lobby-text="close"></button>
                </div>
            </div>
            <p class="lobby-privacy" data-lobby-text="privacy"></p>
            <p class="lobby-recovery" data-lobby-text="recovery" hidden></p>
            <button type="button" data-action="export" data-lobby-text="export" hidden></button>
        </section>
        <button type="button" class="lobby-toggle" aria-controls="lobbyPanel" aria-expanded="false">
            <span class="lobby-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="9" cy="8" r="3"/><path d="M3.5 19v-1.5A4.5 4.5 0 0 1 8 13h2a4.5 4.5 0 0 1 4.5 4.5V19"/>
                    <circle cx="17" cy="9" r="2.2"/><path d="M15.5 14h1.8a3.2 3.2 0 0 1 3.2 3.2V19"/>
                </svg>
                <span class="lobby-dot"></span>
            </span>
            <span class="lobby-badge"></span>
        </button>`;
    document.querySelector('.map').append(root);
    const q = selector => root.querySelector(selector);
    const action = name => q(`[data-action="${name}"]`);
    let socket = null, replica = null, backup = null, observed = null;
    let batchTimer, presenceTimer, connectTimer, ackTimer, heartbeat;
    let applying = false, needsRender = false, joining = false, readOnly = false;
    let code = '', ownerKey = '', you = '', roster = [], maximum = config.maxParticipants;
    let expiresAt = 0, remaining = 0, notice = '', recovery = null;
    let sentPresence = null;
    let admission = '', admissionExpiresAt = 0, challengeToken = '';
    let turnstileWidget = null, turnstileLoader = null;
    let connectionMethod = 'join', lobbyOpenedTracked = false;
    const turnstile = config.turnstile || {};
    const LOBBY_NAME_KEY = 'wardogs-lobby-name';
    try {
        q('.lobby-name').value = P.normalizePlayerName(
            window.sessionStorage.getItem(LOBBY_NAME_KEY) ||
            window.localStorage.getItem(LOBBY_NAME_KEY) ||
            ''
        );
    } catch {}
    q('.lobby-name').addEventListener('input', () => {
        const name = q('.lobby-name').value;
        try {
            window.sessionStorage.setItem(LOBBY_NAME_KEY, name);
            window.localStorage.setItem(LOBBY_NAME_KEY, name);
        } catch {}
        schedulePresence();
    });
    const challengeRequired = turnstile.enabled === true &&
        !['localhost', '127.0.0.1'].includes(server.hostname);
    const delay = Math.max(250, Math.min(5000, Number(config.batchDelayMs) || 300));
    const busy = () => Boolean(drag || MAP_TOOL_STATE.pencilDragging || MAP_TOOL_STATE.zoneDragging || MAP_TOOL_STATE.polygonDraft);
    const connected = () => socket?.readyState === WebSocket.OPEN && !joining;
    const lobbyMap = () => replica?.doc?.mapId || S.map;
    const trackLobby = (name, data) => {
        if (typeof trackAnalytics === 'function') trackAnalytics(name, data);
    };
    function failureReason(error) {
        const message = typeof error?.message === 'string' ? error.message : '';
        if (message === 'invalid-invite') return 'invalid-invite';
        if (message === 'admission-room-limit') return 'admission-limit';
        if (message === 'daily-room-limit') return 'daily-limit';
        if (message === 'rate-limited') return 'rate-limited';
        if (/^(challenge-|turnstile-)/.test(message)) return 'security';
        return 'connection';
    }
    const rawDocument = (includeSaved = true) => ({
        mapId: S.map, w: S.w, h: S.h,
        ...Object.fromEntries(P.COLLECTIONS.map(key => [key, key === 'savedTargets' ? (includeSaved ? savedTargets : []) : MAP_TOOL_STATE[key].filter(item => item.mapId === S.map)]))
    });
    function documentBounds(doc) {
        const map = doc.mapId !== 'custom' ? MAPS[doc.mapId] : null;
        if (map && typeof isValidBounds === 'function' && isValidBounds(map.bounds)) {
            return map.bounds;
        }
        return { minX: 0, maxX: doc.w, minY: 0, maxY: doc.h };
    }
    const rawPresence = () => ({
        name: P.normalizePlayerName(q('.lobby-name').value),
        ...P.normalizePresence(
            { origin: S.origin, target: S.target },
            documentBounds({ mapId: S.map, w: S.w, h: S.h })
        )
    });
    function validDocument(raw) {
        const doc = P.normalizeDocument(raw);
        if (doc.mapId !== 'custom' && !Object.hasOwn(MAPS, doc.mapId)) throw new Error('unsupported-room');
        if (doc.mapId !== 'custom' && (doc.w !== MAPS[doc.mapId].w || doc.h !== MAPS[doc.mapId].h)) throw new Error('unsupported-map-size');
        return doc;
    }
    function resetGesture() {
        drag = null;
        pan = null;
        setMapTool(null);
    }
    function render() {
        if (!lobby.active || !replica) return;
        if (busy()) { needsRender = true; return; }
        applying = true;
        try {
            const doc = replica.view();
            const different = S.map !== doc.mapId;
            Object.assign(S, { map: doc.mapId, w: doc.w, h: doc.h });
            if (different) {
                if (typeof loadMapPoints === 'function') loadMapPoints();
                Object.assign(S, { zoom: 1, panX: 0, panY: 0 });
            }
            clamp(S.origin);
            clamp(S.target);
            for (const key of P.COLLECTIONS) {
                if (key === 'savedTargets') savedTargets = structuredClone(doc[key]);
                else MAP_TOOL_STATE[key] = structuredClone(doc[key]);
            }
            observed = P.normalizeDocument(rawDocument());
            needsRender = false;
            updatePresetLock();
            inputs();
            renderSavedTargets();
        } finally { applying = false; }
        updateUI();
    }
    function capture() {
        if (!lobby.active || applying || !replica || busy()) return;
        if (!connected() || readOnly) { render(); return; }
        try {
            schedulePresence();
            const current = validDocument(rawDocument());
            const changes = P.diffDocuments(observed, current);
            if (changes.length) {
                replica.edit(changes);
                observed = current;
                notice = '';
                schedule();
            }
            if (needsRender) render();
        } catch {
            recovery = structuredClone(rawDocument());
            notice = 'invalid';
            render();
            open(true);
        }
        updateUI();
    }
    function flushPresence(force = false) {
        if (!connected() || readOnly) return;
        const presence = rawPresence();
        if (!force && P.same(presence, sentPresence)) return;
        const text = JSON.stringify({ type: 'presence', ...presence });
        if (P.byteLength(text) > P.LIMITS.messageBytes) throw new Error('bad-presence');
        socket.send(text);
        sentPresence = structuredClone(presence);
    }
    function schedulePresence(force = false) {
        if (!connected() || readOnly) return;
        const presence = rawPresence();
        if (!force && P.same(presence, sentPresence)) return;
        if (force) {
            clearTimeout(presenceTimer);
            presenceTimer = null;
            flushPresence(true);
            return;
        }
        if (!presenceTimer) {
            presenceTimer = setTimeout(() => {
                presenceTimer = null;
                try { flushPresence(); }
                catch { notice = 'invalid'; open(true); }
                updateUI();
            }, delay);
        }
        updateUI();
    }
    function schedule() {
        if (!batchTimer && replica?.queue.length && !replica.flight && connected() && !readOnly) {
            batchTimer = setTimeout(() => { batchTimer = null; flush(); }, delay);
        }
    }
    function send(message) {
        if (!message) return;
        const text = JSON.stringify(message);
        if (P.byteLength(text) > P.LIMITS.messageBytes) throw new Error('message-too-large');
        socket.send(text);
        clearTimeout(ackTimer);
        ackTimer = setTimeout(() => { if (socket) socket.close(4000, 'ack-timeout'); }, 15000);
        updateUI();
    }
    function flush() {
        if (!connected() || readOnly || !replica || replica.flight || busy()) { schedule(); return; }
        try { send(replica.take(crypto.randomUUID())); }
        catch {
            recovery = replica.view();
            replica.snapshot(replica.doc, replica.revision, { rejected: true });
            notice = 'invalid'; render(); open(true);
        }
    }
    function history(mode) {
        if (!connected() || readOnly || busy()) return false;
        capture();
        try {
            const message = replica.history(mode, crypto.randomUUID());
            if (!message) return false;
            send(message); render(); return true;
        } catch {
            notice = 'conflict';
            replica.undoStack = []; replica.redoStack = [];
            updateUI(); open(true); return false;
        }
    }
    function updateHistoryUI() {
        const disabled = !connected() || readOnly || !replica || replica.dirty;
        if ($('mapToolUndoButton')) $('mapToolUndoButton').disabled = disabled || !replica.undoStack.length;
        if ($('mapToolRedoButton')) $('mapToolRedoButton').disabled = disabled || !replica.redoStack.length;
    }
    function updateUI() {
        for (const node of root.querySelectorAll('[data-lobby-text]')) node.textContent = t(node.dataset.lobbyText);
        q('.lobby-toggle').setAttribute('aria-label', t('title'));
        q('.lobby-toggle').title = t('title');
        q('.lobby-setup').hidden = lobby.active;
        q('.lobby-session').hidden = !lobby.active;
        const status = joining ? 'connecting' : notice || (lobby.active ? (!connected() ? 'offline' : readOnly ? 'quota' : (replica?.dirty || presenceTimer) ? 'pending' : 'ready') : 'idle');
        q('.lobby-status').textContent = t(status);
        root.dataset.state = connected() ? (readOnly ? 'paused' : 'connected') : lobby.active ? 'offline' : 'idle';
        q('.lobby-count').textContent = `${roster.length} / ${maximum}`;
        q('.lobby-map').textContent = replica ? `${replica.doc.mapId} · ${t('map')}` : '';
        q('.lobby-badge').textContent = lobby.active ? `${roster.length}/${maximum}` : '';
        q('.lobby-budget').textContent = `${t('remaining')}: ${remaining}`;
        q('.lobby-expires').textContent = `${t('expires')}: ${expiresAt ? new Date(expiresAt).toLocaleTimeString(LANG, { hour: '2-digit', minute: '2-digit' }) : '—'}`;
        q('.lobby-peers').replaceChildren(...roster.map((peer, index) => {
            const li = document.createElement('li');
            li.textContent = `${peerDisplayName(peer, index)}${peer.id === you ? ' •' : ''}`;
            return li;
        }));
        action('create').disabled = joining;
        action('join').disabled = joining;
        action('reconnect').hidden = connected(); action('reconnect').disabled = joining;
        action('close').hidden = !ownerKey; action('close').disabled = !connected();
        action('export').hidden = !recovery && !lobby.active;
        q('.lobby-recovery').hidden = !recovery;
        if (lobby.active) updateHistoryUI();
    }
    function open(value) {
        q('#lobbyPanel').hidden = !value;
        q('.lobby-toggle').setAttribute('aria-expanded', String(value));
    }
    function rememberPersonal() {
        clearTimeout(mapPointsWriteTimer); mapPointsWriteTimer = null;
        writeMapPoints();
        backup = { state: structuredClone(S), tools: structuredClone(MAP_TOOL_STATE), targets: structuredClone(savedTargets), disabled: {} };
        for (const id of ['mapSelect', 'apply', 'w', 'h']) {
            if ($(id)) { backup.disabled[id] = $(id).disabled; $(id).disabled = true; }
        }
        lobby.active = true;
        resetGesture();
    }
    function clearTimers() {
        clearTimeout(batchTimer); clearTimeout(presenceTimer); clearTimeout(connectTimer); clearTimeout(ackTimer); clearInterval(heartbeat);
        batchTimer = null; presenceTimer = null;
    }
    function preserve() {
        if (replica?.dirty) recovery = replica.view();
    }
    function leave(force = false) {
        if (!force && replica?.dirty && !confirm(t('leaveConfirm'))) return;
        preserve();
        const old = socket; socket = null; old?.close(1000, 'left'); clearTimers();
        joining = false;
        if (backup) {
            applying = true;
            resetGesture();
            Object.assign(S, backup.state); Object.assign(MAP_TOOL_STATE, backup.tools); savedTargets = backup.targets;
            for (const [id, disabled] of Object.entries(backup.disabled)) $(id).disabled = disabled;
            // Keep active until rendering finishes: no personal write hook sees room data.
            updatePresetLock(); inputs(); renderSavedTargets();
            lobby.active = false; applying = false; backup = null;
            updateMapToolsUI(); updateMapToolHistoryUI(); draw();
        }
        replica = null; observed = null; sentPresence = null; code = ''; ownerKey = ''; roster = []; readOnly = false; needsRender = false;
        updateUI();
    }
    function parseInvite(value) {
        let candidate = value.trim();
        if (candidate.includes('://')) candidate = new URLSearchParams(new URL(candidate).hash.slice(1)).get('room') || '';
        if (!/^[\w-]{22}\.[a-z0-9]{8,12}\.[\w-]{43}$/.test(candidate)) throw new Error('invalid-invite');
        return candidate;
    }
    function inviteLink() { const url = new URL(location.href); url.hash = `room=${code}`; return url.href; }
    function loadTurnstile() {
        if (!challengeRequired || window.turnstile) return Promise.resolve();
        if (turnstileLoader) return turnstileLoader;
        if (typeof turnstile.siteKey !== 'string' || !turnstile.siteKey.trim()) {
            return Promise.reject(new Error('turnstile-not-configured'));
        }
        turnstileLoader = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
            script.async = true;
            script.defer = true;
            script.dataset.wardogsTurnstile = '1';
            script.addEventListener('load', resolve, { once: true });
            script.addEventListener('error', () => reject(new Error('turnstile-unavailable')), { once: true });
            document.head.appendChild(script);
        });
        return turnstileLoader;
    }
    async function prepareChallenge() {
        if (!challengeRequired) return;
        const holder = q('.lobby-turnstile');
        holder.hidden = false;
        await loadTurnstile();
        if (!window.turnstile || typeof window.turnstile.render !== 'function') {
            throw new Error('turnstile-unavailable');
        }
        if (turnstileWidget !== null) return;
        turnstileWidget = window.turnstile.render(holder, {
            sitekey: turnstile.siteKey,
            action: turnstile.action || 'create-lobby',
            size: 'flexible',
            theme: document.documentElement.dataset.theme === 'light' ? 'light' : 'dark',
            callback: token => {
                challengeToken = token;
                notice = '';
                updateUI();
            },
            'expired-callback': () => {
                challengeToken = '';
                notice = 'challenge';
                updateUI();
            },
            'error-callback': () => {
                challengeToken = '';
                notice = 'security';
                updateUI();
            }
        });
    }
    function resetChallenge() {
        challengeToken = '';
        if (turnstileWidget !== null && window.turnstile?.reset) {
            window.turnstile.reset(turnstileWidget);
        }
    }
    async function requestAdmission(token = '') {
        const response = await fetch(`${base}/admission`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
            credentials: 'omit',
            referrerPolicy: 'no-referrer',
            signal: AbortSignal.timeout(10000)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        admission = parseInvite(data.admission);
        admissionExpiresAt = Number(data.expiresAt) || 0;
        q('.lobby-turnstile').hidden = true;
        if (data.mode === 'restricted') {
            trackLobby('lobby-admission-fallback', { mode: 'restricted' });
        }
        return admission;
    }
    async function getAdmission() {
        if (!challengeRequired) return '';
        if (admission && admissionExpiresAt > Date.now() + 5000) return admission;
        try {
            await prepareChallenge();
        } catch (challengeError) {
            try {
                // Mainland China can receive a tightly rate-limited signed admission
                // when Cloudflare's Turnstile script itself is unreachable. The Worker
                // rejects this tokenless request everywhere else.
                return await requestAdmission('');
            } catch (fallbackError) {
                if (fallbackError.message === 'challenge-required') throw challengeError;
                throw fallbackError;
            }
        }
        if (!challengeToken) return null;
        try {
            return await requestAdmission(challengeToken);
        } finally {
            resetChallenge();
        }
    }
    function connect(method = 'join') {
        clearTimers();
        const old = socket; socket = null; old?.close(1000, 'reconnect');
        connectionMethod = method;
        joining = true; notice = ''; sentPresence = null;
        const url = new URL(`${base}/rooms/${code}`); url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
        const current = new WebSocket(url);
        socket = current;
        connectTimer = setTimeout(() => current.close(4000, 'connect-timeout'), 15000);
        current.addEventListener('message', event => {
            if (socket !== current || event.data === 'pong') return;
            try {
                if (typeof event.data !== 'string' || event.data.length > P.LIMITS.messageBytes) throw new Error('bad-message');
                const msg = JSON.parse(event.data);
                if (msg.type === 'snapshot') {
                    const doc = validDocument(msg.doc);
                    const joinedNow = joining;
                    if (joinedNow) {
                        preserve();
                        if (!backup) rememberPersonal();
                        replica = new Replica(doc, msg.revision);
                        joining = false; readOnly = msg.remainingUpdates === 0; notice = '';
                        clearTimeout(connectTimer);
                        heartbeat = setInterval(() => { if (current.readyState === WebSocket.OPEN) current.send('ping'); }, 60000);
                    } else {
                        recovery = replica.snapshot(doc, msg.revision, msg) || recovery;
                        if (msg.error) {
                            notice = ['room-budget', 'daily-budget'].includes(msg.error) ? 'quota' : msg.error === 'conflict' ? 'conflict' : 'invalid';
                            readOnly = notice === 'quota'; open(true);
                        }
                    }
                    if (!replica.flight) clearTimeout(ackTimer);
                    you = P.slug(msg.you); roster = P.normalizeRoster(msg.roster, documentBounds(doc)); maximum = msg.maxParticipants; expiresAt = msg.expiresAt; remaining = msg.remainingUpdates;
                    q('.lobby-link').value = inviteLink();
                    render();
                    if (joinedNow) {
                        const data = { method: connectionMethod, map: doc.mapId };
                        if (connectionMethod === 'create') data.withSavedTargets = q('.lobby-include').checked;
                        trackLobby('lobby-connected', data);
                        schedulePresence(true);
                    }
                    schedule();
                } else if (msg.type === 'changes') {
                    replica.receive(msg);
                    remaining = msg.remainingUpdates;
                    if (!remaining) readOnly = true;
                    if (!replica.flight) clearTimeout(ackTimer);
                    render(); schedule();
                } else if (msg.type === 'ack') {
                    replica.confirm(msg.id, msg.revision);
                    remaining = msg.remainingUpdates;
                    clearTimeout(ackTimer);
                    render(); schedule();
                } else if (msg.type === 'rejected') {
                    recovery = replica.reject(msg.id, msg.revision) || recovery;
                    remaining = msg.remainingUpdates;
                    notice = ['room-budget', 'daily-budget'].includes(msg.code)
                        ? 'quota'
                        : msg.code === 'conflict'
                            ? 'conflict'
                            : 'invalid';
                    readOnly = notice === 'quota';
                    clearTimeout(ackTimer);
                    render(); open(true);
                } else if (msg.type === 'peers') {
                    const doc = replica?.doc;
                    roster = P.normalizeRoster(msg.roster, doc ? documentBounds(doc) : null);
                    updateUI(); draw();
                }
                else if (msg.type === 'closed') { notice = 'closed'; leave(true); open(true); }
                else if (msg.type === 'error') { notice = msg.code === 'rate-limited' ? 'limited' : 'failed'; updateUI(); }
            } catch (error) {
                console.error('[Lobby] invalid state:', error, event.data);
                preserve(); notice = 'failed'; current.close(4000, 'invalid-state');
            }
        });
        current.addEventListener('close', event => {
            if (socket !== current) return;
            const failedWhileJoining = joining;
            const activeMap = lobbyMap();
            console.error('[Lobby] socket closed:', {
                code: event.code,
                reason: event.reason,
                clean: event.wasClean
            });
            clearTimers(); joining = false;
            notice = lobby.active ? 'offline' : 'failed';
            preserve();
            if (lobby.active) { resetGesture(); render(); }
            updateUI(); open(true);
            if (failedWhileJoining) {
                trackLobby('lobby-failed', { operation: connectionMethod, reason: 'connection' });
            } else {
                trackLobby('lobby-disconnected', { map: activeMap });
            }
        });
        current.addEventListener('error', () => { notice = 'failed'; updateUI(); });
        updateUI();
    }
    async function create() {
        joining = true; notice = ''; updateUI();
        try {
            const doc = validDocument(rawDocument(q('.lobby-include').checked));
            const admissionToken = await getAdmission();
            if (admissionToken === null) {
                joining = false;
                notice = 'challenge';
                updateUI();
                return;
            }
            const response = await fetch(`${base}/rooms`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ doc, admission: admissionToken }), credentials: 'omit', referrerPolicy: 'no-referrer', signal: AbortSignal.timeout(15000)
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);
            code = parseInvite(data.code); ownerKey = data.ownerKey;
            q('.lobby-invite').value = inviteLink();
            connect('create');
        } catch (error) {
            joining = false;
            if (error.message === 'admission-room-limit') {
                admission = '';
                admissionExpiresAt = 0;
                notice = 'admissionLimit';
                try { await prepareChallenge(); } catch { notice = 'security'; }
            } else if (error.message === 'daily-room-limit') notice = 'budget';
            else if (error.message === 'rate-limited') notice = 'limited';
            else if (/^(challenge-|turnstile-)/.test(error.message)) notice = 'security';
            else notice = 'failed';
            trackLobby('lobby-failed', { operation: 'create', reason: failureReason(error) });
            updateUI();
        }
    }
    function exportCopy() {
        const doc = recovery || (replica ? replica.view() : null);
        if (!doc) return;
        // Existing target importers understand data/targets; player firing solutions are intentionally not exported.
        const payload = { type: 'wardogs-lobby-recovery', version: 1, doc, data: doc, targets: doc.savedTargets };
        const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
        const link = document.createElement('a'); link.href = url; link.download = 'wardogs-lobby-recovery.json'; link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        trackLobby('lobby-recovery-exported', { map: doc.mapId });
    }
    const peerColours = ['#64b5f6', '#81c784', '#ba68c8', '#ffb74d', '#4dd0e1', '#f06292', '#aed581', '#90a4ae'];
    function peerColour(id) {
        let hash = 0;
        for (const char of id) hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0;
        return peerColours[Math.abs(hash) % peerColours.length];
    }
    function peerDisplayName(peer, index) {
        const fallback = `${t('fallback')} ${index + 1}`;
        if (!peer.name) return fallback;
        const duplicate = roster.filter(candidate =>
            candidate.name && candidate.name.toLocaleLowerCase() === peer.name.toLocaleLowerCase()
        ).length > 1;
        return duplicate ? `${peer.name} · ${peer.id.slice(0, 4)}` : peer.name;
    }
    function visiblePeers() {
        return roster.flatMap((peer, index) => {
            if (peer.id === you || !peer.origin || !peer.target) return [];
            return [{ ...peer, displayName: peerDisplayName(peer, index) }];
        });
    }
    function drawPeerMarker(point, kind, label, colour, above) {
        const pos = worldToLocalScreen(point.x, point.y);
        ctx.save();
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 7, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(13,16,18,.92)';
        ctx.fill();
        ctx.strokeStyle = colour;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = colour;
        ctx.font = 'bold 9px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(kind, pos.x, pos.y + 0.5);

        const text = `${label} · ${kind}`;
        ctx.font = '600 11px system-ui, sans-serif';
        const width = Math.min(156, Math.max(44, ctx.measureText(text).width + 10));
        const labelY = pos.y + (above ? -21 : 21);
        ctx.fillStyle = 'rgba(13,16,18,.88)';
        ctx.fillRect(pos.x - width / 2, labelY - 8, width, 16);
        ctx.strokeStyle = colour;
        ctx.lineWidth = 1;
        ctx.strokeRect(pos.x - width / 2, labelY - 8, width, 16);
        ctx.fillStyle = '#fff';
        ctx.fillText(text, pos.x, labelY, width - 8);
        ctx.restore();
    }
    function drawPeers() {
        for (const peer of visiblePeers()) {
            const colour = peerColour(peer.id);
            const origin = worldToLocalScreen(peer.origin.x, peer.origin.y);
            const target = worldToLocalScreen(peer.target.x, peer.target.y);
            ctx.save();
            ctx.globalAlpha = 0.7;
            ctx.strokeStyle = colour;
            ctx.lineWidth = 1.5;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(origin.x, origin.y);
            ctx.lineTo(target.x, target.y);
            ctx.stroke();
            ctx.restore();
            drawPeerMarker(peer.origin, t('artilleryShort'), peer.displayName, colour, true);
            drawPeerMarker(peer.target, t('targetShort'), peer.displayName, colour, false);
        }
    }
    lobby = {
        active: false,
        capture,
        updateUI,
        updateHistoryUI,
        visiblePeers,
        drawPeers,
        undo: () => history('undo'),
        redo: () => history('redo')
    };
    q('.lobby-toggle').addEventListener('click', () => {
        const opening = q('#lobbyPanel').hidden;
        open(opening);
        if (opening && !lobbyOpenedTracked) {
            lobbyOpenedTracked = true;
            trackLobby('lobby-opened', { map: lobbyMap() });
        }
    });
    action('create').addEventListener('click', create);
    action('join').addEventListener('click', () => {
        try { const next = parseInvite(q('.lobby-invite').value); if (next !== code) ownerKey = ''; code = next; connect('join'); }
        catch (error) {
            notice = 'failed';
            trackLobby('lobby-failed', { operation: 'join', reason: failureReason(error) });
            updateUI();
        }
    });
    action('leave').addEventListener('click', () => {
        const wasActive = lobby.active;
        const activeMap = lobbyMap();
        notice = '';
        leave();
        if (wasActive && !lobby.active) trackLobby('lobby-left', { map: activeMap });
    });
    action('reconnect').addEventListener('click', () => { if (!replica?.dirty || confirm(t('reconnectConfirm'))) connect('reconnect'); });
    action('close').addEventListener('click', () => { if (connected() && confirm(t('closeConfirm'))) socket.send(JSON.stringify({ type: 'close', ownerKey })); });
    action('copy').addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(inviteLink());
            notice = 'copied';
            trackLobby('lobby-invite-copied', { map: lobbyMap() });
            updateUI();
        }
        catch { q('.lobby-link').focus(); q('.lobby-link').select(); }
    });
    action('export').addEventListener('click', exportCopy);
    // Do not leak control clicks / text typing to map gestures and hotkeys.
    for (const type of ['pointerdown', 'mousedown', 'touchstart', 'dblclick', 'wheel', 'click', 'keydown']) {
        root.addEventListener(type, event => {
            event.stopPropagation();
            if (type === 'keydown' && event.key === 'Escape') { open(false); q('.lobby-toggle').focus(); }
        });
    }
    // Finish drags once. Mousemove/pointermove never cause network messages.
    for (const type of ['pointerup', 'mouseup', 'touchend', 'touchcancel', 'keyup']) {
        window.addEventListener(type, () => queueMicrotask(capture));
    }
    // Freeze mutations when disconnected/limited, but keep the lobby exit controls usable.
    for (const type of ['pointerdown', 'mousedown', 'touchstart', 'click', 'keydown', 'change', 'input', 'drop']) {
        window.addEventListener(type, event => {
            if (!lobby.active || (connected() && !readOnly) || root.contains(event.target)) return;
            if (type === 'keydown' && (event.key === 'Tab' || event.key === 'F5' || ((event.ctrlKey || event.metaKey) && ['r', 'R'].includes(event.key)))) return;
            event.preventDefault(); event.stopImmediatePropagation(); open(true);
        }, { capture: true, passive: false });
    }
    window.addEventListener('beforeunload', event => { if (replica?.dirty) { event.preventDefault(); event.returnValue = ''; } });
    const initial = new URLSearchParams(location.hash.slice(1)).get('room');
    if (initial) { q('.lobby-invite').value = initial; open(true); }
    updateUI();
}
