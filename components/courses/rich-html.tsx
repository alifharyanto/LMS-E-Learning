"use client";

import { createElement, Fragment, isValidElement, useEffect, useState, type ComponentProps, type CSSProperties, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";

const allowedTags = new Set([
  "A", "B", "BLOCKQUOTE", "BR", "CAPTION", "CODE", "DEL", "DIV", "EM", "H1", "H2", "H3", "H4",
  "H5", "H6", "HR", "I", "IMG", "LI", "OL", "P", "PRE", "S", "SPAN", "STRONG", "SUB", "SUP",
  "FONT", "TABLE", "TBODY", "TD", "TH", "THEAD", "TR", "U", "UL",
]);
const discardedTags = new Set(["IFRAME", "OBJECT", "SCRIPT", "STYLE", "SVG", "TEMPLATE"]);

function safeUrl(value: string | null) {
  if (!value) return undefined;
  try {
    const url = new URL(value, window.location.origin);
    return url.protocol === "https:" || url.protocol === "http:" || url.protocol === "mailto:" ? value : undefined;
  } catch {
    return undefined;
  }
}

function safeColor(value: string) {
  const color = value.trim().toLowerCase();
  if (/^#[\da-f]{3}(?:[\da-f]{3})?$/i.test(color)) return color;
  const rgb = color.match(/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/);
  if (rgb && rgb.slice(1).every((channel) => Number(channel) <= 255)) return `rgb(${rgb.slice(1).join(", ")})`;
  return undefined;
}

function safeStyle(element: Element) {
  if (!(element instanceof HTMLElement)) return "";
  const styles: string[] = [];
  const textAlign = element.style.textAlign;
  if (["left", "center", "right", "justify"].includes(textAlign)) styles.push(`text-align:${textAlign}`);
  const color = safeColor(element.style.color);
  const backgroundColor = safeColor(element.style.backgroundColor);
  if (color) styles.push(`color:${color}`);
  if (backgroundColor) styles.push(`background-color:${backgroundColor}`);
  return styles.join(";");
}

function getLanguageLabel(language: string | undefined, code: string) {
  const aliases: Record<string, string> = {
    bash: "Bash",
    c: "C",
    "c++": "C++",
    csharp: "C#",
    css: "CSS",
    cpp: "C++",
    go: "Go",
    html: "HTML",
    java: "Java",
    javascript: "JavaScript",
    json: "JSON",
    jsx: "JSX",
    markdown: "Markdown",
    md: "Markdown",
    php: "PHP",
    plaintext: "Teks",
    python: "Python",
    py: "Python",
    rust: "Rust",
    sh: "Bash",
    shell: "Bash",
    sql: "SQL",
    ts: "TypeScript",
    text: "Teks",
    typescript: "TypeScript",
    tsx: "TSX",
    xml: "XML",
    yaml: "YAML",
    yml: "YAML",
  };
  const normalized = language?.toLowerCase();
  if (normalized) return aliases[normalized] ?? `${normalized[0].toUpperCase()}${normalized.slice(1)}`;

  const source = code.trim();
  if (!source) return "Teks";
  if (/^(?:\{[\s\S]*\}|\[[\s\S]*\])$/.test(source)) {
    try {
      JSON.parse(source);
      return "JSON";
    } catch {
      // Continue with syntax-based detection when the snippet is not valid JSON.
    }
  }
  if (/<!doctype\s+html|<\/?[a-z][\s\S]*?>/i.test(source)) return "HTML";
  if (/<\?php\b|\becho\s+\$|\$_(?:GET|POST|SERVER)\b/i.test(source)) return "PHP";
  if (/^\s*(?:SELECT|INSERT\s+INTO|UPDATE\s+\w+\s+SET|CREATE\s+TABLE|DELETE\s+FROM)\b/i.test(source)) return "SQL";
  if (/^\s*[\w.#][\w\s.#:[\]>+~,-]*\s*\{[\s\S]*:[\s\S]*;[\s\S]*\}/.test(source)) return "CSS";
  if (/^\s*(?:from\s+\w+\s+import|import\s+\w+|def\s+\w+\s*\(|class\s+\w+.*:|if\s+__name__\s*==|print\s*\()/m.test(source)) return "Python";
  if (/^\s*(?:#include\s*[<"]|using\s+namespace\s+std|std::|cout\s*<<)/m.test(source)) return "C++";
  if (/^\s*(?:using\s+System|namespace\s+\w+|Console\.WriteLine|public\s+static\s+void\s+Main)/m.test(source)) return "C#";
  if (/^\s*(?:package\s+main|func\s+main\s*\(|fmt\.Print)/m.test(source)) return "Go";
  if (/^\s*(?:fn\s+main\s*\(|let\s+mut\s+|println!\s*\()/m.test(source)) return "Rust";
  if (/^\s*(?:public\s+class\s+\w+|class\s+\w+\s*\{[\s\S]*\bstatic\s+void\s+main|System\.out\.print)/m.test(source)) return "Java";
  if (/^\s*(?:#!.*\b(?:bash|sh)\b|(?:echo|export|cd|mkdir|grep|npm|npx)\s+[^;\n]*)/m.test(source)) return "Bash";
  if (/^\s*(?:interface\s+\w+|type\s+\w+\s*=|enum\s+\w+|(?:const|let|var)\s+\w+\s*:\s*[\w[\]|<>]+)/m.test(source)) return "TypeScript";
  if (/^\s*(?:const|let|var|function|export\s+default|import\s+.*from\s+["'])|=>|console\.(?:log|error|warn)\s*\(/m.test(source)) return "JavaScript";
  return "Teks";
}

function getReactText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(getReactText).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return getReactText(node.props.children);
  return "";
}

export function sanitizeRichHtml(html: string) {
  const parsed = new DOMParser().parseFromString(html, "text/html");

  function copyNode(node: Node, target: Node, insideCodeBlock = false) {
    if (node.nodeType === Node.TEXT_NODE) {
      target.appendChild(document.createTextNode(node.textContent ?? ""));
      return;
    }
    if (!(node instanceof Element)) return;
    if (discardedTags.has(node.tagName)) return;
    if (!allowedTags.has(node.tagName)) {
      for (const child of node.childNodes) copyNode(child, target);
      return;
    }

    const tag = node.tagName === "FONT" ? "span" : node.tagName.toLowerCase();
    const element = document.createElement(tag);
    const isCodeBlock = insideCodeBlock || node.tagName === "PRE" || node.tagName === "CODE";
    if (node.tagName === "A") {
      const href = safeUrl(node.getAttribute("href"));
      if (href) element.setAttribute("href", href);
      element.setAttribute("rel", "noopener noreferrer");
      element.setAttribute("target", "_blank");
    } else if (node.tagName === "IMG") {
      const src = safeUrl(node.getAttribute("src"));
      if (!src || !src.startsWith("https://")) return;
      element.setAttribute("src", src);
      element.setAttribute("alt", node.getAttribute("alt") ?? "");
    } else if (node.tagName === "CODE") {
      const className = node.className.match(/^language-[a-zA-Z0-9_+#-]+$/)?.[0];
      if (className) element.className = className;
    } else if (node.tagName === "TD" || node.tagName === "TH") {
      for (const attribute of ["colspan", "rowspan"] as const) {
        const value = Number(node.getAttribute(attribute));
        if (Number.isSafeInteger(value) && value > 0 && value <= 100) element.setAttribute(attribute, String(value));
      }
    } else if (node.tagName === "OL") {
      const start = Number(node.getAttribute("start"));
      if (Number.isSafeInteger(start) && start > 1) element.setAttribute("start", String(start));
    }
    const styles = isCodeBlock ? [] : safeStyle(node).split(";").filter(Boolean);
    const fontColor = node.tagName === "FONT" ? safeColor(node.getAttribute("color") ?? "") : undefined;
    if (fontColor && !isCodeBlock) styles.push(`color:${fontColor}`);
    const style = styles.join(";");
    if (style) element.setAttribute("style", style);
    for (const child of node.childNodes) copyNode(child, element, isCodeBlock);
    target.appendChild(element);
  }

  const safeBody = document.createElement("div");
  for (const child of parsed.body.childNodes) copyNode(child, safeBody);
  return safeBody.innerHTML;
}

function renderNode(node: Node, key: string): ReactNode {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent;
  if (!(node instanceof HTMLElement) || !allowedTags.has(node.tagName)) return null;

  const tag = node.tagName === "FONT" ? "span" : node.tagName.toLowerCase();
  if (tag === "pre") {
    const languageClass = node.querySelector("code")?.className.match(/^language-([a-zA-Z0-9_+#-]+)$/);
    const children = [...node.childNodes].map((child, index) => renderNode(child, `${key}-${index}`));
    return createElement(CourseCodeBlock, { key, code: node.textContent ?? "", language: languageClass?.[1] }, children);
  }

  const props: Record<string, string | number | CSSProperties> = { key };
  const style: CSSProperties = {};
  if (tag === "a") {
    const href = safeUrl(node.getAttribute("href"));
    if (href) props.href = href;
    props.target = "_blank";
    props.rel = "noopener noreferrer";
  } else if (tag === "img") {
    const src = safeUrl(node.getAttribute("src"));
    if (!src?.startsWith("https://")) return null;
    props.src = src;
    props.alt = node.getAttribute("alt") ?? "";
    props.loading = "lazy";
  } else if (tag === "code") {
    const className = node.className.match(/^language-[a-zA-Z0-9_+#-]+$/)?.[0];
    if (className) props.className = className;
  } else if (tag === "td" || tag === "th") {
    for (const attribute of ["colspan", "rowspan"] as const) {
      const value = Number(node.getAttribute(attribute));
      if (Number.isSafeInteger(value) && value > 0 && value <= 100) {
        props[attribute === "colspan" ? "colSpan" : "rowSpan"] = value;
      }
    }
  } else if (tag === "ol") {
    const start = Number(node.getAttribute("start"));
    if (Number.isSafeInteger(start) && start > 1) props.start = start;
  }
  const textAlign = node.style.textAlign;
  if (["left", "center", "right", "justify"].includes(textAlign)) style.textAlign = textAlign as CSSProperties["textAlign"];
  const color = safeColor(node.style.color);
  const backgroundColor = safeColor(node.style.backgroundColor);
  if (color) style.color = color;
  if (backgroundColor) style.backgroundColor = backgroundColor;
  const fontColor = node.tagName === "FONT" ? safeColor(node.getAttribute("color") ?? "") : undefined;
  if (fontColor) style.color = fontColor;
  if (Object.keys(style).length) props.style = style;

  const children = [...node.childNodes].map((child, index) => renderNode(child, `${key}-${index}`));
  if (tag === "br" || tag === "hr" || tag === "img") return createElement(tag, props);
  return createElement(tag, props, children);
}

export function MarkdownCodeBlock({ children }: ComponentProps<"pre">) {
  const codeElement = isValidElement<{ className?: string; children?: ReactNode }>(children) ? children : null;
  const codeChildren = codeElement?.props.children ?? children;
  const languageClass = codeElement?.props.className?.match(/(?:^|\s)language-([a-zA-Z0-9_+#-]+)(?:\s|$)/);
  return <CourseCodeBlock code={getReactText(codeChildren)} language={languageClass?.[1]}>{codeChildren}</CourseCodeBlock>;
}

function CourseCodeBlock({ code, language, children }: { code: string; language?: string; children?: ReactNode }) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const label = getLanguageLabel(language, code);

  async function copyCode() {
    let copyError: unknown;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
        setCopyState("copied");
        return;
      } else {
        copyError = new Error("Clipboard API is unavailable.");
      }
    } catch (error) {
      copyError = error;
    }

    const textarea = document.createElement("textarea");
    textarea.value = code;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    try {
      textarea.select();
      if (!document.execCommand("copy")) throw copyError ?? new Error("Clipboard access is unavailable.");
      setCopyState("copied");
    } catch (error) {
      console.error("Failed to copy course code block", error);
      setCopyState("error");
    } finally {
      textarea.remove();
    }
  }

  return (
    <div className="rich-code-block">
      <div className="rich-code-block-toolbar">
        <span className="rich-code-block-language">{label}</span>
        <button type="button" className="rich-code-block-copy" onClick={copyCode}>
          {copyState === "copied" ? <Check size={14} /> : <Copy size={14} />}
          <span>{copyState === "copied" ? "Tersalin" : copyState === "error" ? "Gagal menyalin" : "Salin kode"}</span>
        </button>
      </div>
      <pre>{children}</pre>
    </div>
  );
}

export function renderRichHtml(html: string): ReactNode[] {
  const parsed = new DOMParser().parseFromString(sanitizeRichHtml(html), "text/html");
  return [...parsed.body.childNodes].map((node, index) => renderNode(node, `rich-${index}`));
}

export function RichHtmlContent({ html }: { html: string }) {
  const [content, setContent] = useState<ReactNode[]>([]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) setContent(renderRichHtml(html));
    });
    return () => { active = false; };
  }, [html]);

  return <>{content.map((node, index) => <Fragment key={index}>{node}</Fragment>)}</>;
}
