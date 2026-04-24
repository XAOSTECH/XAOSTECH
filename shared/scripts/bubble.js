/**
 * XAOSTECH Floating User Bubble
 * 
 * A persistent, draggable user interface bubble that appears on all subdomains.
 * Features:
 * - User avatar with online status indicator
 * - Dark/Light theme toggle
 * - Notifications badge
 * - Quick navigation dropdown
 * - Draggable and collapsible
 * - State persists via localStorage
 * 
 * State preserved across page loads and subdomain navigation via localStorage.
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'xaostech_bubble';
  const THEME_KEY = 'xaostech_theme';

  // Default state
  const defaultState = {
    x: window.innerWidth - 80,
    y: window.innerHeight - 80,
    collapsed: false,
    expanded: false
  };

  // Load state from localStorage
  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? { ...defaultState, ...JSON.parse(saved) } : defaultState;
    } catch {
      return defaultState;
    }
  }

  // Save state to localStorage
  function saveState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Could not save bubble state:', e);
    }
  }

  // Get current theme
  function getTheme() {
    return localStorage.getItem(THEME_KEY) || 'dark';
  }

  // Set theme
  function setTheme(theme) {
    localStorage.setItem(THEME_KEY, theme);
    document.documentElement.setAttribute('data-theme', theme);
    document.body.classList.toggle('light-theme', theme === 'light');
  }

  // Fetch user data from account API (cookie is HttpOnly, sent automatically via credentials: 'include')
  async function fetchUser() {
    try {
      const res = await fetch('https://account.xaostech.io/api/auth/me', {
        credentials: 'include'
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Could not fetch user:', e);
    }
    return null;
  }

  // Create the bubble UI
  function createBubble(user, state) {
    // Remove existing bubble if any
    document.getElementById('xaos-bubble')?.remove();

    const bubble = document.createElement('div');
    bubble.id = 'xaos-bubble';
    bubble.innerHTML = `
      <style>
        #xaos-bubble {
          position: fixed;
          z-index: 99999;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          user-select: none;
          touch-action: none;
        }
        
        #xaos-bubble * {
          box-sizing: border-box;
        }
        
        .xb-main {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          border: 2px solid #00d4ff;
          cursor: grab;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 20px rgba(0, 212, 255, 0.3);
          transition: transform 0.2s, box-shadow 0.2s;
          position: relative;
        }
        
        .xb-main:hover {
          transform: scale(1.05);
          box-shadow: 0 6px 25px rgba(0, 212, 255, 0.4);
        }
        
        .xb-main:active {
          cursor: grabbing;
        }
        
        .xb-avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          object-fit: cover;
        }
        
        .xb-status {
          position: absolute;
          bottom: 2px;
          right: 2px;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #43a047;
          border: 2px solid #1a1a2e;
        }
        
        .xb-status.offline {
          background: #666;
        }
        
        .xb-badge {
          position: absolute;
          top: -4px;
          right: -4px;
          min-width: 20px;
          height: 20px;
          border-radius: 10px;
          background: #e53935;
          color: #fff;
          font-size: 11px;
          font-weight: bold;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 5px;
        }
        
        .xb-badge.hidden {
          display: none;
        }
        
        .xb-panel {
          position: absolute;
          bottom: 70px;
          right: 0;
          width: 240px;
          background: #1a1a2e;
          border: 1px solid #00d4ff33;
          border-radius: 12px;
          padding: 1rem;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
          opacity: 0;
          visibility: hidden;
          transform: translateY(10px) scale(0.95);
          transition: all 0.2s ease;
        }
        
        .xb-panel.visible {
          opacity: 1;
          visibility: visible;
          transform: translateY(0) scale(1);
        }

        /* Sub-panels (scaffold for messages + progress) */
        .xb-sub {
          position: absolute;
          bottom: 0;
          right: 260px;
          width: 280px;
          max-height: 360px;
          background: #1a1a2e;
          border: 1px solid #00d4ff33;
          border-radius: 12px;
          padding: .75rem;
          box-shadow: 0 8px 32px rgba(0,0,0,.4);
          display: flex;
          flex-direction: column;
        }
        .xb-sub[hidden] { display: none; }
        .xb-sub-h { display:flex;justify-content:space-between;align-items:center;font-weight:600;padding-bottom:.5rem;border-bottom:1px solid #ffffff15;margin-bottom:.5rem;color:#00d4ff }
        .xb-sub-x { background:none;border:0;color:#aaa;cursor:pointer;font-size:1.2rem;line-height:1 }
        .xb-sub-body { flex:1;overflow:auto;font-size:.9rem;color:#ddd }
        .xb-sub-foot { padding-top:.5rem;border-top:1px solid #ffffff15;margin-top:.5rem;text-align:center }
        .xb-empty { opacity:.5;text-align:center;padding:1.5rem .5rem;font-size:.85rem }
        .xb-conv { display:flex;align-items:center;gap:.5rem;padding:.5rem;border-radius:6px;cursor:pointer }
        .xb-conv:hover { background:#ffffff10 }
        .xb-conv .who { flex:1;font-weight:600 }
        .xb-conv .when { font-size:.7rem;opacity:.5 }
        .xb-prog-bar { background:#ffffff15;border-radius:99px;height:8px;overflow:hidden;margin:.5rem 0 }
        .xb-prog-fill { background:linear-gradient(90deg,#00d4ff,#43a047);height:100%;transition:width .3s }
        
        .xb-user {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid #ffffff15;
          margin-bottom: 0.75rem;
        }
        
        .xb-user-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          object-fit: cover;
        }
        
        .xb-user-info {
          flex: 1;
          min-width: 0;
        }
        
        .xb-user-name {
          color: #fff;
          font-weight: 600;
          font-size: 0.9rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .xb-user-role {
          color: #00d4ff;
          font-size: 0.75rem;
          text-transform: capitalize;
        }
        
        .xb-controls {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
        }
        
        .xb-btn {
          flex: 1;
          padding: 0.5rem;
          border: none;
          border-radius: 8px;
          background: #ffffff10;
          color: #ccc;
          cursor: pointer;
          font-size: 0.8rem;
          transition: background 0.2s, color 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.3rem;
        }
        
        .xb-btn:hover {
          background: #ffffff20;
          color: #fff;
        }
        
        .xb-btn.active {
          background: #00d4ff20;
          color: #00d4ff;
        }
        
        .xb-nav {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        
        .xb-nav a {
          color: #aaa;
          text-decoration: none;
          padding: 0.5rem 0.75rem;
          border-radius: 6px;
          font-size: 0.85rem;
          transition: background 0.2s, color 0.2s;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .xb-nav a:hover {
          background: #ffffff10;
          color: #fff;
        }
        
        .xb-nav a.current {
          background: #00d4ff15;
          color: #00d4ff;
        }
        
        .xb-collapse {
          position: absolute;
          top: -8px;
          left: -8px;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #333;
          border: 1px solid #555;
          color: #888;
          font-size: 10px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.2s;
        }
        
        #xaos-bubble:hover .xb-collapse {
          opacity: 1;
        }
        
        .xb-collapsed .xb-main {
          width: 20px;
          height: 20px;
          opacity: 0.5;
        }
        
        .xb-collapsed .xb-avatar,
        .xb-collapsed .xb-status,
        .xb-collapsed .xb-badge {
          display: none;
        }
        
        /* Light theme adjustments */
        body.light-theme #xaos-bubble .xb-main {
          background: linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%);
          border-color: #0099cc;
        }
        
        body.light-theme #xaos-bubble .xb-panel {
          background: #fff;
          border-color: #0099cc33;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
        }
        
        body.light-theme #xaos-bubble .xb-user-name {
          color: #333;
        }
        
        body.light-theme #xaos-bubble .xb-nav a {
          color: #666;
        }
        
        body.light-theme #xaos-bubble .xb-nav a:hover {
          background: #f0f0f0;
          color: #333;
        }
      </style>
      
      <div class="xb-collapse" title="Minimize">×</div>
      
      <div class="xb-main">
        <img class="xb-avatar" src="${user?.avatar_url || ''}" alt="User" onerror="this.style.display='none'" />
        <div class="xb-status ${user ? '' : 'offline'}"></div>
        <div class="xb-badge hidden" id="xb-notif-badge">0</div>
      </div>
      
      <div class="xb-panel">
        ${user ? `
          <div class="xb-user">
            <img class="xb-user-avatar" src="${user.avatar_url || ''}" alt="${user.username}" onerror="this.style.display='none'" />
            <div class="xb-user-info">
              <div class="xb-user-name">${user.username}</div>
              <div class="xb-user-role">${user.role || 'user'}</div>
            </div>
          </div>
        ` : `
          <div class="xb-user">
            <div class="xb-user-info">
              <div class="xb-user-name">Not signed in</div>
              <a href="https://account.xaostech.io/login" style="color:#00d4ff;font-size:0.85rem;">Sign in →</a>
            </div>
          </div>
        `}
        
        <div class="xb-controls">
          <button class="xb-btn" id="xb-theme-toggle" title="Toggle theme">
            <span id="xb-theme-icon">${getTheme() === 'dark' ? '☀️' : '🌙'}</span>
            <span>${getTheme() === 'dark' ? 'Light' : 'Dark'}</span>
          </button>
          ${user ? `
            <button class="xb-btn" id="xb-notif-btn" title="Notifications">
              🔔 <span id="xb-notif-count">0</span>
            </button>
            <button class="xb-btn" id="xb-msg-btn" title="Messages">
              ✉️ <span id="xb-msg-count">0</span>
            </button>
            <button class="xb-btn" id="xb-prog-btn" title="Learning progress">
              📈 <span id="xb-prog-pct">—</span>
            </button>
          ` : ''}
        </div>

        <!-- Sub-panel: Messages (scaffold) -->
        <div class="xb-sub xb-sub-msg" id="xb-sub-msg" hidden>
          <div class="xb-sub-h"><span>Messages</span><button class="xb-sub-x" data-close="msg">×</button></div>
          <div class="xb-sub-body" id="xb-msg-list">
            <div class="xb-empty">No conversations yet.</div>
          </div>
          <div class="xb-sub-foot"><small style="opacity:.5">DM scaffold — wired to api.xaostech.io/messages</small></div>
        </div>

        <!-- Sub-panel: Progress (scaffold) -->
        <div class="xb-sub xb-sub-prog" id="xb-sub-prog" hidden>
          <div class="xb-sub-h"><span>Learning progress</span><button class="xb-sub-x" data-close="prog">×</button></div>
          <div class="xb-sub-body" id="xb-prog-body">
            <div class="xb-empty">No active course.</div>
          </div>
          <div class="xb-sub-foot"><a href="https://edu.xaostech.io/courses" style="color:#00d4ff;font-size:.85rem">Browse courses →</a></div>
        </div>
        
        <nav class="xb-nav">
          <a href="https://xaostech.io" ${isCurrentDomain('xaostech.io') ? 'class="current"' : ''}>🏠 Home</a>
          <a href="https://account.xaostech.io" ${isCurrentDomain('account.xaostech.io') ? 'class="current"' : ''}>👤 Account</a>
          <a href="https://blog.xaostech.io" ${isCurrentDomain('blog.xaostech.io') ? 'class="current"' : ''}>📝 Blog</a>
          <a href="https://edu.xaostech.io" ${isCurrentDomain('edu.xaostech.io') ? 'class="current"' : ''}>📚 Edu</a>
          <a href="https://lingua.xaostech.io" ${isCurrentDomain('lingua.xaostech.io') ? 'class="current"' : ''}>🌍 Lingua</a>
          <a href="https://chat.xaostech.io" ${isCurrentDomain('chat.xaostech.io') ? 'class="current"' : ''}>💬 Chat</a>
        </nav>
      </div>
    `;

    // Set initial position
    bubble.style.left = state.x + 'px';
    bubble.style.top = state.y + 'px';

    if (state.collapsed) {
      bubble.classList.add('xb-collapsed');
    }

    document.body.appendChild(bubble);

    // Setup interactions
    setupDrag(bubble, state);
    setupToggle(bubble, state);
    setupTheme(bubble);
    setupSubPanels(bubble, user);

    return bubble;
  }

  // Sub-panel wiring (messages + progress) — scaffold
  function setupSubPanels(bubble, user) {
    if (!user) return;
    const API = 'https://api.xaostech.io';
    const EDU = 'https://edu.xaostech.io';

    const subMsg  = bubble.querySelector('#xb-sub-msg');
    const subProg = bubble.querySelector('#xb-sub-prog');

    function closeAll() { subMsg.hidden = true; subProg.hidden = true; }
    function open(panel) { closeAll(); panel.hidden = false; }

    bubble.querySelectorAll('.xb-sub-x').forEach((x) => {
      x.addEventListener('click', (e) => { e.stopPropagation(); closeAll(); });
    });

    const msgBtn = bubble.querySelector('#xb-msg-btn');
    if (msgBtn) {
      msgBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!subMsg.hidden) { closeAll(); return; }
        open(subMsg);
        await loadInbox();
      });
    }

    const progBtn = bubble.querySelector('#xb-prog-btn');
    if (progBtn) {
      progBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!subProg.hidden) { closeAll(); return; }
        open(subProg);
        await loadProgress();
      });
    }

    async function loadInbox() {
      const list = bubble.querySelector('#xb-msg-list');
      list.innerHTML = '<div class="xb-empty">Loading…</div>';
      try {
        const r = await fetch(API + '/messages/inbox', { credentials: 'include' });
        const data = await r.json();
        const conv = data.conversations || [];
        const cnt = bubble.querySelector('#xb-msg-count');
        if (cnt) cnt.textContent = data.unread || 0;
        if (!conv.length) { list.innerHTML = '<div class="xb-empty">No conversations yet.</div>'; return; }
        list.innerHTML = conv.map((c) => `
          <div class="xb-conv" data-peer="${c.peer?.id || ''}">
            <div class="who">${c.peer?.username || 'Unknown'}</div>
            <div class="when">${c.lastMessageAt ? new Date(c.lastMessageAt).toLocaleDateString() : ''}</div>
          </div>
        `).join('');
        // TODO: click handler → load thread (GET /messages/thread/:peerId), render messages, send box
      } catch (err) {
        list.innerHTML = '<div class="xb-empty">Failed to load.</div>';
      }
    }

    async function loadProgress() {
      const body = bubble.querySelector('#xb-prog-body');
      body.innerHTML = '<div class="xb-empty">Loading…</div>';
      try {
        // Determine active course: from edu summary, or from current page if on edu
        const sumR = await fetch(EDU + '/api/progress/_summary', { credentials: 'include' });
        const summary = sumR.ok ? await sumR.json() : { activeCourseId: null };
        const courseId = summary.activeCourseId
          || (location.hostname === 'edu.xaostech.io' && (location.pathname.match(/\/courses\/([^/]+)/) || [])[1]);
        if (!courseId) { body.innerHTML = '<div class="xb-empty">No active course. Browse courses below.</div>'; return; }
        const r = await fetch(EDU + '/api/progress/' + courseId, { credentials: 'include' });
        const p = await r.json();
        const pct = bubble.querySelector('#xb-prog-pct');
        if (pct) pct.textContent = (p.percent || 0) + '%';
        body.innerHTML = `
          <div style="font-weight:600;margin-bottom:.25rem">${p.courseId}</div>
          <div class="xb-prog-bar"><div class="xb-prog-fill" style="width:${p.percent || 0}%"></div></div>
          <div style="font-size:.8rem;opacity:.7">Chapter ${(p.currentChapter || 0) + 1} · ${p.xp || 0} XP</div>
        `;
      } catch (err) {
        body.innerHTML = '<div class="xb-empty">Failed to load.</div>';
      }
    }

    // Initial badge polling (lightweight: one fetch per panel mount)
    loadInbox().catch(() => {});
    loadProgress().catch(() => {});
  }

  function isCurrentDomain(domain) {
    return window.location.hostname === domain ||
      window.location.hostname === 'www.' + domain;
  }

  // Dragging functionality
  function setupDrag(bubble, state) {
    const main = bubble.querySelector('.xb-main');
    let isDragging = false;
    let startX, startY, startLeft, startTop;

    main.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.xb-collapse')) return;
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      startLeft = bubble.offsetLeft;
      startTop = bubble.offsetTop;
      main.setPointerCapture(e.pointerId);
      e.preventDefault();
    });

    main.addEventListener('pointermove', (e) => {
      if (!isDragging) return;

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      let newX = startLeft + dx;
      let newY = startTop + dy;

      // Constrain to viewport
      newX = Math.max(0, Math.min(window.innerWidth - 60, newX));
      newY = Math.max(0, Math.min(window.innerHeight - 60, newY));

      bubble.style.left = newX + 'px';
      bubble.style.top = newY + 'px';

      state.x = newX;
      state.y = newY;
    });

    main.addEventListener('pointerup', (e) => {
      if (!isDragging) return;
      isDragging = false;
      main.releasePointerCapture(e.pointerId);

      // Only toggle panel if it was a click (not drag)
      const dx = Math.abs(e.clientX - startX);
      const dy = Math.abs(e.clientY - startY);

      if (dx < 5 && dy < 5) {
        togglePanel(bubble, state);
      }

      saveState(state);
    });
  }

  // Panel toggle
  function togglePanel(bubble, state) {
    const panel = bubble.querySelector('.xb-panel');
    state.expanded = !state.expanded;
    panel.classList.toggle('visible', state.expanded);
    saveState(state);
  }

  // Collapse toggle
  function setupToggle(bubble, state) {
    const collapse = bubble.querySelector('.xb-collapse');
    collapse.addEventListener('click', (e) => {
      e.stopPropagation();
      state.collapsed = !state.collapsed;
      bubble.classList.toggle('xb-collapsed', state.collapsed);
      saveState(state);
    });
  }

  // Theme toggle
  function setupTheme(bubble) {
    const btn = bubble.querySelector('#xb-theme-toggle');
    if (!btn) return;

    btn.addEventListener('click', () => {
      const newTheme = getTheme() === 'dark' ? 'light' : 'dark';
      setTheme(newTheme);

      const icon = bubble.querySelector('#xb-theme-icon');
      const label = btn.querySelector('span:last-child');
      icon.textContent = newTheme === 'dark' ? '☀️' : '🌙';
      label.textContent = newTheme === 'dark' ? 'Light' : 'Dark';
    });
  }

  // Close panel when clicking outside
  document.addEventListener('click', (e) => {
    const bubble = document.getElementById('xaos-bubble');
    if (!bubble) return;

    if (!bubble.contains(e.target)) {
      const panel = bubble.querySelector('.xb-panel');
      const state = loadState();
      if (state.expanded) {
        state.expanded = false;
        panel.classList.remove('visible');
        saveState(state);
      }
      // Also collapse any open sub-panels
      bubble.querySelectorAll('.xb-sub').forEach((s) => { s.hidden = true; });
    }
  });

  // Initialize
  async function init() {
    // Apply saved theme immediately
    setTheme(getTheme());

    const state = loadState();
    const user = await fetchUser();
    createBubble(user, state);

    // Handle window resize
    window.addEventListener('resize', () => {
      const bubble = document.getElementById('xaos-bubble');
      if (!bubble) return;

      const state = loadState();
      // Keep bubble in viewport
      state.x = Math.min(state.x, window.innerWidth - 60);
      state.y = Math.min(state.y, window.innerHeight - 60);
      bubble.style.left = state.x + 'px';
      bubble.style.top = state.y + 'px';
      saveState(state);
    });
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
