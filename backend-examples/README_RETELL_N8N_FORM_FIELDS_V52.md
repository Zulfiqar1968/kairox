# Kairox Retell n8n Form Fields v52

The chatbot now sends the Retell access-token request to n8n as separate form fields, not as one JSON string.

Webhook URL:

```text
https://workflows-n8nrunnerpostgresollama-cc30a1-187-127-191-113.sslip.io/webhook/retell_DV
```

## What n8n receives

Content-Type:

```text
application/x-www-form-urlencoded;charset=UTF-8
```

Fields:

```text
agent_id
agent_version
name
phone
email
company
sessionId
```

In n8n, use:

```text
$json.body.name
$json.body.phone
$json.body.email
$json.body.company
$json.body.sessionId
```

If your n8n version exposes form fields at the top level instead, use:

```text
$json.name
$json.phone
$json.email
$json.company
$json.sessionId
```

## HTTP Request node to Retell

Method:

```text
POST
```

URL:

```text
https://api.retellai.com/v2/create-web-call
```

Headers:

```text
Authorization: Bearer YOUR_RETELL_API_KEY
Content-Type: application/json
```

JSON body:

```json
{
  "agent_id": "={ $json.body.agent_id || $json.agent_id }",
  "agent_version": "={ Number($json.body.agent_version || $json.agent_version || 0) }",
  "retell_llm_dynamic_variables": {
    "name": "={ $json.body.name || $json.name || '' }",
    "phone": "={ $json.body.phone || $json.phone || '' }",
    "email": "={ $json.body.email || $json.email || '' }",
    "company": "={ $json.body.company || $json.company || '' }",
    "sessionId": "={ $json.body.sessionId || $json.sessionId || '' }"
  },
  "metadata": {
    "sessionId": "={ $json.body.sessionId || $json.sessionId || '' }"
  }
}
```

## Respond to Webhook

Return the full Retell response JSON. It must include:

```text
access_token
```
