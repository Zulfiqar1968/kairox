# Kairox Retell DV Webhook v51

The website now calls this n8n webhook to get the Retell `access_token`:

```text
https://workflows-n8nrunnerpostgresollama-cc30a1-187-127-191-113.sslip.io/webhook/retell_DV
```

## What the website sends to n8n

The browser sends a POST request with `Content-Type: text/plain;charset=UTF-8` to reduce CORS preflight problems.

Payload includes both top-level fields and `retell_llm_dynamic_variables`:

```json
{
  "agent_id": "agent_5ec6dc37c1772b2f9adc74074b",
  "agent_version": "0",
  "retell_llm_dynamic_variables": {
    "name": "...",
    "phone": "...",
    "email": "...",
    "company": "...",
    "sessionId": "..."
  },
  "name": "...",
  "phone": "...",
  "email": "...",
  "company": "...",
  "sessionId": "..."
}
```

## Where to add the Retell token/API key

Add the Retell API key in the n8n HTTP Request node header:

```text
Authorization: Bearer YOUR_RETELL_API_KEY
Content-Type: application/json
```

Do not put the Retell API key in the website.

## n8n flow

```text
Webhook: POST /retell_DV
↓
HTTP Request: POST https://api.retellai.com/v2/create-web-call
↓
Respond to Webhook: return Retell response JSON
```

## Required response to website

The n8n Respond to Webhook node must return JSON containing:

```json
{
  "access_token": "retell_access_token_here"
}
```
