"use strict";
const electron = require("electron");
const path = require("path");
const fs = require("fs");
const https = require("https");
const http = require("http");
const crypto = require("crypto");
const VITE_DEV_SERVER_URL = "http://localhost:5173";
const COMFYUI_OUTPUT_DIR = path.join(electron.app.getPath("home"), "ComfyUI", "output");
const WINDOW_STATE_FILE = path.join(electron.app.getPath("userData"), "window-state.json");
function loadWindowState() {
  try {
    if (fs.existsSync(WINDOW_STATE_FILE)) {
      const data = fs.readFileSync(WINDOW_STATE_FILE, "utf8");
      return JSON.parse(data);
    }
  } catch {
  }
  return null;
}
function saveWindowState(state) {
  try {
    fs.writeFileSync(WINDOW_STATE_FILE, JSON.stringify(state));
  } catch {
  }
}
let mainWindow = null;
function createWindow() {
  const state = loadWindowState();
  const defaultWidth = 1400;
  const defaultHeight = 900;
  const iconPath = electron.app.isPackaged ? path.join(electron.app.getAppPath(), "icon/icon.ico") : path.join(__dirname, "../icon/icon.ico");
  mainWindow = new electron.BrowserWindow({
    width: (state == null ? void 0 : state.width) || defaultWidth,
    height: (state == null ? void 0 : state.height) || defaultHeight,
    x: state == null ? void 0 : state.x,
    y: state == null ? void 0 : state.y,
    minWidth: 1200,
    minHeight: 700,
    frame: false,
    // 无边框窗口
    backgroundColor: "#09090b",
    titleBarStyle: "hidden",
    titleBarOverlay: {
      color: "#09090b",
      symbolColor: "#e4e4e7",
      height: 40
    },
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false
      // 允许跨域请求 ComfyUI
    },
    icon: iconPath
  });
  if (state == null ? void 0 : state.isMaximized) {
    mainWindow.maximize();
  }
  if (!electron.app.isPackaged) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    const indexPath = path.join(electron.app.getAppPath(), "dist", "index.html");
    mainWindow.loadFile(indexPath);
  }
  mainWindow.webContents.session.webRequest.onBeforeSendHeaders(
    { urls: ["ws://*/*", "wss://*/*"] },
    (details, callback) => {
      const url = new URL(details.url);
      if (details.url.includes("/ws") && details.url.includes("clientId=")) {
        const targetProtocol = url.protocol === "wss:" ? "https:" : "http:";
        details.requestHeaders["Origin"] = `${targetProtocol}//${url.host}`;
      }
      callback({ requestHeaders: details.requestHeaders });
    }
  );
  mainWindow.on("close", () => {
    if (mainWindow) {
      const bounds = mainWindow.getBounds();
      const isMaximized = mainWindow.isMaximized();
      saveWindowState({ ...bounds, isMaximized });
    }
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}
electron.ipcMain.on("window-minimize", () => mainWindow == null ? void 0 : mainWindow.minimize());
electron.ipcMain.on("window-maximize", () => {
  if (mainWindow == null ? void 0 : mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow == null ? void 0 : mainWindow.maximize();
  }
});
electron.ipcMain.on("window-close", () => mainWindow == null ? void 0 : mainWindow.close());
electron.ipcMain.on("open-output-folder", (_event, customPath) => {
  if (customPath && fs.existsSync(customPath)) {
    electron.shell.openPath(customPath);
    return;
  }
  if (fs.existsSync(COMFYUI_OUTPUT_DIR)) {
    electron.shell.openPath(COMFYUI_OUTPUT_DIR);
  } else {
    electron.shell.openPath(electron.app.getPath("pictures"));
  }
});
electron.ipcMain.handle("save-image", async (_event, imageUrl) => {
  try {
    const { filePath } = await electron.dialog.showSaveDialog(mainWindow, {
      defaultPath: `NexusStudio_${Date.now()}.png`,
      filters: [{ name: "Images", extensions: ["png", "jpg"] }]
    });
    if (!filePath) return null;
    const protocol = imageUrl.startsWith("https") ? https : http;
    return new Promise((resolve) => {
      protocol.get(imageUrl, (response) => {
        const file = fs.createWriteStream(filePath);
        response.pipe(file);
        file.on("finish", () => {
          file.close();
          resolve(filePath);
        });
      }).on("error", () => resolve(null));
    });
  } catch {
    return null;
  }
});
electron.ipcMain.handle("select-directory", async () => {
  try {
    const result = await electron.dialog.showOpenDialog(mainWindow, {
      properties: ["openDirectory"]
    });
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    return result.filePaths[0];
  } catch (err) {
    console.error("Save to folder failed:", err);
    return false;
  }
});
const CUSTOM_CHARS_FILE = path.join(electron.app.getPath("userData"), "custom_characters.json");
const CUSTOM_IMAGES_DIR = path.join(electron.app.getPath("userData"), "custom_characters", "images");
if (!fs.existsSync(CUSTOM_IMAGES_DIR)) {
  fs.mkdirSync(CUSTOM_IMAGES_DIR, { recursive: true });
}
electron.ipcMain.handle("load-custom-characters", async () => {
  try {
    if (fs.existsSync(CUSTOM_CHARS_FILE)) {
      const data = fs.readFileSync(CUSTOM_CHARS_FILE, "utf8");
      return JSON.parse(data);
    }
  } catch (e) {
    console.error("Failed to load custom characters", e);
  }
  return { added: [], deleted: [] };
});
electron.ipcMain.handle("save-custom-characters", async (_event, data) => {
  try {
    fs.writeFileSync(CUSTOM_CHARS_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (e) {
    console.error("Failed to save custom characters", e);
    return false;
  }
});
electron.ipcMain.handle("select-image", async () => {
  const result = await electron.dialog.showOpenDialog(mainWindow, {
    properties: ["openFile"],
    filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp"] }]
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});
electron.ipcMain.handle("save-character-image", async (_event, sourcePath, charValue) => {
  try {
    const hash = crypto.createHash("md5").update(charValue.trim()).digest("hex");
    const ext = path.extname(sourcePath).toLowerCase() || ".png";
    const targetFilename = `${hash}${ext}`;
    let buffer = null;
    try {
      const image = electron.nativeImage.createFromPath(sourcePath);
      if (!image.isEmpty()) {
        const size = image.getSize();
        let targetWidth = size.width;
        let targetHeight = size.height;
        if (size.width < size.height) {
          targetWidth = 256;
          targetHeight = Math.round(256 / size.width * size.height);
        } else {
          targetHeight = 256;
          targetWidth = Math.round(256 / size.height * size.width);
        }
        const resized = image.resize({ width: targetWidth, height: targetHeight, quality: "best" });
        buffer = ext === ".jpg" || ext === ".jpeg" ? resized.toJPEG(90) : resized.toPNG();
      }
    } catch (err) {
      console.log("nativeImage 处理图片失败，将直接复制原文件", err);
    }
    if (!buffer || buffer.length === 0) {
      buffer = fs.readFileSync(sourcePath);
    }
    const finalPath = path.join(CUSTOM_IMAGES_DIR, targetFilename);
    fs.writeFileSync(finalPath, buffer);
    return `file://${finalPath.replace(/\\/g, "/")}`;
  } catch (e) {
    console.error("保存角色图片失败:", e);
    return null;
  }
});
electron.ipcMain.handle("save-image-buffer", async (_event, base64Data, charValue, ext = ".png") => {
  try {
    const base64String = base64Data.replace(/^data:.*?;base64,/, "");
    const nodeBuffer = Buffer.from(base64String, "base64");
    const hash = crypto.createHash("md5").update(charValue.trim()).digest("hex");
    const targetFilename = `${hash}${ext}`;
    let finalBuffer = nodeBuffer;
    try {
      const image = electron.nativeImage.createFromBuffer(nodeBuffer);
      if (!image.isEmpty()) {
        const size = image.getSize();
        let targetWidth = size.width;
        let targetHeight = size.height;
        if (size.width < size.height) {
          targetWidth = 256;
          targetHeight = Math.round(256 / size.width * size.height);
        } else {
          targetHeight = 256;
          targetWidth = Math.round(256 / size.height * size.width);
        }
        const resized = image.resize({ width: targetWidth, height: targetHeight, quality: "best" });
        if (ext === ".jpg" || ext === ".jpeg") {
          finalBuffer = resized.toJPEG(90);
        } else {
          finalBuffer = resized.toPNG();
        }
      }
    } catch (err) {
      console.log("nativeImage 处理buffer失败", err);
    }
    const finalPath = path.join(CUSTOM_IMAGES_DIR, targetFilename);
    fs.writeFileSync(finalPath, finalBuffer);
    return `file://${finalPath.replace(/\\/g, "/")}`;
  } catch (e) {
    console.error("保存贴图失败:", e);
    return null;
  }
});
electron.ipcMain.handle("show-open-dialog", async (_event, options) => {
  return await electron.dialog.showOpenDialog(mainWindow, options);
});
electron.ipcMain.handle("copy-character-image", async (_event, sourcePath) => {
  try {
    const hash = crypto.createHash("md5").update(sourcePath + Date.now().toString()).digest("hex");
    const ext = path.extname(sourcePath).toLowerCase() || ".png";
    const targetFilename = `copied_${hash}${ext}`;
    const finalPath = path.join(CUSTOM_IMAGES_DIR, targetFilename);
    fs.copyFileSync(sourcePath, finalPath);
    return finalPath;
  } catch (e) {
    console.error("Copy character image copy failed", e);
    return null;
  }
});
electron.ipcMain.handle("read-image-from-clipboard", async () => {
  try {
    const image = electron.clipboard.readImage();
    if (image.isEmpty()) return { success: false };
    const hash = crypto.createHash("md5").update("clipboard" + Date.now().toString()).digest("hex");
    const targetFilename = `clip_${hash}.png`;
    const finalPath = path.join(CUSTOM_IMAGES_DIR, targetFilename);
    fs.writeFileSync(finalPath, image.toPNG());
    return { success: true, filePath: finalPath };
  } catch (e) {
    console.error("Read clipboard image failed", e);
    return { success: false };
  }
});
electron.ipcMain.handle("delete-character-image", async (_event, imagePath) => {
  try {
    if (!imagePath) return false;
    let rawPath = imagePath;
    if (rawPath.startsWith("file://")) {
      rawPath = rawPath.replace("file://", "");
    }
    if (process.platform === "win32" && rawPath.startsWith("/")) {
      rawPath = rawPath.substring(1);
    }
    rawPath = decodeURIComponent(rawPath);
    if (fs.existsSync(rawPath)) {
      fs.unlinkSync(rawPath);
      return true;
    }
    return false;
  } catch (e) {
    console.error("删除角色图片失败:", e);
    return false;
  }
});
electron.ipcMain.handle("get-user-data-path", () => electron.app.getPath("userData"));
electron.app.whenReady().then(createWindow);
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
electron.app.on("activate", () => {
  if (electron.BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
