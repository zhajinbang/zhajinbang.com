import { notFound } from "next/navigation";
import { getMember, members } from "../../members";
import styles from "./page.module.css";
import CaoArcade from "../cao-arcade";

export function generateStaticParams() {
  return members.map(({ slug }) => ({ slug }));
}

export default async function MemberPage(props: PageProps<"/members/[slug]">) {
  const { slug } = await props.params;
  const member = getMember(slug);

  if (!member) {
    notFound();
  }

  if (slug === "alpha") return <CaoArcade />;

  return (
    <main className={styles.page}>
      <div className={styles.grid} aria-hidden="true" />

      <header className={styles.header}>
        <a className={styles.wordmark} href="/#members">
          ZHAJINBANG
        </a>
      </header>

      <section className={styles.content} aria-labelledby="member-name">
        <h1 id="member-name">{member.name}</h1>
        <p className={styles.role}>{member.role}</p>
        <p className={styles.note} lang="zh-CN">{member.note}</p>

        <div className={styles.menu} aria-label={`${member.name} menu`}>
          {member.menu.map((item, index) => (
            <article className={styles.menuItem} key={item.label}>
              <span>0{index + 1}</span>
              <div>
                <h2>{item.label}</h2>
                <p>{item.detail}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <footer className={styles.footer}>
        <a href="/#members">← RETURN TO BASE</a>
      </footer>
    </main>
  );
}
