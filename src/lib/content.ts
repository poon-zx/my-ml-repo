import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { compileMDX } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypePrettyCode from "rehype-pretty-code";
import { mdxComponents } from "@/components/mdx-components";

const CONTENT_ROOT = path.join(process.cwd(), "content");

export type Collection = "papers" | "problems";

export type NoteFrontmatter = {
  title: string;
  date?: string;
  summary?: string;
  tags?: string[];
};

export type NoteMeta = NoteFrontmatter & {
  slug: string;
  collection: Collection;
};

function getCollectionDir(collection: Collection) {
  return path.join(CONTENT_ROOT, collection);
}

function getMdxFiles(dir: string) {
  if (!fs.existsSync(dir)) {
    return [];
  }
  return fs.readdirSync(dir).filter((file) => file.endsWith(".mdx"));
}

export function getAllSlugs(collection: Collection) {
  const dir = getCollectionDir(collection);
  return getMdxFiles(dir).map((file) => file.replace(/\.mdx$/, ""));
}

export function getAllNotes(collection: Collection): NoteMeta[] {
  const dir = getCollectionDir(collection);
  const notes = getMdxFiles(dir).map((file) => {
    const slug = file.replace(/\.mdx$/, "");
    const source = fs.readFileSync(path.join(dir, file), "utf8");
    const { data } = matter(source);
    const frontmatter = data as NoteFrontmatter;

    return {
      slug,
      collection,
      title: frontmatter.title ?? slug,
      date: frontmatter.date,
      summary: frontmatter.summary,
      tags: frontmatter.tags ?? [],
    };
  });

  return notes.sort((a, b) => {
    const dateCompare = (b.date ?? "").localeCompare(a.date ?? "");
    if (dateCompare !== 0) {
      return dateCompare;
    }
    return a.title.localeCompare(b.title);
  });
}

export async function getNoteBySlug(collection: Collection, slug: string) {
  const dir = getCollectionDir(collection);
  const fullPath = path.join(dir, `${slug}.mdx`);
  if (!fs.existsSync(fullPath)) {
    return null;
  }

  const source = fs.readFileSync(fullPath, "utf8");
  const { content, data } = matter(source);
  const frontmatter = data as NoteFrontmatter;

  const compiled = await compileMDX({
    source: content,
    components: mdxComponents,
    options: {
      mdxOptions: {
        remarkPlugins: [remarkGfm, remarkMath],
        rehypePlugins: [
          rehypeKatex,
          [
            rehypePrettyCode,
            {
              theme: "vitesse-light",
              keepBackground: false,
            },
          ],
        ],
      },
    },
  });

  return {
    meta: {
      slug,
      collection,
      title: frontmatter.title ?? slug,
      date: frontmatter.date,
      summary: frontmatter.summary,
      tags: frontmatter.tags ?? [],
    },
    content: compiled.content,
  };
}
