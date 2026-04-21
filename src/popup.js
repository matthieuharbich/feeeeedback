// feeeeedback — popup (launcher + quick actions)

const toggleBtn = document.getElementById("toggleBtn");
const copyBtn = document.getElementById("copyBtn");
const clearBtn = document.getElementById("clearBtn");
const statusEl = document.getElementById("status");
const urlEl = document.getElementById("url");
const countEl = document.getElementById("count");
const metaEl = document.getElementById("meta");
const extraActions = document.getElementById("extraActions");
const hintEl = document.getElementById("hint");

async function refresh() {
  const session = await chrome.runtime.sendMessage({ type: "GET_SESSION" });
  render(session);
}

function render(session) {
  const active = !!session?.active;
  statusEl.textContent = active ? "actif" : "inactif";
  statusEl.className = `status ${active ? "status-on" : "status-off"}`;
  toggleBtn.textContent = active ? "Arrêter la session" : "Démarrer une session";
  toggleBtn.classList.toggle("btn-primary", !active);
  toggleBtn.classList.toggle("btn-danger", active);

  metaEl.hidden = !active;
  extraActions.hidden = !active;
  hintEl.hidden = active;

  const items = session?.items || [];
  countEl.textContent = items.length;
  urlEl.textContent = session?.url ? ffShortUrl(session.url) : "—";
}

toggleBtn.addEventListener("click", async () => {
  const current = await chrome.runtime.sendMessage({ type: "GET_SESSION" });
  if (current?.active) {
    await chrome.runtime.sendMessage({ type: "STOP_SESSION" });
    refresh();
  } else {
    await chrome.runtime.sendMessage({ type: "START_SESSION" });
    window.close();
  }
});

clearBtn.addEventListener("click", async () => {
  if (!confirm("Vider tous les commentaires de la session ?")) return;
  await chrome.runtime.sendMessage({ type: "CLEAR_ITEMS" });
  refresh();
});

copyBtn.addEventListener("click", async () => {
  const session = await chrome.runtime.sendMessage({ type: "GET_SESSION" });
  const payload = ffFormatSessionJSON(session);
  await navigator.clipboard.writeText(payload);
  copyBtn.textContent = "Copié ✓";
  copyBtn.classList.add("copied");
  setTimeout(() => {
    copyBtn.textContent = "Copier JSON";
    copyBtn.classList.remove("copied");
  }, 1400);
});

refresh();
