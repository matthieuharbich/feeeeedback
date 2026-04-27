// feeeeedback — background service worker
// - Session state (local fallback when not authed or no project selected)
// - Auth storage relay (from bridge.js on the dashboard domain)
// - Tab capture for screenshots

const SESSION_KEY = "ff_session";
const AUTH_KEY = "ff_auth";

async function getSession() {
  const { [SESSION_KEY]: session } = await chrome.storage.local.get(SESSION_KEY);
  return (
    session || {
      active: false,
      items: [],
      url: null,
      title: null,
      startedAt: null,
      mode: "local",
      projectId: null,
      projectName: null,
      projectColor: null,
      cloudSessionId: null,
    }
  );
}

async function setSession(session) {
  await chrome.storage.local.set({ [SESSION_KEY]: session });
}

async function getAuth() {
  const { [AUTH_KEY]: auth } = await chrome.storage.local.get(AUTH_KEY);
  return auth || null;
}

async function setAuth(auth) {
  await chrome.storage.local.set({ [AUTH_KEY]: auth });
}

async function clearAuth() {
  await chrome.storage.local.remove(AUTH_KEY);
}

async function sendToTab(tabId, message) {
  try {
    return await chrome.tabs.sendMessage(tabId, message);
  } catch (err) {
    // Content script not loaded yet — inject it on demand and retry once.
    // This handles fresh tabs, edge-case SPA wipes, and any timing where
    // the content_scripts entry hasn't run yet.
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ["src/format.js", "src/api.js", "src/content.js"],
      });
      await chrome.scripting.insertCSS({
        target: { tabId },
        files: ["src/content.css"],
      });
      return await chrome.tabs.sendMessage(tabId, message);
    } catch (err2) {
      return { ok: false, error: err2.message || err.message };
    }
  }
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    switch (msg.type) {
      case "GET_SESSION":
        sendResponse(await getSession());
        break;

      case "START_SESSION": {
        const tab = await getActiveTab();
        const meta = msg.meta || {};
        const session = {
          active: true,
          items: [],
          url: tab?.url || null,
          title: tab?.title || null,
          startedAt: new Date().toISOString(),
          mode: meta.projectId ? "cloud" : "local",
          projectId: meta.projectId || null,
          projectName: meta.projectName || null,
          projectColor: meta.projectColor || null,
          cloudSessionId: meta.cloudSessionId || null,
          contributorName: meta.contributorName || null,
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
        const tab = await getActiveTab();
        if (tab?.id) await sendToTab(tab.id, { type: "FF_DEACTIVATE" });
        sendResponse(session);
        break;
      }

      case "CLEAR_SESSION": {
        await setSession({
          active: false,
          items: [],
          url: null,
          title: null,
          startedAt: null,
          mode: "local",
          projectId: null,
          projectName: null,
          projectColor: null,
          cloudSessionId: null,
          contributorName: null,
        });
        const tab = await getActiveTab();
        if (tab?.id) await sendToTab(tab.id, { type: "FF_DEACTIVATE" });
        sendResponse({ ok: true });
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

      case "CLEAR_ITEMS": {
        const session = await getSession();
        session.items = [];
        await setSession(session);
        const tab = await getActiveTab();
        if (tab?.id) await sendToTab(tab.id, { type: "FF_REFRESH" });
        sendResponse(session);
        break;
      }

      case "FF_STORE_AUTH":
        await setAuth(msg.payload);
        sendResponse({ ok: true });
        break;

      case "FF_GET_AUTH":
        sendResponse(await getAuth());
        break;

      case "FF_CLEAR_AUTH":
        await clearAuth();
        sendResponse({ ok: true });
        break;

      case "FF_CAPTURE_TAB": {
        const tab = await getActiveTab();
        if (!tab?.windowId) {
          sendResponse({ error: "no active tab" });
          break;
        }
        try {
          const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" });
          sendResponse({ dataUrl });
        } catch (err) {
          sendResponse({ error: err.message });
        }
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
  return true;
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "toggle-picker") return;
  const tab = await getActiveTab();
  if (tab?.id) await sendToTab(tab.id, { type: "FF_TOGGLE_PICKER" });
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  const session = await getSession();
  if (session.active) await sendToTab(tabId, { type: "FF_ACTIVATE" });
});
