// n8n Code node for webhook /retell_DV
// Webhook -> Code -> Respond to Webhook
// Calls Retell Create Web Call and returns access_token to the website.

const incoming = $json.body ?? $json;
const body = typeof incoming === "string" ? JSON.parse(incoming || "{}") : incoming;

const vars = body.retell_llm_dynamic_variables || body;

const dynamicVariables = {
  name: String(vars.name || ""),
  phone: String(vars.phone || ""),
  email: String(vars.email || ""),
  company: String(vars.company || ""),
  sessionId: String(vars.sessionId || "")
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
