"use client";

import { useEffect, useMemo, useState } from "react";

type WorkspaceFile = { name: string; content: string };

function extensionOf(name: string) {
  return name.split(".").at(-1)?.toLowerCase() ?? "";
}

function createWebDocument(files: WorkspaceFile[]) {
  const htmlFile = files.find((file) => ["html", "htm"].includes(extensionOf(file.name)));
  const styles = files.filter((file) => extensionOf(file.name) === "css").map((file) => file.content).join("\n");
  const scripts = files.filter((file) => ["js", "mjs", "cjs"].includes(extensionOf(file.name))).map((file) => file.content).join("\n");
  let document = htmlFile?.content ?? "<main><h1>Preview project</h1></main>";
  if (!/<html(?:\s|>)/i.test(document)) document = `<!doctype html><html><head></head><body>${document}</body></html>`;
  const safeStyles = styles.replace(/<\/style/gi, "<\\/style");
  const safeScripts = scripts.replace(/<\/script/gi, "<\\/script");
  const security = `<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob: https:; font-src data: https:; connect-src 'none'; form-action 'none'; base-uri 'none'"><style>${safeStyles}</style>`;
  if (/<head(?:\s|>)/i.test(document)) document = document.replace(/<head([^>]*)>/i, `<head$1>${security}`);
  else document = document.replace(/<html([^>]*)>/i, `<html$1><head>${security}</head>`);
  if (safeScripts) document = /<\/body>/i.test(document) ? document.replace(/<\/body>/i, `<script>${safeScripts}<\/script></body>`) : `${document}<script>${safeScripts}<\/script>`;
  return document;
}

function createNativeDocument(compiledCode: string) {
  const safeBundle = JSON.stringify(compiledCode.replace(/<\/script/gi, "<\\/script"));
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' https://esm.sh; style-src 'unsafe-inline'; img-src data: blob: https:; font-src data: https:; connect-src https://esm.sh; form-action 'none'; base-uri 'none'"><script type="importmap">{"imports":{"react":"https://esm.sh/react@19.2.8","react-dom":"https://esm.sh/react-dom@19.2.8?external=react","react-dom/client":"https://esm.sh/react-dom@19.2.8/client?external=react","react-native":"https://esm.sh/react-native-web@0.21.3?external=react,react-dom"}}</script><style>html,body,#root{min-height:100%;margin:0}body{font-family:system-ui,sans-serif}</style></head><body><div id="root"></div><script type="module">import React from 'react';import{createRoot}from'react-dom/client';import*as Native from'react-native';const compiled=${safeBundle};try{const module={exports:{}};const requireModule=(name)=>name==='react'?React:name==='react-native'?Native:(()=>{throw new Error('Import belum didukung: '+name)})();new Function('module','exports','require',compiled)(module,module.exports,requireModule);const App=module.exports.default||module.exports.App;if(!App)throw new Error('Buat komponen App sebagai export default.');createRoot(document.getElementById('root')).render(React.createElement(App));}catch(error){document.body.textContent=error instanceof Error?error.message:String(error)}</script></body></html>`;
}

export default function LiveWorkspacePreview({ initialFiles }: { initialFiles: WorkspaceFile[] }) {
  const [files, setFiles] = useState(initialFiles);
  const [previewDocument, setPreviewDocument] = useState("");
  const [previewError, setPreviewError] = useState("");
  const [device, setDevice] = useState<"iphone" | "pixel">("iphone");
  const activeFile = useMemo(() => files.find((file) => ["tsx", "jsx"].includes(extensionOf(file.name))) ?? files[0] ?? { name: "index.html", content: "<main><h1>Workspace lokal belum tersedia</h1></main>" }, [files]);
  const isNative = ["tsx", "jsx"].includes(extensionOf(activeFile.name));

  useEffect(() => {
    const restoreTimer = window.setTimeout(() => {
      try {
        const saved = localStorage.getItem("onecompiler-workspace-v1");
        if (saved) {
          const workspace = JSON.parse(saved) as { files?: unknown };
          if (Array.isArray(workspace.files) && workspace.files.length && workspace.files.every((file) => file && typeof file.name === "string" && typeof file.content === "string")) setFiles(workspace.files);
        }
      } catch {}
    }, 0);

    function receiveLocalWorkspace(event: StorageEvent) {
      if (event.key !== "onecompiler-workspace-v1" || !event.newValue) return;
      try {
        const workspace = JSON.parse(event.newValue) as { files?: unknown };
        if (Array.isArray(workspace.files) && workspace.files.length && workspace.files.every((file) => file && typeof file.name === "string" && typeof file.content === "string")) setFiles(workspace.files);
      } catch {}
    }
    window.addEventListener("storage", receiveLocalWorkspace);
    return () => {
      window.clearTimeout(restoreTimer);
      window.removeEventListener("storage", receiveLocalWorkspace);
    };
  }, []);

  useEffect(() => {
    let active = true;
    async function buildPreview() {
      const extension = extensionOf(activeFile.name);
      if (["tsx", "jsx"].includes(extension)) {
        try {
          const Babel = await import("@babel/standalone");
          const compiled = Babel.transform(activeFile.content, {
            filename: activeFile.name,
            presets: [["typescript", { allExtensions: true, isTSX: true }], ["react", { runtime: "classic" }]],
            plugins: ["transform-modules-commonjs"],
          }).code;
          if (!compiled) throw new Error("Compiler tidak menghasilkan output.");
          if (active) {
            setPreviewError("");
            setPreviewDocument(createNativeDocument(compiled));
          }
        } catch (error) {
          if (active) setPreviewError(error instanceof Error ? error.message : "Preview React Native Web gagal dibuat.");
        }
      } else if (active) {
        setPreviewError("");
        setPreviewDocument(createWebDocument(files));
      }
    }
    void buildPreview();
    return () => { active = false; };
  }, [activeFile, files]);

  return <section className="code-live-preview">
    <div className="code-live-toolbar"><strong>{activeFile.name}</strong>{isNative && <div><button className={device === "iphone" ? "is-active" : ""} type="button" onClick={() => setDevice("iphone")}>iPhone</button><button className={device === "pixel" ? "is-active" : ""} type="button" onClick={() => setDevice("pixel")}>Pixel</button></div>}<span>Preview aktif</span></div>
    <div className={`code-live-stage${isNative ? " is-native" : ""}`}>
      {previewError ? <p role="alert">{previewError}</p> : isNative ? <div className={`code-live-device is-${device}`}><div className="code-live-screen"><div className="code-live-device-status"><span>9:41</span><span>● ▮ ▰</span></div><div className="code-live-camera" /><iframe title={`${device} React Native Web live preview`} sandbox="allow-scripts" srcDoc={previewDocument} /><div className="code-live-home" /></div></div> : <iframe title="Owner live web preview" sandbox="allow-scripts" srcDoc={previewDocument} />}
    </div>
  </section>;
}