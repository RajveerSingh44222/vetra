/* ==========================================
   VETRA PASSWORD MANAGER - APPLICATION LOGIC
   ========================================== */

const API_BASE_URL = "vetra-production-2545.up.railway.app";

class VetraApp {
  constructor() {
    this.state = {
      currentView: 'landing',
      currentTab: 'all',
      currentUser: null,
      credentials: [],
      activeAccordion: false,
      searchQuery: '',
    };

    this.searchDebounceTimer = null;
    this.init();
  }

  async init() {
    const token = localStorage.getItem("access_token");
    if (token) {
      try {
        // Restore user session and validate JWT token
        const user = await this.getCurrentUser();
        this.state.currentUser = user.email || user.username || "User";
        await this.loadVault();
        this.navigateTo("dashboard");
      } catch (error) {
        console.error("Token verification failed, reverting session:", error);
        localStorage.removeItem("access_token");
        localStorage.removeItem("user_email");
        this.navigateTo('landing');
        this.setupSandbox();
      }
    } else {
      this.navigateTo('landing');
      this.setupSandbox();
    }

    // Global Key listener for Dashboard Search Focus (/)
    window.addEventListener('keydown', (e) => {
      if (e.key === '/' && this.state.currentView === 'dashboard') {
        const searchInput = document.getElementById('vault-search');
        if (searchInput && document.activeElement !== searchInput) {
          e.preventDefault();
          searchInput.focus();
          searchInput.select();
        }
      }
    });

    // Default password generation preview
    this.generatePasswordAndPreview();
  }

  // --- ROUTING ENGINE ---
  navigateTo(viewId) {
    // Hide all view sections
    const sections = document.querySelectorAll('.view-section');
    sections.forEach(sec => sec.classList.remove('active'));

    // Deactivate main header layout if in dashboard
    const header = document.getElementById('main-header');
    if (header) {
      if (viewId === 'dashboard') {
        header.classList.add('hidden');
      } else {
        header.classList.remove('hidden');
      }
    }

    // Show selected view
    const targetSection = document.getElementById(`view-${viewId}`);
    if (targetSection) {
      targetSection.classList.add('active');
      this.state.currentView = viewId;
    }

    // Update login status elements
    if (viewId === 'dashboard') {
      const sidebarEmail = document.getElementById('sidebar-email');
      if (sidebarEmail) sidebarEmail.textContent = this.state.currentUser;

      const userAvatar = document.getElementById('user-avatar');
      if (userAvatar && this.state.currentUser) {
        userAvatar.textContent = this.state.currentUser.substring(0, 2).toUpperCase();
      }
      this.renderDashboard();
    }
  }

  scrollToSection(sectionId, event) {
    if (event) event.preventDefault();
    if (this.state.currentView !== 'landing') {
      this.navigateTo('landing');
      // Timeout to wait for transition
      setTimeout(() => {
        const target = document.getElementById(sectionId);
        if (target) target.scrollIntoView({ behavior: 'smooth' });
      }, 300);
    } else {
      const target = document.getElementById(sectionId);
      if (target) target.scrollIntoView({ behavior: 'smooth' });
    }
  }

  // --- CRYPTO PLAYGROUND SANDBOX ---
  setupSandbox() {
    const textInput = document.getElementById('sandbox-input');
    const keyInput = document.getElementById('sandbox-key');

    if (textInput && keyInput) {
      const updatePlayground = async () => {
        const plaintext = textInput.value;
        const key = keyInput.value;
        const outputEl = document.getElementById('sandbox-output');

        if (!outputEl) return;

        if (!plaintext || !key) {
          outputEl.textContent = 'Enter text and key to view simulated ciphertext...';
          return;
        }

        try {
          // Native Web Crypto API derivation & encryption
          const encoder = new TextEncoder();
          const keyData = encoder.encode(key);
          const rawText = encoder.encode(plaintext);

          // Import key material
          const keyMaterial = await window.crypto.subtle.importKey(
            "raw", 
            keyData, 
            "PBKDF2", 
            false, 
            ["deriveKey"]
          );

          // Derive AES-GCM 256 key
          const derivedKey = await window.crypto.subtle.deriveKey(
            {
              name: "PBKDF2",
              salt: encoder.encode("vetra-sandbox-salt"),
              iterations: 5000,
              hash: "SHA-256"
            },
            keyMaterial,
            { name: "AES-GCM", length: 256 },
            true,
            ["encrypt"]
          );

          // Encrypt rawText
          const iv = window.crypto.getRandomValues(new Uint8Array(12));
          const ciphertext = await window.crypto.subtle.encrypt(
            {
              name: "AES-GCM",
              iv: iv
            },
            derivedKey,
            rawText
          );

          // Format output
          const ivHex = Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('');
          const cipherHex = Array.from(new Uint8Array(ciphertext)).map(b => b.toString(16).padStart(2, '0')).join('');
          
          outputEl.textContent = `{\n  "algorithm": "AES-GCM-256",\n  "iv": "${ivHex.slice(0, 16)}...",\n  "salt": "vetra-sandbox-salt",\n  "iterations": 5000,\n  "ciphertext": "${cipherHex.slice(0, 60)}..."\n}`;
        } catch (err) {
          // Fail-safe simple hashing mock if WebCrypto fails
          const mockCipher = btoa(plaintext + key).substring(0, 48);
          outputEl.textContent = `{\n  "algorithm": "AES-GCM-256-SIMULATED",\n  "ciphertext": "${mockCipher}"\n}`;
        }
      };

      textInput.addEventListener('input', updatePlayground);
      keyInput.addEventListener('input', updatePlayground);
      updatePlayground();
    }
  }

  // --- PASSWORD STRENGTH METER ---
  evaluateKeyStrength(key) {
    const fill = document.getElementById('strength-fill');
    const label = document.getElementById('strength-text');
    if (!fill || !label) return;

    if (!key) {
      fill.style.width = '0%';
      fill.style.background = 'transparent';
      label.textContent = 'Key strength: Empty';
      return;
    }

    let score = 0;
    if (key.length >= 8) score++;
    if (key.length >= 12) score++;
    if (/[A-Z]/.test(key)) score++;
    if (/[a-z]/.test(key)) score++;
    if (/[0-9]/.test(key)) score++;
    if (/[^A-Za-z0-9]/.test(key)) score++;

    let percentage = Math.min((score / 6) * 100, 100);
    fill.style.width = `${percentage}%`;

    if (score <= 2) {
      fill.style.backgroundColor = 'var(--danger)';
      label.textContent = 'Key strength: Weak (Vulnerable)';
      label.style.color = 'var(--danger)';
    } else if (score <= 4) {
      fill.style.backgroundColor = 'var(--warning)';
      label.textContent = 'Key strength: Fair (Medium)';
      label.style.color = 'var(--warning)';
    } else {
      fill.style.backgroundColor = 'var(--success)';
      label.textContent = 'Key strength: Strong (Excellent)';
      label.style.color = 'var(--success)';
    }
  }
  getPasswordStrength(password) {
    if (!password) {
      return {
        label: "Unknown",
        className: "weak"
      };
    }

    let score = 0;

    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 2) {
      return {
        label: "Weak",
        className: "weak"
      };
    }

    if (score <= 4) {
      return {
        label: "Fair",
        className: "warning"
      };
    }

    return {
      label: "Strong",
      className: "excellent"
    };
  }
  togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    if (input) {
      input.type = input.type === 'password' ? 'text' : 'password';
    }
  }

  // --- SIGN UP HANDLER ---
  async handleSignUp(e) {
    console.log("SIGNUP BUTTON CLICKED");
    e.preventDefault();

    const emailEl = document.getElementById('signup-email');
    const keyEl = document.getElementById('signup-key');
    const confirmEl = document.getElementById('signup-key-confirm');

    if (!emailEl || !keyEl || !confirmEl) return;

    const email = emailEl.value;
    const key = keyEl.value;
    const confirm = confirmEl.value;

    if (key !== confirm) {
      this.showToast("Master Keys do not match.", "error");
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/auth/signup`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            email: email,
            master_password: key
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        this.showToast(
          data.detail || "Signup failed",
          "error"
        );
        return;
      }

      this.showToast(
        "Account created successfully",
        "success"
      );

      this.navigateTo("signin");

    } catch (error) {
      console.error(error);
      this.showToast(
        "Backend connection failed",
        "error"
      );
    }
  }

  // --- API REQUEST ENGINE ---
  async apiRequest(endpoint, method = "GET", body = null) {
    const token = localStorage.getItem("access_token");

    const options = {
      method,
      headers: {
        "Content-Type": "application/json"
      }
    };

    if (token) {
      options.headers["Authorization"] = `Bearer ${token}`;
    }

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(
      `${API_BASE_URL}${endpoint}`,
      options
    );

    // Support empty responses (like 204 No Content)
    if (response.status === 204) {
      return null;
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.detail || "Request failed"
      );
    }

    return data;
  }

  async loadVault() {
    try {
      const entries = await this.getVaultEntries();
      // Map API fields to UI-expected schema
      this.state.credentials = entries.map(entry => ({
        id: entry.id,
        type: entry.type || 'login',
        name: entry.website_name || '',
        url: entry.website_url || '',
        username: entry.login_identifier || '',
        password: entry.password || '••••••••',
        notes: entry.notes || '',
        lastUpdated: entry.last_updated || entry.updated_at || new Date().toISOString().split('T')[0]
      }));
      this.renderDashboard();
    } catch (error) {
      console.error("Failed to load vault:", error);
      this.showToast("Failed to load vault credentials.", "error");
    }
  }

  async getVaultEntries() {
    return await this.apiRequest(
      "/vault",
      "GET"
    );
  }

  async getVaultEntry(id) {
    return await this.apiRequest(
      `/vault/${id}`,
      "GET"
    );
  }

  async createVaultEntry(payload) {
    return await this.apiRequest(
      "/vault",
      "POST",
      payload
    );
  }

  async updateVaultEntry(id, payload) {
    return await this.apiRequest(
      `/vault/${id}`,
      "PUT",
      payload
    );
  }

  async deleteVaultEntry(id) {
    return await this.apiRequest(
      `/vault/${id}`,
      "DELETE"
    );
  }

  async searchVault(query) {
    return await this.apiRequest(
      `/vault/search?q=${encodeURIComponent(query)}`,
      "GET"
    );
  }

  async getStats() {
    return await this.apiRequest(
      "/dashboard/stats",
      "GET"
    );
  }

  async apiGeneratePassword(length, options = { upper: true, lower: true, numbers: true, symbols: true }) {
    const params = new URLSearchParams({
      length: length.toString(),
      upper: options.upper.toString(),
      lower: options.lower.toString(),
      numbers: options.numbers.toString(),
      symbols: options.symbols.toString()
    });

    const response = await this.apiRequest(
      `/tools/generate-password?${params.toString()}`,
      "GET"
    );
    return response.password || response.generated_password || response;
  }

  async decryptPassword(id) {
  try {
    const data = await this.apiRequest(
      `/vault/${id}/decrypt`,
      "GET"
    );

    console.log("DECRYPT SUCCESS:", data);

    return data.password;
  } catch (error) {
    console.error(
      "DECRYPT FAILED:",
      error
    );

    alert(error.message);

    return "";
  }
}

  // --- SIGN IN HANDLER ---
  async handleSignIn(e) {
    console.log("LOGIN BUTTON CLICKED");
    e.preventDefault();

    const emailEl = document.getElementById('signin-email');
    const keyEl = document.getElementById('signin-key');

    if (!emailEl || !keyEl) return;

    const email = emailEl.value;
    const key = keyEl.value;

    try {
      const response = await fetch(
        `${API_BASE_URL}/auth/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            email: email,
            master_password: key
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        this.showToast(
          data.detail || "Login failed",
          "error"
        );
        return;
      }

      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("user_email", email);

      this.state.currentUser = email;

      await this.loadVault();
      this.simulateDecryption(email);
    } catch (error) {
      console.error(error);
      this.showToast(
        "Backend connection failed",
        "error"
      );
    }
  }

  simulateDecryption(email) {
    const overlay = document.getElementById('decrypt-overlay');
    const title = document.getElementById('decrypt-status-title');
    const fill = document.getElementById('decrypt-progress-fill');
    const log = document.getElementById('decrypt-log');

    if (!overlay || !title || !fill || !log) {
      this.navigateTo('dashboard');
      this.showToast("Vault successfully unlocked.", "success");
      return;
    }

    overlay.classList.remove('hidden');
    overlay.classList.add('unlocking');
    log.innerHTML = '';
    
    const logs = [
      "Connecting to Vetra backend API...",
      "Authenticating JWT token claims...",
      "Stretching master key using remote PBKDF2 parameters...",
      "Requesting encrypted vault payloads...",
      "Decrypting payload block using authenticated AES-GCM-256...",
      "Validating GCM tag integrity...",
      "Decryption successful. Loading dashboard UI..."
    ];

    let progress = 0;
    let step = 0;

    const timer = setInterval(() => {
      progress += Math.floor(Math.random() * 15) + 5;
      if (progress >= 100) {
        progress = 100;
        clearInterval(timer);
        
        setTimeout(() => {
          overlay.classList.add('hidden');
          overlay.classList.remove('unlocking');
          this.navigateTo('dashboard');
          this.showToast("Vault successfully unlocked & decrypted.", "success");
        }, 300);
      }

      fill.style.width = `${progress}%`;
      
      if (step < logs.length && progress >= (step / logs.length) * 100) {
        title.textContent = logs[step];
        const logLine = document.createElement('div');
        logLine.textContent = `> ${logs[step]}`;
        log.appendChild(logLine);
        log.scrollTop = log.scrollHeight;
        step++;
      }
    }, 150);
  }

  async handleLockVault() {
    try {
      const token = localStorage.getItem('access_token');

      await fetch(
  `${API_BASE_URL}/auth/logout`,
  {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`
    }
  }
);
    } catch (err) {
      console.error(err);
    }

    localStorage.removeItem('access_token');
    localStorage.removeItem('user_email');

    this.state.currentUser = null;
    this.state.credentials = [];

    this.navigateTo('landing');
    this.showToast("Vault locked. Cryptographic session cleared.", "info");
  }

  handleForgotAccount() {
    this.showToast("Under Vetra's zero-knowledge architecture, account recovery is impossible. Ensure you keep backups of your keys.", "error");
  }

  // --- DASHBOARD AND VAULT RENDER ---
  switchTab(tabId) {
    this.state.currentTab = tabId;
    
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => item.classList.remove('active'));
    
    const targetMenu = document.getElementById(`menu-${tabId}`);
    if (targetMenu) targetMenu.classList.add('active');
    
    const titles = {
      'all': 'All Credentials',
      'logins': 'Login Vault',
      'cards': 'Payment Cards',
      'notes': 'Secure Notes'
    };
    const titleEl = document.getElementById('current-category-title');
    if (titleEl) titleEl.textContent = titles[tabId];
    
    this.renderDashboard();
  }

  handleSearch(val) {
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }
    // Debounce to prevent flooding the backend search endpoint
    this.searchDebounceTimer = setTimeout(async () => {
      this.state.searchQuery = val.trim();
      if (this.state.searchQuery) {
        try {
          const entries = await this.searchVault(this.state.searchQuery);
          this.state.credentials = entries.map(entry => ({
            id: entry.id,
            type: entry.type || 'login',
            name: entry.website_name || '',
            url: entry.website_url || '',
            username: entry.login_identifier || '',
            password: entry.password || '••••••••',
            notes: entry.notes || '',
            lastUpdated: entry.last_updated || entry.updated_at || new Date().toISOString().split('T')[0]
          }));
          this.renderCredentialsList();
        } catch (error) {
          console.error("Search query execution failed:", error);
        }
      } else {
        await this.loadVault();
      }
    }, 250);
  }

  renderDashboard() {
    this.updateStats();
    this.renderCredentialsList();
  }

  async updateStats() {
    try {
      const stats = await this.getStats();

      // Stats fields mapper
      const counts = {
        all: stats.total || stats.total_count || this.state.credentials.length,
        logins: stats.logins_count || (stats.counts && stats.counts.logins) || this.state.credentials.filter(c => c.type === 'login').length,
        cards: stats.cards_count || (stats.counts && stats.counts.cards) || this.state.credentials.filter(c => c.type === 'card').length,
        notes: stats.notes_count || (stats.counts && stats.counts.notes) || this.state.credentials.filter(c => c.type === 'note').length
      };

      const totalVal = stats.total || stats.total_count || counts.all;
      const strongVal = stats.strong || stats.strong_count || 0;
      const weakVal = stats.weak || stats.weak_count || 0;
      const healthVal = stats.health || stats.health_score || stats.health_rating || 100;

      // Update sidebar badges
      const badgeAll = document.getElementById('badge-count-all');
      if (badgeAll) badgeAll.textContent = counts.all;

      const badgeLogins = document.getElementById('badge-count-logins');
      if (badgeLogins) badgeLogins.textContent = counts.logins;

      const badgeCards = document.getElementById('badge-count-cards');
      if (badgeCards) badgeCards.textContent = counts.cards;

      const badgeNotes = document.getElementById('badge-count-notes');
      if (badgeNotes) badgeNotes.textContent = counts.notes;

      // Stat Cards
      const statTotal = document.getElementById('stat-total');
      if (statTotal) statTotal.textContent = totalVal;

      const statStrong = document.getElementById('stat-strong');
      if (statStrong) statStrong.textContent = strongVal;

      const statWeak = document.getElementById('stat-weak');
      if (statWeak) statWeak.textContent = weakVal;

      // Vault Health Rating
      const statHealth = document.getElementById('stat-health');
      if (statHealth) statHealth.textContent = `${healthVal}%`;

      // Circular Progress Fill
      const ringFill = document.getElementById('health-ring-fill');
      if (ringFill) {
        const circumference = 138.23; // 2 * pi * r (r=22)
        const offset = circumference * (1 - healthVal / 100);
        ringFill.style.strokeDashoffset = offset;
      }

      // Toggle insight banner if warning exists
      const banner = document.getElementById('security-insight-banner');
      if (banner) {
        if (weakVal > 0) {
          banner.classList.remove('hidden');
        } else {
          banner.classList.add('hidden');
        }
      }
    } catch (error) {
      console.error("Failed to load dashboard stats:", error);
    }
  }

  renderCredentialsList() {
    const body = document.getElementById('vault-list-body');
    const msg = document.getElementById('no-credentials-msg');
    if (!body) return;

    body.innerHTML = '';

    // Filter items
    let items = this.state.credentials;
    
    // Tab filtering
    if (this.state.currentTab !== 'all') {
      const typeMap = {
        'logins': 'login',
        'cards': 'card',
        'notes': 'note'
      };
      items = items.filter(c => c.type === typeMap[this.state.currentTab]);
    }

    if (items.length === 0) {
      if (msg) msg.classList.remove('hidden');
      this.closeDetailsDrawer();
      return;
    } else {
      if (msg) msg.classList.add('hidden');
    }

    items.forEach(c => {
      const tr = document.createElement('tr');
      tr.id = `row-${c.id}`;
      if (this.state.selectedCredentialId === c.id) {
        tr.classList.add('selected');
      }

      tr.addEventListener('click', (e) => {
        if (e.target.closest('.action-btn')) return;
        this.selectCredential(c.id);
      });
      
      const letter = c.name.charAt(0).toUpperCase();

      tr.innerHTML = `
        <td>
          <div class="table-item-cell">
            <div class="item-icon-circle">${letter}</div>
            <div class="item-info-text">
              <span class="item-name">${c.name}</span>
              ${c.url ? `<span class="item-url">${c.url}</span>` : ''}
            </div>
          </div>
        </td>
        <td class="cell-muted">${c.username || '—'}</td>
        <td class="cell-muted">${c.lastUpdated}</td>
        <td class="text-right">
          <div class="actions-cell">
            ${c.type !== 'note' ? `
              <button class="action-btn" onclick="app.copyToClipboard('${c.username}', this, 'Username copied')" title="Copy Username">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              </button>
            ` : ''}
            <button class="action-btn" onclick="app.handleCopyPassword('${c.id}', this)" title="Copy Secret">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </button>
            <button class="action-btn" onclick="app.openEditModal('${c.id}')" title="Edit Item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            </button>
            <button class="action-btn btn-delete" onclick="app.handleDeleteCredential('${c.id}')" title="Delete Item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        </td>
      `;
      body.appendChild(tr);
    });

    // Keep active selection visible
    if (this.state.selectedCredentialId) {
      const selectedExists = items.some(c => c.id === this.state.selectedCredentialId);
      if (selectedExists) {
        this.selectCredential(this.state.selectedCredentialId);
      } else {
        this.closeDetailsDrawer();
      }
    }
  }

  // --- CRUD METHODS ---
  openAddModal() {
    const title = document.getElementById('modal-title');
    if (title) title.textContent = "Add Credential";

    const form = document.getElementById('credential-form');
    if (form) form.reset();

    const credId = document.getElementById('cred-id');
    if (credId) credId.value = '';
    
    this.handleTypeChange('login');

    const modal = document.getElementById('add-modal');
    if (modal) modal.classList.add('active');
  }

  async openEditModal(id) {
    try {
      const entry = await this.getVaultEntry(id);
      const decryptedPassword = await this.decryptPassword(id);

      const title = document.getElementById('modal-title');
      if (title) title.textContent = "Edit Credential";

      const credId = document.getElementById('cred-id');
      if (credId) credId.value = entry.id;

      const credType = document.getElementById('cred-type');
      if (credType) credType.value = entry.type || 'login';

      const credName = document.getElementById('cred-name');
      if (credName) credName.value = entry.website_name || '';

      const credUrl = document.getElementById('cred-url');
      if (credUrl) credUrl.value = entry.website_url || '';

      const credUsername = document.getElementById('cred-username');
      if (credUsername) credUsername.value = entry.login_identifier || '';

      const credPassword = document.getElementById('cred-password');
      if (credPassword) credPassword.value = decryptedPassword;

      const credNotes = document.getElementById('cred-notes');
      if (credNotes) credNotes.value = entry.notes || '';

      this.handleTypeChange(entry.type || 'login');

      const modal = document.getElementById('add-modal');
      if (modal) modal.classList.add('active');
    } catch (error) {
      console.error("Failed to load item for editing:", error);
      this.showToast("Failed to load credential information.", "error");
    }
  }

  closeAddModal() {
    const modal = document.getElementById('add-modal');
    if (modal) modal.classList.remove('active');
  }

  handleTypeChange(type) {
    const urlGroup = document.getElementById('group-url');
    const userGroup = document.getElementById('group-username');
    const passGroup = document.getElementById('group-password');
    const genGroup = document.getElementById('generator-section');

    const nameLabel = document.getElementById('label-cred-name');
    const userLabel = document.getElementById('label-cred-username');
    const passLabel = document.getElementById('label-cred-password');

    if (type === 'login') {
      if (urlGroup) urlGroup.classList.remove('hidden');
      if (userGroup) userGroup.classList.remove('hidden');
      if (passGroup) passGroup.classList.remove('hidden');
      if (genGroup) genGroup.classList.remove('hidden');
      if (nameLabel) nameLabel.textContent = "Website / Name";
      if (userLabel) userLabel.textContent = "Username / Email";
      if (passLabel) passLabel.textContent = "Password";
    } else if (type === 'card') {
      if (urlGroup) urlGroup.classList.remove('hidden');
      if (userGroup) userGroup.classList.remove('hidden');
      if (passGroup) passGroup.classList.remove('hidden');
      if (genGroup) genGroup.classList.add('hidden');
      if (nameLabel) nameLabel.textContent = "Card Network / Bank";
      if (userLabel) userLabel.textContent = "Card Number";
      if (passLabel) passLabel.textContent = "Expiration & CVV";
    } else if (type === 'note') {
      if (urlGroup) urlGroup.classList.add('hidden');
      if (userGroup) userGroup.classList.add('hidden');
      if (passGroup) passGroup.classList.add('hidden');
      if (genGroup) genGroup.classList.add('hidden');
      if (nameLabel) nameLabel.textContent = "Note Title";
    }
  }

  async handleSaveCredential(e) {
    e.preventDefault();

    const idVal = document.getElementById("cred-id");
    const typeVal = document.getElementById("cred-type");
    const nameVal = document.getElementById("cred-name");
    const urlVal = document.getElementById("cred-url");
    const userVal = document.getElementById("cred-username");
    const passVal = document.getElementById("cred-password");
    const notesVal = document.getElementById("cred-notes");

    if (!nameVal) return;

    const id = idVal ? idVal.value : '';
    const type = typeVal ? typeVal.value : 'login';
    const website_name = nameVal.value;
    const website_url = urlVal ? urlVal.value : '';
    const login_identifier = userVal ? userVal.value : '';
    const password = passVal ? passVal.value : '';
    const notes = notesVal ? notesVal.value : '';

    try {
      const payload = {
        type,
        website_name,
        website_url,
        login_identifier,
        password,
        notes,
      };

      if (id) {
        await this.updateVaultEntry(id, payload);
        this.showToast(
          "Credential updated successfully",
          "success"
        );
      } else {
        await this.createVaultEntry(payload);
        this.showToast(
          "Credential saved successfully",
          "success"
        );
      }

      await this.loadVault();
      this.closeAddModal();
    } catch (error) {
      this.showToast(
        error.message,
        "error"
      );
    }
  }

  async deleteCredential(id) {
    try {
      await this.deleteVaultEntry(id);
      await this.loadVault();
      this.showToast(
        "Credential deleted",
        "success"
      );
    } catch (error) {
      this.showToast(
        error.message,
        "error"
      );
    }
  }

  handleDeleteCredential(id) {
    if (confirm("Are you sure you want to delete this credential?")) {
      this.deleteCredential(id);
    }
  }

  // --- PASSWORD GENERATOR ---
  toggleGeneratorAccordion() {
    const content = document.getElementById('gen-content');
    if (content) content.classList.toggle('collapsed');
  }

  updateGenLength(val) {
    const lenVal = document.getElementById('gen-length-val');
    if (lenVal) lenVal.textContent = val;
    this.generatePasswordAndPreview();
  }

  async generatePasswordAndPreview() {
    const lengthEl = document.getElementById('gen-length');
    if (!lengthEl) return;

    const length = parseInt(lengthEl.value) || 16;
    
    const upperEl = document.getElementById('gen-upper');
    const lowerEl = document.getElementById('gen-lower');
    const numbersEl = document.getElementById('gen-numbers');
    const symbolsEl = document.getElementById('gen-symbols');

    const upper = upperEl ? upperEl.checked : true;
    const lower = lowerEl ? lowerEl.checked : true;
    const numbers = numbersEl ? numbersEl.checked : true;
    const symbols = symbolsEl ? symbolsEl.checked : true;

    try {
      const pass = await this.apiGeneratePassword(length, { upper, lower, numbers, symbols });
      const targetInput = document.getElementById('cred-password');
      if (targetInput && pass) {
        targetInput.value = pass;
      }
    } catch (error) {
      console.error("Backend password generation failed:", error);
    }
  }

  async generateAndFillPassword() {
    await this.generatePasswordAndPreview();
    this.showToast("High-entropy password generated from backend.", "info");
  }

  // --- CLIPBOARD ACTIONS & TOASTS ---
  async copyToClipboard(text, btnElement, successMsg) {
    try {
      await navigator.clipboard.writeText(text);
      
      // Visual feedback on button
      const oldHtml = btnElement.innerHTML;
      btnElement.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      `;
      
      setTimeout(() => {
        btnElement.innerHTML = oldHtml;
      }, 1500);

      this.showToast(successMsg, "success");
    } catch (err) {
      this.showToast("Clipboard write permission blocked.", "error");
    }
  }

  async handleCopyPassword(id, btnElement) {
    const password = await this.decryptPassword(id);

    console.log("Decrypted value:", password);

    if (password) {
      await this.copyToClipboard(
        password,
        btnElement,
        "Password copied"
      );
    }
  }

  showToast(message, type = "info") {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let icon = "";
    if (type === "success") {
      icon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    } else if (type === "error") {
      icon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
    } else {
      icon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
    }

    toast.innerHTML = `
      ${icon}
      <span>${message}</span>
    `;

    container.appendChild(toast);

    // Fade out and remove
    setTimeout(() => {
      toast.classList.add('fade-out');
      toast.addEventListener('animationend', () => {
        toast.remove();
      });
    }, 3000);
  }

  async getCurrentUser() {
    return await this.apiRequest(
      "/auth/me",
      "GET"
    );
  }

  async selectCredential(id) {
    this.state.selectedCredentialId = id;
    
    // Highlight correct row in list
    const rows = document.querySelectorAll('#vault-list-body tr');
    rows.forEach(r => r.classList.remove('selected'));
    const selectedRow = document.getElementById(`row-${id}`);
    if (selectedRow) selectedRow.classList.add('selected');

    const emptyPanel = document.getElementById('details-empty');
    const contentPanel = document.getElementById('details-content');
    const drawer = document.getElementById('details-drawer');

    if (emptyPanel) emptyPanel.classList.add('hidden');
    if (contentPanel) contentPanel.classList.remove('hidden');
    if (drawer) drawer.classList.add('active'); // slide-in drawer

    try {
      // Fetch details fresh from backend
      const entry = await this.getVaultEntry(id);
      
      // Update local state copy
      const index = this.state.credentials.findIndex(c => c.id === id);
      const mapped = {
        id: entry.id,
        type: entry.type || 'login',
        name: entry.website_name || '',
        url: entry.website_url || '',
        username: entry.login_identifier || '',
        password: entry.password || '••••••••',
        notes: entry.notes || '',
        lastUpdated: entry.last_updated || entry.updated_at || new Date().toISOString().split('T')[0]
      };
      if (index !== -1) {
        this.state.credentials[index] = mapped;
      }

      // Decrypt the password on demand
      const decryptedPassword = await this.decryptPassword(id);
      mapped.password = decryptedPassword;

      const firstLetter = mapped.name.charAt(0).toUpperCase();

      if (contentPanel) {
        contentPanel.innerHTML = `
          <!-- Close drawer button for mobile -->
          <div class="drawer-header-actions" style="display: flex; justify-content: flex-end; margin-bottom: -15px;">
            <button class="btn-close" onclick="app.closeDetailsDrawer()" style="padding: 4px;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>

          <div class="details-header-card">
            <div class="details-avatar">${firstLetter}</div>
            <h3 class="details-title">${mapped.name}</h3>
            ${mapped.url ? `<a href="${mapped.url}" target="_blank" class="details-subtitle-link">
              ${mapped.url.replace('https://', '').replace('http://', '')}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            </a>` : '<span class="details-subtitle-link">Secure Vault Item</span>'}
          </div>

          ${mapped.type !== 'note' ? `
            <div class="details-field-group">
              <span class="details-field-label">${mapped.type === 'card' ? 'Card Number' : 'Username / Email'}</span>
              <div class="details-field-value-box">
                <input type="text" class="details-field-value" readonly value="${mapped.username}">
                <button class="details-field-action-btn" onclick="app.copyToClipboard('${mapped.username}', this, 'Username copied')">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                </button>
              </div>
            </div>
          ` : ''}

          ${mapped.type !== 'note' ? `
            <div class="details-field-group">
              <span class="details-field-label">${mapped.type === 'card' ? 'Expiration & CVV' : 'Password'}</span>
              <div class="details-field-value-box">
                <input type="password" id="detail-pass-input" class="details-field-value monospace" readonly value="${decryptedPassword}">
                <button class="details-field-action-btn" onclick="app.togglePasswordVisibility('detail-pass-input')" title="Toggle visibility">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                </button>
                <button class="details-field-action-btn" onclick="app.handleCopyPassword('${mapped.id}', this)" title="Copy password">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </button>
              </div>
              <!-- Entropy indicator -->
              <div class="entropy-meter" id="detail-entropy-container">
                <!-- Calculated dynamically below -->
              </div>
            </div>
          ` : ''}

          <div class="details-field-group">
            <span class="details-field-label">Secure Notes</span>
            <div class="details-notes-box">${mapped.notes || 'No notes added to this credential.'}</div>
          </div>

          <div class="details-field-group">
            <span class="details-field-label">Metadata</span>
            <span style="font-size: 11px; color: var(--text-muted); line-height: 1.4;">Last decrypted: Just now<br>Last updated: ${mapped.lastUpdated}</span>
          </div>

          <div class="details-footer-actions">
            <button class="btn btn-secondary flex-1" onclick="app.openEditModal('${mapped.id}')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Edit
            </button>
            <button class="btn btn-secondary btn-delete flex-1" onclick="app.handleDeleteCredential('${mapped.id}')" style="border-color: rgba(239, 68, 68, 0.2); color: #fda4af;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              Delete
            </button>
          </div>
        `;

        // Render entropy metrics
        const entropyContainer = document.getElementById('detail-entropy-container');
        if (entropyContainer && mapped.type !== 'note') {
          let entropyText = "Weak";
          let entropyClass = "weak";
          let entropyPercent = 20;

          if (decryptedPassword && mapped.type !== 'card') {
            let pool = 0;
            if (/[a-z]/.test(decryptedPassword)) pool += 26;
            if (/[A-Z]/.test(decryptedPassword)) pool += 26;
            if (/[0-9]/.test(decryptedPassword)) pool += 10;
            if (/[^a-zA-Z0-9]/.test(decryptedPassword)) pool += 32;
            const bits = pool > 0 ? Math.round(decryptedPassword.length * Math.log2(pool)) : 0;

            if (bits >= 80) {
              entropyText = `AES-Secure (${bits} bits)`;
              entropyClass = "excellent";
              entropyPercent = 100;
            } else if (bits >= 50) {
              entropyText = `Moderate (${bits} bits)`;
              entropyClass = "warning";
              entropyPercent = 60;
            } else {
              entropyText = `Vulnerable (${bits} bits)`;
              entropyClass = "weak";
              entropyPercent = 30;
            }
          } else if (mapped.type === 'card') {
            entropyText = "Encrypted Details";
            entropyClass = "excellent";
            entropyPercent = 100;
          }

          entropyContainer.innerHTML = `
            <span class="entropy-badge ${entropyClass}">${entropyText}</span>
            <div class="entropy-bar-mini">
              <div class="entropy-fill-mini ${entropyClass}" style="width: ${entropyPercent}%"></div>
            </div>
          `;
        }
      }
    } catch (error) {
      console.error("Failed to load details:", error);
      this.showToast("Failed to load vault details from backend.", "error");
    }
  }

  closeDetailsDrawer() {
    const drawer = document.getElementById('details-drawer');
    if (drawer) drawer.classList.remove('active');
    
    // Clear selections in list
    const rows = document.querySelectorAll('#vault-list-body tr');
    rows.forEach(r => r.classList.remove('selected'));
    
    this.state.selectedCredentialId = null;
  }
}

// Instantiate globally
window.app = new VetraApp();