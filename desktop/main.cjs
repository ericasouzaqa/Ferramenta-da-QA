const { app, BrowserWindow, shell } = require("electron");
const fs = require("fs");
const path = require("path");

const productionEntry = path.join(__dirname, "..", "dist", "public", "index.html");
const developmentUrl = process.env.SINAL_QA_DEV_URL || "http://localhost:5173";

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 940,
    minWidth: 1040,
    minHeight: 700,
    backgroundColor: "#0e141a",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });

  if (fs.existsSync(productionEntry)) {
    win.loadFile(productionEntry);
  } else if (process.env.NODE_ENV === "development") {
    win.loadURL(developmentUrl);
  } else {
    const message = encodeURIComponent(
      "O build da aplicação não foi encontrado. Execute pnpm build antes de abrir o aplicativo desktop.",
    );
    win.loadURL(`data:text/html;charset=utf-8,<main style="font:16px system-ui;padding:40px;color:%2320383f"><h1>Ferramenta da QA</h1><p>${message}</p></main>`);
  }
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
