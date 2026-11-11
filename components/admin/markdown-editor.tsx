"use client";

import type { ReactNode } from "react";
import { useRef } from "react";
import { Bold, Code2, Heading1, Heading2, Heading3, Italic, Link2, List, ListOrdered, Minus, Quote, Strikethrough } from "lucide-react";

type MarkdownEditorProps = {
  name: string;
  value: string;
  onChange: (value: string) => void;
};

function MarkdownToolButton({ label, children, onClick }: { label: string; children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      className="admin-markdown-tool"
      aria-label={label}
      title={label}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export default function MarkdownEditor({ name, value, onChange }: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function wrapSelection(before: string, after = before, placeholder = "teks") {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.slice(start, end) || placeholder;
    const replacement = `${before}${selected}${after}`;
    onChange(`${value.slice(0, start)}${replacement}${value.slice(end)}`);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selected.length);
    });
  }

  function prefixLines(prefix: string) {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const nextLineBreak = value.indexOf("\n", end);
    const lineEnd = nextLineBreak === -1 ? value.length : nextLineBreak;
    const selection = value.slice(lineStart, lineEnd);
    const replacement = selection.split("\n").map((line) => `${prefix}${line}`).join("\n");
    onChange(`${value.slice(0, lineStart)}${replacement}${value.slice(lineEnd)}`);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(lineStart, lineStart + replacement.length);
    });
  }

  function insertHorizontalRule() {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = value.slice(0, start);
    const separator = before && !before.endsWith("\n\n") ? "\n\n" : "";
    const insertion = `${separator}---\n\n`;
    onChange(`${before}${insertion}${value.slice(end)}`);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + insertion.length, start + insertion.length);
    });
  }

  return (
    <div className="admin-markdown-editor">
      <div className="admin-markdown-toolbar" role="toolbar" aria-label="Format isi materi">
        <MarkdownToolButton label="Heading 1" onClick={() => prefixLines("# ")}><Heading1 size={17} /></MarkdownToolButton>
        <MarkdownToolButton label="Heading 2" onClick={() => prefixLines("## ")}><Heading2 size={17} /></MarkdownToolButton>
        <MarkdownToolButton label="Heading 3" onClick={() => prefixLines("### ")}><Heading3 size={17} /></MarkdownToolButton>
        <span className="admin-markdown-divider" aria-hidden="true" />
        <MarkdownToolButton label="Tebal" onClick={() => wrapSelection("**", "**", "teks tebal")}><Bold size={16} /></MarkdownToolButton>
        <MarkdownToolButton label="Miring" onClick={() => wrapSelection("_", "_", "teks miring")}><Italic size={16} /></MarkdownToolButton>
        <MarkdownToolButton label="Coret" onClick={() => wrapSelection("~~", "~~", "teks")}><Strikethrough size={16} /></MarkdownToolButton>
        <span className="admin-markdown-divider" aria-hidden="true" />
        <MarkdownToolButton label="Kutipan" onClick={() => prefixLines("> ")}><Quote size={16} /></MarkdownToolButton>
        <MarkdownToolButton label="Daftar berpoin" onClick={() => prefixLines("- ")}><List size={17} /></MarkdownToolButton>
        <MarkdownToolButton label="Daftar bernomor" onClick={() => prefixLines("1. ")}><ListOrdered size={17} /></MarkdownToolButton>
        <span className="admin-markdown-divider" aria-hidden="true" />
        <MarkdownToolButton label="Kode sebaris" onClick={() => wrapSelection("`", "`", "kode")}><Code2 size={16} /></MarkdownToolButton>
        <MarkdownToolButton label="Blok kode" onClick={() => wrapSelection("```\n", "\n```", "tulis kode di sini")}><span className="admin-markdown-code-block">{"</>"}</span></MarkdownToolButton>
        <MarkdownToolButton label="Tautan" onClick={() => wrapSelection("[", "](https://)", "teks tautan")}><Link2 size={16} /></MarkdownToolButton>
        <MarkdownToolButton label="Garis pemisah" onClick={insertHorizontalRule}><Minus size={17} /></MarkdownToolButton>
      </div>
      <textarea
        ref={textareaRef}
        className="textarea admin-markdown-source"
        name={name}
        aria-label="Isi materi"
        placeholder={"Tulis isi materi di sini...\n\nPilih teks lalu gunakan toolbar untuk memformat."}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
      />
      <p className="admin-markdown-hint">Tulis materi langsung seperti di Notepad, lalu pilih teks atau baris dan gunakan toolbar. Maksimal 5 MB.</p>
    </div>
  );
}
