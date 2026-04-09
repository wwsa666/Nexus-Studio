"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  // 窗口控制
  minimizeWindow: () => electron.ipcRenderer.send("window-minimize"),
  maximizeWindow: () => electron.ipcRenderer.send("window-maximize"),
  closeWindow: () => electron.ipcRenderer.send("window-close"),
  // 文件操作
  openOutputFolder: (path) => electron.ipcRenderer.send("open-output-folder", path),
  saveImage: (imageUrl) => electron.ipcRenderer.invoke("save-image", imageUrl),
  selectDirectory: () => electron.ipcRenderer.invoke("select-directory"),
  saveImageToFolder: (imageUrl, rootDir, subFolder, fileName) => electron.ipcRenderer.invoke("save-image-to-folder", imageUrl, rootDir, subFolder, fileName),
  selectImage: () => electron.ipcRenderer.invoke("select-image"),
  saveCharacterImage: (sourcePath, charValue) => electron.ipcRenderer.invoke("save-character-image", sourcePath, charValue),
  saveImageBuffer: (base64Data, charValue, ext) => electron.ipcRenderer.invoke("save-image-buffer", base64Data, charValue, ext),
  saveCustomCharacters: (data) => electron.ipcRenderer.invoke("save-custom-characters", data),
  loadCustomCharacters: () => electron.ipcRenderer.invoke("load-custom-characters"),
  deleteCharacterImage: (imagePath) => electron.ipcRenderer.invoke("delete-character-image", imagePath),
  getUserDataPath: () => electron.ipcRenderer.invoke("get-user-data-path"),
  showOpenDialog: (options) => electron.ipcRenderer.invoke("show-open-dialog", options),
  copyCharacterImage: (sourcePath) => electron.ipcRenderer.invoke("copy-character-image", sourcePath),
  readImageFromClipboard: () => electron.ipcRenderer.invoke("read-image-from-clipboard")
});
