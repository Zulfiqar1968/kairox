(function () {
  'use strict';

  function getStored(key, fallback = '') {
    try { return localStorage.getItem(key) || fallback; } catch (e) { return fallback; }
  }

  function setStored(key, value) {
    try { localStorage.setItem(key, value); } catch (e) {}
  }

  const nav = document.querySelector('.navbar');
  const back = document.querySelector('.back-to-top');

  function setScrolled() {
    if (nav) nav.classList.toggle('scrolled', window.scrollY > 18);
    if (back) back.classList.toggle('show', window.scrollY > 420);
  }
  window.addEventListener('scroll', setScrolled, { passive: true });
  setScrolled();

  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', function (e) {
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  if (window.AOS) {
    AOS.init({
      duration: 950,
      easing: 'ease-out-cubic',
      once: true,
      offset: 72,
      mirror: false,
      anchorPlacement: 'top-bottom'
    });
  }

  function getTextNodes(root) {
    const nodes = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        const parent = node.parentElement;
        if (!parent || ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(parent.tagName)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    let node;
    while ((node = walker.nextNode())) nodes.push(node);
    return nodes;
  }

  function translatePage(lang) {
    const ar = (window.KAIROX_I18N && window.KAIROX_I18N.ar) || {};
    const en = Object.fromEntries(Object.entries(ar).map(([k, v]) => [v, k]));
    const dict = lang === 'ar' ? ar : en;
    const attrNames = ['placeholder', 'aria-label', 'title', 'value'];

    getTextNodes(document.body).forEach((node) => {
      const original = node.nodeValue;
      const trimmed = original.trim().replace(/\s+/g, ' ');
      if (dict[trimmed]) {
        node.nodeValue = original.replace(trimmed, dict[trimmed]);
      }
    });

    document.querySelectorAll('input, textarea, button, a, img, select').forEach((el) => {
      attrNames.forEach((attr) => {
        if (!el.hasAttribute(attr)) return;
        const value = el.getAttribute(attr);
        if (dict[value]) el.setAttribute(attr, dict[value]);
      });
    });

    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.body.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.body.classList.toggle('rtl', lang === 'ar');
  }

  const languageSelectors = document.querySelectorAll('[data-language-selector]');
  const savedLanguage = getStored('kairox_lang', 'en');
  languageSelectors.forEach((selector) => {
    selector.value = savedLanguage;
    selector.addEventListener('change', (e) => {
      const value = e.target.value;
      setStored('kairox_lang', value);
      languageSelectors.forEach((s) => { s.value = value; });
      translatePage(value);
    });
  });
  if (savedLanguage !== 'en') translatePage(savedLanguage);

  const LEAD_WEBHOOK_URL = window.KAIROX_LEAD_WEBHOOK_URL || 'https://molly-preestival-irina.ngrok-free.app/webhook/kairox';

  document.querySelectorAll('[data-kx-form]').forEach((form) => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const alert = form.querySelector('[data-form-alert]');
      const btn = form.querySelector('button[type="submit"]');
      const data = Object.fromEntries(new FormData(form).entries());
      const isLocalFilePreview = location.protocol === 'file:';
      data.source_page = isLocalFilePreview ? (location.pathname.split('/').pop() || 'local-preview') : location.pathname;
      data.source_url = isLocalFilePreview ? 'local-preview' : location.href;
      data.page_title = document.title;
      data.timestamp = new Date().toISOString();
      data.source = 'kairox_website';
      data.notification_email = data.notification_email || 'kairoxly@gmail.com';

      const body = new URLSearchParams();
      Object.entries(data).forEach(([key, value]) => body.append(key, value == null ? '' : String(value)));

      if (btn) {
        btn.disabled = true;
        btn.dataset.original = btn.textContent;
        btn.textContent = (getStored('kairox_lang', 'en') === 'ar') ? 'جارٍ الإرسال...' : 'Sending...';
      }

      try {
        const response = await fetch(LEAD_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
          body: body.toString(),
        });
        if (!response.ok) throw new Error('Webhook error ' + response.status);

        if (alert) {
          alert.className = 'alert alert-success mt-3';
          alert.textContent = (getStored('kairox_lang', 'en') === 'ar')
            ? 'شكرًا لك. تم إرسال طلبك إلى كايروكس وسنتواصل معك قريبًا.'
            : 'Thank you. Your request has been sent to Kairox. We will contact you shortly.';
        }
        form.reset();
      } catch (err) {
        console.error(err);
        if (alert) {
          alert.className = 'alert alert-warning mt-3';
          alert.textContent = (getStored('kairox_lang', 'en') === 'ar')
            ? 'تعذر إرسال النموذج الآن. يرجى التواصل معنا عبر واتساب أو المحاولة مرة أخرى.'
            : 'We could not submit the form right now. Please contact us on WhatsApp or try again.';
        }
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.textContent = btn.dataset.original;
        }
      }
    });
  });

  document.querySelectorAll('[data-track]').forEach((el) => {
    el.addEventListener('click', () => {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: el.getAttribute('data-track'), page: location.pathname });
    });
  });

  // Premium pointer micro-interactions for hero, solution and featured AI agent cards.
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!prefersReducedMotion) {
    const tiltCards = document.querySelectorAll('[data-tilt], .agent-card, .hero-card, .pricing-card.featured');
    tiltCards.forEach((card) => {
      card.addEventListener('mousemove', (event) => {
        const rect = card.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const rotateY = ((x / rect.width) - 0.5) * 7;
        const rotateX = ((0.5 - y / rect.height)) * 7;
        card.style.setProperty('--mx', `${x}px`);
        card.style.setProperty('--my', `${y}px`);
        card.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px)`;
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
        card.style.removeProperty('--mx');
        card.style.removeProperty('--my');
      });
    });
  }

  // Soft count-up effect for visible stat numbers.
  const stats = document.querySelectorAll('.stat strong, .hero-metric strong, .case-metric strong');
  if ('IntersectionObserver' in window && !prefersReducedMotion) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const original = el.textContent.trim();
        const match = original.match(/^(\d+)(.*)$/);
        if (!match) return observer.unobserve(el);
        const target = parseInt(match[1], 10);
        const suffix = match[2];
        let start = null;
        const duration = 900;
        function step(timestamp) {
          if (!start) start = timestamp;
          const progress = Math.min((timestamp - start) / duration, 1);
          const value = Math.round(target * (1 - Math.pow(1 - progress, 3)));
          el.textContent = value + suffix;
          if (progress < 1) requestAnimationFrame(step);
          else el.textContent = original;
        }
        requestAnimationFrame(step);
        observer.unobserve(el);
      });
    }, { threshold: 0.45 });
    stats.forEach((stat) => observer.observe(stat));
  }
})();
