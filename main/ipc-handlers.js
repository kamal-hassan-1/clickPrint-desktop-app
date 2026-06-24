const { ipcMain } = require("electron");
const {
	sendOtp,
	verifyOtp,
	updateShop,
	getAuthState,
	clearAuthState,
} = require("./api-service");

function registerIpcHandlers() {
	ipcMain.handle("auth:send-otp", async (_event, number) => {
		console.log("[IPC] auth:send-otp →", number);
		return await sendOtp(number);
	});

	ipcMain.handle("auth:verify-otp", async (_event, code, number) => {
		console.log("[IPC] auth:verify-otp →", number);
		return await verifyOtp(code, number);
	});

	ipcMain.handle("auth:get-state", async () => {
		return getAuthState();
	});

	ipcMain.handle("auth:logout", async () => {
		clearAuthState();
		return { success: true };
	});

	ipcMain.handle("shop:update", async (_event, shopId, data) => {
		console.log("[IPC] shop:update →", shopId);
		return await updateShop(shopId, data);
	});
}

module.exports = { registerIpcHandlers };
