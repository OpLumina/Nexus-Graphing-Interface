import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  openFile: (): Promise<{ path: string; content: string } | null> =>
    ipcRenderer.invoke("file:open"),

  saveFile: (args: { defaultPath: string; content: string }): Promise<string | null> =>
    ipcRenderer.invoke("file:save", args),

  exportFile: (args: { defaultPath: string; content: string; encoding: "utf-8" | "base64" }): Promise<string | null> =>
    ipcRenderer.invoke("file:export", args),

  listSaves: (): Promise<{ name: string; mtime: number }[]> =>
    ipcRenderer.invoke("file:list-saves"),

  quickSave: (content: string): Promise<string | null> =>
    ipcRenderer.invoke("file:quick-save", content),

  loadSave: (name: string): Promise<string> =>
    ipcRenderer.invoke("file:load-save", name),
});
