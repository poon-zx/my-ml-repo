import Link from "next/link";
import { getAllNotes } from "@/lib/content";

export default function ProblemsPage() {
  const problems = getAllNotes("problems");

  return (
    <section className="section">
      <header className="section-header">
        <h1>ML coding problems</h1>
        <p>Interesting problems and the solutions I want to revisit.</p>
        <p className="muted">
          Credit: many problems are adapted from{" "}
          <a href="https://www.deep-ml.com/" target="_blank" rel="noreferrer">
            Deep-ML
          </a>
          .
        </p>
      </header>

      {problems.length === 0 ? (
        <p className="empty-state">
          No problems yet. Add a markdown file in `content/problems` to get
          started.
        </p>
      ) : (
        <div className="note-list">
          {problems.map((problem) => (
            <article key={problem.slug} className="note-card">
              <div>
                <h2>
                  <Link className="note-link" href={`/problems/${problem.slug}`}>
                    {problem.title}
                  </Link>
                </h2>
                {problem.summary && <p>{problem.summary}</p>}
              </div>
              <div className="note-meta">
                {problem.date && <span>{problem.date}</span>}
                {problem.tags?.length ? (
                  <span>{problem.tags.join(" · ")}</span>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
