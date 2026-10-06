"use client";

import CodeMirror from "@uiw/react-codemirror";
import { useRouter } from "next/navigation";
import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { javascript } from "@codemirror/lang-javascript";
import { php } from "@codemirror/lang-php";
import { oneDark } from "@codemirror/theme-one-dark";
import { EditorView } from "@codemirror/view";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, Bot, Braces, Check, ChevronDown, ChevronRight, CircleAlert, Code2, FileCode2, FileJson2, FilePlus2, FileText, Folder, FolderOpen, FolderPlus, Monitor, PanelRight, Play, Save, Search, Send, Smartphone, Sparkles, Terminal, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent, type PointerEvent, type ReactNode } from "react";
import { apiRequest } from "@/lib/browser-api";

type WorkspaceFile = { name: string; content: string };
type OutputLine = { id: number; level: "info" | "error" | "log"; text: string };
type SyncState = "loading" | "saving" | "saved" | "local" | "error";
type PreviewSize = "desktop" | "mobile" | "iphone" | "pixel";
type PreviewKind = "web" | "php" | "native";
type ExplorerNode = { kind: "folder"; name: string; path: string; children: ExplorerNode[] } | { kind: "file"; name: string; path: string; file: WorkspaceFile };
type AiModelOption = { id: string; label: string; provider: "groq" | "custom"; model: string };
type AiChange = { name: string; content: string };
type AiMessage = { id: number; role: "user" | "assistant"; markdown: string; changes?: AiChange[]; applied?: boolean };

const starterFiles: WorkspaceFile[] = [
  { name: "index.html", content: "<!doctype html>\n<html lang=\"id\">\n<head>\n  <meta charset=\"utf-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n  <title>Latihan web</title>\n</head>\n<body>\n  <main class=\"card\">\n    <p class=\"eyebrow\">LATIHAN PERTAMA</p>\n    <h1>Halo, CourseUp!</h1>\n    <p>Ubah file HTML, CSS, dan JavaScript di sebelah kiri.</p>\n    <button id=\"hello\">Klik aku</button>\n  </main>\n</body>\n</html>" },
  { name: "style.css", content: "* { box-sizing: border-box; }\nbody {\n  min-height: 100vh;\n  margin: 0;\n  display: grid;\n  place-items: center;\n  color: #17343a;\n  background: #edf4ef;\n  font: 16px system-ui, sans-serif;\n}\n.card {\n  width: min(420px, calc(100% - 32px));\n  padding: 36px;\n  border: 1px solid #d6e3da;\n  border-radius: 18px;\n  background: white;\n  box-shadow: 0 18px 50px #17343a12;\n}\n.eyebrow { color: #147a68; font-size: 11px; font-weight: 800; letter-spacing: .12em; }\nh1 { margin: 10px 0; font-size: 34px; }\nbutton { padding: 11px 18px; border: 0; border-radius: 8px; color: white; background: #147a68; font: inherit; cursor: pointer; }" },
  { name: "script.js", content: "const button = document.querySelector('#hello');\n\nbutton.addEventListener('click', () => {\n  console.log('Tombol berhasil diklik!');\n  button.textContent = 'Berhasil!';\n});" },
];

const allowedExtensions = new Set(["html", "htm", "css", "js", "mjs", "cjs", "jsx", "ts", "tsx", "php", "json"]);
const codeTheme = EditorView.theme({
  "&": { height: "100%", fontSize: "13px", color: "var(--code-editor-foreground)", backgroundColor: "var(--code-editor-background)" },
  ".cm-scroller": { fontFamily: "'Cascadia Code', 'SFMono-Regular', Consolas, monospace", lineHeight: "1.7", overflow: "auto" },
  ".cm-gutters": { border: "none", color: "var(--code-editor-foreground)", backgroundColor: "var(--code-editor-background)" },
  ".cm-activeLine": { backgroundColor: "var(--code-editor-active-line)" },
  ".cm-activeLineGutter": { backgroundColor: "var(--code-editor-active-line)" },
}, { dark: true });
const lightCodeTheme = EditorView.theme({
  "&": { height: "100%", fontSize: "13px", color: "var(--code-editor-foreground)", backgroundColor: "var(--code-editor-background)" },
  ".cm-scroller": { fontFamily: "'Cascadia Code', 'SFMono-Regular', Consolas, monospace", lineHeight: "1.7", overflow: "auto" },
  ".cm-gutters": { border: "none", color: "var(--code-editor-foreground)", backgroundColor: "var(--code-editor-background)" },
  ".cm-activeLine": { backgroundColor: "var(--code-editor-active-line)" },
  ".cm-activeLineGutter": { backgroundColor: "var(--code-editor-active-line)" },
}, { dark: false });

function extensionOf(name: string) {
  return name.split(".").at(-1)?.toLowerCase() ?? "";
}

function buildExplorerTree(files: WorkspaceFile[], folders: string[]): ExplorerNode[] {
  const root: ExplorerNode[] = [];
  const ensureFolder = (siblings: ExplorerNode[], name: string, path: string) => {
    const existingFolder = siblings.find((node) => node.kind === "folder" && node.path === path);
    if (existingFolder?.kind === "folder") return existingFolder.children;
    const folder: Extract<ExplorerNode, { kind: "folder" }> = { kind: "folder", name, path, children: [] };
    siblings.push(folder);
    return folder.children;
  };

  for (const path of folders) {
    let siblings = root;
    let currentPath = "";
    for (const segment of path.split("/")) {
      currentPath = currentPath ? `${currentPath}/${segment}` : segment;
      siblings = ensureFolder(siblings, segment, currentPath);
    }
  }

  for (const file of files) {
    const segments = file.name.split("/");
    const fileName = segments.pop() ?? file.name;
    let siblings = root;
    let folderPath = "";
    for (const segment of segments) {
      folderPath = folderPath ? `${folderPath}/${segment}` : segment;
      siblings = ensureFolder(siblings, segment, folderPath);
    }
    siblings.push({ kind: "file", name: fileName, path: file.name, file });
  }

  const sortNodes = (nodes: ExplorerNode[]) => {
    nodes.sort((left, right) => left.kind === right.kind ? left.name.localeCompare(right.name) : left.kind === "folder" ? -1 : 1);
    nodes.forEach((node) => { if (node.kind === "folder") sortNodes(node.children); });
  };
  sortNodes(root);
  return root;
}

function fileTypeIcon(name: string) {
  const extension = extensionOf(name);
  const color = extension === "html" || extension === "htm" ? "#e98b67"
    : extension === "css" ? "#78a9e8"
      : ["js", "mjs", "cjs"].includes(extension) ? "#e8ce72"
        : ["ts", "tsx"].includes(extension) ? "#6ca7ee"
          : extension === "php" ? "#aa9be7"
            : extension === "json" ? "#d4b36b" : "#9aa9b4";
  if (extension === "json") return <FileJson2 size={14} color={color} />;
  if (["html", "htm", "jsx", "tsx"].includes(extension)) return <Code2 size={14} color={color} />;
  if (extension === "css") return <Braces size={14} color={color} />;
  return <FileCode2 size={14} color={color} />;
}

function isValidWorkspacePath(path: string) {
  return path.length <= 160 && path.split("/").every((segment) => /^[a-zA-Z0-9_-][a-zA-Z0-9._-]{0,79}$/.test(segment) && !segment.includes(".."));
}

function parentFolderPaths(path: string) {
  const segments = path.split("/");
  const parents: string[] = [];
  for (let index = 1; index < segments.length; index += 1) parents.push(segments.slice(0, index).join("/"));
  return parents;
}

function filterExplorerTree(nodes: ExplorerNode[], query: string): ExplorerNode[] {
  if (!query) return nodes;
  const filtered: ExplorerNode[] = [];
  for (const node of nodes) {
    if (node.kind === "file") {
      if (node.path.toLowerCase().includes(query)) filtered.push(node);
      continue;
    }
    const children = filterExplorerTree(node.children, query);
    if (node.name.toLowerCase().includes(query) || children.length) filtered.push({ ...node, children });
  }
  return filtered;
}

function editorExtensions(name: string) {
  const extension = extensionOf(name);
  if (extension === "html" || extension === "htm") return [html()];
  if (extension === "css") return [css()];
  if (extension === "php") return [php()];
  if (["jsx", "tsx"].includes(extension)) return [javascript({ jsx: true })];
  return [javascript()];
}

function safeInlineCode(code: string) {
  return code.replace(/<\/script/gi, "<\\/script").replace(/<\/style/gi, "<\\/style");
}

function createWebDocument(files: WorkspaceFile[]) {
  const htmlFile = files.find((file) => ["html", "htm"].includes(extensionOf(file.name)));
  const page = htmlFile?.content ?? "<main><h1>Halaman baru</h1><p>Mulai menulis HTML.</p></main>";
  const cssText = files.filter((file) => extensionOf(file.name) === "css").map((file) => file.content).join("\n");
  const jsText = files.filter((file) => ["js", "mjs", "cjs"].includes(extensionOf(file.name))).map((file) => file.content).join("\n");
  const bridge = `(() => { const send = (level, args) => parent.postMessage({ type: 'code-output', level, text: args.map((value) => { try { return typeof value === 'string' ? value : JSON.stringify(value); } catch { return String(value); } }).join(' ') }, '*'); ['log', 'info', 'warn', 'error'].forEach((level) => { const original = console[level]; console[level] = (...args) => { send(level === 'error' ? 'error' : 'log', args); original.apply(console, args); }; }); window.onerror = (message, source, line, column) => send('error', [message + ' (' + line + ':' + column + ')']); })();`;
  const script = jsText ? `<script>${safeInlineCode(jsText)}<\/script>` : "";
  const security = `<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; connect-src 'none'; form-action 'none'; base-uri 'none'"><style>${safeInlineCode(cssText)}</style><script>${bridge}<\/script>`;
  let document = page;
  if (!/<html(?:\s|>)/i.test(document)) document = `<!doctype html><html><head></head><body>${document}</body></html>`;
  if (/<head(?:\s|>)/i.test(document)) {
    document = document.replace(/<head([^>]*)>/i, `<head$1>${security}`);
  } else {
    document = document.replace(/<html([^>]*)>/i, `<html$1><head>${security}</head>`);
  }
  if (script) {
    document = /<\/body>/i.test(document) ? document.replace(/<\/body>/i, `${script}</body>`) : `${document}${script}`;
  }
  return document;
}

function createNativeDocument(compiledCode: string, device: "iphone" | "pixel") {
  const safeBundle = JSON.stringify(safeInlineCode(compiledCode));
  const bridge = `const send = (level, args) => parent.postMessage({ type: 'code-output', level, text: args.map((value) => { try { return typeof value === 'string' ? value : JSON.stringify(value); } catch { return String(value); } }).join(' ') }, '*'); ['log', 'info', 'warn', 'error'].forEach((level) => { const original = console[level]; console[level] = (...args) => { send(level === 'error' ? 'error' : 'log', args); original.apply(console, args); }; }); window.onerror = (message, source, line, column) => send('error', [message + ' (' + line + ':' + column + ')']);`;
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' https://esm.sh; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; connect-src 'none'; form-action 'none'; base-uri 'none'"><script type="importmap">{"imports":{"react":"https://esm.sh/react@19.2.8","react-dom":"https://esm.sh/react-dom@19.2.8?external=react","react-dom/client":"https://esm.sh/react-dom@19.2.8/client?external=react","react-native":"https://esm.sh/react-native-web@0.21.3?external=react,react-dom","react-native-web":"https://esm.sh/react-native-web@0.21.3?external=react,react-dom"}}</script><style>html,body,#root{min-height:100%;margin:0}body{font-family:system-ui,sans-serif}</style></head><body><div id="root"></div><script>${bridge}<\/script><script type="module">import React from 'react'; import { createRoot } from 'react-dom/client'; import * as Native from 'react-native'; const compiled = ${safeBundle}; try { const module = { exports: {} }; const requireModule = (name) => name === 'react' ? React : (name === 'react-native' || name === 'react-native-web') ? Native : (() => { throw new Error('Import belum didukung: ' + name); })(); new Function('module', 'exports', 'require', compiled)(module, module.exports, requireModule); const App = module.exports.default || module.exports.App; if (!App) throw new Error('Buat komponen App sebagai export default.'); createRoot(document.getElementById('root')).render(React.createElement(App)); parent.postMessage({type:'code-output',level:'info',text:'Preview React Native Web aktif di frame ${device === "iphone" ? "iPhone 15 Pro" : "Google Pixel 8"}.'},'*'); } catch (error) { console.error(error instanceof Error ? error.message : String(error)); }</script></body></html>`;
}

function defaultFileContent(name: string) {
  const extension = extensionOf(name);
  if (extension === "html" || extension === "htm") return starterFiles[0].content;
  if (extension === "php") return `<?php\n\necho '<main><h1>Halo dari PHP</h1><p>Ubah file ini, lalu tekan Run.</p></main>';`;
  if (extension === "tsx" || extension === "jsx") return `import React from 'react';\nimport { View, Text } from 'react-native';\n\nexport default function App() {\n  return (\n    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#edf4ef' }}>\n      <Text style={{ color: '#17343a', fontSize: 24, fontWeight: '700' }}>Halo dari React Native</Text>\n    </View>\n  );\n}`;
  return "";
}

function createPhpDocument(htmlText: string) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; connect-src 'none'; form-action 'none'; base-uri 'none'"></head><body>${htmlText}</body></html>`;
}

export default function CodeStudio() {
  const router = useRouter();
  const [editorDarkMode, setEditorDarkMode] = useState(false);
  const [files, setFiles] = useState<WorkspaceFile[]>(starterFiles);
  const [folders, setFolders] = useState<string[]>([]);
  const [activeName, setActiveName] = useState("index.html");
  const [ready, setReady] = useState(false);
  const [cloudSyncEnabled, setCloudSyncEnabled] = useState(false);
  const [syncState, setSyncState] = useState<SyncState>("loading");
  const [syncMessage, setSyncMessage] = useState("Memuat workspace");
  const [previewSize, setPreviewSize] = useState<PreviewSize>("desktop");
  const [previewDocument, setPreviewDocument] = useState("");
  const [previewKind, setPreviewKind] = useState<PreviewKind | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [exitDialogOpen, setExitDialogOpen] = useState(false);
  const [rightPanel, setRightPanel] = useState<"preview" | "ai">("preview");
  const [aiMessages, setAiMessages] = useState<AiMessage[]>([]);
  const [aiInput, setAiInput] = useState("");
  const [aiModels, setAiModels] = useState<AiModelOption[]>([]);
  const [aiModelId, setAiModelId] = useState("");
  const [aiSending, setAiSending] = useState(false);
  const [aiError, setAiError] = useState("");
  const [output, setOutput] = useState<OutputLine[]>([]);
  const [activePanel, setActivePanel] = useState<"explorer" | "editor" | "preview">("editor");
  const [newFileOpen, setNewFileOpen] = useState(false);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [newFileError, setNewFileError] = useState("");
  const [explorerSearch, setExplorerSearch] = useState("");
  const [activeFolder, setActiveFolder] = useState("");
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() => new Set());
  const [outputOpen, setOutputOpen] = useState(true);
  const [terminalHeight, setTerminalHeight] = useState(190);
  const [terminalCommand, setTerminalCommand] = useState("");
  const [paneRatio, setPaneRatio] = useState(56);
  const mainPanesRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLIFrameElement>(null);
  const runButtonRef = useRef<HTMLButtonElement>(null);
  const terminalInputRef = useRef<HTMLInputElement>(null);
  const nextLogId = useRef(1);
  const nextAiMessageId = useRef(1);
  const aiMessagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const syncTheme = () => setEditorDarkMode(document.documentElement.dataset.theme === "dark");
    syncTheme();
    const observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  const activeFile = files.find((file) => file.name === activeName) ?? files[0];
  const activeExtension = activeFile ? extensionOf(activeFile.name) : "";
  const nativeMode = ["tsx", "jsx"].includes(activeExtension);
  const phpMode = activeExtension === "php";
  const explorerTree = useMemo(() => buildExplorerTree(files, folders), [files, folders]);
  const filteredExplorerTree = useMemo(() => filterExplorerTree(explorerTree, explorerSearch.trim().toLowerCase()), [explorerTree, explorerSearch]);

  const modeLabel = useMemo(() => {
    if (nativeMode) return "REACT NATIVE WEB";
    if (phpMode) return "PHP + WEB";
    return "WEB · HTML / CSS / JS";
  }, [nativeMode, phpMode]);

  useEffect(() => {
    let active = true;
    async function loadWorkspace() {
      let localFiles: WorkspaceFile[] = [];
      let localFolders: string[] = [];
      try {
        const saved = localStorage.getItem("courseup-code-workspace");
        if (saved) {
          const parsed = JSON.parse(saved) as WorkspaceFile[] | { files?: WorkspaceFile[]; folders?: string[] };
          if (Array.isArray(parsed) && parsed.every((file) => typeof file.name === "string" && typeof file.content === "string")) localFiles = parsed;
          else if (parsed && !Array.isArray(parsed)) {
            if (Array.isArray(parsed.files) && parsed.files.every((file) => typeof file.name === "string" && typeof file.content === "string")) localFiles = parsed.files;
            if (Array.isArray(parsed.folders)) localFolders = parsed.folders.filter((folder) => typeof folder === "string");
          }
        }
      } catch { localFiles = []; }

      try {
        const remote = await apiRequest<{ files: WorkspaceFile[]; folders?: string[] }>("/api/v1/code-workspace");
        if (!active) return;
        setCloudSyncEnabled(true);
        setFolders(remote.folders ?? []);
        if (remote.files.length) {
          setFiles(remote.files);
          setActiveName(remote.files[0].name);
          setSyncState("saved");
          setSyncMessage("Sinkron cloud aktif");
        } else if (localFiles.length) {
          setFiles(localFiles);
          setFolders(localFolders);
          setActiveName(localFiles[0].name);
          setSyncState("local");
          setSyncMessage("Mengirim workspace lokal ke cloud");
        } else {
          setSyncState("saved");
          setSyncMessage("Workspace baru");
        }
      } catch (error) {
        if (!active) return;
        if (localFiles.length) {
          setFiles(localFiles);
          setFolders(localFolders);
          setActiveName(localFiles[0].name);
        }
        if ((error as Error & { status?: number }).status === 401) {
          setSyncState("local");
          setSyncMessage("Masuk untuk sinkron antarperangkat");
        } else {
          setSyncState("error");
          setSyncMessage("Cloud belum tersedia; salinan lokal aman");
        }
      } finally {
        if (active) setReady(true);
      }
    }

    void loadWorkspace();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem("courseup-code-workspace", JSON.stringify({ files, folders }));
    } catch {
      const storageError = window.setTimeout(() => {
        setSyncState("error");
        setSyncMessage("Perangkat kehabisan ruang penyimpanan");
        setIsDirty(true);
      }, 0);
      return () => window.clearTimeout(storageError);
    }
    if (!cloudSyncEnabled) {
      const localSave = window.setTimeout(() => setIsDirty(false), 250);
      return () => window.clearTimeout(localSave);
    }
    const timeout = window.setTimeout(() => {
      setSyncState("saving");
      setSyncMessage("Menyimpan perubahan");
      void apiRequest<{ saved: boolean }>("/api/v1/code-workspace", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files, folders }),
      }).then(() => {
        setSyncState("saved");
        setSyncMessage("Semua perubahan tersinkron");
        setIsDirty(false);
      }).catch((error: Error & { status?: number }) => {
        if (error.status === 401) {
          setSyncState("local");
          setSyncMessage("Masuk untuk sinkron antarperangkat");
          setIsDirty(false);
        } else {
          setSyncState("error");
          setSyncMessage("Cloud belum tersedia; salinan lokal aman");
        }
      });
    }, 900);
    return () => window.clearTimeout(timeout);
  }, [files, folders, ready, cloudSyncEnabled]);

  useEffect(() => {
    function receivePreviewMessage(event: MessageEvent) {
      if (event.source !== previewRef.current?.contentWindow || !event.data || event.data.type !== "code-output") return;
      const level = event.data.level === "error" ? "error" : event.data.level === "info" ? "info" : "log";
      addOutput(String(event.data.text ?? ""), level);
    }
    window.addEventListener("message", receivePreviewMessage);
    return () => window.removeEventListener("message", receivePreviewMessage);
  }, []);

  useEffect(() => {
    function runShortcut(event: globalThis.KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        runButtonRef.current?.click();
      }
    }
    window.addEventListener("keydown", runShortcut);
    return () => window.removeEventListener("keydown", runShortcut);
  }, []);

  useEffect(() => {
    let active = true;
    apiRequest<{ models: AiModelOption[] }>("/api/v1/code-workspace/assistant", { cache: "no-store" })
      .then(({ models }) => {
        if (!active) return;
        setAiModels(models);
        setAiModelId((current) => models.some((model) => model.id === current) ? current : models[0]?.id || "");
      })
      .catch((error: Error) => { if (active) setAiError(error.message); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    aiMessagesEndRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [aiMessages, aiSending]);

  function addOutput(text: string, level: OutputLine["level"] = "info") {
    setOutput((current) => [...current.slice(-149), { id: nextLogId.current++, level, text }]);
  }

  function selectNativeDevice(device: "iphone" | "pixel") {
    setPreviewSize(device);
    const model = device === "iphone" ? "iPhone 15 Pro" : "Google Pixel 8";
    setOutput((current) => current.map((line) => line.text.startsWith("Preview React Native Web aktif di frame ")
      ? { ...line, text: `Preview React Native Web aktif di frame ${model}.` }
      : line));
  }

  function updateActiveContent(content: string) {
    if (!activeFile) return;
    setIsDirty(true);
    setFiles((current) => current.map((file) => file.name === activeFile.name ? { ...file, content } : file));
  }

  function createFile(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const name = newFileName.trim();
    if (!isValidWorkspacePath(name)) {
      setNewFileError("Nama file tidak valid.");
      return;
    }
    const extension = extensionOf(name);
    if (!allowedExtensions.has(extension)) {
      setNewFileError("Format belum didukung. Coba .html, .css, .js, .php, atau .tsx.");
      return;
    }
    const filePath = activeFolder && !name.includes("/") ? `${activeFolder}/${name}` : name;
    if (files.some((file) => file.name.toLowerCase() === filePath.toLowerCase())) {
      setNewFileError("File dengan nama tersebut sudah ada.");
      return;
    }
    setIsDirty(true);
    const newFolders = parentFolderPaths(filePath);
    setFolders((current) => Array.from(new Set([...current, ...newFolders])));
    setExpandedFolders((current) => new Set([...current, ...newFolders]));
    setFiles((current) => [...current, { name: filePath, content: defaultFileContent(filePath) }]);
    setActiveName(filePath);
    setActivePanel("editor");
    setNewFileName("");
    setNewFileError("");
    setNewFileOpen(false);
  }

  function createFolder(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const name = newFolderName.trim();
    const folderPath = activeFolder && !name.includes("/") ? `${activeFolder}/${name}` : name;
    if (!isValidWorkspacePath(folderPath) || extensionOf(folderPath) !== folderPath.split("/").at(-1)) {
      setNewFileError("Nama folder tidak valid.");
      return;
    }
    if (folders.some((folder) => folder.toLowerCase() === folderPath.toLowerCase())) {
      setNewFileError("Folder dengan nama tersebut sudah ada.");
      return;
    }
    setIsDirty(true);
    setFolders((current) => Array.from(new Set([...current, ...parentFolderPaths(folderPath), folderPath])));
    setExpandedFolders((current) => new Set([...current, folderPath]));
    setActiveFolder(folderPath);
    setNewFolderName("");
    setNewFileError("");
    setNewFolderOpen(false);
  }

  function removeFile(name: string) {
    if (files.length === 1) {
      addOutput("Workspace harus memiliki setidaknya satu file.", "error");
      return;
    }
    const remaining = files.filter((file) => file.name !== name);
    setIsDirty(true);
    setFiles(remaining);
    if (activeName === name) setActiveName(remaining[0].name);
  }

  function selectFile(name: string) {
    setActiveFolder(parentFolderPaths(name).at(-1) ?? "");
    setActiveName(name);
    setActivePanel("editor");
    if (["tsx", "jsx"].includes(extensionOf(name))) {
      setPreviewSize((current) => current === "pixel" ? "pixel" : "iphone");
    }
  }

  function toggleFolder(path: string) {
    setExpandedFolders((current) => {
      const next = new Set(current);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
    setActiveFolder(path);
  }

  function toggleFolderDialog() {
    setNewFolderName("");
    setNewFileError("");
    setNewFolderOpen((open) => !open);
  }

  async function saveWorkspace() {
    try {
      localStorage.setItem("courseup-code-workspace", JSON.stringify({ files, folders }));
      if (!cloudSyncEnabled) {
        setSyncState("local");
        setSyncMessage("Tersimpan di perangkat ini");
        setIsDirty(false);
        return true;
      }
      setSyncState("saving");
      setSyncMessage("Menyimpan perubahan");
      await apiRequest("/api/v1/code-workspace", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files, folders }),
      });
      setSyncState("saved");
      setSyncMessage("Semua perubahan tersinkron");
      setIsDirty(false);
      return true;
    } catch {
      setSyncState("error");
      setSyncMessage("Cloud belum tersedia; perubahan belum tersinkron");
      setIsDirty(true);
      return false;
    }
  }

  function leaveEditor(discardChanges = false) {
    if (isDirty && !discardChanges) {
      setExitDialogOpen(true);
      return;
    }
    router.push("/");
  }

  async function sendAiMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const prompt = aiInput.trim();
    if (!prompt || !aiModelId) {
      setAiError("Pilih model AI dan tulis pesan terlebih dahulu.");
      return;
    }
    const userMessage: AiMessage = { id: nextAiMessageId.current++, role: "user", markdown: prompt };
    const history = aiMessages.map((message) => ({ role: message.role, content: message.markdown }));
    setAiMessages((current) => [...current, userMessage]);
    setAiInput("");
    setAiSending(true);
    setAiError("");
    try {
      let remainingContext = 48 * 1024;
      const contextFiles = [activeFile, ...files.filter((file) => file.name !== activeFile?.name)].flatMap((file) => {
        if (remainingContext <= 0) return [];
        const content = file.content.slice(0, remainingContext);
        remainingContext -= new TextEncoder().encode(content).byteLength;
        return [{ name: file.name, content }];
      });
      const { models } = await apiRequest<{ models: AiModelOption[] }>("/api/v1/code-workspace/assistant", { cache: "no-store" });
      const requestModelId = models.some((model) => model.id === aiModelId) ? aiModelId : models[0]?.id;
      setAiModels(models);
      setAiModelId(requestModelId ?? "");
      if (!requestModelId) throw new Error("Belum ada model AI yang tersedia.");
      const result = await apiRequest<{ markdown: string; changes: AiChange[] }>("/api/v1/code-workspace/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activeFileName: activeFile?.name ?? "", prompt, modelId: requestModelId, files: contextFiles, history }),
      });
      setAiMessages((current) => [...current, { id: nextAiMessageId.current++, role: "assistant", markdown: result.markdown, changes: result.changes }]);
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "AI belum dapat merespons.");
    } finally {
      setAiSending(false);
    }
  }

  function applyAiChanges(message: AiMessage) {
    const existingNames = new Set(files.map((file) => file.name));
    const validChanges = (message.changes ?? []).filter((change) => existingNames.has(change.name) && new TextEncoder().encode(change.content).byteLength <= 1024 * 1024);
    if (!validChanges.length) {
      setAiError("Tidak ada perubahan file valid untuk diterapkan.");
      return;
    }
    const replacements = new Map(validChanges.map((change) => [change.name, change.content]));
    setFiles((current) => current.map((file) => replacements.has(file.name) ? { ...file, content: replacements.get(file.name) ?? file.content } : file));
    setActiveName(validChanges[0].name);
    setActivePanel("editor");
    setIsDirty(true);
    setAiMessages((current) => current.map((item) => item.id === message.id ? { ...item, applied: true } : item));
    addOutput(`AI changes diterapkan ke ${validChanges.map((change) => change.name).join(", ")}.`, "info");
  }

  function openAiPanel() {
    setRightPanel("ai");
    setActivePanel("preview");
    setAiError("");
  }

  function submitTerminalCommand(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const command = terminalCommand.trim();
    setTerminalCommand("");
    if (command !== "npm run dev") {
      addOutput(`Perintah belum tersedia: ${command || "(kosong)"}. Gunakan npm run dev untuk memperbarui preview.`, "error");
      return;
    }
    void runCode();
  }

  function renderExplorerNodes(nodes: ExplorerNode[], depth = 0): ReactNode {
    return nodes.map((node) => {
      if (node.kind === "folder") {
        const expanded = expandedFolders.has(node.path) || explorerSearch.length > 0;
        return <div key={node.path}>
          <button type="button" className={`code-explorer-row code-folder-row ${activeFolder === node.path ? "is-selected" : ""}`} style={{ paddingLeft: 9 + depth * 14 }} onClick={() => toggleFolder(node.path)}>
            {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}{expanded ? <FolderOpen size={14} color="var(--gold)" /> : <Folder size={14} color="var(--gold)" />}<span>{node.name}</span>
          </button>
          {expanded && node.children.length > 0 && <div>{renderExplorerNodes(node.children, depth + 1)}</div>}
        </div>;
      }
      return <div key={node.path} className={`code-explorer-row code-file-row ${activeName === node.path ? "is-selected" : ""}`} style={{ paddingLeft: 27 + depth * 14 }}>
        <button type="button" onClick={() => selectFile(node.path)}>{fileTypeIcon(node.name)}<span>{node.name.split("/").at(-1)}</span></button>
        <button type="button" aria-label={`Hapus ${node.path}`} title="Hapus file" onClick={() => removeFile(node.path)}><X size={12} /></button>
      </div>;
    });
  }

  async function runCode() {
    setOutput([]);
    setOutputOpen(true);
    setActivePanel("preview");
    setRightPanel("preview");
    setPreviewDocument("");
    setPreviewKind(null);

    if (nativeMode) {
      const device = previewSize === "pixel" ? "pixel" : "iphone";
      setPreviewSize(device);
      addOutput("> npm run dev", "info");
      addOutput("> courseup-native-preview@1.0.0 dev", "info");
      addOutput("> Transforming TSX and starting React Native Web preview...", "info");
      try {
        const Babel = await import("@babel/standalone");
        const source = files.find((file) => file.name === activeName)?.content ?? "";
        const compiled = Babel.transform(source, {
          filename: activeName,
          presets: [["typescript", { allExtensions: true, isTSX: true }], ["react", { runtime: "classic" }]],
          plugins: ["transform-modules-commonjs"],
        }).code;
        if (!compiled) throw new Error("Compiler tidak menghasilkan output.");
        setPreviewDocument(createNativeDocument(compiled, device));
        setPreviewKind("native");
        addOutput("✓ Compile berhasil. Menjalankan preview mobile...", "info");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Compile TSX gagal.";
        addOutput(message, "error");
        setPreviewDocument("");
      }
      return;
    }

    if (phpMode) {
      const entryFile = files.some((file) => file.name === "index.php") ? "index.php" : activeName;
      addOutput("> npm run dev", "info");
      addOutput("> Menjalankan PHP di sandbox terkonfigurasi...", "info");
      try {
        const result = await apiRequest<{ html: string; output: string }>("/api/v1/code-workspace/run-php", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ files, entryFile }),
        });
        addOutput(result.output || "PHP selesai tanpa output terminal.", "log");
        setPreviewDocument(createPhpDocument(result.html));
        setPreviewKind("php");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Runner PHP gagal.";
        addOutput(message, "error");
        setPreviewDocument("");
      }
      return;
    }

    addOutput("> npm run dev", "info");
    addOutput("> Menjalankan preview web...", "info");
    setPreviewDocument(createWebDocument(files));
    setPreviewKind("web");
    addOutput("Preview diperbarui. Buka console untuk melihat log JavaScript.", "info");
  }

  function handleDividerDown(event: PointerEvent<HTMLDivElement>) {
    const container = mainPanesRef.current;
    if (!container) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const bounds = container.getBoundingClientRect();
    const update = (moveEvent: globalThis.PointerEvent) => {
      const nextRatio = ((moveEvent.clientX - bounds.left) / bounds.width) * 100;
      setPaneRatio(Math.max(28, Math.min(72, nextRatio)));
    };
    const stop = () => {
      container.removeEventListener("pointermove", update);
      container.removeEventListener("pointerup", stop);
      container.removeEventListener("pointercancel", stop);
    };
    container.addEventListener("pointermove", update);
    container.addEventListener("pointerup", stop, { once: true });
    container.addEventListener("pointercancel", stop, { once: true });
  }

  function handleTerminalResize(event: PointerEvent<HTMLDivElement>) {
    const handle = event.currentTarget;
    const startY = event.clientY;
    const startHeight = terminalHeight;
    handle.setPointerCapture(event.pointerId);
    const update = (moveEvent: globalThis.PointerEvent) => setTerminalHeight(Math.max(110, Math.min(420, startHeight + startY - moveEvent.clientY)));
    const stop = () => {
      handle.removeEventListener("pointermove", update);
      handle.removeEventListener("pointerup", stop);
      handle.removeEventListener("pointercancel", stop);
    };
    handle.addEventListener("pointermove", update);
    handle.addEventListener("pointerup", stop, { once: true });
    handle.addEventListener("pointercancel", stop, { once: true });
  }

  const previewIsMobile = nativeMode || previewSize === "mobile";
  const selectedDevice = previewSize === "pixel" ? "pixel" : "iphone";

  return <section className="code-studio" aria-label="Code editor workspace">
    <header className="code-topbar">
      <button type="button" className="code-exit-button" aria-label="Kembali ke beranda" title="Kembali ke beranda" onClick={() => leaveEditor()}><ArrowLeft size={16} /><span>Kembali</span></button>
      <div className="code-brand"><span className="code-brand-mark"><Code2 size={16} /></span><strong>Editor <span>Kode</span></strong><span className="code-project-name">Project Saya</span></div>
      <div className="code-top-actions">
        <span className={`code-sync-state is-${isDirty ? "saving" : syncState}`} title={isDirty ? "Perubahan belum tersimpan" : syncMessage}><span className="code-sync-dot" />{isDirty ? "Belum disimpan" : syncState === "loading" ? "Memuat" : syncState === "saving" ? "Menyimpan" : syncState === "saved" ? "Tersimpan" : syncState === "local" ? "Lokal" : "Offline"}</span>
        <button type="button" className="code-save-button" aria-label="Simpan workspace" onClick={() => void saveWorkspace()} title="Simpan workspace"><Save size={14} /><span>Simpan</span></button>
        <button type="button" className="code-ai-button" aria-label="Minta bantuan AI" onClick={openAiPanel} title="Minta bantuan AI"><Sparkles size={14} /><span>Tanya AI</span></button>
        <button className="code-run-button" ref={runButtonRef} type="button" aria-label={nativeMode ? "Buka terminal" : "Jalankan project"} onClick={() => nativeMode ? terminalInputRef.current?.focus() : void runCode()}><Play size={14} fill="currentColor" /><span>{nativeMode ? "Terminal" : "Run"}</span>{!nativeMode && <kbd>Ctrl ↵</kbd>}</button>
      </div>
    </header>

    <div className="code-mobile-switch" role="tablist" aria-label="Panel editor">
      <button type="button" role="tab" aria-selected={activePanel === "explorer"} aria-controls="code-explorer-panel" className={activePanel === "explorer" ? "is-active" : ""} onClick={() => setActivePanel("explorer")}><Folder size={14} />Files</button>
      <button type="button" role="tab" aria-selected={activePanel === "editor"} aria-controls="code-editor-panel" className={activePanel === "editor" ? "is-active" : ""} onClick={() => setActivePanel("editor")}><Code2 size={14} />Editor</button>
      <button type="button" role="tab" aria-selected={activePanel === "preview"} aria-controls="code-preview-panel" className={activePanel === "preview" ? "is-active" : ""} onClick={() => setActivePanel("preview")}><PanelRight size={14} />Preview</button>
    </div>

    <div className="code-workbench">
      <aside id="code-explorer-panel" className={`code-explorer ${activePanel === "explorer" ? "is-mobile-open" : ""}`} aria-label="Explorer project">
        <div className="code-explorer-heading"><span>File dan folder</span><button type="button" className="code-explorer-close" aria-label="Tutup panel file" title="Tutup panel file" onClick={() => setActivePanel("editor")}><X size={16} /></button></div>
        <button type="button" className="code-explorer-project" onClick={() => setActiveFolder("")}><ChevronDown size={13} /><strong>PROJECT SAYA</strong></button>
        <div className="code-explorer-actions">
          <button type="button" aria-label="File baru" title="File baru" onClick={() => { setNewFileOpen((open) => !open); setNewFolderOpen(false); setNewFileError(""); }}><FilePlus2 size={15} /></button>
          <button type="button" aria-label="Folder baru" title="Folder baru" onClick={toggleFolderDialog}><FolderPlus size={15} /></button>
          <button type="button" aria-label="Simpan semua" title="Simpan semua" onClick={() => void saveWorkspace()}><Save size={14} /></button>
        </div>
        <label className="code-explorer-search"><Search size={13} /><input value={explorerSearch} placeholder="Cari file atau folder" onChange={(event) => setExplorerSearch(event.target.value)} /><kbd>⌘ P</kbd></label>
        {newFileOpen && <form className="code-explorer-form" onSubmit={createFile}>
          <label htmlFor="new-code-file">File baru {activeFolder && <span>di {activeFolder}</span>}</label>
          <input id="new-code-file" autoFocus value={newFileName} placeholder="index.html" onChange={(event) => { setNewFileName(event.target.value); setNewFileError(""); }} onKeyDown={(event) => { if (event.key === "Escape") setNewFileOpen(false); }} />
          <small>Tekan Enter untuk membuat file</small>
          {newFileError && <small className="is-error" role="alert">{newFileError}</small>}
        </form>}
        {newFolderOpen && <form className="code-explorer-form" onSubmit={createFolder}>
          <label htmlFor="new-code-folder">Folder baru</label>
          <input id="new-code-folder" autoFocus value={newFolderName} placeholder="src" onChange={(event) => { setNewFolderName(event.target.value); setNewFileError(""); }} onKeyDown={(event) => { if (event.key === "Escape") setNewFolderOpen(false); }} />
          <small>Tekan Enter untuk membuat folder</small>
          {newFileError && <small className="is-error" role="alert">{newFileError}</small>}
        </form>}
        <div className="code-explorer-tree">
          {filteredExplorerTree.length ? renderExplorerNodes(filteredExplorerTree) : <div className="code-explorer-empty">{explorerSearch ? "File tidak ditemukan" : "Belum ada file"}</div>}
        </div>
        <div className="code-explorer-account"><span className="code-live-indicator" />{cloudSyncEnabled ? "Cloud workspace" : "Workspace lokal"}</div>
      </aside>

      <main className="code-main-panes" ref={mainPanesRef} style={{ gridTemplateColumns: `${paneRatio}fr 8px ${100 - paneRatio}fr` }}>
        <section id="code-editor-panel" className={`code-editor-column ${activePanel === "editor" ? "is-mobile-active" : ""}`} aria-label="Editor kode dan terminal">
          <div className="code-editor-tabs">
            <div className="code-open-file-tab is-active">{activeFile ? fileTypeIcon(activeFile.name) : <FileText size={14} />}<span>{activeFile?.name ?? "Pilih file"}</span>{isDirty && <i title="Belum tersimpan" />}</div>
            {activeFile && <span className="code-editor-path">{activeFile.name.replace(/[^/]+$/, "")}</span>}
            <div className="code-editor-tab-actions"><span className="code-mode-label"><Braces size={13} />{modeLabel}</span><button type="button" className="code-ai-icon" onClick={openAiPanel} title="Tanya AI tentang project" aria-label="Buka AI assistant"><Sparkles size={14} /></button></div>
          </div>
          <div className="code-editor-body">
            <CodeMirror value={activeFile?.content ?? ""} height="100%" theme={editorDarkMode ? oneDark : "light"} extensions={[...editorExtensions(activeFile?.name ?? "js"), editorDarkMode ? codeTheme : lightCodeTheme]} onChange={updateActiveContent} basicSetup={{ foldGutter: true, bracketMatching: true, closeBrackets: true, autocompletion: true, highlightActiveLine: true }} aria-label={`Editor ${activeFile?.name ?? "kode"}`} />
            {!ready && <div className="code-editor-loading">Menyiapkan workspace...</div>}
          </div>
          <div className="code-editor-status"><span>{activeFile?.name ?? ""}</span><span>{activeExtension.toUpperCase()}</span><span>UTF-8</span><span>LF</span><span>Spaces: 2</span></div>
          <div className="code-terminal-resize" role="separator" aria-orientation="horizontal" aria-label="Ubah tinggi terminal" onPointerDown={handleTerminalResize}><span /></div>
          <section className={`code-terminal-panel ${outputOpen ? "is-open" : "is-collapsed"}`} style={{ height: outputOpen ? `${terminalHeight}px` : "34px" }} aria-label="Terminal output">
            <div className="code-terminal-heading"><button type="button" onClick={() => setOutputOpen((open) => !open)}><ChevronDown size={13} className={outputOpen ? "" : "is-collapsed"} /><Terminal size={14} />{nativeMode ? "TERMINAL SIMULASI" : "TERMINAL"}</button><span>{output.length} baris</span><button type="button" className="code-terminal-clear" onClick={() => setOutput([])} aria-label="Hapus output" title="Hapus output"><Trash2 size={13} /></button></div>
            {outputOpen && <div className="code-output-content" aria-live="polite">
              {output.length ? output.map((line) => <div className={`code-output-line is-${line.level}`} key={line.id}><span>{line.level === "error" ? "×" : line.level === "info" ? "›" : "●"}</span><code>{line.text}</code></div>) : <p>Terminal siap. Ketik npm run dev untuk memperbarui preview.</p>}
            </div>}
            {outputOpen && <form className="code-terminal-command" onSubmit={submitTerminalCommand}><span>›</span><input ref={terminalInputRef} aria-label="Perintah terminal" value={terminalCommand} onChange={(event) => setTerminalCommand(event.target.value)} placeholder="npm run dev" autoComplete="off" spellCheck={false} /><button type="submit" aria-label="Jalankan perintah" title="Tekan Enter untuk menjalankan preview"><Send size={13} /></button></form>}
          </section>
        </section>

        <div className="code-resize-handle" role="separator" aria-orientation="vertical" aria-label="Ubah ukuran editor dan preview" onPointerDown={handleDividerDown}><span /></div>

        <section id="code-preview-panel" className={`code-preview-pane ${activePanel === "preview" ? "is-mobile-active" : ""}`} aria-label="Preview project">
          <div className="code-right-tabs" role="tablist" aria-label="Panel kanan">
            <button type="button" role="tab" aria-selected={rightPanel === "preview"} className={rightPanel === "preview" ? "is-active" : ""} onClick={() => setRightPanel("preview")}><PanelRight size={13} />Preview</button>
            <button type="button" role="tab" aria-selected={rightPanel === "ai"} className={rightPanel === "ai" ? "is-active" : ""} onClick={() => setRightPanel("ai")}><Sparkles size={13} />Bantuan AI</button>
            {rightPanel === "preview" && <div className="code-preview-controls">
              {nativeMode ? <div className="code-device-picker" aria-label="Bingkai preview mobile">
                <button type="button" className={selectedDevice === "iphone" ? "is-active" : ""} onClick={() => selectNativeDevice("iphone")} title="Preview iPhone 15 Pro, layar 6.1 inci">iPhone 6.1″</button>
                <button type="button" className={selectedDevice === "pixel" ? "is-active" : ""} onClick={() => selectNativeDevice("pixel")} title="Preview Google Pixel 8, layar 6.2 inci">Pixel 6.2″</button>
              </div> : <div className="code-view-picker" aria-label="Ukuran preview web">
                <button type="button" className={previewSize === "desktop" ? "is-active" : ""} aria-label="Preview desktop" title="Desktop" onClick={() => setPreviewSize("desktop")}><Monitor size={15} /></button>
                <button type="button" className={previewSize === "mobile" ? "is-active" : ""} aria-label="Preview mobile" title="Mobile" onClick={() => setPreviewSize("mobile")}><Smartphone size={15} /></button>
              </div>}
            </div>}
          </div>
          {rightPanel === "preview" ? <div className={`code-preview-stage ${previewIsMobile ? "is-mobile-view" : ""} ${nativeMode ? "is-native-view" : ""}`}>
            {nativeMode ? <div className={`code-device-frame is-${selectedDevice}`}>
              <div className="code-device-screen">
                <div className="code-device-status"><span>9:41</span><span className="code-device-status-icons">● ▮ ▰</span></div>
                <div className="code-device-camera" />
                {previewKind === "native" && previewDocument ? <iframe ref={previewRef} title={`${selectedDevice === "iphone" ? "iPhone 15 Pro" : "Google Pixel 8"} React Native preview`} sandbox="allow-scripts" srcDoc={previewDocument} /> : <div className="code-preview-empty"><span className="code-empty-device"><Smartphone size={24} /></span><strong>Preview mobile</strong><span>Ketik npm run dev di terminal untuk compile TSX.</span></div>}
                <div className="code-device-home" />
              </div>
            </div> : previewDocument && previewKind === (phpMode ? "php" : "web") ? <iframe ref={previewRef} title={previewIsMobile ? "Preview mobile" : "Preview website"} className="code-web-frame" sandbox="allow-scripts" srcDoc={previewDocument} /> : phpMode && output.length > 0 && output[output.length - 1].level === "error" ? <div className="code-preview-error"><CircleAlert size={18} />{output[output.length - 1].text}</div> : <div className="code-preview-empty"><span className="code-empty-icon"><Play size={18} /></span><strong>Preview siap dijalankan</strong><span>Tekan Run untuk melihat hasil project.</span></div>}
          </div> : <section className="code-ai-panel" aria-label="CourseUp AI">
            <div className="code-ai-heading"><span className="code-ai-avatar"><Bot size={17} /></span><div><strong>CourseUp AI</strong><small>Membaca konteks project aktif</small></div><span className="code-ai-model-badge">{aiModels.find((model) => model.id === aiModelId)?.provider === "groq" ? "Groq" : "AI"}</span></div>
            <div className="code-ai-messages" aria-live="polite">
              {!aiMessages.length && <article className="code-ai-welcome"><span className="code-dialog-icon is-ai"><Sparkles size={17} /></span><strong>Halo, aku siap bantu project-mu.</strong><p>Tanya tentang kode, minta penjelasan, atau minta aku mencari dan memperbaiki bug. Aku akan membaca file project ini.</p><div className="code-ai-suggestions"><button type="button" onClick={() => setAiInput(`Jelaskan fungsi file ${activeFile?.name ?? "ini"} dengan sederhana.`)}>Jelaskan file aktif</button><button type="button" onClick={() => setAiInput("Periksa project ini dan cari potensi bug. Jangan ubah file sebelum saya menyetujui.")}>Cari bug</button></div></article>}
              {aiMessages.map((message) => <article className={`code-ai-message is-${message.role}`} key={message.id}>
                <div className="code-ai-message-role">{message.role === "user" ? "KAMU" : "COURSEUP AI"}</div>
                <div className="code-ai-markdown"><ReactMarkdown>{message.markdown}</ReactMarkdown></div>
                {!!message.changes?.length && <div className="code-ai-changes"><div className="code-ai-changes-heading"><span>Perubahan file yang diusulkan</span><span>{message.changes.length}</span></div>{message.changes.map((change) => <div className="code-ai-change-row" key={`${message.id}:${change.name}`}><FileCode2 size={13} /><span>{change.name}</span></div>)}<button type="button" disabled={message.applied} onClick={() => applyAiChanges(message)}>{message.applied ? <><Check size={13} />Diterapkan</> : <><Check size={13} />Terapkan perubahan</>}</button></div>}
              </article>)}
              {aiSending && <div className="code-ai-thinking"><span /><span /><span />Menganalisis file project...</div>}
              <div ref={aiMessagesEndRef} />
            </div>
            {aiError && <div className="code-ai-error" role="alert">{aiError}</div>}
            <form className="code-ai-composer" onSubmit={sendAiMessage}>
              <textarea value={aiInput} onChange={(event) => setAiInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} placeholder={`Tanya AI tentang ${activeFile?.name ?? "project"}...`} rows={3} maxLength={2000} />
              <div className="code-ai-composer-bottom"><select aria-label="Pilih model AI" value={aiModelId} onChange={(event) => setAiModelId(event.target.value)} disabled={!aiModels.length || aiSending}>{aiModels.length ? aiModels.map((model) => <option value={model.id} key={model.id}>{model.label}</option>) : <option value="">Model AI belum tersedia</option>}</select><button type="submit" aria-label="Kirim ke AI" title="Kirim ke AI" disabled={aiSending || !aiInput.trim() || !aiModelId}><Send size={14} />{aiSending ? "Menunggu" : "Kirim"}</button></div>
              <small>Enter untuk mengirim · Shift+Enter untuk baris baru</small>
            </form>
          </section>}
        </section>
      </main>
    </div>

    <footer className="code-statusbar"><span><span className={`code-live-indicator ${isDirty ? "is-dirty" : ""}`} />{isDirty ? "Perubahan belum disimpan" : syncMessage}</span><span>{activeFile?.name ?? ""}</span><span>{(files.reduce((total, file) => total + new TextEncoder().encode(file.content).byteLength, 0) / 1024).toFixed(1)} KB / 20 MB</span></footer>

    {exitDialogOpen && <div className="code-dialog-backdrop" role="presentation"><section className="code-dialog" role="dialog" aria-modal="true" aria-labelledby="code-exit-title"><span className="code-dialog-icon"><CircleAlert size={19} /></span><h2 id="code-exit-title">Perubahan belum tersimpan</h2><p>Keluar sekarang tanpa menyimpan perubahan terakhir?</p><div><button type="button" className="code-dialog-secondary" onClick={() => setExitDialogOpen(false)}>Kembali ke editor</button><button type="button" className="code-dialog-danger" onClick={() => leaveEditor(true)}>Keluar tanpa simpan</button><button type="button" className="code-dialog-primary" onClick={async () => { if (await saveWorkspace()) leaveEditor(true); }}>Simpan & keluar</button></div></section></div>}

  </section>;
}