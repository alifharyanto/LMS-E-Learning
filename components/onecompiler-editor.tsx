"use client";

import Editor, { type OnMount } from "@monaco-editor/react";
import type { editor as MonacoEditor } from "monaco-editor";
import { useRouter } from "next/navigation";
import JSZip from "jszip";
import ReactMarkdown from "react-markdown";
import {
  ArrowLeft,
  Bot,
  Bug,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardPaste,
  Code2,
  CircleUserRound,
  Copy,
  Download,
  EllipsisVertical,
  ExternalLink,
  Files,
  Folder,
  FolderOpen,
  FolderPlus,
  History,
  Menu,
  Monitor,
  Plus,
  Play,
  Save,
  Search,
  Settings,
  Sparkles,
  X,
  Send,
} from "lucide-react";
import { useEffect, useEffectEvent, useMemo, useRef, useState, type CSSProperties, type FormEvent, type PointerEvent } from "react";
import { apiRequest } from "@/lib/browser-api";

type ConsoleTab = "Terminal" | "AI Agent" | "Preview";
type ToolPanel = "files" | "history" | "settings";
type RunState = "ready" | "running" | "success" | "error";
type WorkspaceSaveState = "loading" | "saving" | "saved" | "local" | "error";
type WorkspaceFile = { name: string; content: string };
type ExplorerNode = { kind: "folder"; name: string; path: string; children: ExplorerNode[] } | { kind: "file"; name: string; path: string };
type AiMessage = { id: number; role: "user" | "assistant"; markdown: string; changes?: { name: string; content: string }[]; applied?: boolean };
type EditorUser = { id: number; username: string; full_name: string; profile_photo: string };

const starterCode = `import java.util.*;

public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}`;

const starterFiles: WorkspaceFile[] = [
  { name: "Main.java", content: starterCode },
  { name: "index.html", content: "<!doctype html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"utf-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n  <title>Code Editor Preview</title>\n</head>\n<body>\n  <main>\n    <h1>Hello from Code Editor</h1>\n    <button id=\"hello\">Click me</button>\n  </main>\n</body>\n</html>" },
  { name: "style.css", content: "body { margin: 0; padding: 48px; color: #1f2937; font: 16px system-ui, sans-serif; }\nbutton { padding: 10px 16px; border: 0; border-radius: 6px; color: white; background: #4f46e5; cursor: pointer; }" },
  { name: "script.js", content: "const button = document.getElementById('hello');\nif (button) {\n  button.addEventListener('click', function () {\n    console.log('Button clicked!');\n    document.querySelector('h1').textContent = 'JavaScript is running';\n  });\n}" },
];

function isPristineStarterWorkspace(files: WorkspaceFile[]) {
  return files.length === starterFiles.length && starterFiles.every((starter) =>
    files.some((file) => file.name === starter.name && file.content === starter.content),
  );
}

function languageForName(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  const languages: Record<string, string> = {
    c: "c", cc: "cpp", cpp: "cpp", cs: "csharp", css: "css", go: "go", h: "cpp", hpp: "cpp",
    html: "html", htm: "html", java: "java", js: "javascript", jsx: "javascript", json: "json",
    kt: "kotlin", md: "markdown", mjs: "javascript", php: "php", py: "python", rb: "ruby", rs: "rust",
    scss: "scss", sh: "shell", sql: "sql", swift: "swift", ts: "typescript", tsx: "typescript", xml: "xml", yaml: "yaml", yml: "yaml",
  };
  return languages[extension] ?? "plaintext";
}

function parentFolderPaths(path: string) {
  const segments = path.split("/");
  return segments.slice(1).map((_, index) => segments.slice(0, index + 1).join("/"));
}

function buildExplorerTree(files: WorkspaceFile[], folders: string[]): ExplorerNode[] {
  const root: ExplorerNode[] = [];
  const ensureFolder = (siblings: ExplorerNode[], name: string, path: string) => {
    const existing = siblings.find((node) => node.kind === "folder" && node.path === path);
    if (existing?.kind === "folder") return existing.children;
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
    const name = segments.pop() ?? file.name;
    let siblings = root;
    let currentPath = "";
    for (const segment of segments) {
      currentPath = currentPath ? `${currentPath}/${segment}` : segment;
      siblings = ensureFolder(siblings, segment, currentPath);
    }
    siblings.push({ kind: "file", name, path: file.name });
  }
  const sortNodes = (nodes: ExplorerNode[]) => {
    nodes.sort((left, right) => left.kind === right.kind ? left.name.localeCompare(right.name) : left.kind === "folder" ? -1 : 1);
    nodes.forEach((node) => { if (node.kind === "folder") sortNodes(node.children); });
  };
  sortNodes(root);
  return root;
}

function validWorkspacePath(path: string) {
  return path.length <= 160 && path.split("/").every((segment) => /^[a-zA-Z0-9_-][a-zA-Z0-9._-]{0,79}$/.test(segment) && !segment.includes(".."));
}

function createPreviewDocument(files: WorkspaceFile[]) {
  const htmlFile = files.find((file) => ["html", "htm"].includes(file.name.split(".").pop()?.toLowerCase() ?? ""));
  const styles = files.filter((file) => file.name.toLowerCase().endsWith(".css")).map((file) => file.content).join("\n");
  const scripts = files.filter((file) => ["js", "mjs", "cjs"].includes(file.name.split(".").pop()?.toLowerCase() ?? "")).map((file) => file.content).join("\n");
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

function createNativePreviewDocument(compiledCode: string, device: "iphone" | "pixel") {
  const safeBundle = JSON.stringify(compiledCode.replace(/<\/script/gi, "<\\/script"));
  const deviceName = device === "iphone" ? "iPhone" : "Google Pixel";
  const bridge = `const send = (level, args) => parent.postMessage({ type: 'code-editor-output', level, text: args.map((value) => { try { return typeof value === 'string' ? value : JSON.stringify(value); } catch { return String(value); } }).join(' ') }, '*'); ['log', 'info', 'warn', 'error'].forEach((level) => { const original = console[level]; console[level] = (...args) => { send(level, args); original.apply(console, args); }; }); window.onerror = (message, source, line, column) => send('error', [message + ' (' + line + ':' + column + ')']);`;
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' https://esm.sh; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; connect-src https://esm.sh; form-action 'none'; base-uri 'none'"><script type="importmap">{"imports":{"react":"https://esm.sh/react@19.2.8","react-dom":"https://esm.sh/react-dom@19.2.8?external=react","react-dom/client":"https://esm.sh/react-dom@19.2.8/client?external=react","react-native":"https://esm.sh/react-native-web@0.21.3?external=react,react-dom"}}</script><style>html,body,#root{min-height:100%;margin:0}body{font-family:system-ui,sans-serif}</style></head><body><div id="root"></div><script>${bridge}<\/script><script type="module">import React from 'react'; import { createRoot } from 'react-dom/client'; import * as Native from 'react-native'; const compiled = ${safeBundle}; try { const module = { exports: {} }; const requireModule = (name) => name === 'react' ? React : name === 'react-native' ? Native : (() => { throw new Error('Import belum didukung: ' + name); })(); new Function('module', 'exports', 'require', compiled)(module, module.exports, requireModule); const App = module.exports.default || module.exports.App; if (!App) throw new Error('Buat komponen App sebagai export default.'); createRoot(document.getElementById('root')).render(React.createElement(App)); parent.postMessage({type:'code-editor-output',level:'info',text:'Preview React Native Web aktif pada frame ${deviceName}.'},'*'); } catch (error) { console.error(error instanceof Error ? error.message : String(error)); }</script></body></html>`;
}

function createPythonRunnerDocument() {
  return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' https://cdn.jsdelivr.net; connect-src https://cdn.jsdelivr.net; worker-src blob:; base-uri 'none'"></head><body><script type="module">const send=(level,text,extra={})=>parent.postMessage({type:'code-editor-output',level,text,...extra},'*');try{const{loadPyodide}=await import('https://cdn.jsdelivr.net/pyodide/v0.29.3/full/pyodide.mjs');const pyodide=await loadPyodide({indexURL:'https://cdn.jsdelivr.net/pyodide/v0.29.3/full/'});window.parent.postMessage({type:'code-editor-python-ready'},'*');window.addEventListener('message',async(event)=>{if(event.source!==parent||event.data?.type!=='run-python')return;pyodide.setStdout({batched:(text)=>send('log',text)});pyodide.setStderr({batched:(text)=>send('error',text)});try{await pyodide.runPythonAsync(event.data.source);send('info','Python selesai.',{complete:true,status:'success'});}catch(error){send('error',error instanceof Error?error.message:String(error),{complete:true,status:'error'});}});}catch(error){send('error',error instanceof Error?error.message:String(error),{complete:true,status:'error'});}</script></body></html>`;
}

const reactNativeTypeDefinitions = `declare namespace JSX {
  interface Element {}
  interface ElementChildrenAttribute { children: {}; }
}
declare module "react" {
  export type ReactNode = JSX.Element | string | number | null | undefined;
  export interface FunctionComponent<Props = Record<string, unknown>> { (props: Props & { children?: ReactNode }): JSX.Element | null; }
  const React: { createElement(type: unknown, props?: unknown, ...children: unknown[]): JSX.Element };
  export default React;
}
declare module "react-native" {
  import type { FunctionComponent } from "react";
  export type View = FunctionComponent<Record<string, unknown>>;
  export const View: FunctionComponent<Record<string, unknown>>;
  export type Text = FunctionComponent<Record<string, unknown>>;
  export const Text: FunctionComponent<Record<string, unknown>>;
  export type TextInput = FunctionComponent<Record<string, unknown>>;
  export const TextInput: FunctionComponent<Record<string, unknown>>;
  export type ScrollView = FunctionComponent<Record<string, unknown>>;
  export const ScrollView: FunctionComponent<Record<string, unknown>>;
  export type Image = FunctionComponent<Record<string, unknown>>;
  export const Image: FunctionComponent<Record<string, unknown>>;
  export type Pressable = FunctionComponent<Record<string, unknown>>;
  export const Pressable: FunctionComponent<Record<string, unknown>>;
  export type SafeAreaView = FunctionComponent<Record<string, unknown>>;
  export const SafeAreaView: FunctionComponent<Record<string, unknown>>;
  export type Button = FunctionComponent<Record<string, unknown>>;
  export const Button: FunctionComponent<Record<string, unknown>>;
}`;

export default function OneCompilerEditor() {
  const router = useRouter();
  const [source, setSource] = useState("");
  const [files, setFiles] = useState<WorkspaceFile[]>([]);
  const [openFileNames, setOpenFileNames] = useState<string[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [activeName, setActiveName] = useState("");
  const [fileOpen, setFileOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [tab, setTab] = useState<ConsoleTab>("Preview");
  const [mobilePane, setMobilePane] = useState<"editor" | "output">("editor");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [visualViewport, setVisualViewport] = useState<{ height: number; width: number; offsetTop: number } | null>(null);
  const [output, setOutput] = useState("");
  const [previewDocument, setPreviewDocument] = useState("");
  const [previewRunVersion, setPreviewRunVersion] = useState(0);
  const [hasRun, setHasRun] = useState(false);
  const [runState, setRunState] = useState<RunState>("ready");
  const [consoleOpen, setConsoleOpen] = useState(true);
  const [workspaceReady, setWorkspaceReady] = useState(false);
  const [workspaceSaveState, setWorkspaceSaveState] = useState<WorkspaceSaveState>("loading");
  const [history, setHistory] = useState<string[]>([]);
  const [toolPanel, setToolPanel] = useState<ToolPanel | null>(null);
  const [openMenu, setOpenMenu] = useState<"language" | "more" | "new-file" | null>(null);
  const [newFileName, setNewFileName] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFileError, setNewFileError] = useState("");
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() => new Set());
  const [activeFolder, setActiveFolder] = useState("");
  const [paneRatio, setPaneRatio] = useState(58);
  const [previewSize, setPreviewSize] = useState<"desktop" | "iphone" | "pixel">("desktop");
  const [account, setAccount] = useState<EditorUser | null>(null);
  const [cloudSyncEnabled, setCloudSyncEnabled] = useState(false);
  const [aiModels, setAiModels] = useState<{ id: string; label: string; provider: string }[]>([]);
  const [aiModelId, setAiModelId] = useState("");
  const [aiMessages, setAiMessages] = useState<AiMessage[]>([]);
  const [aiInput, setAiInput] = useState("");
  const [aiSending, setAiSending] = useState(false);
  const [aiError, setAiError] = useState("");
  const [terminalCommand, setTerminalCommand] = useState("");
  const [pythonRunnerOpen, setPythonRunnerOpen] = useState(false);
  const [pythonRuntimeReady, setPythonRuntimeReady] = useState(false);
  const [pythonRunRequest, setPythonRunRequest] = useState<{ id: number; source: string } | null>(null);
  const [fontSize, setFontSize] = useState(18);
  const [wordWrap, setWordWrap] = useState(false);
  const [toast, setToast] = useState("");
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const previewRef = useRef<HTMLIFrameElement | null>(null);
  const pythonRunnerRef = useRef<HTMLIFrameElement | null>(null);
  const mainPanesRef = useRef<HTMLDivElement | null>(null);
  const aiMessagesEndRef = useRef<HTMLDivElement | null>(null);
  const phpRuntimeRef = useRef<unknown>(null);
  const nextAiMessageId = useRef(1);
  const lastRunKey = useRef("");
  const nextPythonRunId = useRef(1);
  const monacoTypesReady = useRef(false);
  const explorerTree = useMemo(() => buildExplorerTree(files, folders), [files, folders]);

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }, [dark]);

  useEffect(() => {
    if (!workspaceReady) return;
    try { localStorage.setItem("onecompiler-theme", dark ? "dark" : "light"); } catch {}
  }, [dark, workspaceReady]);

  useEffect(() => {
    let active = true;
    async function loadWorkspace() {
      let localFiles: WorkspaceFile[] = [];
      let localFolders: string[] = [];
      let localActiveName = "";
      try {
        const savedTheme = localStorage.getItem("onecompiler-theme");
        if (savedTheme === "dark") setDark(true);
        const persisted = localStorage.getItem("onecompiler-workspace-v1") ?? localStorage.getItem("courseup-code-workspace");
        if (persisted) {
          const parsed = JSON.parse(persisted) as unknown;
          const value = Array.isArray(parsed) ? { files: parsed } : parsed;
          if (value && typeof value === "object" && "files" in value && Array.isArray(value.files)) {
            localFiles = value.files.filter((file): file is WorkspaceFile => Boolean(file) && typeof file === "object" && typeof file.name === "string" && typeof file.content === "string" && validWorkspacePath(file.name));
            if ("folders" in value && Array.isArray(value.folders)) localFolders = value.folders.filter((folder): folder is string => typeof folder === "string" && validWorkspacePath(folder));
            if ("activeName" in value && typeof value.activeName === "string") localActiveName = value.activeName;
          }
        }
        if (isPristineStarterWorkspace(localFiles)) {
          localFiles = [];
          localFolders = [];
          localActiveName = "";
        }
      } catch {
        if (active) announce("Workspace lokal tidak dapat dibuka");
      }

      if (localFiles.length && active) {
        setFiles(localFiles);
        setFolders(localFolders);
        setFileOpen(true);
        const restoredName = localFiles.some((file) => file.name === localActiveName) ? localActiveName : localFiles[0].name;
        setOpenFileNames([restoredName]);
        setActiveName(restoredName);
        setSource(localFiles.find((file) => file.name === restoredName)?.content ?? "");
        setExpandedFolders(new Set(localFolders));
      }

      try {
        const { user } = await apiRequest<{ user: EditorUser }>("/api/v1/auth/me");
        if (!active) return;
        setAccount(user);
        const remote = await apiRequest<{ files: WorkspaceFile[]; folders?: string[] }>("/api/v1/code-workspace");
        if (!active) return;
        setCloudSyncEnabled(true);
        if (remote.files.length) {
          setFiles(remote.files);
          setFolders(remote.folders ?? []);
          setFileOpen(true);
          setActiveName(remote.files[0].name);
          setOpenFileNames([remote.files[0].name]);
          setSource(remote.files[0].content);
          setWorkspaceSaveState("saved");
        } else if (!localFiles.length) {
          setWorkspaceSaveState("saved");
        } else {
          setWorkspaceSaveState("saving");
        }
      } catch (error) {
        if (!active) return;
        setWorkspaceSaveState((error as { status?: number }).status === 401 ? "local" : "error");
      } finally {
        if (active) setWorkspaceReady(true);
      }
    }
    void loadWorkspace();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const viewport = window.matchMedia("(max-width: 760px)");
    const updateViewport = () => setIsMobileViewport(viewport.matches);
    updateViewport();
    viewport.addEventListener("change", updateViewport);
    return () => viewport.removeEventListener("change", updateViewport);
  }, []);

  useEffect(() => {
    const browserViewport = window.visualViewport;
    if (!browserViewport) return;

    const updateVisualViewport = () => {
      setVisualViewport({
        height: browserViewport.height,
        width: browserViewport.width,
        offsetTop: browserViewport.offsetTop,
      });
    };

    updateVisualViewport();
    browserViewport.addEventListener("resize", updateVisualViewport);
    browserViewport.addEventListener("scroll", updateVisualViewport);

    return () => {
      browserViewport.removeEventListener("resize", updateVisualViewport);
      browserViewport.removeEventListener("scroll", updateVisualViewport);
    };
  }, []);

  useEffect(() => {
    if (!isMobileViewport || !visualViewport) return;

    const frame = window.requestAnimationFrame(() => {
      editorRef.current?.layout();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [isMobileViewport, visualViewport]);

  useEffect(() => {
    if (!workspaceReady) return;
    const timeout = window.setTimeout(() => {
      try {
        localStorage.setItem("onecompiler-workspace-v1", JSON.stringify({ files, folders, activeName }));
        if (!cloudSyncEnabled) setWorkspaceSaveState("local");
      } catch {
        setWorkspaceSaveState("error");
      }
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [activeName, cloudSyncEnabled, files, folders, workspaceReady]);

  useEffect(() => {
    if (!workspaceReady || !cloudSyncEnabled) return;
    const timeout = window.setTimeout(() => {
      setWorkspaceSaveState("saving");
      void apiRequest("/api/v1/code-workspace", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files, folders }),
      }).then(() => setWorkspaceSaveState("saved")).catch((error: { status?: number }) => {
        setWorkspaceSaveState(error.status === 401 ? "local" : "error");
        setCloudSyncEnabled(false);
      });
    }, 2200);
    return () => window.clearTimeout(timeout);
  }, [files, folders, workspaceReady, cloudSyncEnabled]);

  useEffect(() => {
    let active = true;
    apiRequest<{ models: { id: string; label: string; provider: string }[] }>("/api/v1/code-workspace/assistant")
      .then(({ models }) => {
        if (!active) return;
        setAiModels(models);
        setAiModelId((current) => current || models[0]?.id || "");
      })
      .catch((error: Error) => { if (active) setAiError(error.message); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    aiMessagesEndRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [aiMessages, aiSending]);

  const runPreview = useEffectEvent(() => { void runCode(); });

  useEffect(() => {
    if (isMobileViewport || !hasRun || tab !== "Preview") return;
    if (lastRunKey.current === `${activeName}\0${source}`) return;
    const timeout = window.setTimeout(runPreview, 800);
    return () => window.clearTimeout(timeout);
  }, [activeName, hasRun, isMobileViewport, source, tab]);

  useEffect(() => {
    function receivePreviewMessage(event: MessageEvent) {
      const fromPreview = event.source === previewRef.current?.contentWindow;
      const fromPythonRunner = event.source === pythonRunnerRef.current?.contentWindow;
      if (fromPythonRunner && event.data?.type === "code-editor-python-ready") {
        setPythonRuntimeReady(true);
        return;
      }
      if ((!fromPreview && !fromPythonRunner) || event.data?.type !== "code-editor-output") return;
      setOutput((current) => current ? `${current}\n${event.data.text}` : event.data.text);
      if (event.data.complete) setRunState(event.data.status === "error" ? "error" : "success");
      else if (event.data.level === "error") setRunState("error");
    }
    window.addEventListener("message", receivePreviewMessage);
    return () => window.removeEventListener("message", receivePreviewMessage);
  }, []);

  useEffect(() => {
    if (!pythonRuntimeReady || !pythonRunRequest) return;
    pythonRunnerRef.current?.contentWindow?.postMessage({ type: "run-python", source: pythonRunRequest.source }, "*");
  }, [pythonRunRequest, pythonRuntimeReady]);

  function announce(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 1800);
  }

  function updateSource(value: string | undefined) {
    const nextSource = value ?? "";
    setSource(nextSource);
    setWorkspaceSaveState("saving");
    setFiles((current) => current.map((file) => file.name === activeName ? { ...file, content: nextSource } : file));
  }

  function selectAllCode() {
    const editor = editorRef.current;
    const model = editor?.getModel();
    if (!editor || !model) return;
    editor.setSelection(model.getFullModelRange());
    editor.focus();
  }

  async function copySelectedCode() {
    const editor = editorRef.current;
    const model = editor?.getModel();
    const selection = editor?.getSelection();
    if (!editor || !model || !selection || selection.isEmpty()) {
      announce("Pilih kode yang ingin disalin terlebih dahulu");
      return;
    }

    const selectedText = model.getValueInRange(selection);
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard API tidak tersedia");
      await navigator.clipboard.writeText(selectedText);
    } catch {
      const temporaryInput = document.createElement("textarea");
      temporaryInput.value = selectedText;
      temporaryInput.setAttribute("readonly", "");
      temporaryInput.style.position = "fixed";
      temporaryInput.style.opacity = "0";
      document.body.appendChild(temporaryInput);
      temporaryInput.select();
      const copied = document.execCommand("copy");
      temporaryInput.remove();
      if (!copied) {
        editor.focus();
        announce("Clipboard tidak bisa diakses. Periksa izin clipboard browser");
        return;
      }
    }

    editor.focus();
    announce("Kode berhasil disalin");
  }

  async function pasteCode() {
    const editor = editorRef.current;
    const model = editor?.getModel();
    if (!editor || !model) return;

    let pastedText: string;
    try {
      if (!navigator.clipboard?.readText) throw new Error("Clipboard API tidak tersedia");
      pastedText = await navigator.clipboard.readText();
    } catch {
      editor.focus();
      announce("Clipboard tidak bisa dibaca. Izinkan akses clipboard browser lalu coba lagi");
      return;
    }

    const range = editor.getSelection() ?? model.getFullModelRange();
    editor.executeEdits("clipboard-paste", [{ range, text: pastedText, forceMoveMarkers: true }]);
    editor.focus();
  }

  function openFile(name: string) {
    const file = files.find((item) => item.name === name);
    if (!file) return;
    setActiveName(name);
    setSource(file.content);
    setOpenFileNames((current) => current.includes(name) ? current : [...current, name]);
    setFileOpen(true);
    setWorkspaceSaveState("saving");
    setToolPanel(null);
  }

  function addFile(name = newFileName.trim()) {
    const enteredName = name.replaceAll("\\", "/").replace(/^\/+|\/+$/g, "");
    const normalizedName = activeFolder && !enteredName.includes("/") ? `${activeFolder}/${enteredName}` : enteredName;
    if (!validWorkspacePath(normalizedName)) {
      setNewFileError("Masukkan nama file atau path yang valid.");
      return;
    }
    if (files.some((file) => file.name.toLowerCase() === normalizedName.toLowerCase())) {
      setNewFileError("File dengan nama tersebut sudah ada.");
      return;
    }
    const extension = normalizedName.split(".").pop()?.toLowerCase();
    const content = normalizedName === "Main.java" ? starterCode
      : extension === "html" ? starterFiles[1].content
        : extension === "php" ? "<?php\n\necho '<main><h1>Halo dari PHP</h1></main>';"
          : ["tsx", "jsx"].includes(extension ?? "") ? "import React from 'react';\nimport { View, Text } from 'react-native';\n\nexport default function App() {\n  return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><Text>Halo dari React Native</Text></View>;\n}"
            : "";
    const newFolders = parentFolderPaths(normalizedName);
    setFolders((current) => Array.from(new Set([...current, ...newFolders])));
    setExpandedFolders((current) => new Set([...current, ...newFolders]));
    setFiles((current) => [...current, { name: normalizedName, content }]);
    setOpenFileNames((current) => [...current, normalizedName]);
    setActiveName(normalizedName);
    setSource(content);
    setWorkspaceSaveState("saving");
    setFileOpen(true);
    setToolPanel(null);
    setOpenMenu(null);
    setNewFileName("");
    setNewFileError("");
  }

  function createFolder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const enteredName = newFolderName.trim().replaceAll("\\", "/").replace(/^\/+|\/+$/g, "");
    const folderPath = activeFolder && !enteredName.includes("/") ? `${activeFolder}/${enteredName}` : enteredName;
    if (!validWorkspacePath(folderPath) || folderPath.split("/").some((part) => part.includes("."))) {
      setNewFileError("Masukkan nama folder yang valid.");
      return;
    }
    if (folders.some((folder) => folder.toLowerCase() === folderPath.toLowerCase())) {
      setNewFileError("Folder dengan nama tersebut sudah ada.");
      return;
    }
    const newFolders = [...parentFolderPaths(folderPath), folderPath];
    setFolders((current) => Array.from(new Set([...current, ...newFolders])));
    setExpandedFolders((current) => new Set([...current, ...newFolders]));
    setActiveFolder(folderPath);
    setNewFolderName("");
    setNewFileError("");
    setNewFolderOpen(false);
  }

  function removeFile(name: string) {
    if (files.length < 2) {
      announce("Workspace harus memiliki setidaknya satu file");
      return;
    }
    const remaining = files.filter((file) => file.name !== name);
    setFiles(remaining);
    setOpenFileNames((current) => current.filter((fileName) => fileName !== name));
    if (name === activeName) {
      setActiveName(remaining[0].name);
      setSource(remaining[0].content);
    }
  }

  function removeFolder(path: string) {
    if (files.some((file) => file.name.startsWith(`${path}/`))) {
      announce("Hapus file di dalam folder terlebih dahulu");
      return;
    }
    setFolders((current) => current.filter((folder) => folder !== path && !folder.startsWith(`${path}/`)));
    setExpandedFolders((current) => new Set(Array.from(current).filter((folder) => folder !== path && !folder.startsWith(`${path}/`))));
    if (activeFolder === path || activeFolder.startsWith(`${path}/`)) setActiveFolder(parentFolderPaths(path).at(-1) ?? "");
  }

  function renderExplorerNodes(nodes: ExplorerNode[], depth = 0) {
    return nodes.map((node) => node.kind === "folder" ? <div key={node.path}>
      <div className="oc-tree-folder-wrap">
        <button className={`oc-tree-row oc-folder-row${activeFolder === node.path ? " is-selected" : ""}`} type="button" style={{ paddingLeft: 9 + depth * 14 }} onClick={() => {
          setActiveFolder(node.path);
          setExpandedFolders((current) => {
            const next = new Set(current);
            if (next.has(node.path)) next.delete(node.path);
            else next.add(node.path);
            return next;
          });
        }}>
          {expandedFolders.has(node.path) ? <FolderOpen size={15} /> : <Folder size={15} />}<span>{node.name}</span><ChevronRight className={expandedFolders.has(node.path) ? "is-expanded" : ""} size={13} />
        </button>
        <button className="oc-tree-folder-delete" type="button" aria-label={`Delete empty folder ${node.path}`} title="Delete empty folder" onClick={() => removeFolder(node.path)}><X size={13} /></button>
      </div>
      {expandedFolders.has(node.path) && renderExplorerNodes(node.children, depth + 1)}
    </div> : <div className={`oc-tree-row oc-tree-file${activeName === node.path ? " is-selected" : ""}`} key={node.path} style={{ paddingLeft: 25 + depth * 14 }}>
      <button type="button" onClick={() => openFile(node.path)}><span className="oc-java-mark">{node.name.split(".").at(-1)?.slice(0, 1).toUpperCase() ?? "F"}</span><span>{node.name}</span></button>
      <button type="button" aria-label={`Delete ${node.path}`} title="Delete file" onClick={() => removeFile(node.path)}><X size={13} /></button>
    </div>);
  }

  function handleDividerDown(event: PointerEvent<HTMLDivElement>) {
    const container = mainPanesRef.current;
    if (!container) return;
    const bounds = container.getBoundingClientRect();
    event.currentTarget.setPointerCapture(event.pointerId);
    const update = (moveEvent: globalThis.PointerEvent) => setPaneRatio(Math.max(30, Math.min(75, ((moveEvent.clientX - bounds.left) / bounds.width) * 100)));
    const stop = () => {
      container.removeEventListener("pointermove", update);
      container.removeEventListener("pointerup", stop);
      container.removeEventListener("pointercancel", stop);
    };
    container.addEventListener("pointermove", update);
    container.addEventListener("pointerup", stop, { once: true });
    container.addEventListener("pointercancel", stop, { once: true });
  }

  function closeFile(name: string) {
    const remainingOpen = openFileNames.filter((fileName) => fileName !== name);
    setOpenFileNames(remainingOpen);
    if (name !== activeName) return;
    const nextFile = files.find((file) => remainingOpen.includes(file.name));
    if (nextFile) {
      setActiveName(nextFile.name);
      setSource(nextFile.content);
    } else {
      setFileOpen(false);
      setSource("");
    }
  }

  async function sendAiMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const prompt = aiInput.trim();
    if (!prompt || !aiModelId) {
      setAiError(account ? "Model AI belum tersedia." : "Masuk untuk menggunakan AI Agent.");
      return;
    }
    const priorHistory = aiMessages.map((message) => ({ role: message.role, content: message.markdown }));
    const userMessage: AiMessage = { id: nextAiMessageId.current++, role: "user", markdown: prompt };
    setAiMessages((current) => [...current, userMessage]);
    setAiInput("");
    setAiSending(true);
    setAiError("");
    try {
      let remainingContext = 48 * 1024;
      const contextFiles = files.flatMap((file) => {
        if (remainingContext <= 0) return [];
        const content = file.content.slice(0, remainingContext);
        remainingContext -= new TextEncoder().encode(content).byteLength;
        return [{ name: file.name, content }];
      });
      const result = await apiRequest<{ markdown: string; changes: { name: string; content: string }[] }>("/api/v1/code-workspace/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activeFileName: activeName, prompt, modelId: aiModelId, files: contextFiles, history: priorHistory }),
      });
      setAiMessages((current) => [...current, { id: nextAiMessageId.current++, role: "assistant", markdown: result.markdown, changes: result.changes }]);
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "AI Agent belum dapat merespons.");
    } finally {
      setAiSending(false);
    }
  }

  function applyAiChanges(message: AiMessage) {
    const existingNames = new Set(files.map((file) => file.name));
    const validChanges = (message.changes ?? []).filter((change) => existingNames.has(change.name) && new TextEncoder().encode(change.content).byteLength <= 1024 * 1024);
    if (!validChanges.length) {
      setAiError("Tidak ada perubahan file yang valid untuk diterapkan.");
      return;
    }
    const replacements = new Map(validChanges.map((change) => [change.name, change.content]));
    setFiles((current) => current.map((file) => replacements.has(file.name) ? { ...file, content: replacements.get(file.name) ?? file.content } : file));
    if (replacements.has(activeName)) setSource(replacements.get(activeName) ?? source);
    setAiMessages((current) => current.map((item) => item.id === message.id ? { ...item, applied: true } : item));
  }

  function downloadActiveFile() {
    const blob = new Blob([source], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = activeName.split("/").at(-1) ?? activeName;
    link.click();
    URL.revokeObjectURL(url);
    setOpenMenu(null);
  }

  async function downloadWorkspace() {
    const archive = new JSZip();
    for (const folder of folders) archive.folder(folder);
    for (const file of files) archive.file(file.name, file.content);
    const blob = await archive.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "code-workspace.zip";
    link.click();
    URL.revokeObjectURL(url);
    setOpenMenu(null);
  }

  function openLiveBrowser() {
    if (!account) {
      router.push("/login");
      return;
    }
    const liveTab = window.open(`/code/live/local/${account.id}`, "_blank");
    if (liveTab) liveTab.opener = null;
    else announce("Izinkan pop-up untuk membuka preview di browser");
    setOpenMenu(null);
  }

  function selectOutputTab(nextTab: ConsoleTab) {
    setTab(nextTab);
    setMobilePane("output");
    setConsoleOpen(true);
  }

  function submitTerminalCommand(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const command = terminalCommand.trim();
    setTerminalCommand("");
    if (command === "clear") {
      setOutput("");
      return;
    }
    if (command === "help") {
      setOutput("Perintah tersedia: help, clear, run, npm run dev, log <pesan>\nPerintah shell umum lainnya belum didukung.");
      return;
    }
    if (command === "run" || command === "npm run dev" || command === "start") {
      void runCode();
      return;
    }
    if (command.startsWith("log ")) {
      setOutput((current) => [current, command.slice(4)].filter(Boolean).join("\n"));
      return;
    }
    setOutput((current) => [current, `Perintah belum tersedia: ${command || "(kosong)"}. Ketik help untuk daftar perintah.`].filter(Boolean).join("\n"));
  }

  function resetCode() {
    if (!window.confirm(`Reset isi ${activeName}? Perubahan saat ini akan hilang.`)) return;
    updateSource(activeName === "Main.java" ? starterCode : "");
    setHasRun(false);
    setOpenMenu(null);
    announce("Editor reset");
  }

  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    editor.onDidChangeModelContent((event) => {
      if (event.isUndoing || event.isRedoing || event.changes.length !== 1 || event.changes[0].text !== ">") return;
      const extension = activeName.split(".").pop()?.toLowerCase();
      if (!["html", "htm", "jsx", "tsx"].includes(extension ?? "")) return;

      queueMicrotask(() => {
        const model = editor.getModel();
        const change = event.changes[0];
        const lineNumber = change.range.startLineNumber;
        const insertionColumn = change.range.startColumn + change.text.length;
        if (!model || change.range.startLineNumber !== change.range.endLineNumber) return;

        const lineBeforeCursor = model.getLineContent(lineNumber).slice(0, insertionColumn - 1);
        const openingTag = lineBeforeCursor.match(/<([A-Za-z][\w:.-]*)(?:\s[^<>]*)?>$/);
        if (!openingTag || /\/\s*>$/.test(lineBeforeCursor)) return;
        const tagName = openingTag[1];
        if (["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"].includes(tagName.toLowerCase())) return;

        const remainder = model.getValueInRange(new monaco.Range(lineNumber, insertionColumn, lineNumber, model.getLineMaxColumn(lineNumber)));
        if (new RegExp(`^\\s*</${tagName}(?=[\\s>])`, "i").test(remainder)) return;

        editor.executeEdits("auto-close-tag", [{
          range: new monaco.Range(lineNumber, insertionColumn, lineNumber, insertionColumn),
          text: `</${tagName}>`,
          forceMoveMarkers: true,
        }]);
      });
    });
    if (!monacoTypesReady.current) {
      const tsDefaults = monaco.languages.typescript.typescriptDefaults;
      const jsDefaults = monaco.languages.typescript.javascriptDefaults;
      const tsTypePath = "file:///node_modules/@types/react-native/index.d.ts";
      tsDefaults.addExtraLib(reactNativeTypeDefinitions, tsTypePath);
      jsDefaults.addExtraLib(reactNativeTypeDefinitions, tsTypePath);
      tsDefaults.setCompilerOptions({ ...tsDefaults.getCompilerOptions(), allowSyntheticDefaultImports: true, esModuleInterop: true, jsx: monaco.languages.typescript.JsxEmit.React });
      jsDefaults.setCompilerOptions({ ...jsDefaults.getCompilerOptions(), allowSyntheticDefaultImports: true, esModuleInterop: true, jsx: monaco.languages.typescript.JsxEmit.React });
      monacoTypesReady.current = true;
    }
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

  async function runCode() {
    if (!fileOpen) return;
    const extension = activeName.split(".").pop()?.toLowerCase() ?? "";
    lastRunKey.current = `${activeName}\0${source}`;
    setRunState("running");
    setConsoleOpen(true);
    setTab("Preview");
    setMobilePane("output");
    setOpenMenu(null);
    const currentFiles = files.map((file) => file.name === activeName ? { ...file, content: source } : file);
    setFiles(currentFiles);
    if (["html", "htm", "css", "js", "mjs", "cjs"].includes(extension)) {
      setPreviewDocument(createPreviewDocument(currentFiles));
      setPreviewRunVersion((version) => version + 1);
      setOutput("");
      setRunState("success");
    } else if (["jsx", "tsx"].includes(extension)) {
      try {
        const Babel = await import("@babel/standalone");
        const compiled = Babel.transform(source, {
          filename: activeName,
          presets: [["typescript", { allExtensions: true, isTSX: true }], ["react", { runtime: "classic" }]],
          plugins: ["transform-modules-commonjs"],
        }).code;
        if (!compiled) throw new Error("Compiler tidak menghasilkan output.");
        const device = previewSize === "pixel" ? "pixel" : "iphone";
        setPreviewSize(device);
        setPreviewDocument(createNativePreviewDocument(compiled, device));
        setPreviewRunVersion((version) => version + 1);
        setOutput("Transform TSX berhasil. Memuat React Native Web...");
        setRunState("success");
      } catch (error) {
        setOutput(error instanceof Error ? error.message : "Compile TSX gagal.");
        setRunState("error");
      }
    } else if (extension === "php") {
      setOutput("Memuat PHP WebAssembly...");
      try {
        const [{ PHP, loadPHPRuntime }, { getPHPLoaderModule }] = await Promise.all([import("@php-wasm/universal"), import("@php-wasm/web-8-4")]);
        let php = phpRuntimeRef.current as InstanceType<typeof PHP> | null;
        if (!php) {
          const runtimeId = await loadPHPRuntime(await getPHPLoaderModule());
          php = new PHP(runtimeId);
          phpRuntimeRef.current = php;
        }
        const root = "/workspace";
        try { php.mkdir(root); } catch {}
        for (const file of currentFiles) {
          const segments = file.name.split("/");
          segments.pop();
          let directory = root;
          for (const segment of segments) {
            directory += `/${segment}`;
            try { php.mkdir(directory); } catch {}
          }
          php.writeFile(`${root}/${file.name}`, file.content);
        }
        const entryFile = currentFiles.some((file) => file.name === "index.php") ? "index.php" : activeName;
        const response = await php.runStream({ scriptPath: `${root}/${entryFile}` });
        const html = await response.stdoutText;
        const errors = await response.stderrText;
        setOutput([html, errors].filter(Boolean).join("\n") || "PHP selesai tanpa output.");
        setPreviewDocument(createPreviewDocument([{ name: "index.html", content: html }]));
        setPreviewRunVersion((version) => version + 1);
        setRunState(errors ? "error" : "success");
      } catch (error) {
        setOutput(error instanceof Error ? error.message : "PHP WebAssembly gagal dijalankan.");
        setRunState("error");
      }
    } else if (extension === "py") {
      setTab("Terminal");
      setMobilePane("output");
      setOutput("Memuat runtime Python WebAssembly...");
      setPythonRunnerOpen(true);
      setPythonRunRequest({ id: nextPythonRunId.current++, source });
    } else {
      setTab("Terminal");
      setMobilePane("output");
      setOutput(extension === "java"
        ? "Java belum dapat dijalankan: server ini tidak memiliki JDK/javac runner yang terkonfigurasi. Source tidak disimulasikan."
        : `${languageForName(activeName)} dapat diedit dengan syntax highlighting, tetapi runtime belum tersedia.`);
      setRunState("error");
    }
    setHasRun(true);
  }

  function openFindWidget() {
    const editor = editorRef.current;
    if (!editor) return;
    setMobileSidebarOpen(false);
    setToolPanel(null);

    const activateFind = () => {
      editor.focus();
      editor.getAction("actions.find")?.run();

      const restoreFindWidget = () => {
        const widget = editor.getDomNode()?.querySelector(".find-widget") as HTMLElement | null;
        const input = widget?.querySelector(".monaco-findInput textarea") as HTMLTextAreaElement | null;
        const controls = widget?.querySelectorAll<HTMLButtonElement | HTMLInputElement | HTMLTextAreaElement>(
          "button, [role='button'], [role='checkbox'], textarea, input, .monaco-findInput"
        );

        widget?.setAttribute("aria-hidden", "false");
        widget?.style.setProperty("z-index", "60");
        widget?.style.setProperty("visibility", "visible");
        widget?.style.setProperty("opacity", "1");
        widget?.style.setProperty("pointer-events", "auto");

        controls?.forEach((element) => {
          element.removeAttribute("disabled");
          element.setAttribute("aria-disabled", "false");
        });

        if (input) {
          input.removeAttribute("disabled");
          input.setAttribute("aria-disabled", "false");
          input.focus();
          try {
            const value = input.value ?? "";
            input.setSelectionRange(value.length, value.length);
          } catch {}
        }

        if (widget) {
          widget.scrollIntoView({ block: "nearest", inline: "nearest" });
        }
      };

      window.requestAnimationFrame(() => {
        window.setTimeout(restoreFindWidget, 0);
      });
    };

    window.setTimeout(activateFind, 25);
  }

  function toggleToolPanel(panel: ToolPanel) {
    setMobileSidebarOpen(false);
    setOpenMenu(null);
    if (panel === "history") {
      const key = `code-editor-${activeName}`;
      try {
        const persisted = localStorage.getItem(key);
        if (persisted !== null) setHistory((items) => [persisted, ...items.filter((item) => item !== persisted)].slice(0, 5));
      } catch {
        announce("Riwayat penyimpanan tidak dapat dibuka");
      }
    }
    setToolPanel((current) => current === panel ? null : panel);
  }

  const mobileViewportStyle: CSSProperties = isMobileViewport && visualViewport
    ? {
        position: "fixed",
        top: visualViewport.offsetTop,
        left: 0,
        width: visualViewport.width,
        height: visualViewport.height,
      }
    : {};

  return (
    <main
      className={`onecompiler-app${dark ? " is-dark" : ""}${mobilePane === "output" ? " is-mobile-output" : ""}${isMobileViewport && visualViewport ? " is-mobile-viewport" : ""}`}
      style={mobileViewportStyle}
    >
      <header className="oc-navbar">
        <div className="oc-brand-group">
          <button className="oc-back-button" type="button" aria-label="Kembali ke beranda" title="Kembali ke beranda" onClick={() => router.push("/")}>
            <ArrowLeft size={16} />
          </button>
          <a className="oc-brand" href="/code" aria-label="Code Editor home">
            <span className="oc-brand-mark"><Code2 size={23} strokeWidth={2.2} /></span>
            <span>Code Editor</span>
          </a>
        </div>

        <div className="oc-run-group">
          <button className="oc-icon-button oc-more-button" type="button" aria-label="More options" aria-expanded={openMenu === "more"} onClick={() => setOpenMenu((current) => current === "more" ? null : "more")}><EllipsisVertical size={21} /></button>
          {openMenu === "more" && <div className="oc-top-popover oc-more-menu" role="menu">
            <button type="button" role="menuitem" onClick={downloadActiveFile}><Download size={16} />Download file</button>
            <button type="button" role="menuitem" onClick={() => void downloadWorkspace()}><Files size={16} />Download workspace ZIP</button>
            <button type="button" role="menuitem" onClick={openLiveBrowser}><ExternalLink size={16} />Open in browser</button>
            <button type="button" role="menuitem" onClick={resetCode}><X size={16} />Reset file</button>
          </div>}
          <button className="oc-account-button" type="button" aria-label={account ? `Account ${account.full_name}` : "Login"} title={account?.full_name ?? "Login"} onClick={() => router.push(account ? "/dashboard" : "/login")}>
            <CircleUserRound size={20} />
            <span>{account ? account.full_name.split(" ")[0] : "Login"}</span>
          </button>
          <span className={`oc-autosave is-${workspaceSaveState}`} role="status"><span />{workspaceSaveState === "loading" ? "Memuat" : workspaceSaveState === "saving" ? "Menyimpan" : workspaceSaveState === "error" ? "Belum tersinkron" : workspaceSaveState === "local" ? "Tersimpan lokal" : "Tersimpan"}</span>
          <button className="oc-action oc-run-button" type="button" onClick={runCode}><Play size={17} fill="currentColor" />Run</button>
        </div>
      </header>

      <nav className="oc-mobile-switch" aria-label="Workspace panels">
        <button type="button" className={mobilePane === "editor" ? "is-active" : ""} onClick={() => setMobilePane("editor")}><Code2 size={15} />Editor</button>
        <button type="button" className={mobilePane === "output" && tab === "Preview" ? "is-active" : ""} onClick={() => selectOutputTab("Preview")}><Monitor size={15} />Preview</button>
      </nav>

      <aside className={`oc-sidebar${mobileSidebarOpen ? " is-mobile-expanded" : ""}`} aria-label="Editor tools">
        {mobileSidebarOpen && <button className="oc-mobile-sidebar-close" type="button" onClick={() => setMobileSidebarOpen(false)}><X size={20} /><span>Close menu</span></button>}
        <div className="oc-sidebar-top">
          <button className={toolPanel === "files" ? "is-active" : ""} type="button" aria-label="Files" aria-expanded={toolPanel === "files"} onClick={() => toggleToolPanel("files")}><Files /><span>Files</span></button>
          <button type="button" aria-label="Search" title="Find in code" onClick={openFindWidget}><Search /><span>Search</span></button>
        </div>
        <div className="oc-sidebar-bottom">
          <button className={toolPanel === "history" ? "is-active" : ""} type="button" aria-label="History" aria-expanded={toolPanel === "history"} onClick={() => toggleToolPanel("history")}><History /><span>History</span></button>
          <button className={toolPanel === "settings" ? "is-active" : ""} type="button" aria-label="Settings" aria-expanded={toolPanel === "settings"} onClick={() => toggleToolPanel("settings")}><Settings /><span>Settings</span></button>
        </div>
      </aside>
      {mobileSidebarOpen && <button className="oc-sidebar-backdrop" type="button" aria-label="Tutup overlay sidebar" onClick={() => setMobileSidebarOpen(false)} />}

      {toolPanel && <section className={`oc-tool-panel${toolPanel === "files" ? " is-files-panel" : toolPanel === "history" ? " is-history-panel" : " is-settings-panel"}`} aria-label={`${toolPanel} panel`}>
        <div className="oc-tool-panel-heading"><strong>{toolPanel === "files" ? "Files" : toolPanel === "history" ? "History" : "Settings"}</strong><button type="button" aria-label="Close panel" onClick={() => setToolPanel(null)}><X size={17} /></button></div>
        {toolPanel === "files" && <div className="oc-tool-panel-body">
          <div className="oc-explorer-actions"><button type="button" aria-label="New file" title="New file" onClick={() => { setOpenMenu("new-file"); setNewFolderOpen(false); setNewFileError(""); }}><Plus size={16} /></button><button type="button" aria-label="New folder" title="New folder" onClick={() => { setNewFolderOpen((open) => !open); setOpenMenu(null); setNewFileError(""); }}><FolderPlus size={16} /></button></div>
          {openMenu === "new-file" && <form className="oc-create-form" onSubmit={(event) => { event.preventDefault(); addFile(); }}><label htmlFor="oc-new-file-name">New file {activeFolder ? `in ${activeFolder}` : ""}</label><input id="oc-new-file-name" autoFocus value={newFileName} onChange={(event) => { setNewFileName(event.target.value); setNewFileError(""); }} placeholder="src/index.php" /><small>Press Enter to create</small>{newFileError && <small role="alert">{newFileError}</small>}</form>}
          {newFolderOpen && <form className="oc-create-form" onSubmit={createFolder}><label htmlFor="oc-new-folder-name">New folder {activeFolder ? `in ${activeFolder}` : ""}</label><input id="oc-new-folder-name" autoFocus value={newFolderName} onChange={(event) => { setNewFolderName(event.target.value); setNewFileError(""); }} placeholder="src" /><small>Press Enter to create</small>{newFileError && <small role="alert">{newFileError}</small>}</form>}
          <div className="oc-file-list">{files.length ? renderExplorerNodes(explorerTree) : <p className="oc-panel-empty">Workspace masih kosong. Buat file pertama untuk mulai menulis kode.</p>}</div>
        </div>}
        {toolPanel === "history" && <div className="oc-tool-panel-body"><p className="oc-panel-caption">Saved versions of {activeName}</p>{history.length ? history.map((version, index) => <button className="oc-history-item" key={`${index}-${version.slice(0, 12)}`} type="button" onClick={() => { updateSource(version); setToolPanel(null); announce("Version restored"); }}><span>Version {history.length - index}</span><code>{version.split("\n")[0] || "Empty file"}</code></button>) : <p className="oc-panel-empty">No saved versions yet</p>}</div>}
        {toolPanel === "settings" && <div className="oc-tool-panel-body"><div className="oc-setting-row"><span>Font size</span><div><button type="button" aria-label="Decrease font size" onClick={() => setFontSize((size) => Math.max(12, size - 1))}>-</button><span>{fontSize}px</span><button type="button" aria-label="Increase font size" onClick={() => setFontSize((size) => Math.min(28, size + 1))}>+</button></div></div><button className="oc-setting-toggle" type="button" aria-pressed={wordWrap} onClick={() => setWordWrap((value) => !value)}><span>Word wrap</span><span>{wordWrap ? "On" : "Off"}</span></button><button className="oc-setting-toggle" type="button" onClick={() => setDark((value) => !value)}><span>Dark theme</span><span>{dark ? "On" : "Off"}</span></button></div>}
      </section>}

      <div className="oc-workbench" ref={mainPanesRef} style={{ gridTemplateColumns: `${paneRatio}fr 8px ${100 - paneRatio}fr` }}>
      <section className="oc-editor-pane" aria-label="Code editor">
        <div className="oc-editor-tabs" role="group" aria-label="Open files">
          <button className="oc-editor-menu-toggle" type="button" aria-label={mobileSidebarOpen ? "Tutup menu sidebar" : "Buka menu sidebar"} aria-expanded={mobileSidebarOpen} onClick={() => setMobileSidebarOpen((open) => !open)}>{mobileSidebarOpen ? <X size={17} /> : <Menu size={17} />}</button>
          {openFileNames.map((name) => <div className={`oc-file-tab${name === activeName ? " is-active" : ""}`} key={name} role="tab" aria-selected={name === activeName} tabIndex={0} onClick={() => openFile(name)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") openFile(name); }}><span className="oc-java-mark">{name.split(".").pop()?.slice(0, 1).toUpperCase() ?? "F"}</span><span>{name}</span><button type="button" aria-label={`Close ${name}`} onClick={(event) => { event.stopPropagation(); closeFile(name); }}><X size={17} /></button></div>)}
          <button className="oc-add-file" type="button" aria-label="Add file" aria-expanded={openMenu === "new-file"} onClick={() => { setToolPanel("files"); setOpenMenu("new-file"); setNewFileError(""); }}><Plus size={21} /></button>
        </div>
        <div className="oc-clipboard-tools" role="group" aria-label="Code selection and clipboard">
          <button type="button" onClick={selectAllCode} title="Pilih semua kode"><span>Select all</span></button>
          <button type="button" onClick={() => void copySelectedCode()} title="Salin kode terpilih"><Copy size={15} /><span>Copy</span></button>
          <button type="button" onClick={() => void pasteCode()} title="Tempel dari clipboard"><ClipboardPaste size={15} /><span>Paste</span></button>
        </div>
        <div className="oc-monaco-wrap">
          {fileOpen ? <Editor
            key={activeName}
            path={activeName}
            height="100%"
            language={languageForName(activeName)}
            theme={dark ? "onecompiler-dark" : "onecompiler-light"}
            value={source}
            onChange={updateSource}
            onMount={handleEditorMount}
            options={{
              automaticLayout: true,
              editContext: !isMobileViewport,
              fontFamily: "Consolas, 'Fira Code', monospace",
              fontSize,
              lineHeight: 26,
              fontLigatures: false,
              lineNumbers: "on",
              minimap: { enabled: false },
              autoClosingBrackets: "languageDefined",
              autoClosingQuotes: "languageDefined",
              autoIndent: "full",
              scrollBeyondLastLine: false,
              renderLineHighlight: "all",
              guides: { indentation: true, bracketPairs: true },
              bracketPairColorization: { enabled: true },
              folding: false,
              glyphMargin: false,
              overviewRulerLanes: 0,
              scrollbar: isMobileViewport
                ? { vertical: "visible", horizontal: "visible", verticalScrollbarSize: 10, horizontalScrollbarSize: 10, useShadows: false, alwaysConsumeMouseWheel: false }
                : { vertical: "visible", verticalScrollbarSize: 12, horizontalScrollbarSize: 10, useShadows: false, alwaysConsumeMouseWheel: false },
              padding: { top: 14, bottom: 12 },
              tabSize: 4,
              wordWrap: wordWrap ? "on" : "off",
            }}
          /> : <div className="oc-editor-closed"><Code2 size={28} /><strong>Mulai dari file baru</strong><span>Buat file untuk mulai menulis kode.</span><button type="button" onClick={() => { setToolPanel("files"); setOpenMenu("new-file"); setNewFileError(""); }}>Buat file</button></div>}
        </div>
      </section>

      <div className="oc-resize-handle" role="separator" aria-orientation="vertical" aria-label="Resize editor and panel" onPointerDown={handleDividerDown}><span /></div>

      <section className={`oc-console-pane${consoleOpen ? "" : " is-hidden"}`} aria-label="Program output">
        {tab === "Preview" && ["tsx", "jsx"].includes(activeName.split(".").pop()?.toLowerCase() ?? "") && <div className="oc-console-tabs"><div className="oc-device-picker" aria-label="Preview device"><button className={previewSize === "iphone" ? "is-active" : ""} type="button" onClick={() => setPreviewSize("iphone")}>iPhone</button><button className={previewSize === "pixel" ? "is-active" : ""} type="button" onClick={() => setPreviewSize("pixel")}>Pixel</button></div></div>}
        <div className="oc-console-content" role="tabpanel">
          {tab === "Preview" && (previewDocument ? <div className={`oc-preview-stage${["tsx", "jsx"].includes(activeName.split(".").pop()?.toLowerCase() ?? "") ? " is-native" : ""}`}>
            {["tsx", "jsx"].includes(activeName.split(".").pop()?.toLowerCase() ?? "") ? <div className={`oc-device-frame is-${previewSize}`}><div className="oc-device-screen"><div className="oc-device-status"><span>9:41</span><span>● ▮ ▰</span></div><div className="oc-device-camera" /><iframe key={previewRunVersion} ref={previewRef} title={`${previewSize} React Native Web preview`} sandbox="allow-scripts" srcDoc={previewDocument} /><div className="oc-device-home" /></div></div> : <iframe key={previewRunVersion} ref={previewRef} onLoad={() => setRunState((state) => state === "running" ? "success" : state)} className="oc-preview-frame" title="Live code preview" sandbox="allow-scripts" srcDoc={previewDocument} />}
          </div> : <div className="oc-empty-state"><Code2 className="oc-empty-icon" size={42} strokeWidth={1.7} /><strong>Preview</strong><span>Run project untuk melihat hasil</span></div>)}
          {tab === "Terminal" && <div className="oc-terminal-view"><pre className="oc-output">{output || "Terminal siap. Ketik help untuk melihat perintah yang tersedia."}</pre><form className="oc-terminal-command" onSubmit={submitTerminalCommand}><span>›</span><input value={terminalCommand} onChange={(event) => setTerminalCommand(event.target.value)} aria-label="Terminal command" placeholder="help" autoComplete="off" spellCheck={false} /><button type="submit" aria-label="Run terminal command"><Play size={15} /></button></form></div>}
          {tab === "AI Agent" && <section className="oc-ai-view" aria-label="AI Agent">
            <header className="oc-ai-heading"><span><Bot size={18} /></span><div><strong>AI Agent</strong><small>{account ? "Konteks file project aktif" : "Masuk untuk menggunakan AI"}</small></div><select aria-label="AI model" value={aiModelId} onChange={(event) => setAiModelId(event.target.value)} disabled={!aiModels.length || aiSending}><option value="">{aiModels.length ? "Pilih model" : "Belum tersedia"}</option>{aiModels.map((model) => <option value={model.id} key={model.id}>{model.label}</option>)}</select></header>
            <div className="oc-ai-messages" aria-live="polite">
              {!aiMessages.length && <div className="oc-ai-welcome"><Sparkles size={24} /><strong>Halo, aku siap bantu.</strong><span>Tanya tentang kode atau minta bantuan mencari bug.</span></div>}
              {aiMessages.map((message) => <article className={`oc-ai-message is-${message.role}`} key={message.id}><span>{message.role === "user" ? "Kamu" : "AI Agent"}</span><div><ReactMarkdown>{message.markdown}</ReactMarkdown></div>{!!message.changes?.length && <div className="oc-ai-changes"><p>{message.changes.length} proposed file change{message.changes.length === 1 ? "" : "s"}</p>{message.changes.map((change) => <code key={`${message.id}-${change.name}`}>{change.name}</code>)}<button type="button" disabled={message.applied} onClick={() => applyAiChanges(message)}>{message.applied ? <Check size={14} /> : <CheckCircle2 size={14} />}{message.applied ? "Applied" : "Apply changes"}</button></div>}</article>)}
              {aiSending && <div className="oc-ai-thinking">Menganalisis file project...</div>}
              <div ref={aiMessagesEndRef} />
            </div>
            {aiError && <p className="oc-ai-error" role="alert">{aiError}</p>}
            <form className="oc-ai-composer" onSubmit={sendAiMessage}><textarea value={aiInput} onChange={(event) => setAiInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} placeholder={`Tanya tentang ${activeName}...`} rows={3} maxLength={2000} /><button type="submit" aria-label="Send message" disabled={aiSending || !aiInput.trim()}><Send size={16} />{aiSending ? "Mengirim" : "Kirim"}</button></form>
          </section>}
        </div>
      </section>
      </div>

      <footer className="oc-statusbar">
        <div className="oc-status-left">
          <span className={`oc-run-status is-${runState}`} role="status">
            {runState === "error" ? <Bug size={15} /> : <CheckCircle2 size={15} />}
            {runState === "running" ? "Running..." : runState === "success" ? "Run selesai" : runState === "error" ? "Perlu diperbaiki" : "Siap"}
          </span>
          <span className={`oc-workspace-status is-${workspaceSaveState}`} aria-live="polite">
            <Save size={13} />{workspaceSaveState === "loading" ? "Memuat..." : workspaceSaveState === "saving" ? "Menyimpan..." : workspaceSaveState === "error" ? "Belum tersinkron" : workspaceSaveState === "local" ? "Tersimpan lokal" : "Tersimpan cloud"}
          </span>
        </div>
        <div className="oc-status-right">{activeName && <span>{languageForName(activeName).toUpperCase()}</span>}</div>
      </footer>
      {pythonRunnerOpen && <iframe ref={pythonRunnerRef} className="oc-python-runner" title="Python WebAssembly runtime" aria-hidden="true" sandbox="allow-scripts" srcDoc={createPythonRunnerDocument()} />}
      {toast && <div className="oc-toast" role="status">{toast}</div>}
    </main>
  );
}