// feeeeedback — popup (shared password unlock + org selector + contributor)

const API_BASE = "https://feeeeedback.mtth.world";
const CONTRIB_KEY = "ff_contributor";
const ORG_KEY = "ff_active_org";
const CONTRIB_DEFAULTS = ["Nicolas", "Juliane", "Damien", "Tony"];

const $ = (id) => document.getElementById(id);

const els = {
  status: $("status"),
  authNone: $("authNone"),
  authLoaded: $("authLoaded"),
  unlockForm: $("unlockForm"),
  passwordInput: $("passwordInput"),
  unlockBtn: $("unlockBtn"),
  unlockErr: $("unlockErr"),
  localStartBtn: $("localStartBtn"),
  lockBtn: $("lockBtn"),
  tabUrl: $("tabUrl"),
  orgSelect: $("orgSelect"),
  projectSelect: $("projectSelect"),
  contributorSelect: $("contributorSelect"),
  contributorCustom: $("contributorCustom"),
  sessionActions: $("sessionActions"),
  toggleBtn: $("toggleBtn"),
  meta: $("meta"),
  count: $("count"),
  projectLabel: $("projectLabel"),
  contributorLabel: $("contributorLabel"),
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
let savedContributor = null;
let activeOrgId = null;

async function init() {
  auth = await ffGetAuth();
  session = await chrome.runtime.sendMessage({ type: "GET_SESSION" });
  [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  savedContributor = await loadContributor();
  activeOrgId = await loadActiveOrg();

  if (auth && currentTab?.url) {
    await refreshProjects();
  }
  render();
  applyContributorToUI();
  listenForAuth();
}

async function refreshProjects() {
  try {
    const r = await ffMatchProjects(currentTab.url);
    matchedProjects = r.matches || [];
    allProjects = r.all || [];
  } catch (err) {
    console.warn("feeeeedback: match projects failed", err);
    matchedProjects = [];
    allProjects = [];
  }
}

async function loadContributor() {
  const { [CONTRIB_KEY]: c } = await chrome.storage.local.get(CONTRIB_KEY);
  return c || { kind: "preset", value: CONTRIB_DEFAULTS[0] };
}

async function saveContributor(c) {
  await chrome.storage.local.set({ [CONTRIB_KEY]: c });
  savedContributor = c;
}

async function loadActiveOrg() {
  const { [ORG_KEY]: o } = await chrome.storage.local.get(ORG_KEY);
  return o || null;
}

async function saveActiveOrg(orgId) {
  await chrome.storage.local.set({ [ORG_KEY]: orgId });
  activeOrgId = orgId;
}

function currentContributorName() {
  if (savedContributor?.kind === "custom")
    return (savedContributor.value || "").trim() || null;
  return savedContributor?.value || null;
}

function applyContributorToUI() {
  if (!els.contributorSelect || !savedContributor) return;
  if (savedContributor.kind === "custom") {
    els.contributorSelect.value = "__other__";
    els.contributorCustom.style.display = "";
    els.contributorCustom.value = savedContributor.value || "";
  } else {
    els.contributorSelect.value = CONTRIB_DEFAULTS.includes(savedContributor.value)
      ? savedContributor.value
      : CONTRIB_DEFAULTS[0];
    els.contributorCustom.style.display = "none";
  }
}

function listenForAuth() {
  chrome.storage.onChanged.addListener(async (changes, area) => {
    if (area !== "local" || !changes.ff_auth) return;
    auth = changes.ff_auth.newValue || null;
    if (auth && currentTab?.url) await refreshProjects();
    render();
    applyContributorToUI();
  });
}

function render() {
  const active = !!session?.active;
  els.status.textContent = active ? "actif" : "inactif";
  els.status.className = `status ${active ? "status-on" : "status-off"}`;

  els.authNone.hidden = !!auth || active;
  els.authLoaded.hidden = !auth || active;

  if (auth) {
    els.tabUrl.textContent = currentTab?.url ? ffShortUrl(currentTab.url) : "—";

    // --- Org selector ---
    const orgs = auth.orgs || [];
    if (els.orgSelect) {
      els.orgSelect.innerHTML = "";
      if (orgs.length === 0) {
        const opt = document.createElement("option");
        opt.value = "";
        opt.textContent = "(aucune organisation)";
        els.orgSelect.appendChild(opt);
        els.orgSelect.disabled = true;
      } else {
        els.orgSelect.disabled = false;
        for (const org of orgs) {
          const opt = document.createElement("option");
          opt.value = org.id;
          opt.textContent = org.name;
          els.orgSelect.appendChild(opt);
        }
        if (!activeOrgId || !orgs.find((o) => o.id === activeOrgId)) {
          activeOrgId = orgs[0].id;
        }
        els.orgSelect.value = activeOrgId;
      }
    }

    // --- Project selector (filter by active org) ---
    const select = els.projectSelect;
    select.innerHTML = "";

    const optNone = document.createElement("option");
    optNone.value = "";
    optNone.textContent = "— Local (copier JSON) —";
    select.appendChild(optNone);

    const orgMatched = matchedProjects.filter(
      (p) => !activeOrgId || p.organizationId === activeOrgId
    );
    const orgOthers = allProjects
      .filter((p) => !activeOrgId || p.organizationId === activeOrgId)
      .filter((p) => !orgMatched.find((m) => m.id === p.id));

    if (orgMatched.length) {
      const group = document.createElement("optgroup");
      group.label = "Correspond à cette page";
      orgMatched.forEach((p) => group.appendChild(projectOption(p)));
      select.appendChild(group);
    }
    if (orgOthers.length) {
      const group = document.createElement("optgroup");
      group.label = "Autres projets";
      orgOthers.forEach((p) => group.appendChild(projectOption(p)));
      select.appendChild(group);
    }
    if (orgMatched.length) select.value = orgMatched[0].id;
  }

  els.sessionActions.hidden = !auth && !active;
  els.meta.hidden = !active;
  els.extraActions.hidden = !active;

  if (auth && !active) {
    els.sessionActions.hidden = false;
    els.toggleBtn.textContent = "Démarrer une session";
    els.toggleBtn.classList.add("btn-primary");
    els.toggleBtn.classList.remove("btn-danger");
  } else if (active) {
    els.sessionActions.hidden = false;
    els.toggleBtn.textContent = "Arrêter la session";
    els.toggleBtn.classList.remove("btn-primary");
    els.toggleBtn.classList.add("btn-danger");
  } else {
    els.sessionActions.hidden = true;
  }

  if (active) {
    els.count.textContent = (session?.items || []).length;
    els.projectLabel.textContent = session?.projectName || "Local";
    els.contributorLabel.textContent = session?.contributorName || "—";
    els.dashBtn.hidden = !(session?.mode === "cloud" && auth?.apiUrl);
  }
}

function projectOption(p) {
  const opt = document.createElement("option");
  opt.value = p.id;
  opt.textContent = p.name;
  return opt;
}

function showErr(msg) {
  els.unlockErr.textContent = msg;
  els.unlockErr.hidden = !msg;
}

// --- handlers --------------------------------------------------------------

els.unlockForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const password = els.passwordInput.value;
  if (!password) return;
  showErr("");
  els.unlockBtn.disabled = true;
  els.unlockBtn.textContent = "…";
  try {
    const res = await fetch(`${API_BASE}/api/v1/extension/unlock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Mot de passe incorrect");
    await chrome.runtime.sendMessage({
      type: "FF_STORE_AUTH",
      payload: {
        apiKey: data.apiKey,
        apiUrl: API_BASE,
        user: data.user,
        orgs: data.orgs || [],
        linkedAt: new Date().toISOString(),
      },
    });
    auth = await ffGetAuth();
    if (currentTab?.url) await refreshProjects();
    els.passwordInput.value = "";
    render();
    applyContributorToUI();
  } catch (err) {
    showErr(err.message || "Erreur");
  } finally {
    els.unlockBtn.disabled = false;
    els.unlockBtn.textContent = "Déverrouiller";
  }
});

els.localStartBtn?.addEventListener("click", async () => {
  const contributorName = currentContributorName();
  await chrome.runtime.sendMessage({
    type: "START_SESSION",
    meta: { contributorName },
  });
  window.close();
});

els.lockBtn?.addEventListener("click", async () => {
  await ffClearAuth();
  auth = null;
  render();
});

els.orgSelect?.addEventListener("change", async () => {
  await saveActiveOrg(els.orgSelect.value);
  render();
});

els.contributorSelect?.addEventListener("change", async () => {
  const v = els.contributorSelect.value;
  if (v === "__other__") {
    els.contributorCustom.style.display = "";
    els.contributorCustom.focus();
    await saveContributor({
      kind: "custom",
      value: els.contributorCustom.value || "",
    });
  } else {
    els.contributorCustom.style.display = "none";
    await saveContributor({ kind: "preset", value: v });
  }
});

els.contributorCustom?.addEventListener("input", async () => {
  if (els.contributorSelect.value !== "__other__") return;
  await saveContributor({
    kind: "custom",
    value: els.contributorCustom.value || "",
  });
});

els.toggleBtn?.addEventListener("click", async () => {
  if (session?.active) {
    await chrome.runtime.sendMessage({ type: "STOP_SESSION" });
    session = await chrome.runtime.sendMessage({ type: "GET_SESSION" });
    render();
    return;
  }

  const contributorName = currentContributorName();
  if (!contributorName) {
    alert("Sélectionne ou entre un prénom pour attribuer les retours.");
    return;
  }

  const projectId = els.projectSelect?.value || "";
  let meta = { contributorName };
  if (projectId && auth) {
    const proj = [...matchedProjects, ...allProjects].find(
      (p) => p.id === projectId
    );
    try {
      const { session: cloudSession } = await ffCreateSession({
        projectId,
        startUrl: currentTab?.url,
        startTitle: currentTab?.title,
        contributorName,
      });
      meta = {
        contributorName,
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
  const orgs = auth.orgs || [];
  const slug =
    orgs.find((o) => o.id === activeOrgId)?.slug || orgs[0]?.slug || "";
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
