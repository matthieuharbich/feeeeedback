// feeeeedback — content script
// Picker UI: hover-outline, click to capture, floating comment panel.

(() => {
  if (window.__ff_injected__) return;
  window.__ff_injected__ = true;

  const OUTLINE_CLASS = "ff-outline-hover";
  const MARKED_CLASS = "ff-marked";
  let active = false;
  let panelOpen = false;
  let currentHover = null;

  // --- selector generation ---------------------------------------------------
  function cssPath(el) {
    if (!(el instanceof Element)) return "";
    const path = [];
    let node = el;
    while (node && node.nodeType === Node.ELEMENT_NODE && node !== document.documentElement) {
      let selector = node.nodeName.toLowerCase();
      if (node.id) {
        selector += `#${CSS.escape(node.id)}`;
        path.unshift(selector);
        break;
      }
      const classes = [...node.classList].filter((c) => !c.startsWith("ff-"));
      if (classes.length) selector += "." + classes.map(CSS.escape).join(".");
      const parent = node.parentElement;
      if (parent) {
        const siblings = [...parent.children].filter((c) => c.nodeName === node.nodeName);
        if (siblings.length > 1) {
          const idx = siblings.indexOf(node) + 1;
          selector += `:nth-of-type(${idx})`;
        }
      }
      path.unshift(selector);
      node = parent;
    }
    return path.join(" > ");
  }

  // --- picker handlers -------------------------------------------------------
  function onMouseOver(e) {
    if (!active || panelOpen) return;
    const target = e.target;
    if (isInsideUi(target)) return;
    if (currentHover) currentHover.classList.remove(OUTLINE_CLASS);
    currentHover = target;
    currentHover.classList.add(OUTLINE_CLASS);
  }

  function onMouseOut(e) {
    if (!active) return;
    if (e.target === currentHover) {
      currentHover.classList.remove(OUTLINE_CLASS);
      currentHover = null;
    }
  }

  function onClick(e) {
    if (!active || panelOpen) return;
    const target = e.target;
    if (isInsideUi(target)) return;
    e.preventDefault();
    e.stopPropagation();
    if (currentHover) currentHover.classList.remove(OUTLINE_CLASS);
    openCommentPanel(target);
  }

  function onKeyDown(e) {
    if (!active) return;
    if (e.key === "Escape") {
      if (panelOpen) closeCommentPanel();
      else deactivate();
    }
  }

  // --- comment panel ---------------------------------------------------------
  let panelEl = null;

  function openCommentPanel(target) {
    panelOpen = true;
    target.classList.add(MARKED_CLASS);
    const selector = cssPath(target);
    const text = (target.innerText || target.value || target.alt || "").trim().slice(0, 200);
    const rect = target.getBoundingClientRect();

    panelEl = document.createElement("div");
    panelEl.className = "ff-panel";
    panelEl.innerHTML = `
      <div class="ff-panel-header">
        <span class="ff-panel-title">feeeeedback</span>
        <button class="ff-btn ff-btn-ghost" data-ff-close>✕</button>
      </div>
      <div class="ff-panel-meta">
        <div class="ff-panel-selector" title="Sélecteur CSS"></div>
        <div class="ff-panel-text" title="Texte de l'élément"></div>
      </div>
      <textarea class="ff-panel-textarea" placeholder="Ton commentaire…" rows="4"></textarea>
      <div class="ff-panel-actions">
        <button class="ff-btn ff-btn-ghost" data-ff-cancel>Annuler</button>
        <button class="ff-btn ff-btn-primary" data-ff-save>Enregistrer</button>
      </div>
    `;
    panelEl.querySelector(".ff-panel-selector").textContent = selector;
    panelEl.querySelector(".ff-panel-text").textContent = text || "(aucun texte)";

    document.documentElement.appendChild(panelEl);
    positionPanel(rect);

    const textarea = panelEl.querySelector(".ff-panel-textarea");
    textarea.focus();

    panelEl.querySelector("[data-ff-close]").addEventListener("click", () => {
      target.classList.remove(MARKED_CLASS);
      closeCommentPanel();
    });
    panelEl.querySelector("[data-ff-cancel]").addEventListener("click", () => {
      target.classList.remove(MARKED_CLASS);
      closeCommentPanel();
    });
    panelEl.querySelector("[data-ff-save]").addEventListener("click", async () => {
      const comment = textarea.value.trim();
      if (!comment) {
        textarea.focus();
        return;
      }
      await chrome.runtime.sendMessage({
        type: "ADD_ITEM",
        item: {
          selector,
          text,
          comment,
          tagName: target.tagName.toLowerCase(),
          url: location.href,
          createdAt: new Date().toISOString(),
        },
      });
      closeCommentPanel();
    });
    textarea.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        panelEl.querySelector("[data-ff-save]").click();
      }
    });
  }

  function positionPanel(rect) {
    const margin = 10;
    const panelW = 360;
    const panelH = panelEl.offsetHeight || 260;
    let top = window.scrollY + rect.bottom + margin;
    let left = window.scrollX + rect.left;
    if (left + panelW > window.scrollX + window.innerWidth) {
      left = window.scrollX + window.innerWidth - panelW - margin;
    }
    if (top + panelH > window.scrollY + window.innerHeight) {
      top = window.scrollY + rect.top - panelH - margin;
      if (top < window.scrollY) top = window.scrollY + margin;
    }
    panelEl.style.top = `${top}px`;
    panelEl.style.left = `${Math.max(margin, left)}px`;
  }

  function closeCommentPanel() {
    if (panelEl) {
      panelEl.remove();
      panelEl = null;
    }
    panelOpen = false;
  }

  function isInsideUi(el) {
    return el.closest && (el.closest(".ff-panel") || el.closest(".ff-banner"));
  }

  // --- activation ------------------------------------------------------------
  let bannerEl = null;

  function activate() {
    if (active) return;
    active = true;
    document.addEventListener("mouseover", onMouseOver, true);
    document.addEventListener("mouseout", onMouseOut, true);
    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onKeyDown, true);
    showBanner();
  }

  function deactivate() {
    if (!active) return;
    active = false;
    document.removeEventListener("mouseover", onMouseOver, true);
    document.removeEventListener("mouseout", onMouseOut, true);
    document.removeEventListener("click", onClick, true);
    document.removeEventListener("keydown", onKeyDown, true);
    if (currentHover) currentHover.classList.remove(OUTLINE_CLASS);
    currentHover = null;
    closeCommentPanel();
    hideBanner();
    chrome.runtime.sendMessage({ type: "STOP_SESSION" });
  }

  function showBanner() {
    if (bannerEl) return;
    bannerEl = document.createElement("div");
    bannerEl.className = "ff-banner";
    bannerEl.innerHTML = `
      <span class="ff-banner-dot"></span>
      <span>feeeeedback actif — clique un élément pour commenter</span>
      <button class="ff-btn ff-btn-ghost" data-ff-stop>Stop</button>
    `;
    document.documentElement.appendChild(bannerEl);
    bannerEl.querySelector("[data-ff-stop]").addEventListener("click", deactivate);
  }

  function hideBanner() {
    if (bannerEl) {
      bannerEl.remove();
      bannerEl = null;
    }
  }

  // --- message handler -------------------------------------------------------
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "FF_ACTIVATE") {
      activate();
      sendResponse({ ok: true });
    } else if (msg.type === "FF_DEACTIVATE") {
      deactivate();
      sendResponse({ ok: true });
    } else if (msg.type === "FF_PING") {
      sendResponse({ ok: true, active });
    }
    return true;
  });

  // Re-activate if session was left active (e.g. tab switch)
  chrome.runtime.sendMessage({ type: "GET_SESSION" }, (session) => {
    if (session && session.active && session.url === location.href) activate();
  });
})();
