importScripts("connection.js");
/* LumGram keyboard shortcut handler. No background polling or remote feeds. */
chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "toggle-extension") return;
  const { instagram_enable = "1" } =
    await chrome.storage.local.get("instagram_enable");
  await chrome.storage.local.set({
    instagram_enable: instagram_enable === "1" ? "0" : "1",
  });
});
chrome.runtime.onInstalled.addListener(() =>
  chrome.action.setBadgeText({ text: "" }),
);

chrome.runtime.onMessage.addListener((message, sender, reply) => {
  if (sender.id !== chrome.runtime.id || message?.type !== "LUMGRAM_CONNECTION")
    return;
  // Only the extension dashboard may request injection/reloading, not a page script.
  if (!sender.url?.startsWith(chrome.runtime.getURL(""))) return;
  LumConnection.handle(message).then(reply);
  return true;
});
