import Link from "next/link";
import { getAllNotes } from "@/lib/content";

export default function Home() {
  const papers = getAllNotes("papers");
  const problems = getAllNotes("problems");

  return (
    <section className="home">
      <div className="home-hero">
        <div className="home-hero-bg" aria-hidden="true" />
        <div className="home-hero-nodes" aria-hidden="true" />
        <div className="home-hero-content">
          <p className="eyebrow">Personal ML repository</p>
          <h1>
            My collection of interesting ML papers, concise notes, and
            coding problems.
            <span className="typing-cursor" aria-hidden="true" />
          </h1>
          <p className="lede">
          </p>
          <div className="home-actions">
            <Link className="button" href="/papers">
              Browse papers
            </Link>
            <Link className="button button-outline" href="/problems">
              See coding problems
            </Link>
          </div>
          <div className="home-status" aria-hidden="true">
            <span>Backfilling</span>
            <span className="thinking-dots">
              <span />
              <span />
              <span />
            </span>
          </div>
          <dl className="home-stats">
            <div>
              <dt>Papers</dt>
              <dd className="stat-value">{papers.length}</dd>
            </div>
            <div>
              <dt>Problems</dt>
              <dd className="stat-value">{problems.length}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="home-grid">
        <Link className="home-card home-card-papers home-card-link" href="/papers">
          <div className="card-icon" aria-hidden="true">
            <svg viewBox="0 0 48 48" fill="none">
              <path
                d="M10 12.5H32c2.2 0 4 1.8 4 4V34"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M8 16h22c2.2 0 4 1.8 4 4v16H12c-2.2 0-4-1.8-4-4V16z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <path
                d="M14 22h14M14 28h10"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <h2>Papers</h2>
          <p>
            Short summaries, key equations, and practical takeaways from ML
            papers worth revisiting.
          </p>
        </Link>
        <Link
          className="home-card home-card-problems home-card-link"
          href="/problems"
        >
          <div className="card-icon" aria-hidden="true">
            <svg viewBox="0 0 48 48" fill="none">
              <path
                d="M10 14h28c2.2 0 4 1.8 4 4v14c0 2.2-1.8 4-4 4H18l-8 6v-6H10c-2.2 0-4-1.8-4-4V18c0-2.2 1.8-4 4-4z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <path
                d="M18 24h6M28 24h4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <h2>Problems</h2>
          <p>
            Interview-style ML coding tasks, my solutions, and notes on edge
            cases.
          </p>
        </Link>
      </div>
    </section>
  );
}
