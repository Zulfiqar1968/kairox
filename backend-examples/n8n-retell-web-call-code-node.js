// n8n Code node for POST /webhook/retell-web-call
// Flow: Webhook node -> this Code node -> Respond to Webhook node
// Store the Retell API key server-side as environment variable: RETELL_API_KEY
// IMPORTANT: The browser sends text/plain to avoid CORS preflight, so this code handles string or object body.

const incoming = $json.body ?? $json;
const body = typeof incoming === "string" ? JSON.parse(incoming) : incoming;

const input = body.retell_llm_dynamic_variables || {};

const dynamicVariables = {
  name: String(input.name || ""),
  phone: String(input.phone || ""),
  email: String(input.email || ""),
  company: String(input.company || ""),
  sessionId: String(input.sessionId || "")
};

const response = await this.helpers.httpRequest({
  method: "POST",
  url: "https://api.retellai.com/v2/create-web-call",
  headers: {
    "Authorization": `Bearer ${process.env.RETELL_API_KEY}`,
    "Content-Type": "application/json"
  },
  body: {
    agent_id: body.agent_id || "agent_5ec6dc37c1772b2f9adc74074b",
    agent_version: body.agent_version === "latest" ? "latest" : Number(body.agent_version || 0),
    retell_llm_dynamic_variables: dynamicVariables,
    metadata: {
      sessionId: dynamicVariables.sessionId
    }
  },
  json: true
});

return [{
  json: response
}];
