const slides = [
  {
    src: "https://images.unsplash.com/photo-1527589177743-325f24eef297?auto=format&fit=crop&w=1600&q=82",
    alt: "A quiet shoreline under a muted sky",
    caption: "Coastline in low light",
  },
  {
    src: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1600&q=82",
    alt: "Editorial studio portrait of a person with their eyes closed",
    caption: "Portrait / soft focus",
  },
  {
    src: "https://images.unsplash.com/photo-1484882918957-e9f6567be3c8?auto=format&fit=crop&w=1600&q=82",
    alt: "Monochrome brutalist concrete architecture",
    caption: "Concrete geometry",
  },
  {
    src: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1600&q=82",
    alt: "Editorial portrait of a person against a bright background",
    caption: "Portrait / daylight",
  },
  {
    src: "https://images.unsplash.com/photo-1642602105776-4f161cab8053?auto=format&fit=crop&w=1600&q=82",
    alt: "Moody rocky coastline beside the sea",
    caption: "Edge of the water",
  },
];

const track = document.querySelector("[data-track]");
const dots = document.querySelector("[data-dots]");
const announcement = document.querySelector("[data-announcement]");
const opening = document.querySelector("#opening");
const siteShell = document.querySelector("#site-shell");
const pageRevealRing = document.querySelector(".page-reveal-ring");
const windLayer = document.querySelector("[data-wind-layer]");
const goldWord = document.querySelector("h1 span:nth-child(2)");
const gallery = document.querySelector("#gallery");
const root = document.documentElement;
const motionToggle = document.querySelector("[data-motion-toggle]");
const replayButton = document.querySelector("[data-intro-replay]");
const skipOpeningLink = document.querySelector(".skip-link");
const initialMotion = new URLSearchParams(window.location.search).get("motion");
let activeIndex = 0;
// The requested product behavior is motion-on for every normal page load.
// ?motion=off remains available as an explicit escape hatch, and the visible
// toggle can still stop motion after the visitor has entered the page.
let motionOverride = initialMotion === "off" ? "off" : "on";
let isPaused = motionOverride === "off";
let timer;
let openingTimer;
let openingExitTimer;
let pageRevealTimer;
let dotAnimationTimer;
let entryPlaybackFrame;
let windLayoutFrame;
const pendingWindIndexes = new Set();
let galleryVisible = true;
// Keep the written tagline on screen long enough for the closing rings to read
// as one complete gesture before the page-reveal circle takes over.
const OPENING_EXIT_START = 2050;
const OPENING_HOLD = 3600;
const PAGE_REVEAL_DURATION = 960;
const AUTOPLAY_INTERVAL = 4800;
const DOT_ANIMATION_DURATION = 680;

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

track.innerHTML = slides
  .map(
    ({ src, alt }, index) => `
      <figure class="gallery__slide ${index === 0 ? "is-active" : ""}" aria-hidden="${index === 0 ? "false" : "true"}">
        <img src="${src}" srcset="${imageSourceAtWidth(src, 1200)} 1200w, ${src} 1600w, ${imageSourceAtWidth(src, 2000)} 2000w" sizes="(max-width: 680px) calc(100vw - 2rem), 92vw" alt="${alt}" width="2400" height="1350" decoding="async" ${index === 0 ? "fetchpriority=\"high\"" : "loading=\"lazy\""} />
      </figure>`,
  )
  .join("");

dots.innerHTML = slides
  .map(
    ({ caption: slideCaption }, index) =>
      `<button class="gallery__dot ${index === 0 ? "is-active" : ""}" type="button" data-slide-index="${index}" aria-label="Show poster ${index + 1} of ${slides.length}: ${slideCaption}" aria-current="${index === 0 ? "true" : "false"}"></button>`,
  )
  .join("");

function warmSlide(index) {
  const normalizedIndex = (index + slides.length) % slides.length;
  const image = track.children[normalizedIndex]?.querySelector("img");
  if (!image || image.dataset.warmed === "true") return;
  image.dataset.warmed = "true";
  image.loading = "eager";
  // Decode off the transition path where supported, so a slide switch does
  // not compete with image decoding on the main thread.
  if (typeof image.decode === "function") image.decode().catch(() => {});
}

function scheduleSlideWarmup(index) {
  const task = () => warmSlide(index);
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(task, { timeout: 800 });
  } else {
    window.setTimeout(task, 0);
  }
}

function updateSlide(index) {
  const previousIndex = activeIndex;
  activeIndex = (index + slides.length) % slides.length;
  warmSlide(activeIndex);
  announcement.textContent = `Poster ${activeIndex + 1} of ${slides.length} selected: ${slides[activeIndex].caption}.`;
  [...track.children].forEach((slide, slideIndex) => {
    slide.setAttribute("aria-hidden", String(slideIndex !== activeIndex));
    slide.classList.toggle("is-active", slideIndex === activeIndex);
  });
  [...dots.children].forEach((dot, dotIndex) => {
    dot.classList.remove("is-entering", "is-leaving");
    dot.classList.toggle("is-active", dotIndex === activeIndex);
    dot.setAttribute("aria-current", String(dotIndex === activeIndex));
  });

  if (previousIndex !== activeIndex) {
    const previousDot = dots.children[previousIndex];
    const activeDot = dots.children[activeIndex];
    // Restart both animations so rapid successive selections still read as a state change.
    void activeDot.offsetWidth;
    previousDot.classList.add("is-leaving");
    activeDot.classList.add("is-entering");
    window.clearTimeout(dotAnimationTimer);
    dotAnimationTimer = window.setTimeout(() => {
      previousDot.classList.remove("is-leaving");
      activeDot.classList.remove("is-entering");
    }, DOT_ANIMATION_DURATION);
  }
  scheduleSlideWarmup(activeIndex + 1);
}

function stopAutoplay() {
  window.clearInterval(timer);
  timer = undefined;
}

function startAutoplay() {
  stopAutoplay();
  if (!isPaused && isMotionEnabled() && galleryVisible && siteShell.classList.contains("is-ready")) {
    scheduleSlideWarmup(activeIndex + 1);
    timer = window.setInterval(() => updateSlide(activeIndex + 1), AUTOPLAY_INTERVAL);
  }
}

function setPaused(nextPaused) {
  isPaused = nextPaused;
  startAutoplay();
}

dots.addEventListener("click", (event) => {
  const target = event.target.closest("[data-slide-index]");
  if (!target) return;
  updateSlide(Number(target.dataset.slideIndex));
});

function warmSlideFromControl(event) {
  const target = event.target.closest("[data-slide-index]");
  if (target) warmSlide(Number(target.dataset.slideIndex));
}

dots.addEventListener("pointerover", warmSlideFromControl, { passive: true });
dots.addEventListener("focusin", warmSlideFromControl);

if ("IntersectionObserver" in window) {
  const titleWrap = document.querySelector(".hero__title-wrap");
  new IntersectionObserver(([entry]) => {
    titleWrap.classList.toggle("is-motion-paused", !entry.isIntersecting);
  }, { rootMargin: "120px" }).observe(titleWrap);

  new IntersectionObserver(([entry]) => {
    galleryVisible = entry.isIntersecting;
    if (galleryVisible) startAutoplay();
    else stopAutoplay();
  }, { rootMargin: "160px" }).observe(gallery);
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
    startAutoplay();
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
  startAutoplay();
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
  if (document.hidden) stopAutoplay();
  else startAutoplay();
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
    setPaused(true);
    return;
  }

  if (replay || !siteShell.classList.contains("is-ready")) {
    isPaused = false;
    stopAutoplay();
    playOpening();
    return;
  }

  setPaused(false);
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
  entryPlaybackFrame = window.requestAnimationFrame(() => applyMotionMode({ replay: true }));
}

// Start on the first displayed frame, without waiting for remote images. If
// Edge restores this document from back/forward cache, pageshow replays it.
if (document.prerendering) {
  document.addEventListener("prerenderingchange", playOpeningWhenPageIsVisible, { once: true });
} else {
  playOpeningWhenPageIsVisible();
}

window.addEventListener("pageshow", (event) => {
  if (event.persisted) playOpeningWhenPageIsVisible();
});
