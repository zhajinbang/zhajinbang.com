import type { CSSProperties } from "react";
import Image from "next/image";
import Script from "next/script";

const sparks = [
  ["0vmin", "-25vmin"],
  ["15vmin", "-19vmin"],
  ["24vmin", "-6vmin"],
  ["22vmin", "12vmin"],
  ["10vmin", "23vmin"],
  ["-9vmin", "23vmin"],
  ["-22vmin", "12vmin"],
  ["-25vmin", "-6vmin"],
  ["-15vmin", "-19vmin"],
] as const;

export default function Home() {
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip opening animation
      </a>

      <div className="opening" id="opening" aria-hidden="true">
        <div className="opening__rings" aria-hidden="true">
          <span className="opening__ring opening__ring--one" />
          <span className="opening__ring opening__ring--two" />
          <span className="opening__ring opening__ring--three" />
        </div>
        <span className="opening__core" aria-hidden="true" />
        <div className="opening__burst" aria-hidden="true">
          {sparks.map(([x, y]) => (
            <span
              key={`${x}-${y}`}
              style={{ "--tx": x, "--ty": y } as CSSProperties}
            />
          ))}
        </div>
        <svg
          className="opening__liquid-sweep"
          viewBox="0 0 640 90"
          aria-hidden="true"
          preserveAspectRatio="none"
        >
          <path
            className="opening__liquid-trail"
            d="M12 58 C94 16 126 78 212 44 S360 20 462 43 S562 64 628 29"
            pathLength="1"
          />
          <path
            className="opening__liquid-trail opening__liquid-trail--fine"
            d="M94 68 C188 38 247 72 332 50 S462 36 548 49"
            pathLength="1"
          />
        </svg>
        <span className="opening__liquid-head" aria-hidden="true" />
        <div className="opening__copy">
          <p className="opening__eyebrow">zhajinbang presents</p>
          <p className="opening__tagline" data-tagline>
            Welcome to zhajinbang.
          </p>
        </div>
        <span className="opening__wipe-ring" aria-hidden="true" />
      </div>

      <svg
        className="page-reveal-ring"
        viewBox="0 0 100 100"
        aria-hidden="true"
        focusable="false"
      >
        <circle cx="50" cy="50" r="48" vectorEffect="non-scaling-stroke" />
      </svg>

      <div className="site-shell" id="site-shell">
        <header className="masthead">
          <a className="brand" href="#top" aria-label="zhajinbang home">
            <Image
              src="/brand/zhajin-logo.jpg"
              alt="zhajinbang logo"
              width={240}
              height={120}
              priority
            />
          </a>
          <p className="masthead__title" id="top">
            zhajinbang
          </p>
          <div className="masthead__actions">
            <button
              className="sound-toggle"
              type="button"
              data-motion-toggle
              aria-pressed="true"
            >
              Motion: on
            </button>
            <button className="sound-toggle" type="button" data-intro-replay>
              Replay opening
            </button>
          </div>
        </header>

        <main id="main-content" tabIndex={-1}>
          <section className="hero" aria-labelledby="gallery-heading">
            <div className="hero__intro">
              <p className="section-label" lang="en">
                01 / visual index
              </p>
              <div className="hero__title-wrap">
                <h1 id="gallery-heading" aria-label="Jerk it, til you cum it">
                  <span>JERK IT,</span>
                  <span>TIL YOU</span>
                  <span>CUM IT</span>
                </h1>
                <div
                  className="title-splashes"
                  aria-hidden="true"
                  data-wind-layer
                />
              </div>
              <p className="hero__copy" lang="en">
                This site is for our own pleasure.
                <br />
                No ads. That is the pleasure.
                <br />
                Zhajinbang, worldwide.
              </p>
            </div>

            <div
              className="gallery"
              id="gallery"
              role="region"
              aria-roledescription="carousel"
              aria-label="Featured image carousel"
            >
              <div className="gallery__viewport">
                <div className="gallery__track" data-track />
                <div
                  className="gallery__dots"
                  data-dots
                  aria-label="Choose a poster"
                />
              </div>
              <p className="sr-only" data-announcement aria-live="polite">
                Slide 1 of 5 selected.
              </p>
            </div>
          </section>
        </main>

        <footer className="footer">
          <p>zhajinbang.com / visual reference only</p>
          <p>Images: Unsplash · logo: existing repository asset</p>
        </footer>
      </div>

      <Script src="/home.js" strategy="afterInteractive" />
    </>
  );
}
