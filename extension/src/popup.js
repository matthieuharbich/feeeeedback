// feeeeedback — popup (simplified auth flow)

const API_BASE = "https://feeeeedback.mtth.world";

const $ = (id) => document.getElementById(id);

const els = {
  status: $("status"),
  authNone: $("authNone"),
  authSent: $("authSent"),
  authLoaded: $("authLoaded"),
  magicForm: $("magicForm"),
  emailInput: $("emailInput"),
  magicBtn: $("magicBtn"),
  magicErr: $("magicErr"),
  sentEmail: $("sentEmail"),
  backBtn: $("backBtn"),
  localStartBtn: $("localStartBtn"),
  signOutBtn: $("signOutBtn"),
  userAvatar: $("userAvatar"),
  userName: $("userName"),
  userEmail: $("userEmail"),
  tabUrl: $("tabUrl"),
  projectSelect: $("projectSelect"),
  sessionActions: $("sessionActions"),
  toggleBtn: $("toggleBtn"),
  meta: $("meta"),
  count: $("count"),
  projectLabel: $("projectLabel"),
  extraActions: $("extraActions"),
  copyBtn: $("copyBtn"),
  dashBtn: $("dashBtn"),
  clearBtn: $("clearBtn"),
};

let auth = null;
let session = null;
let currentTab = null;
let matchedProjects = [];
let allProjects = [];
let pendingEmail = null;

async function init() {
  auth = await ffGetAuth();
  session = await chrome.runtime.sendMessage({ type: "GET_SESSION" });
  [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (auth && currentTab?.url) {
    try {
      const r = await ffMatchProjects(currentTab.url);
      matchedProjects = r.matches || [];
      allProjects = r.all || [];
    } catch (err) {
      console.warn("feeeeedback: match projects failed", err);
    }
  }
  render();
  listenForAuth();
}

// Live-update when bridge.js stores new auth
function listenForAuth() {
  chrome.storage.onChanged.addListener(async (changes, area) => {
    if (area !== "local" || !changes.ff_auth) return;
    auth = changes.ff_auth.newValue || null;
    if (auth && currentTab?.url) {
      try {
        const r = await ffMatchProjects(currentTab.url);
        matchedProjects = r.matches || [];
        allProjects = r.all || [];
      } catch {}
    }
    render();
  });
}

function render() {
  const active = !!session?.active;
  els.status.textContent = active ? "actif" : "inactif";
  els.status.className = `status ${active ? "status-on" : "status-off"}`;

  els.authNone.hidden = !!auth || active || !!pendingEmail;
  els.authSent.hidden = !!auth || active || !pendingEmail;
  els.authLoaded.hidden = !auth || active;

  if (auth) {
    els.userName.textContent = auth.user?.name || auth.user?.email || "";
    els.userEmail.textContent = auth.user?.email || "";
    els.userAvatar.textContent = (auth.user?.name || auth.user?.email || "?")
      .slice(0, 2)
      .toUpperCase();

    els.tabUrl.textContent = currentTab?.url ? ffShortUrl(currentTab.url) : "—";

    const select = els.projectSelect;
    select.innerHTML = "";

    const optNone = document.createElement("option");
    optNone.value = "";
    optNone.textContent = "— Local (pas de sync) —";
    select.appendChild(optNone);

    if (matchedProjects.length) {
      const group = document.createElement("optgroup");
      group.label = "Correspond à cette page";
      matchedProjects.forEach((p) => group.appendChild(projectOption(p)));
      select.appendChild(group);
    }
    const others = allProjects.filter((p) => !matchedProjects.find((m) => m.id === p.id));
    if (others.length) {
      const group = document.createElement("optgroup");
      group.label = "Autres projets";
      others.forEach((p) => group.appendChild(projectOption(p)));
      select.appendChild(group);
    }

    if (matchedProjects.length) select.value = matchedProjects[0].id;
  }

  els.sessionActions.hidden = !auth || !!pendingEmail;
  els.meta.hidden = !active;
  els.extraActions.hidden = !active;

  if (auth && !active) {
    els.toggleBtn.textContent = "Démarrer une session";
    els.toggleBtn.classList.add("btn-primary");
    els.toggleBtn.classList.remove("btn-danger");
  } else if (active) {
    els.sessionActions.hidden = false;
    els.toggleBtn.textContent = "Arrêter la session";
    els.toggleBtn.classList.remove("btn-primary");
    els.toggleBtn.classList.add("btn-danger");
  }

  if (active) {
    els.count.textContent = (session?.items || []).length;
    els.projectLabel.textContent = session?.projectName || "Local";
    els.dashBtn.hidden = !(session?.mode === "cloud" && auth?.apiUrl);
  }

  if (pendingEmail) els.sentEmail.textContent = pendingEmail;
}

function projectOption(p) {
  const opt = document.createElement("option");
  opt.value = p.id;
  opt.textContent = p.name;
  return opt;
}

function showErr(msg) {
  els.magicErr.textContent = msg;
  els.magicErr.hidden = !msg;
}

// --- handlers --------------------------------------------------------------

els.magicForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = els.emailInput.value.trim();
  if (!email) return;
  showErr("");
  els.magicBtn.disabled = true;
  els.magicBtn.textContent = "Envoi…";
  try {
    const res = await fetch(`${API_BASE}/api/auth/sign-in/magic-link`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        callbackURL: "/extension/auto-connect",
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.error) {
      throw new Error(data.error?.message || data.message || "Impossible d'envoyer le lien");
    }
    pendingEmail = email;
    render();
  } catch (err) {
    showErr(err.message || "Erreur");
  } finally {
    els.magicBtn.disabled = false;
    els.magicBtn.textContent = "M'envoyer le lien";
  }
});

els.backBtn?.addEventListener("click", () => {
  pendingEmail = null;
  render();
});

els.localStartBtn?.addEventListener("click", async () => {
  await chrome.runtime.sendMessage({ type: "START_SESSION", meta: {} });
  window.close();
});

els.signOutBtn?.addEventListener("click", async () => {
  if (!confirm("Déconnecter l'extension ?")) return;
  await ffClearAuth();
  auth = null;
  render();
});

els.toggleBtn?.addEventListener("click", async () => {
  if (session?.active) {
    await chrome.runtime.sendMessage({ type: "STOP_SESSION" });
    session = await chrome.runtime.sendMessage({ type: "GET_SESSION" });
    render();
    return;
  }

  const projectId = els.projectSelect.value;
  let meta = {};
  if (projectId && auth) {
    const proj = [...matchedProjects, ...allProjects].find((p) => p.id === projectId);
    try {
      const { session: cloudSession } = await ffCreateSession({
        projectId,
        startUrl: currentTab?.url,
        startTitle: currentTab?.title,
      });
      meta = {
        projectId,
        projectName: proj?.name,
        projectColor: proj?.color,
        cloudSessionId: cloudSession.id,
      };
    } catch (err) {
      alert("Impossible de démarrer la session cloud : " + err.message);
      return;
    }
  }
  await chrome.runtime.sendMessage({ type: "START_SESSION", meta });
  window.close();
});

els.copyBtn?.addEventListener("click", async () => {
  const s = await chrome.runtime.sendMessage({ type: "GET_SESSION" });
  const payload = ffFormatSessionJSON(s);
  await navigator.clipboard.writeText(payload);
  els.copyBtn.textContent = "Copié ✓";
  els.copyBtn.classList.add("copied");
  setTimeout(() => {
    els.copyBtn.textContent = "Copier JSON";
    els.copyBtn.classList.remove("copied");
  }, 1400);
});

els.dashBtn?.addEventListener("click", async () => {
  if (!auth?.apiUrl) return;
  const slug = auth.orgs?.[0]?.slug;
  const url = slug ? `${auth.apiUrl}/${slug}/inbox` : `${auth.apiUrl}/`;
  await chrome.tabs.create({ url });
});

els.clearBtn?.addEventListener("click", async () => {
  if (!confirm("Vider tous les commentaires de la session ?")) return;
  await chrome.runtime.sendMessage({ type: "CLEAR_ITEMS" });
  session = await chrome.runtime.sendMessage({ type: "GET_SESSION" });
  render();
});

init();
