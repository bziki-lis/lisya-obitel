// Лайтбокс для витрины: картинка, обёрнутая в ссылку на изображение,
// открывается поверх страницы. Без JS ссылка просто ведёт на полную версию.

export const manifest = {
  name: "lightbox",
  displayName: "Lightbox",
  description: "Opens linked images in an overlay",
  version: "1.0.0",
  category: "transformer",
}

const css = `
.lb-trigger { cursor: zoom-in; display: block; }
.lb-trigger img { transition: opacity 0.15s ease; }
.lb-trigger:hover img { opacity: 0.92; }
.lb-overlay {
  position: fixed; inset: 0; z-index: 9999;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 0.75rem; padding: 1.5rem;
  background: rgba(10, 8, 7, 0.95);
  cursor: zoom-out;
  opacity: 0; transition: opacity 0.18s ease;
}
.lb-overlay.lb-open { opacity: 1; }
.lb-overlay img {
  max-width: 96vw; max-height: 86vh; width: auto; height: auto;
  margin: 0; border-radius: 4px;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.6);
}
.lb-caption { color: #efe6db; font-family: var(--headerFont); font-size: 1.1rem; text-align: center; }
.lb-close {
  position: absolute; top: 0.75rem; right: 0.75rem;
  width: 2.75rem; height: 2.75rem; border-radius: 50%;
  border: 1px solid rgba(239, 230, 219, 0.35); background: rgba(27, 23, 22, 0.6);
  color: #efe6db; font-size: 1.5rem; line-height: 1; cursor: pointer;
}
.lb-close:hover { background: rgba(224, 122, 75, 0.35); }
.lb-close:focus-visible { outline: 2px solid #e07a4b; outline-offset: 2px; }
body.lb-locked { overflow: hidden; }
@media (prefers-reduced-motion: reduce) {
  .lb-overlay, .lb-trigger img { transition: none; }
}
`

const script = `
(function () {
  if (window.__lightboxReady) return;
  window.__lightboxReady = true;
  var IMG = /\\.(webp|png|jpe?g|gif|avif)(\\?.*)?$/i;
  var overlay = null, lastFocus = null;

  function mark() {
    document.querySelectorAll("article a").forEach(function (a) {
      var img = a.querySelector("img");
      if (img && IMG.test(a.getAttribute("href") || "")) a.classList.add("lb-trigger");
    });
  }

  function close() {
    if (!overlay) return;
    var o = overlay; overlay = null;
    o.classList.remove("lb-open");
    document.body.classList.remove("lb-locked");
    document.removeEventListener("keydown", onKey);
    setTimeout(function () { o.remove(); }, 180);
    if (lastFocus) lastFocus.focus();
  }

  function onKey(e) {
    if (e.key === "Escape") close();
    if (e.key === "Tab" && overlay) { e.preventDefault(); overlay.querySelector(".lb-close").focus(); }
  }

  function open(href, alt) {
    lastFocus = document.activeElement;
    overlay = document.createElement("div");
    overlay.className = "lb-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", alt || "Изображение");
    var btn = document.createElement("button");
    btn.className = "lb-close"; btn.type = "button";
    btn.setAttribute("aria-label", "Закрыть"); btn.textContent = "×";
    var img = document.createElement("img");
    img.src = href; img.alt = alt || "";
    overlay.appendChild(btn); overlay.appendChild(img);
    if (alt) { var cap = document.createElement("div"); cap.className = "lb-caption"; cap.textContent = alt; overlay.appendChild(cap); }
    overlay.addEventListener("click", close);
    document.body.appendChild(overlay);
    document.body.classList.add("lb-locked");
    document.addEventListener("keydown", onKey);
    requestAnimationFrame(function () { overlay && overlay.classList.add("lb-open"); });
    btn.focus();
  }

  document.addEventListener("click", function (e) {
    if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest("a.lb-trigger");
    if (!a) return;
    e.preventDefault();
    e.stopPropagation();
    var img = a.querySelector("img");
    open(a.href, img ? img.getAttribute("alt") : "");
  }, true);

  document.addEventListener("nav", function () { close(); mark(); });
  mark();
})();
`

const IMG_HREF = /\.(webp|png|jpe?g|gif|avif)(\?.*)?$/i

// rehype: помечаем ссылки-картинки и снимаем с них классы внутренних ссылок,
// чтобы на них не всплывало превью страницы и их не перехватывал SPA-роутер
function rehypeLightbox() {
  return (tree) => {
    const walk = (node) => {
      if (node.type === "element" && node.tagName === "a") {
        const href = String(node.properties?.href ?? "")
        const hasImg = (node.children ?? []).some((c) => c.type === "element" && c.tagName === "img")
        if (hasImg && IMG_HREF.test(href)) {
          const cls = [].concat(node.properties.className ?? []).filter(
            (c) => c !== "internal" && c !== "internal-link",
          )
          cls.push("lb-trigger")
          node.properties.className = cls
        }
      }
      for (const c of node.children ?? []) walk(c)
    }
    walk(tree)
  }
}

export default function Lightbox() {
  return {
    name: "Lightbox",
    markdownPlugins() {
      return []
    },
    htmlPlugins() {
      return [rehypeLightbox]
    },
    externalResources() {
      return {
        css: [{ content: css, inline: true }],
        js: [{ script, loadTime: "afterDOMReady", contentType: "inline" }],
      }
    },
  }
}
