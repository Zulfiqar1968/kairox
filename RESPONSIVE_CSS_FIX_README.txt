Kairox responsive/mobile-first CSS fix

What changed:
- Added a mobile-first responsive CSS layer in assets/css/responsive-mobile-first.css
- Also appended the same responsive layer to assets/css/styles.css as a fallback
- Updated all HTML files to load styles.css with cache-busting and then load responsive-mobile-first.css after it

Main fixes:
- No horizontal overflow on mobile
- Navbar/logo/hamburger remain inside the viewport
- Hero pills wrap correctly instead of forcing the page wider
- Adaptive margins at phone, tablet, laptop, desktop and wide desktop sizes
- Responsive typography, section spacing, cards, grids and media sizing
- Chat and back-to-top buttons stay inside the screen

Deployment:
Upload the full ZIP contents to your hosting.
If you only want the CSS fix, upload:
assets/css/styles.css
assets/css/responsive-mobile-first.css
and the updated HTML files so the new responsive CSS file is loaded.
