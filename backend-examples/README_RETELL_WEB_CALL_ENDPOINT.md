# Retell Web Call Endpoint Setup

The website cannot call Retell directly with your API key. The browser must call your backend/n8n webhook, and that backend must call Retell Create Web Call.

## Endpoint expected by the website

```text
https://workflows-n8nrunnerpostgresollama-cc30a1-187-127-191-113.sslip.io/webhook/retell-web-call
```

## Required browser response

Your endpoint must return JSON containing Retell's `access_token`.

## n8n setup

1. Create an n8n workflow.
2. Add a **Webhook** node:
   - Method: `POST`
   - Path: `retell-web-call`
   - Response mode: use **Respond to Webhook** node.
3. Add a **Code** node after the Webhook.
4. Paste the code from:

```text
backend-examples/n8n-retell-web-call-code-node.js
```

5. Add a **Respond to Webhook** node:
   - Respond with: JSON from the Code node.
   - Add response headers if your n8n setup supports them:

```text
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, Accept
```

6. Make the workflow Active.
7. Store the Retell API key server-side as:

```text
RETELL_API_KEY
```

## Important

The website sends `Content-Type: text/plain;charset=UTF-8` to avoid browser CORS preflight problems. The Code node handles this by parsing the body if it arrives as a string.

## Retell API endpoint used by backend

```text
https://api.retellai.com/v2/create-web-call
```

## Variables passed to Retell

```json
{
  "name": "...",
  "phone": "...",
  "email": "...",
  "company": "...",
  "sessionId": "..."
}
```
