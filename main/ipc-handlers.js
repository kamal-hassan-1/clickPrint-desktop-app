const { ipcMain } = require("electron");
const {
	sendOtp,
	verifyOtp,
	getAuthState,
	clearAuthState,
} = require("./api-service");

/**
 * Register all IPC handlers.
 * These map renderer invoke() calls → main process API functions.
 */
function registerIpcHandlers() {
	// ──── Auth: Send OTP ────
	ipcMain.handle("auth:send-otp", async (_event, number) => {
		console.log("[IPC] auth:send-otp →", number);
		return await sendOtp(number);
	});

	// ──── Auth: Verify OTP ────
	ipcMain.handle("auth:verify-otp", async (_event, code, number) => {
		console.log("[IPC] auth:verify-otp →", number);
		return await verifyOtp(code, number);
	});

	// ──── Auth: Get current state ────
	ipcMain.handle("auth:get-state", async () => {
		return getAuthState();
	});

	// ──── Auth: Logout ────
	ipcMain.handle("auth:logout", async () => {
		clearAuthState();
		return { success: true };
	});
}

module.exports = { registerIpcHandlers };
