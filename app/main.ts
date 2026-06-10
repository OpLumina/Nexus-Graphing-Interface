import { app, BrowserWindow, ipcMain, dialog, shell } from "electron";
import { readFile, writeFile, readdir, mkdir, stat } from "node:fs/promises";
import { join } from "node:path";

const DEV_URL = "http://localhost:5173";
const PROD_INDEX = join(__dirname, "../frontend/dist/index.html");
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
    },
  });

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
  return readFile(join(dir, name), "utf-8");
});
