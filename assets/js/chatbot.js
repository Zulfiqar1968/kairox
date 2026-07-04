(function () {
  "use strict";

  const defaults = {
    brand: "Kairox AI Assistant",
    webhook: "https://molly-preestival-irina.ngrok-free.app/webhook/f7b6e59a-4498-491d-baaf-f6652f66d59a/chat",
    callUrl: "https://retellai.com/kairox",
    chatUrl: "https://n8n.com/kairox",
    logo: "assets/img/kairox-logo.svg"
  };

  const config = Object.assign({}, defaults, window.KairoxChatConfig || {});
  const sessionKey = "kx_session";
  const historyKey = "kx_chat_history_v7";
  const versionKey = "kx_chat_widget_version";
  const widgetVersion = "kairox-ribbon-actions-v7-mobile-touch";

  let sessionId = localStorage.getItem(sessionKey);
  if (!sessionId) {
    sessionId = "kx_" + Math.random().toString(36).slice(2, 10) + "_" + Date.now();
    localStorage.setItem(sessionKey, sessionId);
  }
  localStorage.setItem(versionKey, widgetVersion);

  const state = {
    isOpen: false,
    isSending: false,
    isRibbonVisible: false,
    manualMode: false,
    hideTimer: null,
    history: safeParse(localStorage.getItem(historyKey), [])
  };

  function safeParse(value, fallback) {
    try { return value ? JSON.parse(value) : fallback; } catch { return fallback; }
  }

  function escapeHtml(text) {
    return String(text || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function richText(text) {
    let html = escapeHtml(text || "");
    html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/\n/g, "<br>");
    html = html.replace(/(https?:\/\/[^\s<]+)/g, "<a href=\"$1\" target=\"_blank\" rel=\"noopener noreferrer\">$1</a>");
    return html;
  }

  function nowTime() {
    return new Intl.DateTimeFormat("en", { hour: "2-digit", minute: "2-digit" }).format(new Date());
  }

  function saveHistory() {
    localStorage.setItem(historyKey, JSON.stringify(state.history.slice(-40)));
  }

  function extractReply(data) {
    if (!data) return "";
    if (typeof data === "string") return data.trim();

    if (Array.isArray(data)) {
      for (const item of data) {
        const found = extractReply(item);
        if (found) return found;
      }
      return "";
    }

    const keys = ["output", "reply", "message", "answer", "response", "text", "content", "result"];
    for (const key of keys) {
      if (typeof data[key] === "string" && data[key].trim()) return data[key].trim();
    }

    const wrappers = ["json", "body", "data", "payload"];
    for (const wrapper of wrappers) {
      if (data[wrapper]) {
        const found = extractReply(data[wrapper]);
        if (found) return found;
      }
    }

    return "";
  }

  function buildWidget() {
    if (document.querySelector(".kx-floating-actions")) return;

    const actions = document.createElement("div");
    actions.className = "kx-floating-actions is-collapsed";
    actions.setAttribute("aria-label", "Kairox quick actions");
    actions.innerHTML = `
      <button class="kx-ribbon-toggle" type="button" aria-label="Expand quick actions" aria-expanded="false">
        <span class="kx-ribbon-toggle-inner">
          <i class="bi bi-chevron-left kx-toggle-expand" aria-hidden="true"></i>
          <i class="bi bi-chevron-right kx-toggle-collapse" aria-hidden="true"></i>
        </span>
      </button>
      <div class="kx-action-ribbon">
        <div class="kx-ribbon-buttons">
          <a class="kx-float-btn kx-float-call" href="${escapeHtml(config.callUrl)}" target="_blank" rel="noopener noreferrer" aria-label="Call Kairox voice agent">
            <span class="kx-float-icon"><i class="bi bi-telephone-outbound-fill"></i></span>
            <span class="kx-float-label">Call</span>
          </a>
          <button class="kx-float-btn kx-float-chat" type="button" aria-label="Open Kairox chat assistant">
            <span class="kx-float-icon"><i class="bi bi-chat-dots-fill"></i></span>
            <span class="kx-float-label">Chat</span>
          </button>
        </div>
      </div>
    `;

    const panel = document.createElement("section");
    panel.className = "kx-chat-window";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Kairox AI chat assistant");
    panel.innerHTML = `
      <div class="kx-chat-header">
        <div class="kx-chat-brand">
          <div class="kx-chat-avatar"><img src="${escapeHtml(config.logo)}" alt=""></div>
          <div>
            <div class="kx-chat-title">${escapeHtml(config.brand)}</div>
            <div class="kx-chat-status"><span></span> Online AI advisor</div>
          </div>
        </div>
        <div class="kx-chat-header-actions">
          <a class="kx-chat-head-btn" href="${escapeHtml(config.callUrl)}" target="_blank" rel="noopener noreferrer" aria-label="Open voice call"><i class="bi bi-telephone"></i></a>
          <button class="kx-chat-head-btn kx-chat-clear" type="button" aria-label="Clear chat"><i class="bi bi-trash3"></i></button>
          <button class="kx-chat-head-btn kx-chat-close" type="button" aria-label="Close chat"><i class="bi bi-x-lg"></i></button>
        </div>
      </div>

      <div class="kx-chat-body">
        <div class="kx-chat-intro">
          <span class="kx-chat-intro-badge">KAIROX AI</span>
          <strong>How can we help your business automate today?</strong>
          <p>Ask about AI employees, pricing, appointments, support agents or workflow automation.</p>
        </div>
        <div class="kx-chat-messages" aria-live="polite"></div>
      </div>

      <div class="kx-chat-quick">
        <button type="button" data-kx-question="What does Kairox do?">What do you do?</button>
        <button type="button" data-kx-question="How much does it cost?">Pricing</button>
        <button type="button" data-kx-question="Can I book a consultation?">Book consultation</button>
        <a href="${escapeHtml(config.chatUrl)}" target="_blank" rel="noopener noreferrer">Open agent <i class="bi bi-box-arrow-up-right"></i></a>
      </div>

      <div class="kx-chat-typing-note" aria-live="polite"></div>

      <form class="kx-chat-input-row">
        <input type="text" class="kx-chat-input-field" placeholder="Type your message..." autocomplete="off" aria-label="Type your message">
        <button type="submit" aria-label="Send message"><i class="bi bi-send-fill"></i></button>
      </form>
    `;

    document.body.appendChild(actions);
    document.body.appendChild(panel);

    const chatButton = actions.querySelector(".kx-float-chat");
    const ribbonToggle = actions.querySelector(".kx-ribbon-toggle");
    const closeButton = panel.querySelector(".kx-chat-close");
    const clearButton = panel.querySelector(".kx-chat-clear");
    const messages = panel.querySelector(".kx-chat-messages");
    const form = panel.querySelector(".kx-chat-input-row");
    const input = panel.querySelector(".kx-chat-input-field");
    const typingNote = panel.querySelector(".kx-chat-typing-note");

    function syncRibbon() {
      actions.classList.toggle("is-visible", state.isRibbonVisible);
      actions.classList.toggle("is-collapsed", !state.isRibbonVisible);
      actions.classList.toggle("is-manual-mode", state.manualMode);
      ribbonToggle.setAttribute("aria-expanded", String(state.isRibbonVisible));
      ribbonToggle.setAttribute("aria-label", state.isRibbonVisible ? "Collapse quick actions" : "Expand quick actions");
      ribbonToggle.setAttribute("title", state.isRibbonVisible ? "Collapse" : "Expand");
    }

    function revealRibbon(source) {
      state.isRibbonVisible = true;
      clearTimeout(state.hideTimer);
      if (source === "manual") {
        state.manualMode = true;
      } else if (!state.manualMode) {
        state.hideTimer = setTimeout(() => {
          if (!state.isOpen && !state.manualMode) collapseRibbon("auto");
        }, 60000);
      }
      syncRibbon();
    }

    function collapseRibbon(source) {
      if (state.isOpen && source !== "manual") return;
      if (source === "manual") state.manualMode = true;
      state.isRibbonVisible = false;
      clearTimeout(state.hideTimer);
      syncRibbon();
    }

    function expandManually() {
      revealRibbon("manual");
    }

    function collapseManually() {
      if (state.isOpen) closePanel({ preserveManual: true });
      collapseRibbon("manual");
    }

    let lastRibbonToggleAt = 0;

    function handleRibbonToggle(event) {
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }

      const now = Date.now();
      if (now - lastRibbonToggleAt < 320) return;
      lastRibbonToggleAt = now;

      if (state.isRibbonVisible) {
        collapseManually();
      } else {
        expandManually();
      }
    }

    ribbonToggle.addEventListener("pointerup", handleRibbonToggle);
    ribbonToggle.addEventListener("click", handleRibbonToggle);
    ribbonToggle.addEventListener("touchend", handleRibbonToggle, { passive: false });
    ribbonToggle.addEventListener("pointerdown", function (event) {
      event.stopPropagation();
    });

    let scrollTicking = false;
    function handleScrollActivity() {
      if (state.manualMode) return;
      if (!scrollTicking) {
        window.requestAnimationFrame(() => {
          revealRibbon("auto");
          scrollTicking = false;
        });
        scrollTicking = true;
      }
    }

    window.addEventListener("scroll", handleScrollActivity, { passive: true });
    window.addEventListener("wheel", handleScrollActivity, { passive: true });
    window.addEventListener("touchmove", handleScrollActivity, { passive: true });

    function openPanel() {
      state.isOpen = true;
      state.isRibbonVisible = true;
      syncRibbon();
      panel.classList.add("open");
      chatButton.classList.add("active");
      renderHistory();
      setTimeout(() => input.focus(), 80);
    }

    function closePanel(options = {}) {
      state.isOpen = false;
      panel.classList.remove("open");
      chatButton.classList.remove("active");
      if (!options.preserveManual && !state.manualMode) {
        clearTimeout(state.hideTimer);
        state.hideTimer = setTimeout(() => collapseRibbon("auto"), 60000);
      }
    }

    function togglePanel() {
      state.isOpen ? closePanel() : openPanel();
    }

    chatButton.addEventListener("click", togglePanel);
    closeButton.addEventListener("click", () => closePanel());

    clearButton.addEventListener("click", function () {
      state.history = [];
      saveHistory();
      renderHistory(true);
      input.focus();
    });

    panel.querySelectorAll("[data-kx-question]").forEach((btn) => {
      btn.addEventListener("click", function () {
        sendMessage(btn.getAttribute("data-kx-question"));
      });
    });

    let typingTimer = null;
    input.addEventListener("input", function () {
      typingNote.textContent = input.value.trim() ? "You are typing..." : "";
      clearTimeout(typingTimer);
      typingTimer = setTimeout(() => { typingNote.textContent = ""; }, 900);
    });

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      sendMessage(input.value);
    });

    function addMessage(text, type, persist = true) {
      const msg = document.createElement("div");
      msg.className = "kx-chat-msg " + (type === "user" ? "user" : "bot");

      const bubble = document.createElement("div");
      bubble.className = "kx-chat-bubble";
      bubble.innerHTML = type === "user" ? escapeHtml(text) : richText(text);

      const meta = document.createElement("div");
      meta.className = "kx-chat-meta";
      meta.textContent = type === "user" ? "You • " + nowTime() : "Kairox • " + nowTime();

      msg.appendChild(bubble);
      msg.appendChild(meta);
      messages.appendChild(msg);

      if (persist) {
        state.history.push({ type, text });
        saveHistory();
      }

      scrollBottom();
      return msg;
    }

    function showTyping() {
      const typing = document.createElement("div");
      typing.className = "kx-chat-msg bot kx-chat-typing";
      typing.innerHTML = `<div class="kx-chat-bubble"><span></span><span></span><span></span></div>`;
      messages.appendChild(typing);
      scrollBottom();
      return typing;
    }

    function scrollBottom() {
      requestAnimationFrame(() => {
        messages.scrollTop = messages.scrollHeight;
      });
    }

    function renderHistory(forceWelcome = false) {
      messages.innerHTML = "";
      if (!state.history.length || forceWelcome) {
        addMessage("Hello! I’m the Kairox AI Advisor. I can help you explore AI employees, pricing, appointments, sales automation, support automation and workflow optimization.", "bot", false);
      } else {
        state.history.forEach((item) => addMessage(item.text, item.type, false));
      }
      scrollBottom();
    }

    async function sendMessage(value) {
      const text = String(value || "").trim();
      if (!text || state.isSending) return;

      state.isSending = true;
      input.value = "";
      typingNote.textContent = "";
      addMessage(text, "user");
      const typing = showTyping();

      try {
        const response = await fetch(config.webhook, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            sessionId,
            page: window.location.href,
            source: "kairox_website_chat"
          })
        });

        const raw = await response.text();
        let data = raw;
        try { data = JSON.parse(raw); } catch { /* plain-text response */ }

        const reply = extractReply(data) || "Thank you. I could not read the automation response clearly. You can continue here, call the Kairox voice agent, or book a consultation.";
        typing.remove();
        addMessage(reply, "bot");
      } catch (error) {
        console.error("[Kairox Chat] Connection error:", error);
        typing.remove();
        addMessage(`Connection issue. Please try again, or use the voice agent here: ${config.callUrl}`, "bot");
      } finally {
        state.isSending = false;
        input.focus();
      }
    }

    renderHistory();
    syncRibbon();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", buildWidget);
  } else {
    buildWidget();
  }
})();
