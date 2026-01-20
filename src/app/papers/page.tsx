import Link from "next/link";
import { getAllNotes } from "@/lib/content";

export default function PapersPage() {
  const papers = getAllNotes("papers");

  return (
    <section className="section">
      <header className="section-header">
        <h1>ML papers</h1>
        <p>Notes and reflections on papers I want to remember.</p>
      </header>

      {papers.length === 0 ? (
        <p className="empty-state">
          No paper notes yet. Add a markdown file in `content/papers` to get
          started.
        </p>
      ) : (
        <div className="note-list">
          {papers.map((paper) => (
            <article key={paper.slug} className="note-card">
              <div>
                <h2>
                  <Link className="note-link" href={`/papers/${paper.slug}`}>
                    {paper.title}
                  </Link>
                </h2>
                {paper.summary && <p>{paper.summary}</p>}
              </div>
              <div className="note-meta">
                {paper.date && <span>{paper.date}</span>}
                {paper.tags?.length ? (
                  <span>{paper.tags.join(" · ")}</span>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
