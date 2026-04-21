// feeeeedback — background service worker
// Relays popup <-> content script messages and keeps session state in chrome.storage.

const STORAGE_KEY = "ff_session";

async function getSession() {
  const { [STORAGE_KEY]: session } = await chrome.storage.local.get(STORAGE_KEY);
  return session || { active: false, items: [], url: null, startedAt: null };
}

async function setSession(session) {
  await chrome.storage.local.set({ [STORAGE_KEY]: session });
}

async function sendToTab(tabId, message) {
  try {
    return await chrome.tabs.sendMessage(tabId, message);
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    switch (msg.type) {
      case "GET_SESSION": {
        sendResponse(await getSession());
        break;
      }
      case "START_SESSION": {
        const tab = await chrome.tabs.query({ active: true, currentWindow: true }).then((t) => t[0]);
        const session = {
          active: true,
          items: [],
          url: tab?.url || null,
          title: tab?.title || null,
          startedAt: new Date().toISOString(),
        };
        await setSession(session);
        if (tab?.id) await sendToTab(tab.id, { type: "FF_ACTIVATE" });
        sendResponse(session);
        break;
      }
      case "STOP_SESSION": {
        const session = await getSession();
        session.active = false;
        await setSession(session);
        const tab = await chrome.tabs.query({ active: true, currentWindow: true }).then((t) => t[0]);
        if (tab?.id) await sendToTab(tab.id, { type: "FF_DEACTIVATE" });
        sendResponse(session);
        break;
      }
      case "CLEAR_SESSION": {
        await setSession({ active: false, items: [], url: null, startedAt: null });
        const tab = await chrome.tabs.query({ active: true, currentWindow: true }).then((t) => t[0]);
        if (tab?.id) await sendToTab(tab.id, { type: "FF_DEACTIVATE" });
        sendResponse({ ok: true });
        break;
      }
      case "CLEAR_ITEMS": {
        const session = await getSession();
        session.items = [];
        await setSession(session);
        const tab = await chrome.tabs.query({ active: true, currentWindow: true }).then((t) => t[0]);
        if (tab?.id) await sendToTab(tab.id, { type: "FF_REFRESH" });
        sendResponse(session);
        break;
      }
      case "ADD_ITEM": {
        const session = await getSession();
        session.items.push({ id: crypto.randomUUID(), ...msg.item });
        await setSession(session);
        sendResponse(session);
        break;
      }
      case "REMOVE_ITEM": {
        const session = await getSession();
        session.items = session.items.filter((i) => i.id !== msg.id);
        await setSession(session);
        sendResponse(session);
        break;
      }
      case "GET_SHORTCUT": {
        const commands = await chrome.commands.getAll();
        const cmd = commands.find((c) => c.name === "toggle-picker");
        sendResponse({ shortcut: cmd?.shortcut || "" });
        break;
      }
      default:
        sendResponse({ ok: false, error: "unknown message type" });
    }
  })();
  return true; // keep sendResponse async
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "toggle-picker") return;
  const tab = await chrome.tabs.query({ active: true, currentWindow: true }).then((t) => t[0]);
  if (tab?.id) await sendToTab(tab.id, { type: "FF_TOGGLE_PICKER" });
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  const session = await getSession();
  if (session.active) await sendToTab(tabId, { type: "FF_ACTIVATE" });
});
