"use client";

import Editor, { type OnMount } from "@monaco-editor/react";
import type { editor as MonacoEditor } from "monaco-editor";
import { useRouter } from "next/navigation";
import {
  ArrowLeftRight,
  BookOpen,
  Bug,
  CheckCircle2,
  ChevronDown,
  Code2,
  EllipsisVertical,
  Files,
  History,
  Moon,
  Plus,
  Play,
  Rocket,
  Save,
  Search,
  Settings,
  Share2,
  Sparkles,
  SquareTerminal,
  Sun,
  Wifi,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

type ConsoleTab = "Console" | "I/O" | "AI Agent" | "Preview";
type ToolPanel = "files" | "history" | "settings";
type WorkspaceFile = { name: string; content: string };
type FileKind = "java" | "html" | "css" | "javascript" | "typescript" | "json" | "markdown" | "python" | "text";
type FileType = { kind: FileKind; label: string; extension: string; baseName: string; language: string };

const starterCode = `import java.util.*;

public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}`;

const fileTypes: FileType[] = [
  { kind: "java", label: "Java", extension: "java", baseName: "Main", language: "java" },
  { kind: "html", label: "HTML", extension: "html", baseName: "index", language: "html" },
  { kind: "css", label: "CSS", extension: "css", baseName: "style", language: "css" },
  { kind: "javascript", label: "JavaScript", extension: "js", baseName: "script", language: "javascript" },
  { kind: "typescript", label: "TypeScript", extension: "ts", baseName: "script", language: "typescript" },
  { kind: "json", label: "JSON", extension: "json", baseName: "data", language: "json" },
  { kind: "markdown", label: "Markdown", extension: "md", baseName: "README", language: "markdown" },
  { kind: "python", label: "Python", extension: "py", baseName: "main", language: "python" },
  { kind: "text", label: "Text file", extension: "txt", baseName: "notes", language: "plaintext" },
];

const starterFiles: WorkspaceFile[] = [
  { name: "Main.java", content: starterCode },
  { name: "index.html", content: "<!doctype html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"utf-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n  <title>Code Editor Preview</title>\n</head>\n<body>\n  <main>\n    <h1>Hello from Code Editor</h1>\n    <button id=\"hello\">Click me</button>\n  </main>\n</body>\n</html>" },
  { name: "style.css", content: "body { margin: 0; padding: 48px; color: #1f2937; font: 16px system-ui, sans-serif; }\nbutton { padding: 10px 16px; border: 0; border-radius: 6px; color: white; background: #4f46e5; cursor: pointer; }" },
  { name: "script.js", content: "const button = document.getElementById('hello');\nif (button) {\n  button.addEventListener('click', function () {\n    console.log('Button clicked!');\n    document.querySelector('h1').textContent = 'JavaScript is running';\n  });\n}" },
];

function fileTypeForName(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase();
  return fileTypes.find((fileType) => fileType.extension === extension) ?? fileTypes[fileTypes.length - 1];
}

function starterContent(kind: FileKind) {
  if (kind === "java") return starterCode;
  if (kind === "html") return starterFiles[1].content;
  if (kind === "css") return starterFiles[2].content;
  if (kind === "javascript") return starterFiles[3].content;
  if (kind === "typescript") return "const greeting: string = 'Hello from TypeScript';\nconsole.log(greeting);";
  if (kind === "json") return "{\n  \"name\": \"code-editor-project\"\n}";
  if (kind === "markdown") return "# Code Editor Project\n\nStart writing here.";
  if (kind === "python") return "print('Hello, world!')";
  return "";
}

function createPreviewDocument(files: WorkspaceFile[]) {
  const htmlFile = files.find((file) => ["html"].includes(fileTypeForName(file.name).extension));
  const styles = files.filter((file) => fileTypeForName(file.name).kind === "css").map((file) => file.content).join("\n");
  const scripts = files.filter((file) => fileTypeForName(file.name).kind === "javascript").map((file) => file.content).join("\n");
  let document = htmlFile?.content ?? "<!doctype html><html><head></head><body><main><h1>Web preview</h1></main></body></html>";
  if (!/<html(?:\s|>)/i.test(document)) document = `<!doctype html><html><head></head><body>${document}</body></html>`;
  const bridge = `(() => { const send = (level, args) => parent.postMessage({ type: 'code-editor-output', level, text: args.map((value) => { try { return typeof value === 'string' ? value : JSON.stringify(value); } catch { return String(value); } }).join(' ') }, '*'); ['log', 'info', 'warn', 'error'].forEach((level) => { const original = console[level]; console[level] = (...args) => { send(level, args); original.apply(console, args); }; }); window.onerror = (message) => send('error', [message]); })();`;
  const styleTag = styles ? `<style>${styles.replace(/<\/style/gi, "<\\/style")}</style>` : "";
  const bridgeTag = `<script>${bridge}<\/script>`;
  const userScriptTag = scripts ? `<script>${scripts.replace(/<\/script/gi, "<\\/script")}<\/script>` : "";
  const injectedHead = `${styleTag}`;
  if (/<\/head>/i.test(document)) document = document.replace(/<\/head>/i, `${injectedHead}</head>`);
  else document = document.replace(/<html([^>]*)>/i, `<html$1><head>${injectedHead}</head>`);
  if (/<\/body>/i.test(document)) document = document.replace(/<\/body>/i, `${bridgeTag}${userScriptTag}</body>`);
  else document += `${bridgeTag}${userScriptTag}`;
  return document;
}

function mockJavaOutput(source: string) {
  const lines: string[] = [];
  const outputPattern = /System\.out\.print(?:ln)?\s*\(([^)]*?)\)\s*;/g;
  let match: RegExpExecArray | null;
  while ((match = outputPattern.exec(source)) !== null) {
    const expression = match[1].trim();
    const stringLiteral = expression.match(/^"((?:\\.|[^"\\])*)"$/);
    if (stringLiteral) lines.push(stringLiteral[1].replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\"));
    else if (/^-?\d+(?:\.\d+)?$/.test(expression)) lines.push(expression);
    else lines.push(expression);
  }
  return lines.length ? lines.join("\n") : "Program finished with exit code 0";
}

export default function OneCompilerEditor() {
  const router = useRouter();
  const [source, setSource] = useState(starterCode);
  const [files, setFiles] = useState<WorkspaceFile[]>(starterFiles);
  const [activeName, setActiveName] = useState("Main.java");
  const [fileOpen, setFileOpen] = useState(true);
  const [dark, setDark] = useState(false);
  const [tab, setTab] = useState<ConsoleTab>("Console");
  const [output, setOutput] = useState("");
  const [previewDocument, setPreviewDocument] = useState("");
  const [hasRun, setHasRun] = useState(false);
  const [saved, setSaved] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [toolPanel, setToolPanel] = useState<ToolPanel | null>(null);
  const [openMenu, setOpenMenu] = useState<"language" | "more" | "new-file" | null>(null);
  const [fontSize, setFontSize] = useState(18);
  const [wordWrap, setWordWrap] = useState(false);
  const [toast, setToast] = useState("");
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const previewRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }, [dark]);

  useEffect(() => {
    function receivePreviewMessage(event: MessageEvent) {
      if (event.source !== previewRef.current?.contentWindow || event.data?.type !== "code-editor-output") return;
      setOutput((current) => current ? `${current}\n${event.data.text}` : event.data.text);
    }
    window.addEventListener("message", receivePreviewMessage);
    return () => window.removeEventListener("message", receivePreviewMessage);
  }, []);

  function announce(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 1800);
  }

  function updateSource(value: string | undefined) {
    const nextSource = value ?? "";
    setSource(nextSource);
    setFiles((current) => current.map((file) => file.name === activeName ? { ...file, content: nextSource } : file));
  }

  function openFile(name: string) {
    const file = files.find((item) => item.name === name);
    if (!file) return;
    setActiveName(name);
    setSource(file.content);
    setFileOpen(true);
    setToolPanel(null);
  }

  function addFile(kind: FileKind = "java") {
    const fileType = fileTypes.find((item) => item.kind === kind) ?? fileTypes[0];
    let name = `${fileType.baseName}.${fileType.extension}`;
    let number = 2;
    while (files.some((file) => file.name === name)) {
      name = `${fileType.baseName}${number}.${fileType.extension}`;
      number += 1;
    }
    const content = starterContent(kind);
    setFiles((current) => [...current, { name, content }]);
    setActiveName(name);
    setSource(content);
    setFileOpen(true);
    setToolPanel(null);
    setOpenMenu(null);
  }

  function selectFileType(kind: FileKind) {
    const existing = files.find((file) => fileTypeForName(file.name).kind === kind);
    if (existing) openFile(existing.name);
    else addFile(kind);
    setOpenMenu(null);
  }

  function closeFile(name: string) {
    const remaining = files.filter((file) => file.name !== name);
    setFiles(remaining);
    if (name !== activeName) return;
    const nextFile = remaining[0];
    if (nextFile) {
      setActiveName(nextFile.name);
      setSource(nextFile.content);
    } else {
      setFileOpen(false);
      setSource("");
    }
  }

  function resetCode() {
    updateSource(activeName === "Main.java" ? starterCode : "");
    setHasRun(false);
    setOpenMenu(null);
    announce("Editor reset");
  }

  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monaco.editor.defineTheme("onecompiler-light", {
      base: "vs",
      inherit: true,
      rules: [
        { token: "keyword", foreground: "0000FF" },
        { token: "type.identifier", foreground: "267F99" },
        { token: "identifier", foreground: "795E26" },
        { token: "string", foreground: "A31515" },
        { token: "number", foreground: "098658" },
      ],
      colors: { "editor.background": "#FFFFFF", "editor.foreground": "#1F1F1F", "editorLineNumber.foreground": "#1683B8", "editorLineNumber.activeForeground": "#145DA0", "editor.lineHighlightBackground": "#F3F3F3", "editor.selectionBackground": "#C8C8C8", "editorIndentGuide.background1": "#E5E5E5", "editorIndentGuide.activeBackground1": "#B8B8B8" },
    });
    monaco.editor.defineTheme("onecompiler-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "keyword", foreground: "569CD6" },
        { token: "type.identifier", foreground: "4EC9B0" },
        { token: "identifier", foreground: "DCDCAA" },
        { token: "string", foreground: "CE9178" },
      ],
      colors: { "editor.background": "#1E1E1E", "editor.lineHighlightBackground": "#2A2D2E", "editorLineNumber.foreground": "#858585", "editorIndentGuide.background1": "#3A3A3A" },
    });
    monaco.editor.setTheme(dark ? "onecompiler-dark" : "onecompiler-light");
    if (editor.getValue().startsWith("import java.util.*;")) editor.setSelection(new monaco.Range(1, 1, 1, 7));
  };

  function runCode() {
    if (!fileOpen) return;
    const activeKind = fileTypeForName(activeName).kind;
    if (["html", "css", "javascript"].includes(activeKind)) {
      const currentFiles = files.map((file) => file.name === activeName ? { ...file, content: source } : file);
      setFiles(currentFiles);
      setPreviewDocument(createPreviewDocument(currentFiles));
      setOutput("");
      setTab("Preview");
    } else if (activeKind === "java") {
      setOutput(mockJavaOutput(source));
      setTab("Console");
    } else {
      setOutput(`${fileTypeForName(activeName).label} file is ready. Run Java or HTML/CSS/JavaScript to execute a preview.`);
      setTab("Console");
    }
    setHasRun(true);
    setOpenMenu(null);
  }

  function saveCode() {
    localStorage.setItem(`code-editor-${activeName}`, source);
    setHistory((items) => [source, ...items.filter((item) => item !== source)].slice(0, 5));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
    announce(`${activeName} saved`);
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(source);
      announce("Code copied");
    } catch {
      announce("Clipboard access unavailable");
    }
    setOpenMenu(null);
  }

  async function shareCode() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      announce("Link copied");
    } catch {
      announce("Clipboard access unavailable");
    }
  }

  function toggleToolPanel(panel: ToolPanel) {
    setOpenMenu(null);
    if (panel === "history") {
      const key = `code-editor-${activeName}`;
      const persisted = localStorage.getItem(key);
      if (persisted !== null) setHistory((items) => [persisted, ...items.filter((item) => item !== persisted)].slice(0, 5));
    }
    setToolPanel((current) => current === panel ? null : panel);
  }

  return (
    <main className={`onecompiler-app${dark ? " is-dark" : ""}`}>
      <header className="oc-navbar">
        <div className="oc-brand-group">
          <a className="oc-brand" href="/code" aria-label="Code Editor home">
            <span className="oc-brand-mark"><Code2 size={23} strokeWidth={2.2} /></span>
            <span>Code Editor</span>
          </a>
          <button className="oc-upgrade" type="button" onClick={() => router.push("/register")}><Rocket size={17} />Upgrade</button>
        </div>

        <div className="oc-run-group">
          <button className="oc-action oc-ai-button" type="button" onClick={() => { setTab("AI Agent"); setOpenMenu(null); }}><Sparkles size={19} />AI</button>
          <button className="oc-action oc-language-button" type="button" aria-expanded={openMenu === "language"} onClick={() => setOpenMenu((current) => current === "language" ? null : "language")}><span>{fileTypeForName(activeName).label}</span><ChevronDown size={18} /></button>
          <button className="oc-action oc-run-button" type="button" onClick={runCode}><Play size={17} fill="currentColor" />Run</button>
          <button className="oc-icon-button oc-more-button" type="button" aria-label="More options" aria-expanded={openMenu === "more"} onClick={() => setOpenMenu((current) => current === "more" ? null : "more")}><EllipsisVertical size={21} /></button>
          {openMenu === "language" && <div className="oc-top-popover oc-language-menu" role="menu">{fileTypes.map((fileType) => <button className={fileType.kind === fileTypeForName(activeName).kind ? "is-selected" : ""} key={fileType.kind} type="button" role="menuitem" onClick={() => selectFileType(fileType.kind)}><span>{fileType.label}</span>{fileType.kind === fileTypeForName(activeName).kind && <span>Selected</span>}</button>)}</div>}
          {openMenu === "more" && <div className="oc-top-popover oc-more-menu" role="menu"><button type="button" role="menuitem" onClick={() => void copyCode()}><Code2 size={16} />Copy code</button><button type="button" role="menuitem" onClick={resetCode}><X size={16} />Reset editor</button></div>}
        </div>

        <div className="oc-account-group">
          <button className="oc-icon-button oc-utility-button" type="button" aria-label="Report a bug" title="Contact support" onClick={() => router.push("/contact")}><Bug size={19} /></button>
          <button className="oc-icon-button oc-utility-button" type="button" aria-label={dark ? "Switch to light theme" : "Switch to dark theme"} onClick={() => setDark((value) => !value)}>{dark ? <Moon size={19} /> : <Sun size={19} />}</button>
          <button className="oc-outline-button oc-save-button" type="button" onClick={saveCode}><Save size={19} />{saved ? "Saved" : "Save"}</button>
          <button className="oc-icon-button oc-utility-button" type="button" aria-label="Copy share link" onClick={() => void shareCode()}><Share2 size={19} /></button>
          <button className="oc-outline-button oc-login-button" type="button" onClick={() => router.push("/login")}>Login</button>
        </div>
      </header>

      <aside className="oc-sidebar" aria-label="Editor tools">
        <div className="oc-sidebar-top">
          <button className={toolPanel === "files" ? "is-active" : ""} type="button" aria-label="Files" aria-expanded={toolPanel === "files"} onClick={() => toggleToolPanel("files")}><Files /></button>
          <button type="button" aria-label="Search" title="Find in code" onClick={() => { setToolPanel(null); editorRef.current?.getAction("actions.find")?.run(); }}><Search /></button>
        </div>
        <div className="oc-sidebar-bottom">
          <button className={toolPanel === "history" ? "is-active" : ""} type="button" aria-label="History" aria-expanded={toolPanel === "history"} onClick={() => toggleToolPanel("history")}><History /></button>
          <button className={toolPanel === "settings" ? "is-active" : ""} type="button" aria-label="Settings" aria-expanded={toolPanel === "settings"} onClick={() => toggleToolPanel("settings")}><Settings /></button>
        </div>
      </aside>

      {toolPanel && <section className="oc-tool-panel" aria-label={`${toolPanel} panel`}>
        <div className="oc-tool-panel-heading"><strong>{toolPanel === "files" ? "Files" : toolPanel === "history" ? "History" : "Settings"}</strong><button type="button" aria-label="Close panel" onClick={() => setToolPanel(null)}><X size={17} /></button></div>
        {toolPanel === "files" && <div className="oc-tool-panel-body"><div className="oc-file-list">{files.map((file) => <button className={file.name === activeName ? "is-selected" : ""} key={file.name} type="button" onClick={() => openFile(file.name)}><span className="oc-java-mark">{fileTypeForName(file.name).label.slice(0, 1)}</span>{file.name}<span>{file.name === activeName ? "Open" : ""}</span></button>)}</div><button className="oc-panel-command" type="button" onClick={() => { setToolPanel(null); setOpenMenu("new-file"); }}><Plus size={16} />New file</button></div>}
        {toolPanel === "history" && <div className="oc-tool-panel-body"><p className="oc-panel-caption">Saved versions of {activeName}</p>{history.length ? history.map((version, index) => <button className="oc-history-item" key={`${index}-${version.slice(0, 12)}`} type="button" onClick={() => { updateSource(version); setToolPanel(null); announce("Version restored"); }}><span>Version {history.length - index}</span><code>{version.split("\n")[0] || "Empty file"}</code></button>) : <p className="oc-panel-empty">No saved versions yet</p>}</div>}
        {toolPanel === "settings" && <div className="oc-tool-panel-body"><div className="oc-setting-row"><span>Font size</span><div><button type="button" aria-label="Decrease font size" onClick={() => setFontSize((size) => Math.max(12, size - 1))}>-</button><span>{fontSize}px</span><button type="button" aria-label="Increase font size" onClick={() => setFontSize((size) => Math.min(28, size + 1))}>+</button></div></div><button className="oc-setting-toggle" type="button" aria-pressed={wordWrap} onClick={() => setWordWrap((value) => !value)}><span>Word wrap</span><span>{wordWrap ? "On" : "Off"}</span></button><button className="oc-setting-toggle" type="button" onClick={() => setDark((value) => !value)}><span>Dark theme</span><span>{dark ? "On" : "Off"}</span></button></div>}
      </section>}

      <section className="oc-editor-pane" aria-label="Code editor">
        <div className="oc-editor-tabs" role="tablist" aria-label="Open files">
          {files.map((file) => <div className={`oc-file-tab${file.name === activeName ? " is-active" : ""}`} key={file.name} role="tab" aria-selected={file.name === activeName} tabIndex={0} onClick={() => openFile(file.name)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") openFile(file.name); }}><span className="oc-java-mark">J</span><span>{file.name}</span><button type="button" aria-label={`Close ${file.name}`} onClick={(event) => { event.stopPropagation(); closeFile(file.name); }}><X size={17} /></button></div>)}
          <button className="oc-add-file" type="button" aria-label="Add file" aria-expanded={openMenu === "new-file"} onClick={() => setOpenMenu((current) => current === "new-file" ? null : "new-file")}><Plus size={21} /></button>
        </div>
        {openMenu === "new-file" && <div className="oc-file-type-menu" role="menu" aria-label="Choose file type">{fileTypes.map((fileType) => <button key={fileType.kind} type="button" role="menuitem" onClick={() => addFile(fileType.kind)}><span className={`oc-file-type-mark oc-file-type-${fileType.kind}`}>{fileType.label.slice(0, 1)}</span>{fileType.label}<span>.{fileType.extension}</span></button>)}</div>}
        <div className="oc-monaco-wrap">
          {fileOpen ? <Editor
            key={activeName}
            height="100%"
            language={fileTypeForName(activeName).language}
            theme={dark ? "onecompiler-dark" : "onecompiler-light"}
            value={source}
            onChange={updateSource}
            onMount={handleEditorMount}
            options={{
              automaticLayout: true,
              fontFamily: "Consolas, 'Fira Code', monospace",
              fontSize,
              lineHeight: 26,
              fontLigatures: false,
              lineNumbers: "on",
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              renderLineHighlight: "all",
              guides: { indentation: true, bracketPairs: true },
              bracketPairColorization: { enabled: true },
              folding: false,
              glyphMargin: false,
              overviewRulerLanes: 0,
              scrollbar: { verticalScrollbarSize: 9, horizontalScrollbarSize: 9, useShadows: false },
              padding: { top: 14, bottom: 12 },
              tabSize: 4,
              wordWrap: wordWrap ? "on" : "off",
            }}
          /> : <div className="oc-editor-closed"><Code2 size={28} /><strong>No file open</strong><button type="button" onClick={() => addFile()}>Create Java file</button></div>}
        </div>
      </section>

      <section className="oc-console-pane" aria-label="Program output">
        <div className="oc-console-tabs" role="tablist" aria-label="Output panels">
          <button className={tab === "Console" ? "is-active" : ""} type="button" role="tab" aria-selected={tab === "Console"} onClick={() => setTab("Console")}><SquareTerminal size={16} />Console</button>
          <button className={tab === "I/O" ? "is-active" : ""} type="button" role="tab" aria-selected={tab === "I/O"} onClick={() => setTab("I/O")}><SquareTerminal size={16} />I/O</button>
          <button className={tab === "AI Agent" ? "is-active" : ""} type="button" role="tab" aria-selected={tab === "AI Agent"} onClick={() => setTab("AI Agent")}><Sparkles size={16} />AI Agent</button>
          <button className={tab === "Preview" ? "is-active" : ""} type="button" role="tab" aria-selected={tab === "Preview"} onClick={() => setTab("Preview")}><Code2 size={16} />Preview</button>
        </div>
        <div className="oc-console-content" role="tabpanel">
          {tab === "Preview" && previewDocument ? <iframe ref={previewRef} className="oc-preview-frame" title="HTML CSS JavaScript preview" sandbox="allow-scripts" srcDoc={previewDocument} /> : tab === "Console" && hasRun ? <pre className="oc-output">{output || "No console output"}</pre> : (
            <div className="oc-empty-state">
              {tab === "Console" ? <><SquareTerminal className="oc-empty-icon" size={42} strokeWidth={1.7} /><strong>Live Console</strong><span>Click Run to start</span></> : tab === "I/O" ? <><SquareTerminal className="oc-empty-icon" size={42} strokeWidth={1.7} /><strong>Program I/O</strong></> : tab === "AI Agent" ? <><Sparkles className="oc-empty-icon" size={42} strokeWidth={1.7} /><strong>AI Agent</strong></> : <><Code2 className="oc-empty-icon" size={42} strokeWidth={1.7} /><strong>Web Preview</strong><span>Run an HTML, CSS, or JavaScript file</span></>}
            </div>
          )}
        </div>
      </section>

      <footer className="oc-statusbar">
        <div className="oc-status-left"><span><CheckCircle2 size={15} />Ready</span><button className="oc-status-action oc-terminal-status" type="button" onClick={() => setTab("Console")}><SquareTerminal size={15} />Terminal</button></div>
        <div className="oc-status-right"><button className="oc-status-action" type="button" onClick={() => setDark((value) => !value)}>{dark ? "Dark" : "Light"} <ArrowLeftRight size={15} /></button><a className="oc-status-action" href="https://docs.oracle.com/en/java/" target="_blank" rel="noreferrer">Wiki <BookOpen size={16} /></a><button className="oc-status-action" type="button" onClick={() => announce("Internet connection active")}>Internet <Wifi size={16} /></button></div>
      </footer>
      {toast && <div className="oc-toast" role="status">{toast}</div>}
    </main>
  );
}