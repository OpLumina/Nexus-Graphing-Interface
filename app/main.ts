import { app, BrowserWindow, ipcMain, dialog, shell } from "electron";
import { readFile, writeFile, readdir, mkdir, stat } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

const DEV_URL = "http://localhost:5173";
const PROD_DIST_DIR = join(__dirname, "../frontend/dist");
const PROD_INDEX = join(PROD_DIST_DIR, "index.html");
const isDev = !app.isPackaged;

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: "#1a1a1a",
    titleBarStyle: "hidden",
    webPreferences: {
      preload: join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // Deny all attempts to open new windows; route external links to the OS
  // browser instead of spawning a renderer that still holds the electronAPI
  // bridge (ENV-2).
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) void shell.openExternal(url);
    return { action: "deny" };
  });

  // Block in-page navigation away from the app's own origin so a stray link or
  // compromised renderer cannot load a remote page that retains the bridge.
  // ENV-9: in prod the guard is scoped to the bundled dist directory's file URL
  // — a bare `file://` prefix would let a compromised renderer navigate to any
  // local file (`file:///etc/passwd`, `file:///C:/...`). The trailing separator
  // ensures only paths *inside* dist match (not a sibling `dist-evil/`).
  const allowedOrigin = isDev
    ? DEV_URL
    : pathToFileURL(PROD_DIST_DIR + sep).href;
  const guardNavigation = (event: Electron.Event, url: string) => {
    if (!url.startsWith(allowedOrigin)) event.preventDefault();
  };
  win.webContents.on("will-navigate", guardNavigation);
  win.webContents.on("will-redirect", guardNavigation);

  if (isDev) {
    win.loadURL(DEV_URL);
  } else {
    win.loadFile(PROD_INDEX);
  }

  return win;
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.on("window:minimize", (event) => {
  BrowserWindow.fromWebContents(event.sender)?.minimize();
});

ipcMain.on("window:maximize", (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return;
  win.isMaximized() ? win.unmaximize() : win.maximize();
});

ipcMain.on("window:close", (event) => {
  BrowserWindow.fromWebContents(event.sender)?.close();
});

ipcMain.handle("file:open", async () => {
  const result = await dialog.showOpenDialog({
    filters: [
      { name: "NexusGraph", extensions: ["ngraph", "ngp"] },
      { name: "All Files", extensions: ["*"] },
    ],
    properties: ["openFile"],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  const path = result.filePaths[0];
  const content = await readFile(path, "utf-8");
  return { path, content };
});

ipcMain.handle("file:save", async (_event, { defaultPath, content }: { defaultPath: string; content: string }) => {
  const result = await dialog.showSaveDialog({
    defaultPath,
    filters: [{ name: "NexusGraph", extensions: ["ngraph"] }],
  });
  if (result.canceled || !result.filePath) return null;
  await writeFile(result.filePath, content, "utf-8");
  return result.filePath;
});

ipcMain.handle("file:export", async (_event, { defaultPath, content, encoding }: { defaultPath: string; content: string; encoding: "utf-8" | "base64" }) => {
  const result = await dialog.showSaveDialog({ defaultPath });
  if (result.canceled || !result.filePath) return null;
  await writeFile(result.filePath, Buffer.from(content, encoding));
  return result.filePath;
});

function getSavesDir(): string {
  return isDev
    ? join(app.getAppPath(), "saves")
    : join(app.getPath("userData"), "saves");
}

ipcMain.handle("file:list-saves", async () => {
  const dir = getSavesDir();
  await mkdir(dir, { recursive: true });
  const entries = await readdir(dir);
  const files = entries.filter(f => f.endsWith(".ngraph") || f.endsWith(".ngp"));
  const stats = await Promise.all(
    files.map(async name => {
      const s = await stat(join(dir, name));
      return { name, mtime: s.mtimeMs };
    })
  );
  return stats.sort((a, b) => b.mtime - a.mtime);
});

ipcMain.handle("file:quick-save", async (_event, content: string) => {
  const dir = getSavesDir();
  await mkdir(dir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const name = `graph-${ts}.ngraph`;
  await writeFile(join(dir, name), content, "utf-8");
  return name;
});

ipcMain.handle("file:load-save", async (_event, name: string) => {
  const dir = getSavesDir();
  // Reject path traversal: the resolved target must stay inside the saves dir.
  if (typeof name !== "string" || name.includes("/") || name.includes("\\") || name.includes("..")) {
    throw new Error("Invalid save name");
  }
  const dirResolved = resolve(dir);
  const target = resolve(dirResolved, name);
  if (target !== dirResolved && !target.startsWith(dirResolved + sep)) {
    throw new Error("Invalid save name");
  }
  return readFile(target, "utf-8");
});
