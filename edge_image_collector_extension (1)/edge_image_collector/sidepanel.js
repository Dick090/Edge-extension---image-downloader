const gallery = document.getElementById("gallery");
const count = document.getElementById("count");
const status = document.getElementById("status");

let collected = [];

async function getImages() {

  const tabs = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });

  const tab = tabs[0];

  if (!tab || !tab.id) return;

  try {

    let response;

    try {

      response = await chrome.tabs.sendMessage(
        tab.id,
        { type: "GET_IMAGES" }
      );

    } catch {

      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"]
      });

      response = await chrome.tabs.sendMessage(
        tab.id,
        { type: "GET_IMAGES" }
      );
    }

    collected = response.images || [];

    status.textContent = "LIVE IMAGE DETECTION ACTIVE";

    displayImages();

  } catch (error) {

    status.textContent = "PAGE ACCESS ERROR";

    gallery.innerHTML =
      '<p class="empty">Reload the webpage and try again. Some protected pages cannot be scanned.</p>';

  }
}

function displayImages() {

  count.textContent = collected.length + " Images";

  gallery.innerHTML = "";

  if (collected.length === 0) {

    gallery.innerHTML =
      '<p class="empty">No images detected. Scroll down the webpage.</p>';

    return;
  }

  collected.forEach((item, index) => {

    const box = document.createElement("div");

    box.className = "item";

    const img = document.createElement("img");

    img.src = item.url;

    img.onerror = () => {
      img.alt = "Preview unavailable";
    };

    const info = document.createElement("div");

    info.className = "info";

    const name = document.createElement("div");

    name.className = "name";

    name.textContent =
      item.alt || "Image " + (index + 1);

    const meta = document.createElement("div");

    meta.className = "meta";

    meta.textContent =
      item.width && item.height
        ? item.width + " × " + item.height
        : "Image detected";

    info.append(name, meta);

    box.append(img, info);

    gallery.append(box);

  });
}

document.getElementById("refresh").onclick = getImages;

document.getElementById("download").onclick = async () => {

  await getImages();

  for (let i = 0; i < collected.length; i++) {

    try {

      const url = collected[i].url;

      let filename = "";

      try {
        filename = decodeURIComponent(
          new URL(url).pathname.split("/").pop()
        );
      } catch {}

      if (!filename || !/\.(jpg|jpeg|png|gif|webp|bmp|avif)$/i.test(filename)) {
        filename = "image-" + (i + 1) + ".jpg";
      }

      await chrome.downloads.download({
        url: url,
        filename: "Image Collector/" + filename,
        conflictAction: "uniquify",
        saveAs: false
      });

    } catch (error) {}

  }

  status.textContent = "DOWNLOADS STARTED";
};

getImages();

setInterval(getImages, 2000);
