// feeeeedback — content script
// Floating widget (always visible when session active) with picker toggle,
// comment list, copy, stop. Selector mode is a sub-state of the session.

(() => {
  if (window.__ff_injected__) return;
  window.__ff_injected__ = true;

  const OUTLINE_CLASS = "ff-outline-hover";
  const MARKED_CLASS = "ff-marked";

  let sessionActive = false;
  let pickerActive = false;
  let expanded = true;
  let currentHover = null;
  let panelOpen = false;
  let panelEl = null;
  let widgetEl = null;
  let items = [];

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

  function isInsideUi(el) {
    return el && el.closest && (el.closest(".ff-panel") || el.closest(".ff-widget"));
  }

  // --- picker handlers -------------------------------------------------------
  function onMouseOver(e) {
    if (!pickerActive || panelOpen) return;
    if (isInsideUi(e.target)) return;
    if (currentHover) currentHover.classList.remove(OUTLINE_CLASS);
    currentHover = e.target;
    currentHover.classList.add(OUTLINE_CLASS);
  }

  function onMouseOut(e) {
    if (!pickerActive) return;
    if (e.target === currentHover) {
      currentHover.classList.remove(OUTLINE_CLASS);
      currentHover = null;
    }
  }

  function onClick(e) {
    if (!pickerActive || panelOpen) return;
    if (isInsideUi(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
    if (currentHover) currentHover.classList.remove(OUTLINE_CLASS);
    openCommentPanel(e.target);
  }

  function onKeyDown(e) {
    if (!sessionActive) return;
    if (e.key === "Escape") {
      if (panelOpen) closeCommentPanel(true);
      else if (pickerActive) setPicker(false);
    }
  }

  function setPicker(on) {
    if (on === pickerActive) return;
    pickerActive = on;
    if (on) {
      document.addEventListener("mouseover", onMouseOver, true);
      document.addEventListener("mouseout", onMouseOut, true);
      document.addEventListener("click", onClick, true);
    } else {
      document.removeEventListener("mouseover", onMouseOver, true);
      document.removeEventListener("mouseout", onMouseOut, true);
      document.removeEventListener("click", onClick, true);
      if (currentHover) currentHover.classList.remove(OUTLINE_CLASS);
      currentHover = null;
    }
    renderWidget();
  }

  // --- comment panel ---------------------------------------------------------
  let panelTarget = null;

  function openCommentPanel(target) {
    panelOpen = true;
    panelTarget = target;
    target.classList.add(MARKED_CLASS);
    const selector = cssPath(target);
    const text = (target.innerText || target.value || target.alt || "").trim().slice(0, 200);
    const rect = target.getBoundingClientRect();

    panelEl = document.createElement("div");
    panelEl.className = "ff-panel";
    panelEl.innerHTML = `
      <div class="ff-panel-header">
        <span class="ff-panel-title">feeeeedback</span>
        <button class="ff-icon-btn" data-ff-close title="Fermer">✕</button>
      </div>
      <div class="ff-panel-meta">
        <div class="ff-panel-selector"></div>
        <div class="ff-panel-text"></div>
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

    panelEl.querySelector("[data-ff-close]").addEventListener("click", () => closeCommentPanel(true));
    panelEl.querySelector("[data-ff-cancel]").addEventListener("click", () => closeCommentPanel(true));
    panelEl.querySelector("[data-ff-save]").addEventListener("click", async () => {
      const comment = textarea.value.trim();
      if (!comment) {
        textarea.focus();
        return;
      }
      await saveItem({
        selector,
        text,
        comment,
        tagName: target.tagName.toLowerCase(),
        url: location.href,
        pageTitle: document.title,
        createdAt: new Date().toISOString(),
      });
      closeCommentPanel(false);
    });
    textarea.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        panelEl.querySelector("[data-ff-save]").click();
      }
      if (e.key === "Escape") {
        e.stopPropagation();
        closeCommentPanel(true);
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

  function closeCommentPanel(unmark) {
    if (panelTarget && unmark) panelTarget.classList.remove(MARKED_CLASS);
    panelTarget = null;
    if (panelEl) {
      panelEl.remove();
      panelEl = null;
    }
    panelOpen = false;
  }

  async function saveItem(data) {
    const updated = await chrome.runtime.sendMessage({ type: "ADD_ITEM", item: data });
    items = updated.items || [];
    renderWidget();
  }

  // --- widget ----------------------------------------------------------------
  function renderWidget() {
    if (!sessionActive) {
      if (widgetEl) {
        widgetEl.remove();
        widgetEl = null;
      }
      return;
    }
    if (!widgetEl) {
      widgetEl = document.createElement("div");
      widgetEl.className = "ff-widget";
      document.documentElement.appendChild(widgetEl);
    }
    widgetEl.classList.toggle("ff-collapsed", !expanded);

    if (!expanded) {
      widgetEl.innerHTML = `
        <button class="ff-pill" data-ff-expand title="Ouvrir feeeeedback">
          <span class="ff-dot ${pickerActive ? "on" : "idle"}"></span>
          <span class="ff-pill-label">feeeeedback</span>
          <span class="ff-pill-count">${items.length}</span>
        </button>
      `;
      widgetEl.querySelector("[data-ff-expand]").onclick = () => {
        expanded = true;
        renderWidget();
      };
      return;
    }

    widgetEl.innerHTML = `
      <div class="ff-widget-header">
        <div class="ff-widget-title">
          <span class="ff-dot ${pickerActive ? "on" : "idle"}"></span>
          feeeeedback
          <span class="ff-badge">${items.length}</span>
        </div>
        <button class="ff-icon-btn" data-ff-collapse title="Réduire">—</button>
      </div>
      <button class="ff-toggle ${pickerActive ? "active" : ""}" data-ff-picker>
        ${pickerActive ? "● Sélecteur actif — clique un élément" : "○ Activer le sélecteur"}
      </button>
      <div class="ff-widget-list"></div>
      <div class="ff-widget-actions">
        <button class="ff-btn ff-btn-primary" data-ff-copy ${items.length ? "" : "disabled"}>Copier</button>
        <button class="ff-btn ff-btn-ghost" data-ff-clear ${items.length ? "" : "disabled"}>Vider</button>
        <button class="ff-btn ff-btn-danger" data-ff-stop>Stop</button>
      </div>
    `;

    const list = widgetEl.querySelector(".ff-widget-list");
    if (!items.length) {
      const empty = document.createElement("div");
      empty.className = "ff-empty";
      empty.textContent = pickerActive
        ? "Clique un élément de la page pour le commenter."
        : "Active le sélecteur pour commencer.";
      list.appendChild(empty);
    } else {
      items.forEach((item, i) => {
        const el = document.createElement("div");
        el.className = "ff-widget-item";
        el.innerHTML = `
          <div class="ff-item-index">${i + 1}</div>
          <div class="ff-item-body">
            <div class="ff-item-comment"></div>
            <div class="ff-item-selector"></div>
            <div class="ff-item-url"></div>
          </div>
          <button class="ff-icon-btn" data-ff-remove title="Supprimer">✕</button>
        `;
        el.querySelector(".ff-item-comment").textContent = item.comment;
        el.querySelector(".ff-item-selector").textContent = item.selector;
        el.querySelector(".ff-item-url").textContent = ffShortUrl(item.url);
        el.querySelector("[data-ff-remove]").onclick = async () => {
          const updated = await chrome.runtime.sendMessage({ type: "REMOVE_ITEM", id: item.id });
          items = updated.items || [];
          renderWidget();
        };
        list.appendChild(el);
      });
    }

    widgetEl.querySelector("[data-ff-collapse]").onclick = () => {
      expanded = false;
      renderWidget();
    };
    widgetEl.querySelector("[data-ff-picker]").onclick = () => setPicker(!pickerActive);
    widgetEl.querySelector("[data-ff-copy]").onclick = copyToClipboard;
    widgetEl.querySelector("[data-ff-clear]").onclick = async () => {
      if (!confirm("Vider la session en cours ?")) return;
      await chrome.runtime.sendMessage({ type: "CLEAR_ITEMS" });
      items = [];
      renderWidget();
    };
    widgetEl.querySelector("[data-ff-stop]").onclick = async () => {
      await chrome.runtime.sendMessage({ type: "STOP_SESSION" });
      deactivateSession();
    };
  }

  async function copyToClipboard() {
    const session = await chrome.runtime.sendMessage({ type: "GET_SESSION" });
    const md = ffFormatSessionMarkdown(session);
    const btn = widgetEl?.querySelector("[data-ff-copy]");
    try {
      await navigator.clipboard.writeText(md);
      if (btn) {
        btn.textContent = "Copié ✓";
        btn.classList.add("ff-copied");
        setTimeout(() => {
          if (btn.isConnected) {
            btn.textContent = "Copier";
            btn.classList.remove("ff-copied");
          }
        }, 1400);
      }
    } catch (err) {
      // fallback for pages with clipboard restrictions
      const ta = document.createElement("textarea");
      ta.value = md;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        if (btn) {
          btn.textContent = "Copié ✓";
          btn.classList.add("ff-copied");
          setTimeout(() => {
            if (btn.isConnected) {
              btn.textContent = "Copier";
              btn.classList.remove("ff-copied");
            }
          }, 1400);
        }
      } catch {
        alert("Copie impossible : " + err.message);
      } finally {
        ta.remove();
      }
    }
  }

  // --- session lifecycle -----------------------------------------------------
  async function activateSession() {
    if (sessionActive) return;
    sessionActive = true;
    const session = await chrome.runtime.sendMessage({ type: "GET_SESSION" });
    items = session?.items || [];
    document.addEventListener("keydown", onKeyDown, true);
    renderWidget();
  }

  function deactivateSession() {
    sessionActive = false;
    setPicker(false);
    closeCommentPanel(true);
    document.removeEventListener("keydown", onKeyDown, true);
    renderWidget();
  }

  // --- messages from background / popup --------------------------------------
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    (async () => {
      if (msg.type === "FF_ACTIVATE") {
        await activateSession();
        sendResponse({ ok: true });
      } else if (msg.type === "FF_DEACTIVATE") {
        deactivateSession();
        sendResponse({ ok: true });
      } else if (msg.type === "FF_REFRESH") {
        const s = await chrome.runtime.sendMessage({ type: "GET_SESSION" });
        items = s?.items || [];
        renderWidget();
        sendResponse({ ok: true });
      } else {
        sendResponse({ ok: false });
      }
    })();
    return true;
  });

  // --- re-hydrate on page load ----------------------------------------------
  chrome.runtime.sendMessage({ type: "GET_SESSION" }, (session) => {
    if (session && session.active) activateSession();
  });
})();
