# Kairox v53 — Central Settings and Retell Fixes

## Main settings file

All frequently changed website/chatbot settings are now centralized here:

```text
assets/js/kairox-settings.js
```

Update these values there instead of editing every HTML page:

```text
Retell access-token webhook
Retell agent ID
Retell agent version
Lead webhook
Brand name
Logo paths
WhatsApp link
Email
Footer text
```

## Retell version

Retell agent version is now:

```text
28
```

## Retell webhook

The chatbot calls:

```text
https://workflows-n8nrunnerpostgresollama-cc30a1-187-127-191-113.sslip.io/webhook/retell_DV
```

## Fields sent to n8n

The chatbot sends `application/x-www-form-urlencoded` separate fields:

```text
agent_id
agent_version
name
phone
email
company
sessionId
```

## In n8n, use

```text
$json.body.name
$json.body.phone
$json.body.email
$json.body.company
$json.body.sessionId
$json.body.agent_version
```

If your n8n instance exposes form fields at top level, use:

```text
$json.name
$json.phone
$json.email
$json.company
$json.sessionId
$json.agent_version
```

## Double call prevention

v53 prevents duplicate calls by:

```text
- Removing multi pointer/touch/click bindings from the Call button
- Preventing the global call listener from also firing on the floating ribbon
- Adding isVoiceCallStarting/currentVoiceCallPromise guards
- Disabling the Start voice call button while a call is starting or connected
```

## Loading animation

The voice panel now shows animated loading dots while:

```text
- SDK is loading
- n8n access_token request is running
- Retell call is starting
```

## Header/footer consistency

This is a static HTML site, so the old header/footer markup remains as SEO/no-JS fallback. However, the live settings are now centralized:

```text
assets/js/kairox-settings.js
assets/js/kairox-layout-sync.js
```

`kairox-layout-sync.js` syncs shared contact/footer/logo settings across all pages at runtime.
