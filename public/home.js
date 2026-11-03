const opening = document.querySelector("#opening");
const siteShell = document.querySelector("#site-shell");
const pageRevealRing = document.querySelector(".page-reveal-ring");
const windLayer = document.querySelector("[data-wind-layer]");
const goldWord = document.querySelector("h1 span:nth-child(2)");
const root = document.documentElement;
const motionToggle = document.querySelector("[data-motion-toggle]");
const replayButton = document.querySelector("[data-intro-replay]");
const skipOpeningLink = document.querySelector(".skip-link");
const initialMotion = new URLSearchParams(window.location.search).get("motion");
// The requested product behavior is motion-on for every normal page load.
// ?motion=off remains available as an explicit escape hatch, and the visible
// toggle can still stop motion after the visitor has entered the page.
let motionOverride = initialMotion === "off" ? "off" : "on";
let openingTimer;
let openingExitTimer;
let pageRevealTimer;
let entryPlaybackFrame;
let windLayoutFrame;
const pendingWindIndexes = new Set();
// Keep the written tagline on screen long enough for the closing rings to read
// as one complete gesture before the page-reveal circle takes over.
const OPENING_EXIT_START = 2050;
const OPENING_HOLD = 3600;
const PAGE_REVEAL_DURATION = 960;

function imageSourceAtWidth(src, width) {
  return src.replace(/w=\d+/, `w=${width}`);
}

const windPaths = [
  "M4 40 C37 11 75 8 110 23 C138 36 159 31 176 11",
  "M4 34 C42 6 82 14 118 25 C143 33 161 26 176 8",
  "M4 43 C47 24 87 21 124 30 C149 36 163 28 176 15",
  "M4 30 C43 9 81 7 116 19 C143 29 161 23 176 9",
  "M4 39 C45 19 84 17 121 27 C146 34 162 28 176 14",
];
const windLanes = [
  { x: [0, 8], y: [-22, -10], width: "clamp(7rem, 12.5vw, 15rem)" },
  { x: [21, 29], y: [-5, 7], width: "clamp(7.4rem, 13.2vw, 16rem)" },
  { x: [46, 54], y: [17, 29], width: "clamp(6.8rem, 11.8vw, 14rem)" },
  { x: [8, 16], y: [94, 106], width: "clamp(7.2rem, 12.8vw, 15.4rem)" },
  { x: [41, 49], y: [112, 126], width: "clamp(6.6rem, 11.4vw, 13.5rem)" },
];

function randomInRange([min, max]) {
  return min + Math.random() * (max - min);
}

function calculateWindPosition(lineBounds, { x, y }, layerBounds, wordBounds) {
  const availableX = Math.max(0, wordBounds.width - lineBounds.width - 4);
  const availableY = Math.max(0, wordBounds.height - lineBounds.height - 2);
  const left = wordBounds.left - layerBounds.left + 2 + (randomInRange(x) / 100) * availableX;
  const top = wordBounds.top - layerBounds.top + lineBounds.height / 2 + 1 + (randomInRange(y) / 100) * availableY;
  return { left, top };
}

function scheduleWindPlacement(indexes) {
  if (!goldWord || !windLayer) return;
  indexes.forEach((index) => pendingWindIndexes.add(index));
  if (windLayoutFrame) return;
  windLayoutFrame = window.requestAnimationFrame(() => {
    windLayoutFrame = undefined;
    const winds = [...windLayer.children];
    const indexesToPlace = [...pendingWindIndexes];
    pendingWindIndexes.clear();
    // Batch every layout read before the writes to avoid resize-time layout thrashing.
    const layerBounds = windLayer.getBoundingClientRect();
    const wordBounds = goldWord.getBoundingClientRect();
    const measurements = indexesToPlace.map((index) => ({ index, bounds: winds[index].getBoundingClientRect() }));
    const positions = measurements.map(({ index, bounds }) => ({
      index,
      ...calculateWindPosition(bounds, windLanes[index], layerBounds, wordBounds),
    }));
    positions.forEach(({ index, left, top }) => {
      winds[index].style.setProperty("--x", `${left.toFixed(1)}px`);
      winds[index].style.setProperty("--y", `${top.toFixed(1)}px`);
    });
  });
}

if (windLayer) {
  windLayer.innerHTML = windLanes.map(({ width }, index) => `
    <svg class="gold-wind" viewBox="0 0 180 52" role="presentation" preserveAspectRatio="none" style="--width:${width};--delay:-${(index * 1.18).toFixed(2)}s">
      <defs>
        <linearGradient id="gold-flow-${index}" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stop-color="#b66f16" stop-opacity="0"></stop><stop offset="20%" stop-color="#d7962a" stop-opacity=".6"></stop><stop offset="56%" stop-color="#fff0a8" stop-opacity=".96"></stop><stop offset="82%" stop-color="#d7962a" stop-opacity=".52"></stop><stop offset="100%" stop-color="#b66f16" stop-opacity="0"></stop>
        </linearGradient>
      </defs>
      <path class="gold-wind__stroke" d="${windPaths[index % windPaths.length]}" pathLength="1" stroke="url(#gold-flow-${index})"></path>
    </svg>`).join("");
  scheduleWindPlacement(windLanes.map((_, index) => index));
  [...windLayer.children].forEach((wind, index) => {
    // Reposition only while hidden between cycles, then batch reads and writes.
    wind.addEventListener("animationiteration", () => scheduleWindPlacement([index]));
  });
  window.addEventListener("resize", () => scheduleWindPlacement(windLanes.map((_, index) => index)), { passive: true });
}

if ("IntersectionObserver" in window) {
  const titleWrap = document.querySelector(".hero__title-wrap");
  new IntersectionObserver(([entry]) => {
    titleWrap.classList.toggle("is-motion-paused", !entry.isIntersecting);
  }, { rootMargin: "120px" }).observe(titleWrap);

}

function leaveOpening() {
  opening.classList.add("is-handing-off");
  siteShell.classList.add("is-revealing");
  pageRevealRing.classList.add("is-active");
  // Separate the handoff state from the opacity transition by one frame. This
  // lets the final tagline pose resolve before the page begins to reveal.
  window.requestAnimationFrame(() => opening.classList.add("is-gone"));
  window.clearTimeout(pageRevealTimer);
  pageRevealTimer = window.setTimeout(() => {
    siteShell.classList.remove("is-revealing");
    siteShell.classList.add("is-ready");
    pageRevealRing.classList.remove("is-active");
  }, PAGE_REVEAL_DURATION);
}

function finishOpeningImmediately() {
  window.clearTimeout(pageRevealTimer);
  window.clearTimeout(openingExitTimer);
  window.clearTimeout(openingTimer);
  opening.classList.add("is-gone");
  siteShell.classList.remove("is-revealing");
  siteShell.classList.add("is-ready");
  pageRevealRing.classList.remove("is-active");
}

function playOpening() {
  const tagline = document.querySelector("[data-tagline]");
  tagline.innerHTML = [...tagline.textContent]
    .map((character, index) => `<span style="animation-delay:${index * 55}ms">${character === " " ? "&nbsp;" : character}</span>`)
    .join("");
  window.clearTimeout(pageRevealTimer);
  opening.classList.remove("is-gone", "is-handing-off", "is-exiting", "is-playing");
  siteShell.classList.remove("is-revealing", "is-ready");
  pageRevealRing.classList.remove("is-active");
  // Reflow restarts the decorative CSS timeline when the replay button is used.
  void opening.offsetWidth;
  opening.classList.add("is-playing");
  window.clearTimeout(openingExitTimer);
  window.clearTimeout(openingTimer);
  openingExitTimer = window.setTimeout(() => opening.classList.add("is-exiting"), OPENING_EXIT_START);
  openingTimer = window.setTimeout(leaveOpening, OPENING_HOLD);
}

document.querySelector("[data-intro-replay]").addEventListener("click", playOpening);
skipOpeningLink.addEventListener("click", () => {
  finishOpeningImmediately();
  // WCAG 2.4.1: move focus to the skipped-to landmark after dismissing the overlay.
  window.requestAnimationFrame(() => document.querySelector("#main-content").focus({ preventScroll: true }));
});
document.addEventListener("visibilitychange", () => {
  root.classList.toggle("page-hidden", document.hidden);
});
root.classList.toggle("page-hidden", document.hidden);

function isMotionEnabled() {
  if (motionOverride === "on") return true;
  if (motionOverride === "off") return false;
  return true;
}

function applyMotionMode({ replay = false } = {}) {
  const enabled = isMotionEnabled();
  // Keep the CSS animation timeline enabled before and after the first frame.
  root.classList.toggle("motion-forced", enabled);
  root.classList.toggle("motion-disabled", !enabled);
  motionToggle.textContent = enabled ? "Motion: on" : "Enable motion";
  motionToggle.setAttribute("aria-pressed", String(enabled));
  replayButton.hidden = !enabled;

  if (!enabled) {
    window.clearTimeout(pageRevealTimer);
    window.clearTimeout(openingExitTimer);
    window.clearTimeout(openingTimer);
    opening.classList.add("is-gone");
    siteShell.classList.remove("is-revealing");
    siteShell.classList.add("is-ready");
    pageRevealRing.classList.remove("is-active");
    return;
  }

  if (replay || !siteShell.classList.contains("is-ready")) {
    playOpening();
    return;
  }

}

motionToggle.addEventListener("click", () => {
  motionOverride = isMotionEnabled() ? "off" : "on";
  applyMotionMode({ replay: motionOverride === "on" });
});

function playOpeningWhenPageIsVisible() {
  if (document.visibilityState !== "visible") {
    document.addEventListener("visibilitychange", playOpeningWhenPageIsVisible, { once: true });
    return;
  }

  window.cancelAnimationFrame(entryPlaybackFrame);
  entryPlaybackFrame = window.requestAnimationFrame(() => {
    let skipOpening = window.location.hash === "#members";
    try {
      const key = "zhajinbang-opening-seen";
      skipOpening ||= sessionStorage.getItem(key) === "1";
      sessionStorage.setItem(key, "1");
    } catch {
      // The members anchor still skips the intro when storage is unavailable.
    }

    if (skipOpening) finishOpeningImmediately();
    applyMotionMode();
  });
}

// Start on the first displayed frame, without waiting for remote images.
if (document.prerendering) {
  document.addEventListener("prerenderingchange", playOpeningWhenPageIsVisible, { once: true });
} else {
  playOpeningWhenPageIsVisible();
}

window.addEventListener("pageshow", (event) => {
  if (event.persisted) finishOpeningImmediately();
});
