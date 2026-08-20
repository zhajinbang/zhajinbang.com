import Image from "next/image";
import Link from "next/link";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.page}>
      <div className={styles.grid} aria-hidden="true" />

      <header className={styles.header}>
        <Link className={styles.wordmark} href="/" aria-label="Zhajinbang home">
          ZHAJINBANG
        </Link>

        <nav className={styles.navigation} aria-label="Primary navigation">
          <span>ABOUT</span>
          <span>PROJECTS</span>
          <a
            href="https://github.com/zhajinbang"
            target="_blank"
            rel="noreferrer"
          >
            GITHUB
          </a>
        </nav>
      </header>

      <section className={styles.hero} aria-labelledby="hero-title">
        <h1 id="hero-title" className={styles.srOnly}>
          Zhajinbang
        </h1>

        <div className={styles.logoStage}>
          <Image
            className={styles.logo}
            src="/brand/zhajin-logo.jpg"
            alt="Zhajin logo"
            width={1254}
            height={1254}
            priority
            sizes="(max-width: 720px) 82vw, 560px"
          />
        </div>
      </section>

      <footer className={styles.footer}>
        <p>MECHANICS / ROBOTICS / EXPERIMENTS</p>
        <p className={styles.sectionIndex}>01 — HOME</p>
      </footer>
    </main>
  );
}
