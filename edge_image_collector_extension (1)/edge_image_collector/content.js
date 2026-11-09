(() => {
  if (window.__imageCollectorInstalled) return;
  window.__imageCollectorInstalled = true;

  const found = new Map();

  function bestSrcset(srcset) {
    if (!srcset) return "";
    const choices = srcset.split(",").map(s => s.trim()).filter(Boolean);
    if (!choices.length) return "";
    // Prefer the candidate with the largest declared width/density.
    choices.sort((a, b) => {
      const score = s => {
        const m = s.match(/([\d.]+)(w|x)$/);
        return m ? Number(m[1]) * (m[2] === "x" ? 1000 : 1) : 0;
      };
      return score(a) - score(b);
    });
    return choices[choices.length - 1].split(/\s+/)[0];
  }

  function add(url, img) {
    if (!url || /^(data:|blob:|javascript:)/i.test(url)) return;
    try {
      const absolute = new URL(url, location.href).href;
      if (!/^https?:/i.test(absolute)) return;
      // Ignore tiny tracking pixels and common UI icons where dimensions are known.
      const w = img?.naturalWidth || img?.width || 0;
      const h = img?.naturalHeight || img?.height || 0;
      if (w && h && w < 60 && h < 60) return;
      found.set(absolute, {
        url: absolute,
        alt: img?.alt || "",
        width: w,
        height: h
      });
    } catch (_) {}
  }

  function scan(root = document) {
    if (root.querySelectorAll) {
      root.querySelectorAll("img").forEach(img => {
        add(img.currentSrc || bestSrcset(img.getAttribute("srcset")) ||
            img.getAttribute("data-src") || img.getAttribute("src"), img);
      });
      root.querySelectorAll("source[srcset]").forEach(source => {
        const parent = source.closest("picture")?.querySelector("img");
        add(bestSrcset(source.getAttribute("srcset")), parent);
      });
      // Also collect CSS background images from elements.
      root.querySelectorAll("*").forEach(el => {
        const bg = getComputedStyle(el).backgroundImage;
        if (bg && bg !== "none") {
          for (const match of bg.matchAll(/url\\(["']?(.*?)["']?\\)/g)) add(match[1], null);
        }
      });
    }
    if (root.tagName === "IMG") {
      const img = root;
      add(img.currentSrc || img.getAttribute("src"), img);
    }
  }

  scan();
  const observer = new MutationObserver(records => {
    for (const record of records) {
      if (record.type === "attributes") scan(record.target);
      for (const node of record.addedNodes) {
        if (node.nodeType === 1) scan(node);
      }
    }
  });
  observer.observe(document.documentElement, {
    childList: true, subtree: true, attributes: true,
    attributeFilter: ["src", "srcset", "data-src", "style"]
  });

  // Re-scan after lazy-loaded images update during scrolling.
  let timer;
  window.addEventListener("scroll", () => {
    clearTimeout(timer);
    timer = setTimeout(() => scan(), 250);
  }, {passive: true});

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type === "GET_COLLECTED_IMAGES") {
      scan();
      sendResponse({ images: Array.from(found.values()), count: found.size });
    }
    return true;
  });
})();