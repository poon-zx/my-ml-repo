import { notFound } from "next/navigation";
import { getAllSlugs, getNoteBySlug } from "@/lib/content";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export function generateStaticParams() {
  return getAllSlugs("papers").map((slug) => ({ slug }));
}

export default async function PaperDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const note = await getNoteBySlug("papers", slug);

  if (!note) {
    notFound();
  }

  return (
    <article className="note">
      <header className="note-header">
        <h1>{note.meta.title}</h1>
        <div className="note-meta">
          {note.meta.date && <span>{note.meta.date}</span>}
          {note.meta.tags?.length ? (
            <span>{note.meta.tags.join(" · ")}</span>
          ) : null}
        </div>
        {note.meta.summary && <p className="note-summary">{note.meta.summary}</p>}
      </header>
      <div className="note-content">{note.content}</div>
    </article>
  );
}
