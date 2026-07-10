(function () {
  "use strict";

  const settings = window.KairoxSettings || {};

  function prefix() {
    const path = (window.location && window.location.pathname ? window.location.pathname : "").replace(/\\/g, "/");
    const parts = path.split("/").filter(Boolean);
    const file = parts.length ? parts[parts.length - 1] : "";
    const folder = parts.length > 1 ? parts[parts.length - 2] : "";
    const oneLevelFolders = ["industries", "blog"];

    if (oneLevelFolders.includes(folder)) return "../";

    // When a local file is opened, do not count computer folder segments as website depth.
    return "";
  }

  function cleanLocalPath(path) {
    let clean = String(path || "").split(String.fromCharCode(92)).join("/");
    if (/^(https?:|data:|mailto:|tel:|#|javascript:|blob:)/i.test(clean) || clean.startsWith("//")) return clean;
    if (clean.toLowerCase().indexOf("file:") === 0) clean = clean.slice(5);
    clean = clean.replace(/^\/+/, "");
    if (clean.length > 2 && clean.charAt(1) === ":") clean = clean.slice(2).replace(/^\/+/, "");
    return clean.replace(/^(\.\.\/)+/, "").replace(/^\.\//, "").replace(/^\/+/, "");
  }

  function toRootPath(path) {
    if (!path) return "";
    if (/^(https?:|data:|mailto:|tel:|#|javascript:|blob:)/i.test(path)) return path;
    if (String(path).startsWith("//")) return path;
    return prefix() + cleanLocalPath(path);
  }


  function toAsset(path) {
    if (!path) return "";
    if (/^(https?:|data:|mailto:|tel:)/i.test(path)) return path;
    return prefix() + cleanLocalPath(path);
  }

  function normalizeHref(href) {
    if (!href) return "";
    if (/^(https?:|mailto:|tel:|#|javascript:)/i.test(href)) return href;
    return prefix() + cleanLocalPath(href);
  }

  function setActiveNav() {
    const current = (window.location.pathname.split("/").pop() || "index.html").toLowerCase();
    document.querySelectorAll(".navbar .nav-link").forEach((link) => {
      const href = (link.getAttribute("href") || "").split("#")[0].split("?")[0].split("/").pop().toLowerCase() || "index.html";
      link.classList.toggle("active", href === current);
    });
  }


  function renderSolutionNavigation() {
    const s = window.KairoxSettings || {};
    const links = s.navigation && Array.isArray(s.navigation.solutions) ? s.navigation.solutions : [];
    if (!links.length) return;

    document.querySelectorAll(".navbar-nav").forEach((navList) => {
      const oldSolutions = Array.from(navList.children).find((li) => {
        const a = li.querySelector("a.nav-link");
        return a && /solutions\.html/i.test(a.getAttribute("href") || "") && !li.classList.contains("kx-solutions-menu");
      });

      if (!oldSolutions) return;

      const item = document.createElement("li");
      item.className = "nav-item dropdown kx-solutions-menu";
      item.innerHTML = `
        <a aria-expanded="false" class="nav-link dropdown-toggle" data-bs-toggle="dropdown" href="${normalizeHref("solutions.html")}" role="button">Solutions</a>
        <ul class="dropdown-menu dropdown-menu-xl-end"></ul>
      `;

      const menu = item.querySelector(".dropdown-menu");
      links.forEach((link) => {
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.className = "dropdown-item";
        a.href = normalizeHref(link.href);
        a.textContent = link.label;
        li.appendChild(a);
        menu.appendChild(li);
      });

      oldSolutions.replaceWith(item);
    });
  }

  function renderFooterSolutions() {
    const s = window.KairoxSettings || {};
    const links = s.navigation && Array.isArray(s.navigation.footerSolutions) ? s.navigation.footerSolutions : [];
    if (!links.length) return;

    document.querySelectorAll("footer h6").forEach((heading) => {
      if ((heading.textContent || "").trim().toLowerCase() !== "solutions") return;
      const col = heading.parentElement;
      if (!col) return;

      Array.from(col.querySelectorAll("a")).forEach((a) => a.remove());

      links.forEach((link) => {
        const a = document.createElement("a");
        a.href = normalizeHref(link.href);
        a.textContent = link.label;
        col.appendChild(a);
      });
    });
  }

  function syncLayoutSettings() {
    const s = window.KairoxSettings || {};
    const contact = s.contact || {};
    const brand = s.brand || {};
    const footer = s.footer || {};

    renderSolutionNavigation();
    renderFooterSolutions();

    document.querySelectorAll("nav .navbar-brand img").forEach((img) => {
      img.src = toAsset(brand.logoMark || "/assets/img/kairox-mark.svg");
      img.alt = brand.company || "Kairox FZC LLC";
    });

    document.querySelectorAll("footer img.footer-logo").forEach((img) => {
      img.src = toAsset(brand.logoLight || "/assets/img/kairox-logo-light.svg");
      img.alt = brand.company || "Kairox logo";
    });

    document.querySelectorAll('a[href*="wa.me/"]').forEach((a) => {
      if (contact.whatsappHref) a.href = contact.whatsappHref;
    });

    document.querySelectorAll('a[href^="mailto:"]').forEach((a) => {
      if (contact.email) a.href = "mailto:" + contact.email;
    });

    const footerIntro = document.querySelector("footer .col-lg-4 p");
    if (footerIntro && footer.description) footerIntro.textContent = footer.description;

    const footerSpans = document.querySelectorAll("footer .small span");
    if (footerSpans[0] && footer.copyright) footerSpans[0].textContent = footer.copyright;
    if (footerSpans[1] && footer.tagline) footerSpans[1].textContent = footer.tagline;

    document.querySelectorAll("footer a[href], nav a[href]").forEach((a) => {
      const raw = a.getAttribute("href");
      if (!raw || /^(https?:|mailto:|tel:|#|javascript:)/i.test(raw)) return;
      a.setAttribute("href", normalizeHref(raw));
    });

    setActiveNav();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", syncLayoutSettings, { once: true });
  } else {
    syncLayoutSettings();
  }
})();
