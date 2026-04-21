// feeeeedback — popup

const toggleBtn = document.getElementById("toggleBtn");
const copyBtn = document.getElementById("copyBtn");
const clearBtn = document.getElementById("clearBtn");
const statusEl = document.getElementById("status");
const urlEl = document.getElementById("url");
const countEl = document.getElementById("count");
const itemsEl = document.getElementById("items");

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

  const items = session?.items || [];
  urlEl.textContent = session?.url ? shortUrl(session.url) : "—";
  countEl.textContent = items.length;

  itemsEl.innerHTML = "";
  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = active ? "Aucun élément commenté pour le moment." : "Démarre une session pour commencer.";
    itemsEl.appendChild(empty);
    return;
  }
  for (const item of items) {
    const el = document.createElement("div");
    el.className = "item";
    el.innerHTML = `
      <div class="item-body">
        <div class="item-selector"></div>
        <div class="item-comment"></div>
      </div>
      <button class="item-remove" title="Supprimer">✕</button>
    `;
    el.querySelector(".item-selector").textContent = item.selector;
    el.querySelector(".item-comment").textContent = item.comment;
    el.querySelector(".item-remove").addEventListener("click", async () => {
      const updated = await chrome.runtime.sendMessage({ type: "REMOVE_ITEM", id: item.id });
      render(updated);
    });
    itemsEl.appendChild(el);
  }
}

function shortUrl(u) {
  try {
    const url = new URL(u);
    return url.host + (url.pathname === "/" ? "" : url.pathname);
  } catch {
    return u;
  }
}

toggleBtn.addEventListener("click", async () => {
  const current = await chrome.runtime.sendMessage({ type: "GET_SESSION" });
  const next = current?.active
    ? await chrome.runtime.sendMessage({ type: "STOP_SESSION" })
    : await chrome.runtime.sendMessage({ type: "START_SESSION" });
  render(next);
  if (!current?.active) window.close();
});

clearBtn.addEventListener("click", async () => {
  await chrome.runtime.sendMessage({ type: "CLEAR_SESSION" });
  refresh();
});

copyBtn.addEventListener("click", async () => {
  const session = await chrome.runtime.sendMessage({ type: "GET_SESSION" });
  const md = formatMarkdown(session);
  await navigator.clipboard.writeText(md);
  copyBtn.textContent = "Copié ✓";
  copyBtn.classList.add("copied");
  setTimeout(() => {
    copyBtn.textContent = "Copier pour Claude";
    copyBtn.classList.remove("copied");
  }, 1400);
});

function formatMarkdown(session) {
  if (!session || !session.items?.length) {
    return `# feeeeedback session\n\n(aucun élément capturé)\n`;
  }
  const lines = [];
  lines.push(`# feeeeedback session`);
  lines.push("");
  if (session.url) lines.push(`- URL : ${session.url}`);
  if (session.title) lines.push(`- Page : ${session.title}`);
  if (session.startedAt) lines.push(`- Démarrée : ${session.startedAt}`);
  lines.push(`- Éléments : ${session.items.length}`);
  lines.push("");
  lines.push(`## Retours`);
  lines.push("");
  session.items.forEach((item, i) => {
    lines.push(`### ${i + 1}. <${item.tagName || "element"}>`);
    lines.push(`- Sélecteur : \`${item.selector}\``);
    if (item.text) lines.push(`- Texte : "${item.text.replace(/"/g, '\\"')}"`);
    lines.push(`- URL : ${item.url}`);
    lines.push("");
    lines.push(`**Commentaire :**`);
    lines.push("");
    lines.push(item.comment);
    lines.push("");
  });
  return lines.join("\n");
}

refresh();
