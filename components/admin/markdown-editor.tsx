"use client";

import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { AlignCenter, AlignLeft, AlignRight, Bold, Code2, Heading1, Heading2, Heading3, ImagePlus, Indent, Italic, Link2, List, ListOrdered, Minus, Outdent, Quote, Redo2, RemoveFormatting, Strikethrough, Subscript, Superscript, Table2, Underline, Undo2 } from "lucide-react";
import { sanitizeRichHtml } from "@/components/courses/rich-html";

type MarkdownEditorProps = {
  name: string;
  value: string;
  onChange: (value: string) => void;
  contentFormat?: "html" | "markdown";
};

function MarkdownToolButton({ label, children, onClick, onMouseDown }: { label: string; children: ReactNode; onClick: () => void; onMouseDown?: () => void }) {
  return (
    <button
      type="button"
      className="admin-markdown-tool"
      aria-label={label}
      title={label}
      onMouseDown={(event) => { onMouseDown?.(); event.preventDefault(); }}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function markdownToHtml(markdown: string) {
  const escapeHtml = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const inline = (text: string) => escapeHtml(text)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/__([^_]+)__/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/_([^_]+)_/g, "<em>$1</em>")
    .replace(/~~([^~]+)~~/g, "<del>$1</del>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2">$1</a>');
  const lines = markdown.split(/\r?\n/);
  const blocks: string[] = [];
  let list: "ul" | "ol" | null = null;
  let paragraph: string[] = [];
  let quote: string[] = [];
  let code: string[] | null = null;

  const closeList = () => {
    if (list) blocks.push(`</${list}>`);
    list = null;
  };
  const flushParagraph = () => {
    if (paragraph.length) blocks.push(`<p>${inline(paragraph.join("<br>"))}</p>`);
    paragraph = [];
  };
  const flushQuote = () => {
    if (quote.length) blocks.push(`<blockquote><p>${inline(quote.join("<br>"))}</p></blockquote>`);
    quote = [];
  };

  for (const line of lines) {
    if (line.startsWith("```")) {
      flushParagraph();
      flushQuote();
      closeList();
      if (code) {
        blocks.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`);
        code = null;
      } else code = [];
      continue;
    }
    if (code) {
      code.push(line);
      continue;
    }
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    const item = line.match(/^\s*([-*+]|\d+\.)\s+(.+)$/);
    const quoteLine = line.match(/^\s*>\s?(.*)$/);
    if (heading) {
      flushParagraph(); flushQuote(); closeList();
      const level = heading[1].length;
      blocks.push(`<h${level}>${inline(heading[2])}</h${level}>`);
    } else if (item) {
      flushParagraph(); flushQuote();
      const nextList = /^\d/.test(item[1]) ? "ol" : "ul";
      if (list !== nextList) { closeList(); list = nextList; blocks.push(`<${list}>`); }
      blocks.push(`<li>${inline(item[2])}</li>`);
    } else if (quoteLine) {
      flushParagraph(); closeList();
      quote.push(quoteLine[1]);
    } else if (/^\s*(---+|\*\*\*+)\s*$/.test(line)) {
      flushParagraph(); flushQuote(); closeList(); blocks.push("<hr>");
    } else if (!line.trim()) {
      flushParagraph(); flushQuote(); closeList();
    } else {
      flushQuote(); closeList(); paragraph.push(line);
    }
  }
  if (code) blocks.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`);
  flushParagraph(); flushQuote(); closeList();
  return blocks.join("");
}

export default function MarkdownEditor({ name, value, onChange, contentFormat = "html" }: MarkdownEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastEmittedValue = useRef<string | null>(null);
  const savedSelection = useRef<Range | null>(null);

  function rememberSelection() {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (editor && selection?.rangeCount && editor.contains(selection.anchorNode)) {
      savedSelection.current = selection.getRangeAt(0).cloneRange();
    }
  }

  useEffect(() => {
    if (!editorRef.current || value === lastEmittedValue.current) {
      lastEmittedValue.current = null;
      return;
    }
    const initialHtml = contentFormat === "markdown" ? markdownToHtml(value) : value;
    const safeHtml = sanitizeRichHtml(initialHtml);
    editorRef.current.innerHTML = safeHtml;
    if (contentFormat === "markdown") {
      lastEmittedValue.current = safeHtml;
      onChange(safeHtml);
    }
  }, [contentFormat, onChange, value]);

  function runCommand(command: string, argument?: string) {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    const selection = window.getSelection();
    if (savedSelection.current && selection) {
      selection.removeAllRanges();
      selection.addRange(savedSelection.current);
      savedSelection.current = null;
    }
    document.execCommand(command, false, argument);
    editor.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function insertLink() {
    const url = window.prompt("Masukkan URL tautan:");
    if (!url) return;
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:" && parsed.protocol !== "mailto:") return;
      runCommand("createLink", parsed.toString());
    } catch {
      return;
    }
  }

  function handleInput() {
    if (!editorRef.current) return;
    const html = sanitizeRichHtml(editorRef.current.innerHTML);
    lastEmittedValue.current = html;
    onChange(html);
  }

  function insertTable() {
    runCommand("insertHTML", "<table><tbody><tr><td>Isi sel</td><td>Isi sel</td></tr><tr><td>Isi sel</td><td>Isi sel</td></tr></tbody></table><p><br></p>");
  }

  function insertImage() {
    const url = window.prompt("Masukkan URL gambar (HTTPS):");
    if (!url) return;
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "https:") return;
      runCommand("insertImage", parsed.toString());
    } catch {
      return;
    }
  }

  return (
    <div className="admin-markdown-editor">
      <div className="admin-markdown-toolbar" role="toolbar" aria-label="Format isi materi">
        <MarkdownToolButton label="Batalkan" onClick={() => runCommand("undo")} onMouseDown={rememberSelection}><Undo2 size={16} /></MarkdownToolButton>
        <MarkdownToolButton label="Ulangi" onClick={() => runCommand("redo")} onMouseDown={rememberSelection}><Redo2 size={16} /></MarkdownToolButton>
        <span className="admin-markdown-divider" aria-hidden="true" />
        <MarkdownToolButton label="Paragraf" onClick={() => runCommand("formatBlock", "<p>")} onMouseDown={rememberSelection}><span className="admin-markdown-paragraph">P</span></MarkdownToolButton>
        <MarkdownToolButton label="Heading 1" onClick={() => runCommand("formatBlock", "<h1>")} onMouseDown={rememberSelection}><Heading1 size={17} /></MarkdownToolButton>
        <MarkdownToolButton label="Heading 2" onClick={() => runCommand("formatBlock", "<h2>")} onMouseDown={rememberSelection}><Heading2 size={17} /></MarkdownToolButton>
        <MarkdownToolButton label="Heading 3" onClick={() => runCommand("formatBlock", "<h3>")} onMouseDown={rememberSelection}><Heading3 size={17} /></MarkdownToolButton>
        <span className="admin-markdown-divider" aria-hidden="true" />
        <MarkdownToolButton label="Tebal" onClick={() => runCommand("bold")} onMouseDown={rememberSelection}><Bold size={16} /></MarkdownToolButton>
        <MarkdownToolButton label="Miring" onClick={() => runCommand("italic")} onMouseDown={rememberSelection}><Italic size={16} /></MarkdownToolButton>
        <MarkdownToolButton label="Garis bawah" onClick={() => runCommand("underline")} onMouseDown={rememberSelection}><Underline size={16} /></MarkdownToolButton>
        <MarkdownToolButton label="Coret" onClick={() => runCommand("strikeThrough")} onMouseDown={rememberSelection}><Strikethrough size={16} /></MarkdownToolButton>
        <label className="admin-markdown-color" title="Warna teks"><input type="color" aria-label="Warna teks" onMouseDown={rememberSelection} onChange={(event) => runCommand("foreColor", event.target.value)} /></label>
        <label className="admin-markdown-color" title="Warna sorot"><input type="color" aria-label="Warna sorot" onMouseDown={rememberSelection} onChange={(event) => runCommand("hiliteColor", event.target.value)} /></label>
        <span className="admin-markdown-divider" aria-hidden="true" />
        <MarkdownToolButton label="Subskrip" onClick={() => runCommand("subscript")} onMouseDown={rememberSelection}><Subscript size={16} /></MarkdownToolButton>
        <MarkdownToolButton label="Superskrip" onClick={() => runCommand("superscript")} onMouseDown={rememberSelection}><Superscript size={16} /></MarkdownToolButton>
        <MarkdownToolButton label="Kutipan" onClick={() => runCommand("formatBlock", "<blockquote>")} onMouseDown={rememberSelection}><Quote size={16} /></MarkdownToolButton>
        <span className="admin-markdown-divider" aria-hidden="true" />
        <MarkdownToolButton label="Daftar berpoin" onClick={() => runCommand("insertUnorderedList")} onMouseDown={rememberSelection}><List size={17} /></MarkdownToolButton>
        <MarkdownToolButton label="Daftar bernomor" onClick={() => runCommand("insertOrderedList")} onMouseDown={rememberSelection}><ListOrdered size={17} /></MarkdownToolButton>
        <MarkdownToolButton label="Tambah indentasi" onClick={() => runCommand("indent")} onMouseDown={rememberSelection}><Indent size={16} /></MarkdownToolButton>
        <MarkdownToolButton label="Kurangi indentasi" onClick={() => runCommand("outdent")} onMouseDown={rememberSelection}><Outdent size={16} /></MarkdownToolButton>
        <span className="admin-markdown-divider" aria-hidden="true" />
        <MarkdownToolButton label="Rata kiri" onClick={() => runCommand("justifyLeft")} onMouseDown={rememberSelection}><AlignLeft size={16} /></MarkdownToolButton>
        <MarkdownToolButton label="Rata tengah" onClick={() => runCommand("justifyCenter")} onMouseDown={rememberSelection}><AlignCenter size={16} /></MarkdownToolButton>
        <MarkdownToolButton label="Rata kanan" onClick={() => runCommand("justifyRight")} onMouseDown={rememberSelection}><AlignRight size={16} /></MarkdownToolButton>
        <MarkdownToolButton label="Kode" onClick={() => runCommand("formatBlock", "<pre>")} onMouseDown={rememberSelection}><Code2 size={16} /></MarkdownToolButton>
        <MarkdownToolButton label="Tautan" onClick={insertLink} onMouseDown={rememberSelection}><Link2 size={16} /></MarkdownToolButton>
        <MarkdownToolButton label="Hapus tautan" onClick={() => runCommand("unlink")} onMouseDown={rememberSelection}><span className="admin-markdown-unlink">↗</span></MarkdownToolButton>
        <MarkdownToolButton label="Gambar" onClick={insertImage} onMouseDown={rememberSelection}><ImagePlus size={16} /></MarkdownToolButton>
        <MarkdownToolButton label="Tabel 2 × 2" onClick={insertTable} onMouseDown={rememberSelection}><Table2 size={16} /></MarkdownToolButton>
        <MarkdownToolButton label="Garis pemisah" onClick={() => runCommand("insertHorizontalRule")} onMouseDown={rememberSelection}><Minus size={17} /></MarkdownToolButton>
        <MarkdownToolButton label="Hapus format" onClick={() => runCommand("removeFormat")} onMouseDown={rememberSelection}><RemoveFormatting size={16} /></MarkdownToolButton>
      </div>
      <input type="hidden" name={name} value={value} />
      <div ref={editorRef} className="markdown-document admin-rich-editor" contentEditable suppressContentEditableWarning role="textbox" aria-label="Isi materi" aria-multiline="true" data-placeholder="Tulis isi materi di sini..." onInput={handleInput} onKeyUp={rememberSelection} onMouseUp={rememberSelection} />
      <p className="admin-markdown-hint">Format langsung terlihat saat mengetik. Pilih teks lalu gunakan toolbar. Maksimal 5 MB.</p>
    </div>
  );
}
