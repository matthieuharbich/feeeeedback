// feeeeedback — content script
// Floating widget (always visible when session active) with picker toggle,
// comment list, draggable header, keyboard shortcut, JSON export.

(() => {
  if (window.__ff_injected__) return;
  window.__ff_injected__ = true;

  const OUTLINE_CLASS = "ff-outline-hover";
  const MARKED_CLASS = "ff-marked";
  const POS_KEY = "ff_widget_pos";

  let sessionActive = false;
  let pickerActive = false;
  let currentHover = null;
  let panelOpen = false;
  let panelEl = null;
  let widgetEl = null;
  let items = [];
  let sessionMeta = null;
  let shortcutLabel = "Alt+Shift+S";

  // drag state
  let dragging = false;
  let dragOffset = { x: 0, y: 0 };
  let widgetPos = null;

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
    if (!pickerActive || panelOpen || dragging) return;
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
      <div class="ff-importance" role="radiogroup" aria-label="Importance">
        <button type="button" class="ff-imp" data-ff-imp="low">Pas important</button>
        <button type="button" class="ff-imp ff-imp-active" data-ff-imp="high">Important</button>
        <button type="button" class="ff-imp" data-ff-imp="urgent">Super important</button>
      </div>
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

    let importance = "high";
    panelEl.querySelectorAll("[data-ff-imp]").forEach((btn) => {
      btn.addEventListener("click", () => {
        importance = btn.getAttribute("data-ff-imp");
        panelEl
          .querySelectorAll("[data-ff-imp]")
          .forEach((b) => b.classList.toggle("ff-imp-active", b === btn));
      });
    });

    panelEl.querySelector("[data-ff-close]").addEventListener("click", () => closeCommentPanel(true));
    panelEl.querySelector("[data-ff-cancel]").addEventListener("click", () => closeCommentPanel(true));
    panelEl.querySelector("[data-ff-save]").addEventListener("click", async () => {
      const comment = textarea.value.trim();
      if (!comment) {
        textarea.focus();
        return;
      }
      const saveBtn = panelEl.querySelector("[data-ff-save]");
      const prevLabel = saveBtn.textContent;
      saveBtn.disabled = true;
      saveBtn.textContent = sessionMeta?.mode === "cloud" ? "Envoi…" : "Enregistrement…";
      try {
        const elementRect = {
          x: rect.left + window.scrollX,
          y: rect.top + window.scrollY,
          width: rect.width,
          height: rect.height,
        };
        await saveItem({
          selector,
          text,
          comment,
          priority: importance,
          tagName: target.tagName.toLowerCase(),
          url: location.href,
          pageTitle: document.title,
          createdAt: new Date().toISOString(),
          elementRect,
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
          viewportRect: {
            x: rect.left,
            y: rect.top,
            width: rect.width,
            height: rect.height,
          },
        });
        closeCommentPanel(false);
      } catch (err) {
        saveBtn.disabled = false;
        saveBtn.textContent = prevLabel;
        const errEl = panelEl.querySelector(".ff-panel-error") || (() => {
          const el = document.createElement("div");
          el.className = "ff-panel-error";
          el.style.cssText = "color:#d23a3a;font-size:12px;margin-top:4px;";
          panelEl.insertBefore(el, panelEl.querySelector(".ff-panel-actions"));
          return el;
        })();
        errEl.textContent = err?.message || "Erreur lors de l'enregistrement";
      }
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
    if (sessionMeta?.mode === "cloud" && sessionMeta.cloudSessionId && sessionMeta.projectId) {
      // Cloud mode: capture screenshot, crop to element, POST to API.
      const viewRect = data.viewportRect;
      let screenshotBlob = null;
      let screenshotWidth = null;
      let screenshotHeight = null;
      if (viewRect) {
        try {
          const { blob, width, height } = await captureAndCrop(viewRect);
          screenshotBlob = blob;
          screenshotWidth = width;
          screenshotHeight = height;
        } catch (err) {
          console.warn("feeeeedback: screenshot failed", err);
        }
      }
      const { comment } = await ffCreateComment({
        sessionId: sessionMeta.cloudSessionId,
        projectId: sessionMeta.projectId,
        comment: data.comment,
        selector: data.selector,
        tagName: data.tagName,
        text: data.text,
        url: data.url,
        pageTitle: data.pageTitle,
        viewportWidth: data.viewportWidth,
        viewportHeight: data.viewportHeight,
        elementRect: data.elementRect,
        priority: data.priority,
        screenshotBlob,
        screenshotWidth,
        screenshotHeight,
      });
      // also keep a local copy for immediate widget display
      const updated = await chrome.runtime.sendMessage({
        type: "ADD_ITEM",
        item: { ...data, cloudId: comment?.id, synced: true },
      });
      items = updated.items || [];
    } else {
      const updated = await chrome.runtime.sendMessage({ type: "ADD_ITEM", item: data });
      items = updated.items || [];
    }
    renderWidget();
  }

  async function captureAndCrop(viewRect) {
    // Hide our own UI before capturing so it does not end up in the screenshot.
    const ui = Array.from(document.querySelectorAll(".ff-panel, .ff-widget, .ff-banner"));
    const prevVisibility = ui.map((el) => el.style.visibility);
    ui.forEach((el) => {
      el.style.visibility = "hidden";
    });

    // Strip ALL feeeeedback outline markers from any element that has them
    // (clicked target with .ff-marked, hovered target with .ff-outline-hover).
    // We track which classes were present so we can restore exactly.
    const marked = Array.from(
      document.querySelectorAll("." + MARKED_CLASS + ", ." + OUTLINE_CLASS)
    );
    const markedState = marked.map((el) => ({
      hadMarked: el.classList.contains(MARKED_CLASS),
      hadOutline: el.classList.contains(OUTLINE_CLASS),
      prevOutline: el.style.outline,
      prevOutlineOffset: el.style.outlineOffset,
      prevBoxShadow: el.style.boxShadow,
    }));
    marked.forEach((el) => {
      el.classList.remove(MARKED_CLASS);
      el.classList.remove(OUTLINE_CLASS);
      // Belt & suspenders: also override inline in case some site CSS adds
      // its own focus/hover outline that's still ours.
      el.style.setProperty("outline", "none", "important");
      el.style.setProperty("outline-offset", "0", "important");
      el.style.setProperty("box-shadow", "none", "important");
    });

    const restore = () => {
      ui.forEach((el, i) => {
        const v = prevVisibility[i];
        if (v) el.style.visibility = v;
        else el.style.removeProperty("visibility");
      });
      marked.forEach((el, i) => {
        const s = markedState[i];
        // restore inline styles
        if (s.prevOutline) el.style.outline = s.prevOutline;
        else el.style.removeProperty("outline");
        if (s.prevOutlineOffset) el.style.outlineOffset = s.prevOutlineOffset;
        else el.style.removeProperty("outline-offset");
        if (s.prevBoxShadow) el.style.boxShadow = s.prevBoxShadow;
        else el.style.removeProperty("box-shadow");
        // restore classes
        if (s.hadMarked) el.classList.add(MARKED_CLASS);
        if (s.hadOutline) el.classList.add(OUTLINE_CLASS);
      });
    };

    // Hard fallback: if anything kills this code path mid-capture, ensure UI
    // is restored within 4 s no matter what.
    const safetyTimeout = setTimeout(restore, 4000);

    await new Promise((r) =>
      requestAnimationFrame(() => requestAnimationFrame(r))
    );

    let res;
    try {
      res = await chrome.runtime.sendMessage({ type: "FF_CAPTURE_TAB" });
    } finally {
      clearTimeout(safetyTimeout);
      restore();
    }
    if (!res?.dataUrl) throw new Error(res?.error || "capture failed");
    const img = new Image();
    img.src = res.dataUrl;
    await img.decode();
    const dpr = window.devicePixelRatio || 1;
    const pad = 24 * dpr;
    const sx = Math.max(0, Math.round(viewRect.x * dpr) - pad);
    const sy = Math.max(0, Math.round(viewRect.y * dpr) - pad);
    const sw = Math.min(img.width - sx, Math.round(viewRect.width * dpr) + pad * 2);
    const sh = Math.min(img.height - sy, Math.round(viewRect.height * dpr) + pad * 2);
    const canvas = document.createElement("canvas");
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    return { blob, width: sw, height: sh };
  }

  // --- widget ----------------------------------------------------------------
  function ensureWidget() {
    if (widgetEl && widgetEl.isConnected) return;
    widgetEl = document.createElement("div");
    widgetEl.className = "ff-widget";
    document.documentElement.appendChild(widgetEl);
    applyWidgetPosition();
  }

  // Watch the document for SPA navigations that might wipe our widget.
  let widgetWatcher = null;
  function startWidgetWatcher() {
    if (widgetWatcher) return;
    widgetWatcher = new MutationObserver(() => {
      if (sessionActive && (!widgetEl || !widgetEl.isConnected)) {
        widgetEl = null;
        renderWidget();
      }
      if (panelOpen && panelEl && !panelEl.isConnected) {
        panelEl = null;
        panelOpen = false;
        if (panelTarget) panelTarget.classList.remove(MARKED_CLASS);
        panelTarget = null;
      }
    });
    widgetWatcher.observe(document.documentElement, {
      childList: true,
      subtree: false,
    });
  }
  function stopWidgetWatcher() {
    if (widgetWatcher) {
      widgetWatcher.disconnect();
      widgetWatcher = null;
    }
  }

  function applyWidgetPosition() {
    if (!widgetEl) return;
    if (widgetPos && typeof widgetPos.top === "number" && typeof widgetPos.left === "number") {
      const maxLeft = Math.max(0, window.innerWidth - (widgetEl.offsetWidth || 340));
      const maxTop = Math.max(0, window.innerHeight - (widgetEl.offsetHeight || 120));
      const left = Math.max(0, Math.min(maxLeft, widgetPos.left));
      const top = Math.max(0, Math.min(maxTop, widgetPos.top));
      widgetEl.style.left = `${left}px`;
      widgetEl.style.top = `${top}px`;
      widgetEl.style.right = "auto";
    }
  }

  function renderWidget() {
    if (!sessionActive) {
      if (widgetEl) {
        widgetEl.remove();
        widgetEl = null;
      }
      return;
    }
    ensureWidget();

    const projectBadge =
      sessionMeta?.mode === "cloud" && sessionMeta.projectName
        ? `<span class="ff-mode-badge" style="background:${sessionMeta.projectColor || "#ff6b35"}">${escapeHtml(sessionMeta.projectName)}</span>`
        : `<span class="ff-mode-badge ff-mode-local">Local</span>`;
    const contributorBadge = sessionMeta?.contributorName
      ? `<span class="ff-mode-badge ff-mode-contrib">${escapeHtml(sessionMeta.contributorName)}</span>`
      : "";
    const modeBadge = `${projectBadge}${contributorBadge}`;

    widgetEl.innerHTML = `
      <div class="ff-widget-header" data-ff-drag>
        <div class="ff-widget-title">
          <span class="ff-dot ${pickerActive ? "on" : "idle"}"></span>
          feeeeedback
          ${modeBadge}
        </div>
        <div class="ff-widget-header-actions">
          <span class="ff-kbd" title="Raccourci sélecteur">${shortcutLabel}</span>
        </div>
      </div>
      <button class="ff-toggle ${pickerActive ? "active" : ""}" data-ff-picker>
        <span class="ff-toggle-switch"></span>
        <span class="ff-toggle-label">
          <span class="ff-toggle-main">${pickerActive ? "Sélecteur actif" : "Sélecteur"}</span>
          <span class="ff-toggle-sub">${pickerActive ? "Clique un élément de la page" : "Active pour pointer un élément"}</span>
        </span>
      </button>
      <div class="ff-widget-list"></div>
      <div class="ff-widget-actions">
        ${sessionMeta?.mode === "cloud"
          ? `<button class="ff-btn ff-btn-ghost" data-ff-clear ${items.length ? "" : "disabled"}>Vider</button>`
          : `<button class="ff-btn ff-btn-primary" data-ff-copy ${items.length ? "" : "disabled"}>Copier JSON</button><button class="ff-btn ff-btn-ghost" data-ff-clear ${items.length ? "" : "disabled"}>Vider</button>`}
        <button class="ff-btn ff-btn-danger" data-ff-stop>Stop</button>
      </div>
    `;

    const list = widgetEl.querySelector(".ff-widget-list");
    if (!items.length) {
      const empty = document.createElement("div");
      empty.className = "ff-empty";
      empty.textContent = pickerActive
        ? "Clique un élément de la page pour le commenter."
        : `Active le sélecteur (${shortcutLabel}) pour commencer.`;
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

    widgetEl.querySelector("[data-ff-picker]").onclick = () => setPicker(!pickerActive);
    const copyBtn = widgetEl.querySelector("[data-ff-copy]");
    if (copyBtn) copyBtn.onclick = copyToClipboard;
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

    // drag handle
    const header = widgetEl.querySelector("[data-ff-drag]");
    header.addEventListener("mousedown", onDragStart);
  }

  // --- drag ------------------------------------------------------------------
  function onDragStart(e) {
    if (e.button !== 0) return;
    if (e.target.closest("button")) return;
    dragging = true;
    const rect = widgetEl.getBoundingClientRect();
    dragOffset = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    document.addEventListener("mousemove", onDragMove, true);
    document.addEventListener("mouseup", onDragEnd, true);
    document.body.style.userSelect = "none";
    e.preventDefault();
    e.stopPropagation();
  }

  function onDragMove(e) {
    if (!dragging || !widgetEl) return;
    const maxLeft = Math.max(0, window.innerWidth - widgetEl.offsetWidth);
    const maxTop = Math.max(0, window.innerHeight - widgetEl.offsetHeight);
    const left = Math.max(0, Math.min(maxLeft, e.clientX - dragOffset.x));
    const top = Math.max(0, Math.min(maxTop, e.clientY - dragOffset.y));
    widgetEl.style.left = `${left}px`;
    widgetEl.style.top = `${top}px`;
    widgetEl.style.right = "auto";
    widgetPos = { top, left };
  }

  function onDragEnd() {
    if (!dragging) return;
    dragging = false;
    document.removeEventListener("mousemove", onDragMove, true);
    document.removeEventListener("mouseup", onDragEnd, true);
    document.body.style.userSelect = "";
    if (widgetPos) chrome.storage.local.set({ [POS_KEY]: widgetPos });
  }

  // --- clipboard -------------------------------------------------------------
  async function copyToClipboard() {
    const session = await chrome.runtime.sendMessage({ type: "GET_SESSION" });
    const payload = ffFormatSessionJSON(session);
    const btn = widgetEl?.querySelector("[data-ff-copy]");
    const ok = () => {
      if (!btn) return;
      btn.textContent = "Copié ✓";
      btn.classList.add("ff-copied");
      setTimeout(() => {
        if (btn.isConnected) {
          btn.textContent = "Copier JSON";
          btn.classList.remove("ff-copied");
        }
      }, 1400);
    };
    try {
      await navigator.clipboard.writeText(payload);
      ok();
    } catch (err) {
      const ta = document.createElement("textarea");
      ta.value = payload;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        ok();
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
    const [session, posRes, shortcutRes] = await Promise.all([
      chrome.runtime.sendMessage({ type: "GET_SESSION" }),
      chrome.storage.local.get(POS_KEY),
      chrome.runtime.sendMessage({ type: "GET_SHORTCUT" }),
    ]);
    items = session?.items || [];
    sessionMeta = session
      ? {
          mode: session.mode || "local",
          projectId: session.projectId || null,
          projectName: session.projectName || null,
          projectColor: session.projectColor || null,
          cloudSessionId: session.cloudSessionId || null,
          contributorName: session.contributorName || null,
        }
      : null;
    widgetPos = posRes?.[POS_KEY] || null;
    if (shortcutRes?.shortcut) shortcutLabel = shortcutRes.shortcut;
    document.addEventListener("keydown", onKeyDown, true);
    renderWidget();
    startWidgetWatcher();
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[c]));
  }

  function deactivateSession() {
    sessionActive = false;
    setPicker(false);
    closeCommentPanel(true);
    document.removeEventListener("keydown", onKeyDown, true);
    stopWidgetWatcher();
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
      } else if (msg.type === "FF_TOGGLE_PICKER") {
        if (sessionActive) setPicker(!pickerActive);
        sendResponse({ ok: true, pickerActive });
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
