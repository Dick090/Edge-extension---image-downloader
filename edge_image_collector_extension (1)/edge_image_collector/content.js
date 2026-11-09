(() => {
  if (window.imageCollectorInstalled) return;

  window.imageCollectorInstalled = true;

  const images = new Map();

  function addImage(url, img) {
    if (!url) return;

    if (
      url.startsWith("data:") ||
      url.startsWith("blob:")
    ) return;

    try {
      const fullURL = new URL(url, location.href).href;

      if (!fullURL.startsWith("http")) return;

      const width =
        img?.naturalWidth || img?.width || 0;

      const height =
        img?.naturalHeight || img?.height || 0;

      if (width && height && width < 50 && height < 50) {
        return;
      }

      images.set(fullURL, {
        url: fullURL,
        alt: img?.alt || "",
        width,
        height
      });

    } catch (error) {}
  }

  function scanPage(root = document) {

    if (root.querySelectorAll) {

      root.querySelectorAll("img").forEach(img => {

        const src =
          img.currentSrc ||
          img.getAttribute("src") ||
          img.getAttribute("data-src") ||
          img.getAttribute("data-original");

        addImage(src, img);

        const srcset = img.getAttribute("srcset");

        if (srcset) {
          srcset.split(",").forEach(item => {
            const url = item.trim().split(/\s+/)[0];
            addImage(url, img);
          });
        }
      });

      root.querySelectorAll("[style]").forEach(el => {

        const background =
          getComputedStyle(el).backgroundImage;

        const matches = background.matchAll(
          /url\(["']?(.*?)["']?\)/g
        );

        for (const match of matches) {
          addImage(match[1], null);
        }

      });
    }

    if (root.matches?.("img")) {
      addImage(root.currentSrc || root.src, root);
    }
  }

  scanPage();

  const observer = new MutationObserver(records => {

    records.forEach(record => {

      if (record.type === "attributes") {
        scanPage(record.target);
      }

      record.addedNodes.forEach(node => {
        if (node.nodeType === 1) {
          scanPage(node);
        }
      });

    });

  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: [
      "src",
      "srcset",
      "style",
      "data-src",
      "data-original"
    ]
  });

  window.addEventListener("scroll", () => {
    scanPage();
  }, { passive: true });

  chrome.runtime.onMessage.addListener(
    (message, sender, sendResponse) => {

      if (message.type === "GET_IMAGES") {

        scanPage();

        sendResponse({
          images: Array.from(images.values()),
          count: images.size
        });

      }

      return true;
    }
  );

})();
