import React from "react";

/**
 * Renders admin-authored plain-text content (core.WebsitePage.content) as
 * structured React elements - headings, paragraphs, bullet/numbered lists,
 * bold/italic emphasis, links, and standalone images. Deliberately never
 * uses dangerouslySetInnerHTML: there is no raw-HTML rendering path at all,
 * so there is nothing here for injected markup or a script tag to execute
 * in. Only http(s)/mailto targets are honored for links and images;
 * anything else (javascript:, data:, etc.) renders as plain text instead.
 */

// One combined pattern so bold/italic/links resolve in the order they
// actually appear in the text, rather than each type clobbering the others
// in separate passes. Order in the alternation matters: **bold** must be
// tried before *italic* so "**x**" doesn't get read as italic-around-"*x*".
const INLINE_PATTERN =
  /\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*/g;

const STANDALONE_IMAGE_PATTERN = /^!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)$/;

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  INLINE_PATTERN.lastIndex = 0;
  while ((match = INLINE_PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const key = `${keyPrefix}-i-${i++}`;
    if (match[1] !== undefined) {
      // [text](url)
      const linkUrl = match[2] ?? "";
      nodes.push(
        <a
          key={key}
          href={linkUrl}
          target={linkUrl.startsWith("mailto:") ? undefined : "_blank"}
          rel="noopener noreferrer"
          className="text-[#D4A72C] underline underline-offset-2 hover:text-[#c29322]"
        >
          {match[1]}
        </a>
      );
    } else if (match[3] !== undefined) {
      // **bold**
      nodes.push(<strong key={key}>{match[3]}</strong>);
    } else if (match[4] !== undefined) {
      // *italic*
      nodes.push(<em key={key}>{match[4]}</em>);
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

type ListKind = "bullet" | "number" | null;

export function LegalContent({ content }: { content: string }) {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: React.ReactNode[] = [];
  let paragraphBuffer: string[] = [];
  let listBuffer: string[] = [];
  let listKind: ListKind = null;

  const flushParagraph = (key: string) => {
    if (paragraphBuffer.length === 0) return;
    const text = paragraphBuffer.join(" ");
    blocks.push(
      <p key={key} className="text-slate-700 dark:text-slate-300 leading-relaxed mb-4">
        {renderInline(text, key)}
      </p>
    );
    paragraphBuffer = [];
  };

  const flushList = (key: string) => {
    if (listBuffer.length === 0) return;
    const items = listBuffer.map((item, idx) => (
      <li key={`${key}-${idx}`}>{renderInline(item, `${key}-${idx}`)}</li>
    ));
    if (listKind === "number") {
      blocks.push(
        <ol key={key} className="list-decimal pl-6 mb-4 space-y-1.5 text-slate-700 dark:text-slate-300">
          {items}
        </ol>
      );
    } else {
      blocks.push(
        <ul key={key} className="list-disc pl-6 mb-4 space-y-1.5 text-slate-700 dark:text-slate-300">
          {items}
        </ul>
      );
    }
    listBuffer = [];
    listKind = null;
  };

  lines.forEach((rawLine, idx) => {
    const line = rawLine.trim();
    const key = `b${idx}`;

    if (line === "") {
      flushParagraph(`p${key}`);
      flushList(`l${key}`);
      return;
    }

    const imageMatch = STANDALONE_IMAGE_PATTERN.exec(line);
    if (imageMatch) {
      flushParagraph(`p${key}`);
      flushList(`l${key}`);
      blocks.push(
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={key}
          src={imageMatch[2]}
          alt={imageMatch[1] || ""}
          className="max-w-full rounded-lg border border-slate-200 dark:border-white/10 mb-4"
        />
      );
      return;
    }
    if (line.startsWith("## ")) {
      flushParagraph(`p${key}`);
      flushList(`l${key}`);
      blocks.push(
        <h2 key={key} className="text-xl font-bold text-slate-900 dark:text-white mt-8 mb-3 first:mt-0">
          {renderInline(line.slice(3), key)}
        </h2>
      );
      return;
    }
    if (line.startsWith("# ")) {
      flushParagraph(`p${key}`);
      flushList(`l${key}`);
      blocks.push(
        <h1 key={key} className="text-2xl font-bold text-slate-900 dark:text-white mt-8 mb-3 first:mt-0">
          {renderInline(line.slice(2), key)}
        </h1>
      );
      return;
    }
    if (line.startsWith("- ") || line.startsWith("* ")) {
      flushParagraph(`p${key}`);
      if (listKind === "number") flushList(`l${key}`);
      listKind = "bullet";
      listBuffer.push(line.slice(2));
      return;
    }
    const numberedMatch = /^\d+\.\s+(.*)$/.exec(line);
    if (numberedMatch) {
      flushParagraph(`p${key}`);
      if (listKind === "bullet") flushList(`l${key}`);
      listKind = "number";
      listBuffer.push(numberedMatch[1] ?? "");
      return;
    }
    flushList(`l${key}`);
    paragraphBuffer.push(line);
  });
  flushParagraph("p-end");
  flushList("l-end");

  if (blocks.length === 0) {
    return <p className="text-slate-500 italic">This page has no content yet.</p>;
  }

  return <div>{blocks}</div>;
}
