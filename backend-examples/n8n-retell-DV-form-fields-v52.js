// n8n Code node for /webhook/retell_DV when the website sends form-urlencoded fields.
// Webhook -> Code -> Respond to Webhook
// Retell API key must be available server-side as RETELL_API_KEY.

const body = $json.body || $json;

const dynamicVariables = {
  name: String(body.name || ""),
  phone: String(body.phone || ""),
  email: String(body.email || ""),
  company: String(body.company || ""),
  sessionId: String(body.sessionId || "")
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

return [{ json: response }];
