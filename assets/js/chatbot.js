(function () {
  const config = window.KairoxChatConfig || {};
  const webhookUrl = config.webhook;

  // -----------------------------
  // CREATE UI
  // -----------------------------
  const btn = document.createElement("div");
  btn.innerHTML = "💬";
  btn.style = `
    position:fixed;bottom:20px;right:20px;
    width:60px;height:60px;background:#075e54;
    color:white;border-radius:50%;
    display:flex;align-items:center;justify-content:center;
    font-size:26px;cursor:pointer;z-index:999999;
    box-shadow:0 10px 25px rgba(0,0,0,0.2);
  `;

  const panel = document.createElement("div");
  panel.style = `
    position:fixed;bottom:90px;right:20px;
    width:380px;height:520px;background:#efeae2;
    border-radius:12px;display:none;flex-direction:column;
    overflow:hidden;z-index:999999;
    box-shadow:0 15px 40px rgba(0,0,0,0.25);
  `;

  // -----------------------------
  // HEADER
  // -----------------------------
  const header = document.createElement("div");
  header.style = "background:#075e54;color:#fff;padding:10px;display:flex;justify-content:space-between;align-items:center;";

  header.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;font-weight:bold;">
      <div style="width:28px;height:28px;background:#fff;border-radius:50%;"></div>
      ${config.brand || "AI Assistant"}
    </div>
    <div style="cursor:pointer;">✖</div>
  `;

  // -----------------------------
  // CHAT BOX
  // -----------------------------
  const messages = document.createElement("div");
  messages.style = "flex:1;padding:10px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;";

  // -----------------------------
  // INPUT
  // -----------------------------
  const inputBox = document.createElement("div");
  inputBox.style = "display:flex;padding:8px;background:#f0f0f0;gap:8px;";

  const input = document.createElement("input");
  input.placeholder = "Type your message...";
  input.style = "flex:1;padding:10px;border-radius:20px;border:none;outline:none;";

  const sendBtn = document.createElement("button");
  sendBtn.innerHTML = "➤";
  sendBtn.style = "width:40px;height:40px;border-radius:50%;background:#075e54;color:#fff;border:none;cursor:pointer;";

  inputBox.appendChild(input);
  inputBox.appendChild(sendBtn);

  panel.appendChild(header);
  panel.appendChild(messages);
  panel.appendChild(inputBox);

  document.body.appendChild(btn);
  document.body.appendChild(panel);

  // -----------------------------
  // SESSION ID (IMPORTANT)
  // -----------------------------
  let sessionId = localStorage.getItem("kx_session");

  if (!sessionId) {
    sessionId = "kx_" + Math.random().toString(36).substring(2, 10);
    localStorage.setItem("kx_session", sessionId);
  }

  // -----------------------------
  // TOGGLE
  // -----------------------------
  btn.onclick = () => {
    panel.style.display = panel.style.display === "flex" ? "none" : "flex";
  };

  header.lastElementChild.onclick = () => {
    panel.style.display = "none";
  };

  // -----------------------------
  // UI HELPERS
  // -----------------------------
  function addMessage(text, type) {
    const div = document.createElement("div");
    div.style.maxWidth = "75%";
    div.style.padding = "8px 10px";
    div.style.borderRadius = "8px";
    div.style.fontSize = "14px";
    div.style.wordWrap = "break-word";

    if (type === "user") {
      div.style.alignSelf = "flex-end";
      div.style.background = "#dcf8c6";
    } else {
      div.style.alignSelf = "flex-start";
      div.style.background = "#fff";
    }

    div.innerHTML = text;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  }

  // -----------------------------
  // SEND MESSAGE (UPGRADED)
  // -----------------------------
  async function sendMessage() {
    const text = input.value.trim();
    if (!text) return;

    addMessage(text, "user");
    input.value = "";

    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          sessionId: sessionId,
          page: window.location.href
        })
      });

      const data = await res.json();
      const reply = data.output || data.message || "No response";

      addMessage(reply, "bot");

    } catch (err) {
      addMessage("Connection error", "bot");
    }
  }

  sendBtn.onclick = sendMessage;

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendMessage();
  });

})();