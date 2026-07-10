// Node/Express backend endpoint for Retell Create Web Call.
// npm install express cors dotenv
// .env: RETELL_API_KEY=key_xxx

import express from "express";
import cors from "cors";
import "dotenv/config";

const app = express();

app.use(cors({
  origin: true,
  methods: ["POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Accept"]
}));

app.use(express.text({ type: "text/plain" }));
app.use(express.json());

app.post("/retell-web-call", async (req, res) => {
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const input = body.retell_llm_dynamic_variables || {};

    const dynamicVariables = {
      name: String(input.name || ""),
      phone: String(input.phone || ""),
      email: String(input.email || ""),
      company: String(input.company || ""),
      sessionId: String(input.sessionId || "")
    };

    const response = await fetch("https://api.retellai.com/v2/create-web-call", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.RETELL_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        agent_id: body.agent_id || "agent_5ec6dc37c1772b2f9adc74074b",
        agent_version: body.agent_version === "latest" ? "latest" : Number(body.agent_version || 0),
        retell_llm_dynamic_variables: dynamicVariables,
        metadata: {
          sessionId: dynamicVariables.sessionId
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => console.log("Retell web-call endpoint running on port 3000"));
