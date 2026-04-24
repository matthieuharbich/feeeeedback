// feeeeedback — API client (used in content script and popup, talks to background
// for auth storage, then calls the dashboard API directly).

async function ffGetAuth() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "FF_GET_AUTH" }, (res) => resolve(res || null));
  });
}

async function ffClearAuth() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "FF_CLEAR_AUTH" }, () => resolve(true));
  });
}

async function ffApi(path, { method = "GET", body, form } = {}) {
  const auth = await ffGetAuth();
  if (!auth?.apiKey || !auth?.apiUrl) throw new Error("not authenticated");
  const headers = { "x-api-key": auth.apiKey };
  let payload;
  if (form) {
    payload = form;
  } else if (body) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }
  const res = await fetch(`${auth.apiUrl}${path}`, {
    method,
    headers,
    body: payload,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `api error ${res.status}`);
  }
  return data;
}

async function ffMatchProjects(url) {
  return ffApi(`/api/v1/projects/match?url=${encodeURIComponent(url)}`);
}

async function ffCreateSession({ projectId, startUrl, startTitle, title, contributorName }) {
  return ffApi("/api/v1/sessions", {
    method: "POST",
    body: { projectId, startUrl, startTitle, title, contributorName },
  });
}

async function ffCreateComment({
  sessionId,
  projectId,
  comment,
  selector,
  tagName,
  text,
  url,
  pageTitle,
  viewportWidth,
  viewportHeight,
  elementRect,
  screenshotBlob,
  screenshotWidth,
  screenshotHeight,
}) {
  const fd = new FormData();
  fd.append("sessionId", sessionId);
  fd.append("projectId", projectId);
  fd.append("comment", comment);
  fd.append("selector", selector);
  if (tagName) fd.append("tagName", tagName);
  if (text) fd.append("text", text);
  fd.append("url", url);
  if (pageTitle) fd.append("pageTitle", pageTitle);
  if (viewportWidth) fd.append("viewportWidth", String(viewportWidth));
  if (viewportHeight) fd.append("viewportHeight", String(viewportHeight));
  if (elementRect) fd.append("elementRect", JSON.stringify(elementRect));
  if (screenshotBlob) {
    fd.append("screenshot", screenshotBlob, "screenshot.png");
    if (screenshotWidth) fd.append("screenshotWidth", String(screenshotWidth));
    if (screenshotHeight) fd.append("screenshotHeight", String(screenshotHeight));
  }
  return ffApi("/api/v1/comments", { method: "POST", form: fd });
}
