const countEl = document.getElementById("count");
const listEl = document.getElementById("images");
let collected = [];

function filenameFromUrl(url, index) {
  try {
    const u = new URL(url);
    let name = decodeURIComponent(u.pathname.split("/").pop() || "");
    name = name.replace(/[<>:"/\\\\|?*\\x00-\\x1F]/g, "_");
    if (!name || !/\\.(jpe?g|png|gif|webp|bmp|avif|svg)$/i.test(name)) {
      name = `image-${String(index + 1).padStart(3, "0")}.jpg`;
    }
    return `Facebook-and-Web-Images/${String(index + 1).padStart(3, "0")}-${name}`;
  } catch {
    return `Facebook-and-Web-Images/image-${index + 1}.jpg`;
  }
}

async function getImages() {
  const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
  if (!tab?.id) return;
  chrome.tabs.sendMessage(tab.id, {type: "GET_COLLECTED_IMAGES"}, response => {
    if (chrome.runtime.lastError || !response) {
      countEl.textContent = "Open or reload a webpage";
      listEl.innerHTML = '<p class="empty">This page cannot be scanned. Reload the page, then scroll again. Browser internal pages are restricted.</p>';
      return;
    }
    collected = response.images || [];
    countEl.textContent = `${collected.length} images found`;
    render();
  });
}

function render() {
  listEl.replaceChildren();
  if (!collected.length) {
    listEl.innerHTML = '<p class="empty">No images found yet. Scroll the webpage to load images.</p>';
    return;
  }
  collected.forEach((item, i) => {
    const row = document.createElement("div");
    row.className = "item";
    const img = document.createElement("img");
    img.src = item.url;
    img.alt = "";
    const info = document.createElement("div");
    info.className = "info";
    const name = document.createElement("div");
    name.className = "name";
    name.textContent = item.alt || new URL(item.url).pathname.split("/").pop() || "Image";
    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = item.width && item.height ? `${item.width} × ${item.height}` : "Image";
    info.append(name, meta);
    row.append(img, info);
    listEl.append(row);
  });
}

document.getElementById("refresh").addEventListener("click", getImages);
document.getElementById("download").addEventListener("click", async () => {
  await getImages();
  if (!collected.length) return;
  let started = 0;
  collected.forEach((item, i) => {
    chrome.downloads.download({
      url: item.url,
      filename: filenameFromUrl(item.url, i),
      conflictAction: "uniquify",
      saveAs: false
    }, id => {
      if (id !== undefined) started++;
    });
  });
  document.getElementById("download").textContent = `Started ${collected.length} downloads`;
});
getImages();
const poll = setInterval(getImages, 1500);
window.addEventListener("unload", () => clearInterval(poll));
