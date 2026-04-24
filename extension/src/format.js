// feeeeedback — shared helpers (loaded in both content script and popup)

function ffShortUrl(u) {
  try {
    const url = new URL(u);
    return url.host + (url.pathname === "/" ? "" : url.pathname);
  } catch {
    return u || "";
  }
}

function ffFormatSessionJSON(session) {
  const payload = {
    tool: "feeeeedback",
    version: 1,
    session: {
      startedAt: session?.startedAt || null,
      startUrl: session?.url || null,
      startTitle: session?.title || null,
    },
    items: (session?.items || []).map((item, i) => ({
      index: i + 1,
      comment: item.comment,
      selector: item.selector,
      text: item.text || null,
      tagName: item.tagName || null,
      url: item.url || null,
      pageTitle: item.pageTitle || null,
      createdAt: item.createdAt || null,
    })),
  };
  return JSON.stringify(payload, null, 2);
}
