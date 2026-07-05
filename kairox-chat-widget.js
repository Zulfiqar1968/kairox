/*!
 * Kairox AI — Embeddable Webchat Widget
 * ---------------------------------------------------------------
 * Drop-in chat widget themed for agentevo.online (Kairox FZC LLC).
 * Talks to an n8n Chat Trigger webhook out of the box.
 *
 * USAGE
 * -----
 * <script src="kairox-chat-widget.js"></script>
 * <script>
 *   KairoxChat.init({
 *     webhookUrl: "https://your-n8n-instance.com/webhook/xxxx/chat",
 *     agentName: "Zara",
 *     agentRole: "AI Sales Agent",
 *     welcomeMessage: "Hi! I'm Zara from Kairox. What can I help you automate today?",
 *   });
 * </script>
 *
 * All config keys are optional — sensible Kairox-branded defaults are used.
 * ------------------------------------------------------------------------ */

(function (window, document) {
  "use strict";

  if (window.KairoxChat) return; // prevent double-init

  /* ----------------------------- Defaults ------------------------------ */

  const DEFAULTS = {
    webhookUrl: "",                 // n8n Chat Trigger webhook URL (required to actually send)
    agentName: "Kairox AI",
    agentRole: "Digital Employee",
    welcomeMessage:
      "Hello! I'm your Kairox AI assistant. Ask me about AI employees, pricing, or how automation could work for your business.",
    inputPlaceholder: "Type your message…",
    position: "right",              // "right" | "left"
    primaryStart: "#14C8B0",        // teal
    primaryEnd: "#0891B2",          // cyan-blue
    accentGold: "#D4A94A",
    bubbleAvatar: "", // optional image URL for agent avatar; falls back to orb
    poweredByText: "Powered by Kairox AI",
    poweredByUrl: "https://agentevo.online",
    storagePrefix: "kx_chat_",
    maxRetries: 2,
    retryDelayMs: 900,
    openOnLoad: false,
    launcherGreetingDelayMs: 2600,  // shows a little teaser bubble once, after this delay
    persistHistory: true,
    gtm: true,                      // push events to window.dataLayer if present
    debug: false,                   // set true to console.log raw request/response for troubleshooting
  };

  let config = { ...DEFAULTS };
  let els = {};
  let state = {
    open: false,
    sending: false,
    history: [],
    sessionId: null,
  };

  /* ------------------------------ Utils --------------------------------- */

  function uuid() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // Minimal, safe markdown: bold, italics, inline code, links, line breaks.
  function renderMarkdown(raw) {
    let text = escapeHtml(raw);
    text = text.replace(/`([^`]+)`/g, "<code>$1</code>");
    text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    text = text.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, "$1<em>$2</em>");
    text = text.replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
    );
    text = text.replace(/\n/g, "<br>");
    return text;
  }

  function storageGet(key) {
    try {
      return JSON.parse(localStorage.getItem(config.storagePrefix + key));
    } catch (e) {
      return null;
    }
  }
  function storageSet(key, value) {
    try {
      localStorage.setItem(config.storagePrefix + key, JSON.stringify(value));
    } catch (e) {
      /* storage unavailable — fail silently, widget still works in-memory */
    }
  }

  function pushGtm(eventName, extra) {
    if (!config.gtm) return;
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: eventName, ...extra });
  }

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /* ------------------------------ Styles -------------------------------- */

  function injectStyles() {
    const style = document.createElement("style");
    style.id = "kairox-chat-styles";
    style.textContent = `
      .kx-widget * { box-sizing: border-box; }
      .kx-widget {
        --kx-navy: #041E2B;
        --kx-navy-raised: #0A2E3F;
        --kx-navy-raised-2: #0F3A4E;
        --kx-ink: #F3F6F7;
        --kx-muted: #8CA0A8;
        --kx-line: rgba(255,255,255,0.08);
        --kx-grad: linear-gradient(135deg, ${config.primaryStart}, ${config.primaryEnd});
        --kx-gold: ${config.accentGold};
        --kx-radius: 18px;
        --kx-font-head: 'Sora', 'Segoe UI', system-ui, sans-serif;
        --kx-font-body: 'Inter', 'Segoe UI', system-ui, sans-serif;
        position: fixed;
        ${config.position === "left" ? "left: 24px;" : "right: 24px;"}
        bottom: 24px;
        z-index: 2147483000;
        font-family: var(--kx-font-body);
      }

      /* ---------- Launcher orb ---------- */
      .kx-launcher {
        width: 64px; height: 64px;
        border-radius: 50%;
        border: none;
        cursor: pointer;
        background: var(--kx-grad);
        box-shadow: 0 8px 24px rgba(8,145,178,0.35), 0 0 0 0 rgba(20,200,176,0.5);
        display: flex; align-items: center; justify-content: center;
        position: relative;
        animation: kx-pulse 3.2s ease-in-out infinite;
        transition: transform .2s ease, box-shadow .2s ease;
      }
      .kx-launcher:hover { transform: scale(1.06); }
      .kx-launcher:focus-visible { outline: 2px solid var(--kx-gold); outline-offset: 3px; }
      .kx-launcher svg { width: 28px; height: 28px; position: relative; z-index: 1; }
      .kx-launcher .kx-orb-core {
        position: absolute; inset: 0; border-radius: 50%;
        background: radial-gradient(circle at 35% 30%, rgba(255,255,255,0.55), transparent 55%);
      }
      @keyframes kx-pulse {
        0%, 100% { box-shadow: 0 8px 24px rgba(8,145,178,0.35), 0 0 0 0 rgba(20,200,176,0.45); }
        50% { box-shadow: 0 8px 28px rgba(8,145,178,0.45), 0 0 0 10px rgba(20,200,176,0); }
      }
      @media (prefers-reduced-motion: reduce) {
        .kx-launcher { animation: none; }
      }

      .kx-teaser {
        position: absolute;
        bottom: 76px;
        ${config.position === "left" ? "left: 0;" : "right: 0;"}
        max-width: 220px;
        background: var(--kx-navy-raised);
        color: var(--kx-ink);
        border: 1px solid var(--kx-line);
        padding: 10px 14px;
        border-radius: 14px;
        font-size: 13px;
        line-height: 1.4;
        box-shadow: 0 10px 30px rgba(0,0,0,0.35);
        opacity: 0;
        transform: translateY(6px);
        pointer-events: none;
        transition: opacity .35s ease, transform .35s ease;
      }
      .kx-teaser.kx-show { opacity: 1; transform: translateY(0); pointer-events: auto; }
      .kx-teaser button {
        position: absolute; top: -6px; right: -6px;
        width: 18px; height: 18px; border-radius: 50%;
        background: var(--kx-navy); border: 1px solid var(--kx-line);
        color: var(--kx-muted); font-size: 10px; line-height: 1;
        cursor: pointer; display:flex; align-items:center; justify-content:center;
      }

      /* ---------- Panel ---------- */
      .kx-panel {
        position: absolute;
        bottom: 80px;
        ${config.position === "left" ? "left: 0;" : "right: 0;"}
        width: 380px;
        max-width: calc(100vw - 32px);
        height: 600px;
        max-height: calc(100vh - 120px);
        background: var(--kx-navy);
        border: 1px solid var(--kx-line);
        border-radius: var(--kx-radius);
        box-shadow: 0 24px 60px rgba(0,0,0,0.45);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        opacity: 0;
        transform: translateY(16px) scale(0.98);
        pointer-events: none;
        transition: opacity .28s ease, transform .28s ease;
      }
      .kx-panel.kx-open {
        opacity: 1;
        transform: translateY(0) scale(1);
        pointer-events: auto;
      }

      .kx-header {
        background: linear-gradient(180deg, var(--kx-navy-raised), var(--kx-navy));
        border-bottom: 1px solid var(--kx-line);
        padding: 16px 16px;
        display: flex;
        align-items: center;
        gap: 12px;
        flex-shrink: 0;
      }
      .kx-avatar {
        width: 40px; height: 40px; border-radius: 50%;
        background: var(--kx-grad);
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0;
        position: relative;
        overflow: hidden;
      }
      .kx-avatar img { width: 100%; height: 100%; object-fit: cover; }
      .kx-avatar svg { width: 20px; height: 20px; }
      .kx-header-text { flex: 1; min-width: 0; }
      .kx-header-name {
        font-family: var(--kx-font-head);
        font-weight: 600;
        font-size: 15px;
        color: var(--kx-ink);
        display: flex; align-items: center; gap: 6px;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      .kx-status-dot {
        width: 7px; height: 7px; border-radius: 50%;
        background: #21D07A;
        box-shadow: 0 0 0 2px rgba(33,208,122,0.25);
        flex-shrink: 0;
      }
      .kx-header-role {
        font-size: 12px;
        color: var(--kx-muted);
        margin-top: 1px;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      .kx-header-actions { display: flex; gap: 4px; }
      .kx-icon-btn {
        width: 32px; height: 32px;
        border: none; background: transparent;
        color: var(--kx-muted);
        border-radius: 8px;
        cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        transition: background .15s ease, color .15s ease;
      }
      .kx-icon-btn:hover { background: rgba(255,255,255,0.06); color: var(--kx-ink); }
      .kx-icon-btn svg { width: 17px; height: 17px; }

      .kx-messages {
        flex: 1;
        overflow-y: auto;
        padding: 18px 14px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        scrollbar-width: thin;
        scrollbar-color: var(--kx-navy-raised-2) transparent;
      }
      .kx-messages::-webkit-scrollbar { width: 6px; }
      .kx-messages::-webkit-scrollbar-thumb { background: var(--kx-navy-raised-2); border-radius: 8px; }

      .kx-row { display: flex; gap: 8px; max-width: 100%; }
      .kx-row.kx-user { justify-content: flex-end; }
      .kx-bubble {
        padding: 10px 14px;
        border-radius: 16px;
        font-size: 14px;
        line-height: 1.5;
        max-width: 78%;
        word-wrap: break-word;
      }
      .kx-row.kx-bot .kx-bubble {
        background: var(--kx-navy-raised);
        border: 1px solid var(--kx-line);
        color: var(--kx-ink);
        border-bottom-left-radius: 4px;
      }
      .kx-row.kx-user .kx-bubble {
        background: var(--kx-grad);
        color: #04222B;
        font-weight: 500;
        border-bottom-right-radius: 4px;
      }
      .kx-bubble a { color: inherit; text-decoration: underline; }
      .kx-bubble code {
        background: rgba(255,255,255,0.12);
        padding: 1px 5px;
        border-radius: 4px;
        font-size: 12.5px;
      }
      .kx-row.kx-user .kx-bubble code { background: rgba(4,34,43,0.15); }

      .kx-mini-avatar {
        width: 26px; height: 26px; border-radius: 50%;
        background: var(--kx-grad);
        flex-shrink: 0;
        display: flex; align-items: center; justify-content: center;
        margin-top: 2px;
      }
      .kx-mini-avatar svg { width: 13px; height: 13px; }

      .kx-typing {
        display: flex; gap: 4px; align-items: center;
        padding: 12px 14px;
      }
      .kx-typing span {
        width: 6px; height: 6px; border-radius: 50%;
        background: var(--kx-muted);
        animation: kx-bounce 1.2s infinite ease-in-out;
      }
      .kx-typing span:nth-child(2) { animation-delay: .15s; }
      .kx-typing span:nth-child(3) { animation-delay: .3s; }
      @keyframes kx-bounce {
        0%, 60%, 100% { transform: translateY(0); opacity: .5; }
        30% { transform: translateY(-4px); opacity: 1; }
      }

      .kx-error-note {
        font-size: 12px;
        color: #FF9B85;
        background: rgba(255,90,60,0.08);
        border: 1px solid rgba(255,90,60,0.25);
        padding: 8px 12px;
        border-radius: 10px;
      }

      .kx-inputbar {
        border-top: 1px solid var(--kx-line);
        padding: 12px;
        display: flex;
        align-items: flex-end;
        gap: 8px;
        flex-shrink: 0;
        background: var(--kx-navy);
      }
      .kx-input {
        flex: 1;
        resize: none;
        border: 1px solid var(--kx-line);
        background: var(--kx-navy-raised);
        color: var(--kx-ink);
        border-radius: 14px;
        padding: 10px 14px;
        font-size: 14px;
        font-family: var(--kx-font-body);
        max-height: 96px;
        line-height: 1.4;
        outline: none;
        transition: border-color .15s ease;
      }
      .kx-input::placeholder { color: var(--kx-muted); }
      .kx-input:focus { border-color: ${config.primaryEnd}; }

      .kx-send {
        width: 40px; height: 40px;
        border-radius: 50%;
        border: none;
        background: var(--kx-grad);
        color: #04222B;
        cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0;
        transition: transform .15s ease, opacity .15s ease;
      }
      .kx-send:hover { transform: scale(1.06); }
      .kx-send:disabled { opacity: .45; cursor: not-allowed; transform: none; }
      .kx-send svg { width: 17px; height: 17px; }

      .kx-footer {
        text-align: center;
        font-size: 11px;
        color: var(--kx-muted);
        padding: 7px 0 10px;
        flex-shrink: 0;
        background: var(--kx-navy);
      }
      .kx-footer a { color: var(--kx-muted); text-decoration: none; border-bottom: 1px dotted var(--kx-muted); }
      .kx-footer a:hover { color: var(--kx-ink); }

      @media (max-width: 480px) {
        .kx-widget { right: 0; left: 0; bottom: 0; display: flex; justify-content: ${config.position === "left" ? "flex-start" : "flex-end"}; }
        .kx-panel {
          position: fixed;
          inset: 0;
          width: 100%;
          height: 100%;
          max-height: 100%;
          border-radius: 0;
          bottom: 0; right: 0; left: 0;
        }
        .kx-launcher { margin: 16px; }
      }
    `;
    document.head.appendChild(style);
  }

  /* ------------------------------ Icons --------------------------------- */

  const ICONS = {
    orb: `<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="white" stroke-opacity="0.9" stroke-width="1.6"/><circle cx="12" cy="12" r="3.2" fill="white"/></svg>`,
    close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>`,
    minus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12h14"/></svg>`,
    send: `<svg viewBox="0 0 24 24" fill="none"><path d="M4 12L20 4L14 20L11 13L4 12Z" fill="currentColor"/></svg>`,
  };

  /* ------------------------------ Build DOM ------------------------------ */

  function buildDOM() {
    const root = document.createElement("div");
    root.className = "kx-widget";
    root.setAttribute("role", "region");
    root.setAttribute("aria-label", "Kairox AI chat");

    root.innerHTML = `
      <div class="kx-teaser" id="kxTeaser">
        <button type="button" aria-label="Dismiss">✕</button>
        <span id="kxTeaserText"></span>
      </div>

      <div class="kx-panel" id="kxPanel" role="dialog" aria-modal="false" aria-label="${escapeHtml(config.agentName)} chat window">
        <div class="kx-header">
          <div class="kx-avatar" id="kxAvatar">
            ${config.bubbleAvatar ? `<img src="${config.bubbleAvatar}" alt="">` : ICONS.orb}
          </div>
          <div class="kx-header-text">
            <div class="kx-header-name"><span class="kx-status-dot"></span>${escapeHtml(config.agentName)}</div>
            <div class="kx-header-role">${escapeHtml(config.agentRole)} · Online</div>
          </div>
          <div class="kx-header-actions">
            <button class="kx-icon-btn" id="kxMinimize" aria-label="Minimize chat">${ICONS.minus}</button>
            <button class="kx-icon-btn" id="kxClose" aria-label="Close chat">${ICONS.close}</button>
          </div>
        </div>

        <div class="kx-messages" id="kxMessages"></div>

        <div class="kx-inputbar">
          <textarea
            class="kx-input"
            id="kxInput"
            rows="1"
            placeholder="${escapeHtml(config.inputPlaceholder)}"
            aria-label="Type your message"
          ></textarea>
          <button class="kx-send" id="kxSend" aria-label="Send message">${ICONS.send}</button>
        </div>

        <div class="kx-footer">
          <a href="${config.poweredByUrl}" target="_blank" rel="noopener noreferrer">${escapeHtml(config.poweredByText)}</a>
        </div>
      </div>

      <button class="kx-launcher" id="kxLauncher" aria-label="Open chat with ${escapeHtml(config.agentName)}" aria-expanded="false">
        <span class="kx-orb-core"></span>
        ${ICONS.orb}
      </button>
    `;

    document.body.appendChild(root);

    els = {
      root,
      panel: root.querySelector("#kxPanel"),
      launcher: root.querySelector("#kxLauncher"),
      close: root.querySelector("#kxClose"),
      minimize: root.querySelector("#kxMinimize"),
      messages: root.querySelector("#kxMessages"),
      input: root.querySelector("#kxInput"),
      send: root.querySelector("#kxSend"),
      teaser: root.querySelector("#kxTeaser"),
      teaserText: root.querySelector("#kxTeaserText"),
      teaserDismiss: root.querySelector(".kx-teaser button"),
    };
  }

  /* ------------------------------ Messaging ------------------------------ */

  function scrollToBottom() {
    els.messages.scrollTop = els.messages.scrollHeight;
  }

  function appendMessage(role, text, opts) {
    opts = opts || {};
    const row = document.createElement("div");
    row.className = "kx-row " + (role === "user" ? "kx-user" : "kx-bot");

    let avatarHtml = "";
    if (role !== "user") {
      avatarHtml = `<div class="kx-mini-avatar">${
        config.bubbleAvatar
          ? `<img src="${config.bubbleAvatar}" alt="" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`
          : ICONS.orb
      }</div>`;
    }

    const bubble = document.createElement("div");
    bubble.className = "kx-bubble";
    bubble.innerHTML = renderMarkdown(text);

    row.innerHTML = avatarHtml;
    row.appendChild(bubble);
    els.messages.appendChild(row);
    scrollToBottom();

    if (!opts.skipPersist && config.persistHistory) {
      state.history.push({ role, text, ts: Date.now() });
      storageSet("history", state.history.slice(-60));
    }
  }

  function showTyping() {
    const row = document.createElement("div");
    row.className = "kx-row kx-bot";
    row.id = "kxTypingRow";
    row.innerHTML = `
      <div class="kx-mini-avatar">${ICONS.orb}</div>
      <div class="kx-bubble kx-typing"><span></span><span></span><span></span></div>
    `;
    els.messages.appendChild(row);
    scrollToBottom();
  }

  function hideTyping() {
    const row = document.getElementById("kxTypingRow");
    if (row) row.remove();
  }

  function showError(msg) {
    const row = document.createElement("div");
    row.className = "kx-row kx-bot";
    row.innerHTML = `<div class="kx-mini-avatar">${ICONS.orb}</div><div class="kx-error-note">${escapeHtml(msg)}</div>`;
    els.messages.appendChild(row);
    scrollToBottom();
  }

  // n8n Chat Trigger standard payload: { action, sessionId, chatInput }
  async function sendToWebhook(text, attempt) {
    attempt = attempt || 0;
    const payload = {
      action: "sendMessage",
      sessionId: state.sessionId,
      chatInput: text,
    };

    if (config.debug) console.log("[KairoxChat] → request", payload);

    let res;
    try {
      res = await fetch(config.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (networkErr) {
      // fetch() throws here almost exclusively for CORS blocks, DNS failures,
      // mixed-content blocks, or the server being unreachable — the response
      // never made it back to JS at all.
      if (config.debug) console.error("[KairoxChat] network/CORS failure", networkErr);
      if (attempt < config.maxRetries) {
        await delay(config.retryDelayMs * (attempt + 1));
        return sendToWebhook(text, attempt + 1);
      }
      const err = new Error(
        "Network/CORS error — the browser could not reach the webhook, or the response was blocked by CORS."
      );
      err.kind = "network";
      throw err;
    }

    const rawText = await res.text();
    if (config.debug) console.log("[KairoxChat] ← raw response", res.status, rawText);

    if (!res.ok) {
      if (attempt < config.maxRetries) {
        await delay(config.retryDelayMs * (attempt + 1));
        return sendToWebhook(text, attempt + 1);
      }
      const err = new Error("Webhook returned HTTP " + res.status + ": " + rawText.slice(0, 200));
      err.kind = "http";
      throw err;
    }

    let data = null;
    if (rawText && rawText.trim().length) {
      try {
        data = JSON.parse(rawText);
      } catch (parseErr) {
        // Not JSON — n8n's "Respond to Webhook" node was likely set to
        // "Text" mode instead of "JSON". Treat the raw text as the reply.
        return rawText.trim();
      }
    }

    const reply = extractReply(data);
    if (!reply && config.debug) {
      console.warn(
        "[KairoxChat] Response parsed but no reply text found. Check that your webhook returns { output } or { output } inside an array.",
        data
      );
    }
    return reply;
  }

  function extractReply(data) {
    if (!data) return "";
    if (typeof data === "string") return data;
    if (Array.isArray(data)) {
      const first = data[0] || {};
      return extractReply(first);
    }
    return data.output || data.text || data.message || data.reply || "";
  }

  async function handleSend() {
    const text = els.input.value.trim();
    if (!text || state.sending) return;

    appendMessage("user", text);
    els.input.value = "";
    autoResize();
    pushGtm("kairox_chat_message_sent", { message_length: text.length });

    if (!config.webhookUrl) {
      showError("This chat isn't connected to an assistant yet. Please configure a webhook URL.");
      return;
    }

    state.sending = true;
    els.send.disabled = true;
    showTyping();

    try {
      const reply = await sendToWebhook(text);
      hideTyping();
      appendMessage("bot", reply || "Sorry, I didn't quite catch that — could you rephrase?");
      pushGtm("kairox_chat_response_received", {});
    } catch (err) {
      hideTyping();
      if (err && err.kind === "network") {
        showError(
          "Couldn't reach the assistant. This usually means the webhook needs CORS enabled for this website's domain."
        );
      } else if (err && err.kind === "http") {
        showError("The assistant returned an error. Check the n8n workflow execution log for details.");
      } else {
        showError("I'm having trouble connecting right now. Please try again in a moment.");
      }
      pushGtm("kairox_chat_error", { error: String(err && err.message) });
    } finally {
      state.sending = false;
      els.send.disabled = false;
    }
  }

  function autoResize() {
    els.input.style.height = "auto";
    els.input.style.height = Math.min(els.input.scrollHeight, 96) + "px";
  }

  /* ------------------------------ Open/Close ------------------------------ */

  function openPanel() {
    state.open = true;
    els.panel.classList.add("kx-open");
    els.launcher.setAttribute("aria-expanded", "true");
    hideTeaser(true);
    storageSet("open", true);
    setTimeout(() => els.input.focus(), 200);
    pushGtm("kairox_chat_opened", {});
  }

  function closePanel() {
    state.open = false;
    els.panel.classList.remove("kx-open");
    els.launcher.setAttribute("aria-expanded", "false");
    storageSet("open", false);
    pushGtm("kairox_chat_closed", {});
  }

  function togglePanel() {
    state.open ? closePanel() : openPanel();
  }

  function showTeaser() {
    if (state.open || storageGet("teaserSeen")) return;
    els.teaserText.textContent = "👋 Need help automating your business? Ask me anything.";
    els.teaser.classList.add("kx-show");
  }

  function hideTeaser(permanent) {
    els.teaser.classList.remove("kx-show");
    if (permanent) storageSet("teaserSeen", true);
  }

  /* ------------------------------ Init ------------------------------ */

  function bindEvents() {
    els.launcher.addEventListener("click", togglePanel);
    els.close.addEventListener("click", closePanel);
    els.minimize.addEventListener("click", closePanel);
    els.teaserDismiss.addEventListener("click", (e) => {
      e.stopPropagation();
      hideTeaser(true);
    });
    els.teaser.addEventListener("click", () => {
      hideTeaser(true);
      openPanel();
    });

    els.send.addEventListener("click", handleSend);
    els.input.addEventListener("input", autoResize);
    els.input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
      if (e.key === "Escape") closePanel();
    });
  }

  function restoreHistory() {
    if (!config.persistHistory) {
      appendMessage("bot", config.welcomeMessage, { skipPersist: true });
      return;
    }
    const saved = storageGet("history");
    if (saved && saved.length) {
      state.history = saved;
      saved.forEach((m) => appendMessage(m.role, m.text, { skipPersist: true }));
    } else {
      appendMessage("bot", config.welcomeMessage);
    }
  }

  function init(userConfig) {
    config = { ...DEFAULTS, ...(userConfig || {}) };
    state.sessionId = storageGet("session_id") || uuid();
    storageSet("session_id", state.sessionId);

    injectStyles();
    buildDOM();
    bindEvents();
    restoreHistory();

    if (config.openOnLoad || storageGet("open")) {
      openPanel();
    }

    setTimeout(showTeaser, config.launcherGreetingDelayMs);
  }

  window.KairoxChat = { init };
})(window, document);
