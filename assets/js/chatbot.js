(function () {
  "use strict";
  console.log("[Kairox] chatbot loaded: v33 form-top-clean-payload-on-load");

  const defaults = {
    brand: "Kairox AI Assistant",
    webhook: "https://workflows-n8nrunnerpostgresollama-cc30a1-187-127-191-113.sslip.io/webhook/leads",
    callUrl: "https://retellai.com/kairox",
    chatUrl: "https://n8n.com/kairox",
    logo: "assets/img/kairox-logo.svg"
  };

  const config = Object.assign({}, defaults, window.KairoxChatConfig || {});
  const sessionKey = "kx_session";
  const historyKey = "kx_chat_history_v33";

  // Fresh chat on every page load/refresh.
  localStorage.removeItem(sessionKey);
  localStorage.removeItem(historyKey);
  const sessionId = "kx_" + Math.random().toString(36).slice(2, 10) + "_" + Date.now();

  const state = {
    isRibbonVisible: false,
    isOpen: false,
    isSending: false,
    hideTimer: null,
    history: [],
    leadStep: "form",
    lead: {
      name: "",
      phone: "",
      email: "",
      company: ""
    }
  };

  function safeParse(value, fallback) {
    try { return value ? JSON.parse(value) : fallback; } catch { return fallback; }
  }

  function isMobile() {
    return window.matchMedia && window.matchMedia("(max-width: 767.98px)").matches;
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
    html = html.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
    return html;
  }

  function nowTime() {
    return new Intl.DateTimeFormat("en", { hour: "2-digit", minute: "2-digit" }).format(new Date());
  }

  function saveHistory() {
    // Do not persist chat history. The chat window and buffer reset on reload.
    localStorage.removeItem(historyKey);
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

  function resetStoredChatBuffer() {
    Object.keys(localStorage).forEach((key) => {
      if (
        key === sessionKey ||
        key === historyKey ||
        key === "kairox_chat_history" ||
        key === "kairox_chat_session_id" ||
        key.indexOf("kx_chat_history") === 0 ||
        key.indexOf("kx_session") === 0
      ) {
        localStorage.removeItem(key);
      }
    });
  }

  function buildWidget() {
    resetStoredChatBuffer();
    document.querySelectorAll(".kx-floating-actions, .kx-chat-window").forEach((el) => el.remove());

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
    panel.setAttribute("aria-hidden", "true");
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

      <div class="kx-chat-messages" aria-live="polite"></div>

      <div class="kx-chat-quick">
        <button type="button" data-kx-question="What AI automation services does Kairox offer?">Services</button>
        <button type="button" data-kx-question="How much does Kairox AI automation cost?">Pricing</button>
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

    const toggleButton = actions.querySelector(".kx-ribbon-toggle");
    const chatButton = actions.querySelector(".kx-float-chat");
    const closeButton = panel.querySelector(".kx-chat-close");
    const clearButton = panel.querySelector(".kx-chat-clear");
    const messages = panel.querySelector(".kx-chat-messages");
    const form = panel.querySelector(".kx-chat-input-row");
    const input = panel.querySelector(".kx-chat-input-field");
    const typingNote = panel.querySelector(".kx-chat-typing-note");
    const quickArea = panel.querySelector(".kx-chat-quick");

    function applyMobileLayout() {
      if (!isMobile()) {
        actions.style.removeProperty("transform");
        actions.style.removeProperty("width");
        actions.style.removeProperty("height");
        actions.style.removeProperty("max-width");
        actions.style.removeProperty("max-height");
        actions.style.removeProperty("right");
        actions.style.removeProperty("top");
        return;
      }

      const narrow = window.matchMedia("(max-width: 430px)").matches;
      const bodyWidth = narrow ? 70 : 74;
      const bodyHeight = narrow ? 140 : 142;
      const tabWidth = narrow ? 32 : 34;
      const tabHeight = narrow ? 64 : 66;
      const ribbon = actions.querySelector(".kx-action-ribbon");

      actions.style.setProperty("position", "fixed", "important");
      actions.style.setProperty("top", "50%", "important");
      actions.style.setProperty("right", "0", "important");
      actions.style.setProperty("left", "auto", "important");
      actions.style.setProperty("width", bodyWidth + "px", "important");
      actions.style.setProperty("max-width", bodyWidth + "px", "important");
      actions.style.setProperty("height", bodyHeight + "px", "important");
      actions.style.setProperty("max-height", bodyHeight + "px", "important");
      actions.style.setProperty("overflow", "visible", "important");
      actions.style.setProperty("transform", state.isRibbonVisible ? "translate(0, -50%)" : "translate(" + bodyWidth + "px, -50%)", "important");

      toggleButton.style.setProperty("position", "absolute", "important");
      toggleButton.style.setProperty("top", "50%", "important");
      toggleButton.style.setProperty("left", (-tabWidth + 1) + "px", "important");
      toggleButton.style.setProperty("transform", "translateY(-50%)", "important");
      toggleButton.style.setProperty("width", tabWidth + "px", "important");
      toggleButton.style.setProperty("height", tabHeight + "px", "important");
      toggleButton.style.setProperty("z-index", "1000000", "important");

      const inner = toggleButton.querySelector(".kx-ribbon-toggle-inner");
      if (inner) {
        inner.style.setProperty("width", tabWidth + "px", "important");
        inner.style.setProperty("height", tabHeight + "px", "important");
        inner.style.setProperty("transform", "none", "important");
      }

      if (ribbon) {
        ribbon.style.setProperty("position", "absolute", "important");
        ribbon.style.setProperty("top", "0", "important");
        ribbon.style.setProperty("right", "0", "important");
        ribbon.style.setProperty("width", bodyWidth + "px", "important");
        ribbon.style.setProperty("height", bodyHeight + "px", "important");
        ribbon.style.setProperty("max-width", bodyWidth + "px", "important");
        ribbon.style.setProperty("max-height", bodyHeight + "px", "important");
        ribbon.style.setProperty("opacity", state.isRibbonVisible ? "1" : "0", "important");
        ribbon.style.setProperty("visibility", state.isRibbonVisible ? "visible" : "hidden", "important");
        ribbon.style.setProperty("pointer-events", state.isRibbonVisible ? "auto" : "none", "important");
      }
    }

    function syncRibbon() {
      actions.classList.toggle("is-visible", state.isRibbonVisible);
      actions.classList.toggle("is-collapsed", !state.isRibbonVisible);
      toggleButton.setAttribute("aria-expanded", String(state.isRibbonVisible));
      toggleButton.setAttribute("aria-label", state.isRibbonVisible ? "Collapse quick actions" : "Expand quick actions");
      applyMobileLayout();
    }

    function expandRibbon() {
      state.isRibbonVisible = true;
      clearTimeout(state.hideTimer);
      syncRibbon();
    }

    function collapseRibbon() {
      if (state.isOpen) closePanel();
      state.isRibbonVisible = false;
      clearTimeout(state.hideTimer);
      syncRibbon();
    }

    function toggleRibbon(event) {
      if (event) {
        event.preventDefault();
        event.stopPropagation();
        if (event.stopImmediatePropagation) event.stopImmediatePropagation();
      }
      state.isRibbonVisible ? collapseRibbon() : expandRibbon();
    }

    function openPanel(event) {
      if (event) {
        event.preventDefault();
        event.stopPropagation();
        if (event.stopImmediatePropagation) event.stopImmediatePropagation();
      }

      state.isOpen = true;
      state.isRibbonVisible = true;
      clearTimeout(state.hideTimer);
      syncRibbon();

      panel.classList.add("open");
      panel.setAttribute("aria-hidden", "false");
      panel.style.setProperty("display", "flex", "important");
      panel.style.setProperty("visibility", "visible", "important");
      panel.style.setProperty("opacity", "1", "important");
      panel.style.setProperty("pointer-events", "auto", "important");
      panel.style.setProperty("z-index", "1000001", "important");

      chatButton.classList.add("active");
      renderHistory();
      if (!isLeadComplete()) appendLeadForm();
      setTimeout(() => {
        try { input.focus({ preventScroll: true }); } catch { input.focus(); }
      }, 80);
    }

    function closePanel(event) {
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }

      state.isOpen = false;
      panel.classList.remove("open");
      panel.setAttribute("aria-hidden", "true");
      panel.style.removeProperty("display");
      panel.style.removeProperty("visibility");
      panel.style.removeProperty("opacity");
      panel.style.removeProperty("pointer-events");
      chatButton.classList.remove("active");
      applyMobileLayout();
    }

    function bindOpenButton(element, handler) {
      let last = 0;
      const run = function (event) {
        const now = Date.now();
        if (now - last < 350) return;
        last = now;
        handler(event);
      };

      element.onclick = run;
      element.ontouchend = run;
      element.onpointerup = run;
      element.addEventListener("click", run, true);
      element.addEventListener("touchend", run, { passive: false, capture: true });
      element.addEventListener("pointerup", run, true);
    }

    bindOpenButton(toggleButton, toggleRibbon);
    bindOpenButton(chatButton, openPanel);
    closeButton.addEventListener("click", closePanel);
    closeButton.addEventListener("touchend", closePanel, { passive: false });

    clearButton.addEventListener("click", function () {
      state.history = [];
      resetLeadCapture();
      saveHistory();
      renderHistory(true);
      input.focus();
    });

    panel.querySelectorAll("[data-kx-question]").forEach((btn) => {
      btn.addEventListener("click", function () {
        if (!isLeadComplete()) {
          const firstField = messages.querySelector("[data-kx-lead-form='true'] input");
          if (firstField) firstField.focus();
          return;
        }
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

    window.addEventListener("resize", applyMobileLayout, { passive: true });
    window.addEventListener("orientationchange", function () {
      setTimeout(applyMobileLayout, 250);
    });

    function firstName() {
      return String(state.lead.name || "").trim().split(/\s+/)[0] || "there";
    }

    function isLeadComplete() {
      return state.leadStep === "complete";
    }

    function resetLeadCapture() {
      state.leadStep = "form";
      state.lead = { name: "", phone: "", email: "", company: "" };
      updateLeadUi();
    }

    function leadPromptForStep() {
      return "Please complete the short contact form below so I can personalize the consultation.";
    }

    function updateLeadUi() {
      if (!input) return;

      const complete = isLeadComplete();
      const submitButton = form ? form.querySelector("button") : null;

      if (quickArea) {
        quickArea.style.display = complete ? "" : "none";
      }

      input.placeholder = complete ? "Type your message..." : "Please complete the contact form above first";
      input.setAttribute("aria-label", input.placeholder);
      input.disabled = !complete || state.isSending;

      if (submitButton) {
        submitButton.disabled = !complete || state.isSending;
      }
    }

    function getLeadFormValues(leadForm) {
      return {
        name: String(leadForm.querySelector("[name='name']").value || "").trim(),
        phone: String(leadForm.querySelector("[name='phone']").value || "").trim(),
        email: String(leadForm.querySelector("[name='email']").value || "").trim(),
        company: String(leadForm.querySelector("[name='company']").value || "").trim()
      };
    }

    function validateLeadForm(values) {
      if (!values.name || !values.phone || !values.email || !values.company) {
        return "Please complete all four fields before starting the chat.";
      }

      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email);
      if (!emailOk) {
        return "Please enter a valid email address.";
      }

      return "";
    }

    async function postLeadCapture() {
      const leadPayload = {
        eventType: "lead_capture",
        sessionId,
page: window.location.href,
        source: "kairox-website-chat",
        channel: "website",
        submittedAt: new Date().toISOString()
      };

      try {
        await fetch(config.webhook, {
          method: "POST",
          mode: "cors",
          credentials: "omit",
          redirect: "follow",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json, text/plain, */*"
          },
          body: JSON.stringify(leadPayload)
        });
      } catch (error) {
        console.warn("[Kairox] lead capture webhook warning", error);
      }
    }

    function appendLeadForm() {
      messages.querySelectorAll("[data-kx-lead-form='true']").forEach((el) => el.remove());
      if (isLeadComplete()) return;

      const wrapper = document.createElement("div");
      wrapper.className = "kx-chat-msg assistant kx-lead-form-message";
      wrapper.setAttribute("data-kx-lead-form", "true");
      wrapper.innerHTML = `
        <div class="kx-lead-form-card">
          <div class="kx-lead-form-heading">Welcome to Kairox AI</div>
          <div class="kx-lead-form-subtitle">Share your details to begin a personalized AI automation consultation.</div>
          <form class="kx-lead-form" novalidate>
            <label class="kx-lead-field">
              <span>Name</span>
              <input type="text" name="name" autocomplete="name" placeholder="Your full name" required>
            </label>

            <label class="kx-lead-field">
              <span>Phone</span>
              <input type="tel" name="phone" autocomplete="tel" placeholder="+971 ..." required>
            </label>

            <label class="kx-lead-field">
              <span>Email</span>
              <input type="email" name="email" autocomplete="email" placeholder="you@company.com" required>
            </label>

            <label class="kx-lead-field">
              <span>Company</span>
              <input type="text" name="company" autocomplete="organization" placeholder="Company name" required>
            </label>

            <div class="kx-lead-form-error" aria-live="polite"></div>
            <button type="submit" class="kx-lead-submit">Start chat</button>
          </form>
        </div>
        <span>${escapeHtml(nowTime())}</span>
      `;

      if (messages.firstChild) {
        messages.insertBefore(wrapper, messages.firstChild);
      } else {
        messages.appendChild(wrapper);
      }
      messages.scrollTop = 0;

      const leadForm = wrapper.querySelector(".kx-lead-form");
      const errorBox = wrapper.querySelector(".kx-lead-form-error");
      const firstInput = wrapper.querySelector("input");

      leadForm.addEventListener("submit", function (event) {
        event.preventDefault();

        const values = getLeadFormValues(leadForm);
        const error = validateLeadForm(values);

        if (error) {
          errorBox.textContent = error;
          const firstEmpty = leadForm.querySelector("input:invalid") || leadForm.querySelector("input");
          if (firstEmpty) firstEmpty.focus();
          return;
        }

        errorBox.textContent = "";
        state.lead = values;
        state.leadStep = "complete";

        wrapper.remove();
        updateLeadUi();

        addMessage("assistant", "Thank you, " + firstName() + ". How can I help you today?");
        postLeadCapture();

        input.disabled = false;
        const submitButton = form.querySelector("button");
        if (submitButton) submitButton.disabled = false;
        input.focus();
      });

      setTimeout(() => {
        if (firstInput && !isLeadComplete()) firstInput.focus();
      }, 150);
    }

    function handleLeadCapture() {
      appendLeadForm();
    }

    function ensureLeadFormVisible() {
      if (!isLeadComplete() && !messages.querySelector("[data-kx-lead-form='true']")) {
        appendLeadForm();
      }
    }

    function renderHistory(forceGreeting = false) {
      messages.innerHTML = "";

      if (!state.history.length || forceGreeting) {
        addMessage("assistant", "Welcome to Kairox AI. Please complete the short form below so I can tailor the automation advice to your business.");
      } else {
        state.history.forEach((item) => appendMessage(item.role, item.text, item.time));
      }

      // Always show the lead form whenever the lead is incomplete.
      // This fixes the first-open case where the welcome message was already in history
      // but the form itself is a DOM element, not a saved history message.
      if (!isLeadComplete()) {
        appendLeadForm();
      }

      updateLeadUi();
      messages.scrollTop = messages.scrollHeight;
    }

    function appendMessage(role, text, time) {
      const msg = document.createElement("div");
      msg.className = "kx-chat-msg " + (role === "user" ? "user" : "assistant");
      msg.innerHTML = `<div>${richText(text)}</div><span>${escapeHtml(time || nowTime())}</span>`;
      messages.appendChild(msg);
      messages.scrollTop = messages.scrollHeight;
    }

    function showTypingIndicator() {
      removeTypingIndicator();

      const typing = document.createElement("div");
      typing.className = "kx-chat-msg assistant";
      typing.setAttribute("data-kx-typing", "true");
      typing.setAttribute("aria-label", "Kairox is typing");

      const bubble = document.createElement("div");
      bubble.setAttribute("role", "status");
      bubble.setAttribute("aria-live", "polite");

      const label = document.createElement("span");
      label.textContent = "Kairox is typing";

      const dots = document.createElement("span");
      dots.setAttribute("aria-hidden", "true");

      const apply = (el, styles) => {
        Object.entries(styles).forEach(([key, value]) => el.style.setProperty(key, value, "important"));
      };

      apply(typing, {
        "display": "block",
        "width": "100%",
        "max-width": "100%",
        "margin": "8px 0",
        "padding": "0",
        "text-align": "left"
      });

      apply(bubble, {
        "display": "inline-flex",
        "flex-direction": "row",
        "align-items": "center",
        "justify-content": "flex-start",
        "flex-wrap": "nowrap",
        "gap": "8px",
        "width": "auto",
        "min-width": "174px",
        "max-width": "none",
        "height": "auto",
        "min-height": "38px",
        "white-space": "nowrap",
        "overflow": "visible",
        "text-overflow": "clip",
        "padding": "10px 14px",
        "border-radius": "16px 16px 16px 6px",
        "background": "rgba(255,255,255,.96)",
        "border": "1px solid rgba(15,118,110,.12)",
        "box-shadow": "0 8px 22px rgba(4,30,43,.08)",
        "color": "#617074",
        "line-height": "1",
        "box-sizing": "border-box"
      });

      apply(label, {
        "display": "inline-block",
        "flex": "0 0 auto",
        "width": "auto",
        "min-width": "max-content",
        "max-width": "none",
        "white-space": "nowrap",
        "overflow": "visible",
        "text-overflow": "clip",
        "font-size": "14px",
        "font-weight": "600",
        "line-height": "1",
        "letter-spacing": "-0.01em",
        "color": "#617074",
        "background": "transparent",
        "border": "0",
        "box-shadow": "none"
      });

      apply(dots, {
        "display": "inline-flex",
        "flex-direction": "row",
        "align-items": "center",
        "justify-content": "flex-start",
        "flex": "0 0 auto",
        "flex-wrap": "nowrap",
        "gap": "4px",
        "width": "26px",
        "min-width": "26px",
        "max-width": "26px",
        "height": "8px",
        "min-height": "8px",
        "max-height": "8px",
        "padding": "0",
        "margin": "0",
        "white-space": "nowrap",
        "overflow": "visible",
        "background": "transparent",
        "border": "0",
        "box-shadow": "none",
        "transform": "none",
        "box-sizing": "border-box"
      });

      const dotElements = [];
      for (let i = 0; i < 3; i += 1) {
        const dot = document.createElement("span");
        dot.className = "kx-typing-dot-js-v27";
        apply(dot, {
          "display": "inline-block",
          "flex": "0 0 6px",
          "width": "6px",
          "min-width": "6px",
          "max-width": "6px",
          "height": "6px",
          "min-height": "6px",
          "max-height": "6px",
          "padding": "0",
          "margin": "0",
          "border-radius": "50%",
          "background": "#0F766E",
          "border": "0",
          "box-shadow": "none",
          "opacity": ".32",
          "transform": "translateY(0) scale(.85)",
          "transition": "opacity .18s ease, transform .18s ease"
        });
        dotElements.push(dot);
        dots.appendChild(dot);
      }

      bubble.appendChild(label);
      bubble.appendChild(dots);
      typing.appendChild(bubble);
      messages.appendChild(typing);
      messages.scrollTop = messages.scrollHeight;

      let activeIndex = 0;
      const paintDots = () => {
        dotElements.forEach((dot, index) => {
          const isActive = index === activeIndex;
          dot.style.setProperty("opacity", isActive ? "1" : ".32", "important");
          dot.style.setProperty("transform", isActive ? "translateY(-3px) scale(1)" : "translateY(0) scale(.85)", "important");
        });
        activeIndex = (activeIndex + 1) % dotElements.length;
      };

      paintDots();
      const intervalId = window.setInterval(paintDots, 260);
      typing.__kxTypingInterval = intervalId;
    }

    function removeTypingIndicator() {
      messages.querySelectorAll("[data-kx-typing='true']").forEach((el) => {
        if (el.__kxTypingInterval) {
          window.clearInterval(el.__kxTypingInterval);
        }
        el.remove();
      });
    }

    function addMessage(role, text) {
      const entry = { role, text, time: nowTime() };
      state.history.push(entry);
      saveHistory();
      appendMessage(role, text, entry.time);
    }

    function setSending(value) {
      state.isSending = value;
      const submitButton = form.querySelector("button");
      if (submitButton) submitButton.disabled = value || !isLeadComplete();
      input.disabled = value || !isLeadComplete();
      typingNote.textContent = value ? "Kairox is thinking..." : "";
    }



    async function postToWebhook(text) {
      const payload = {
        message: text,
        sessionId,
lead: Object.assign({}, state.lead),
        page: window.location.href,
        source: "kairox-website-chat",
        channel: "website",
        submittedAt: new Date().toISOString()
      };

      const response = await fetch(config.webhook, {
        method: "POST",
        mode: "cors",
        credentials: "omit",
        redirect: "follow",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json, text/plain, */*"
        },
        body: JSON.stringify(payload)
      });

      const contentType = response.headers.get("content-type") || "";
      let data = "";

      if (contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const raw = await response.text();
        try {
          data = JSON.parse(raw);
        } catch {
          data = raw;
        }
      }

      // n8n sometimes returns useful JSON with a non-2xx status during testing.
      // Only throw if no readable payload exists.
      if (!response.ok && !extractReply(data)) {
        throw new Error("Webhook HTTP " + response.status + ": " + (typeof data === "string" ? data.slice(0, 180) : JSON.stringify(data).slice(0, 180)));
      }

      return data;
    }

    async function sendMessage(value) {
      const text = String(value || "").trim();
      if (!text || state.isSending) return;

      if (!isLeadComplete()) {
        typingNote.textContent = "Please complete the contact form above first.";
        input.value = "";
        const firstField = messages.querySelector("[data-kx-lead-form='true'] input");
        if (firstField) firstField.focus();
        setTimeout(() => { typingNote.textContent = ""; }, 1400);
        return;
      }

      input.value = "";
      typingNote.textContent = "";
      addMessage("user", text);

      setSending(true);
      showTypingIndicator();

      try {
        const payload = await postToWebhook(text);
        removeTypingIndicator();
        const reply = extractReply(payload) || "Thanks. I received your message. Please share your business type, team size and the process you want to automate so I can guide you better.";
        addMessage("assistant", reply);
      } catch (error) {
        console.error("[Kairox] chat webhook connection error", error);
        removeTypingIndicator();
        addMessage("assistant", "I could not load the live AI reply from the webhook. Please check the browser console for the exact webhook error, or use the Open agent link while this connection is finalised.");
      } finally {
        removeTypingIndicator();
        setSending(false);
        updateLeadUi();
        input.focus();
      }
    }

    window.KairoxChatWidget = {
      open: openPanel,
      close: closePanel,
      toggleRibbon,
      expandRibbon,
      collapseRibbon
    };

    state.isOpen = false;
    panel.classList.remove("open");
    panel.setAttribute("aria-hidden", "true");
    panel.style.removeProperty("display");
    panel.style.removeProperty("visibility");
    panel.style.removeProperty("opacity");
    panel.style.removeProperty("pointer-events");

    state.history = [];
    resetLeadCapture();
    input.value = "";
    typingNote.textContent = "";
    removeTypingIndicator();
    renderHistory(true);
    if (!isLeadComplete()) appendLeadForm();
    syncRibbon();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", buildWidget, { once: true });
  } else {
    buildWidget();
  }
})();
