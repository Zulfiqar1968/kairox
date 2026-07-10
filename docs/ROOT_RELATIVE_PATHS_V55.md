# Kairox v55 Root-relative Paths

All local website references in HTML now point from the website home directory using root-relative paths.

Examples:

```text
/assets/css/styles.css
/assets/js/kairox-settings.js
/assets/js/chatbot.js
/assets/img/kairox-mark.svg
/index.html
/solutions.html
/trainings.html
/sales-presentations.html
/industries/real-estate.html
```

This avoids references resolving against a local computer drive when files are opened or moved during editing.

Important: deploy the `kairox` folder contents at your website domain root. If you deploy inside a subfolder, root-relative paths will need that subfolder prefix.
