const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const { registerIpcHandlers } = require("./ipc-handlers");

// Keep a global reference of the window object to prevent garbage collection
let mainWindow = null;

const isDev = !app.isPackaged;

function createWindow() {
	mainWindow = new BrowserWindow({
		width: 480,
		height: 680,
		minWidth: 420,
		minHeight: 600,
		resizable: true,
		frame: false,
		titleBarStyle: "hidden",
		backgroundColor: "#F7F8FA",
		webPreferences: {
			preload: path.join(__dirname, "preload.js"),
			nodeIntegration: false,
			contextIsolation: true,
		},
	});

	if (isDev) {
		mainWindow.loadURL("http://localhost:3000");
	} else {
		mainWindow.loadFile(path.join(__dirname, "../renderer/dist/index.html"));
	}

	mainWindow.on("closed", () => {
		mainWindow = null;
	});
}

// Register all IPC handlers before window creation
registerIpcHandlers();

// Window control IPC handlers
ipcMain.on("window:minimize", () => {
	mainWindow?.minimize();
});

ipcMain.on("window:maximize", () => {
	if (mainWindow?.isMaximized()) {
		mainWindow.unmaximize();
	} else {
		mainWindow?.maximize();
	}
});

ipcMain.on("window:close", () => {
	mainWindow?.close();
});

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
	}
});

app.on("activate", () => {
	if (BrowserWindow.getAllWindows().length === 0) {
		createWindow();
	}
});
