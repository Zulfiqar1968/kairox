# Kairox FZC LLC Static Website

A production-ready premium corporate website for Kairox AI Automation, built with HTML5, CSS3, JavaScript, Bootstrap 5, AOS animations and a custom n8n-powered chatbot widget.

## Folder structure
```
kairox-website/
  index.html
  about.html
  solutions.html
  industries.html
  ai-employees.html
  pricing.html
  case-studies.html
  blog.html
  contact.html
  industries/*.html
  blog/*.html
  assets/css/styles.css
  assets/js/main.js
  assets/js/chatbot.js
  assets/js/calculators.js
  assets/img/*.svg
  assets/img/*.png
  assets/img/agents/*.svg
  docs/website-strategy.md
  docs/brand-guidelines.md
```

## Run locally
```bash
cd kairox-website
python -m http.server 8080
```
Then open `http://localhost:8080`.

## Chatbot integration
The chatbot sends POST requests to:
```text
http://localhost:5678/webhook/ebb8e3d9-24dd-4ab2-b79d-45f4c7851c27/chat
```
Request payload:
```json
{
  "message": "user question",
  "session_id": "unique_session_id",
  "source": "website"
}
```
Expected response:
```json
{
  "reply": "AI response",
  "lead_status": "qualified"
}
```


## Contact and WhatsApp settings
- WhatsApp links are configured to `+971 52 285 5000` using `https://wa.me/971522855000`.
- Contact and newsletter forms submit to the n8n webhook `https://molly-preestival-irina.ngrok-free.app/webhook/kairox` using POST parameters and query parameters. The workflow should send notifications to `kairoxly@gmail.com`.
- Form payload includes form_type, name/email/phone fields where present, source_page, page_title, timestamp, source and notification_email.

## Production edits needed
1. Replace placeholder domain `https://kairox.ai/` in schema when the final domain is confirmed.
2. Replace case study placeholders with approved client data.
3. Expand blog placeholder articles before SEO publishing.
4. Add analytics scripts such as Google Analytics, Google Tag Manager or Meta Pixel as needed.

## Deployment
Deploy as a static site to Netlify, Vercel, Cloudflare Pages, GitHub Pages or any cPanel hosting. Upload the full `kairox-website` folder contents to the web root.

## Bilingual launch readiness

The site includes an English/Arabic language selector, RTL layout support, Arabic translations for navigation, forms, CTAs and main conversion content, and the same n8n webhook for both languages.

## n8n lead webhook

Webhook: `https://molly-preestival-irina.ngrok-free.app/webhook/kairox`

The frontend sends form submissions as POST parameters and as query parameters for easy mapping in n8n Webhook nodes. Configure your n8n workflow to send the received data to `kairoxly@gmail.com`.


## v54 Feature Additions
- New Trainings feature with Documents and Videos.
- New Sales Presentations for Prospects feature.
- New pages: `trainings.html` and `sales-presentations.html`.
- Central navigation/footer solution links are controlled through `assets/js/kairox-settings.js`.
