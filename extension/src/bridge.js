// feeeeedback — content script on feeeeedback.mtth.world (+ localhost dev)
// Listens for FF_AUTH postMessage from the dashboard's /extension/link page
// and forwards credentials to the background service worker.

(() => {
  if (window.__ff_bridge_injected__) return;
  window.__ff_bridge_injected__ = true;

  window.addEventListener("message", (event) => {
    const data = event.data;
    if (!data || data.source !== "feeeeedback" || data.type !== "FF_AUTH") return;
    if (!data.apiKey || !data.user) return;

    chrome.runtime.sendMessage(
      {
        type: "FF_STORE_AUTH",
        payload: {
          apiKey: data.apiKey,
          apiUrl: window.location.origin,
          user: data.user,
          orgs: data.orgs || [],
          linkedAt: new Date().toISOString(),
        },
      },
      () => {
        // Ack back to page (useful for UI feedback)
        window.postMessage(
          { source: "feeeeedback-extension", type: "FF_AUTH_ACK", ok: true },
          window.location.origin
        );
      }
    );
  });

  // Let the page know the extension is present.
  window.postMessage(
    { source: "feeeeedback-extension", type: "FF_EXT_PRESENT" },
    window.location.origin
  );
})();
