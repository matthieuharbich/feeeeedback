// feeeeedback — shared helpers (loaded in both content script and popup)

function ffShortUrl(u) {
  try {
    const url = new URL(u);
    return url.host + (url.pathname === "/" ? "" : url.pathname);
  } catch {
    return u || "";
  }
}

function ffFormatSessionMarkdown(session) {
  if (!session || !session.items?.length) {
    return `# feeeeedback session\n\n(aucun élément capturé)\n`;
  }
  const lines = [];
  lines.push(`# feeeeedback session`);
  lines.push("");
  if (session.url) lines.push(`- Page de départ : ${session.url}`);
  if (session.title) lines.push(`- Titre : ${session.title}`);
  if (session.startedAt) lines.push(`- Démarrée : ${session.startedAt}`);
  lines.push(`- Éléments : ${session.items.length}`);
  lines.push("");
  lines.push(`## Retours`);
  lines.push("");
  session.items.forEach((item, i) => {
    lines.push(`### ${i + 1}. <${item.tagName || "element"}>`);
    lines.push(`- URL : ${item.url}`);
    lines.push(`- Sélecteur : \`${item.selector}\``);
    if (item.text) lines.push(`- Texte : "${item.text.replace(/"/g, '\\"')}"`);
    lines.push("");
    lines.push(`**Commentaire :**`);
    lines.push("");
    lines.push(item.comment);
    lines.push("");
  });
  return lines.join("\n");
}
