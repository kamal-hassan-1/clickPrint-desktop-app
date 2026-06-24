/**
 * API Service — all HTTP requests to the ClickPrint backend happen here,
 * inside the Electron main process. The renderer never makes direct API calls.
 */

const API_BASE_URL = "http://192.168.18.105:3000/api";

// ──────────── In-memory auth state ────────────
let authState = {
	token: null,
	profile: null,
	phoneNumber: null,
};

// ──────────── Helpers ────────────

function getAuthState() {
	return { ...authState };
}

function clearAuthState() {
	authState = { token: null, profile: null, phoneNumber: null };
}

function authHeaders() {
	return {
		"Content-Type": "application/json",
		Authorization: `Bearer ${authState.token}`,
	};
}

// ──────────── Auth API ────────────

async function sendOtp(number) {
	try {
		const response = await fetch(`${API_BASE_URL}/auth/otp`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ number }),
		});

		const data = await response.json();

		if (data.success) {
			authState.phoneNumber = number;
		}

		return data;
	} catch (error) {
		console.error("[API] sendOtp error:", error);
		return {
			success: false,
			message:
				error.message === "fetch failed"
					? "Network error. Please check your internet connection."
					: "An unexpected error occurred. Please try again.",
		};
	}
}

async function verifyOtp(code, number) {
	try {
		const response = await fetch(`${API_BASE_URL}/auth/verify`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ code, number, actor: "shop" }),
		});

		const data = await response.json();

		if (data.success) {
			authState.token = data.data.token;
			authState.profile = data.data.profile || null;
			authState.phoneNumber = number;
			console.log("[API] Auth token stored in main process");
		}

		return data;
	} catch (error) {
		console.error("[API] verifyOtp error:", error);
		return {
			success: false,
			message:
				error.message === "fetch failed"
					? "Network error. Please check your internet connection."
					: "An unexpected error occurred. Please try again.",
		};
	}
}

// ──────────── Shop API ────────────

async function updateShop(shopId, data) {
	try {
		const response = await fetch(`${API_BASE_URL}/shops/${shopId}`, {
			method: "PUT",
			headers: authHeaders(),
			body: JSON.stringify(data),
		});

		return await response.json();
	} catch (error) {
		console.error("[API] updateShop error:", error);
		return {
			success: false,
			message:
				error.message === "fetch failed"
					? "Network error. Please check your internet connection."
					: "An unexpected error occurred. Please try again.",
		};
	}
}

module.exports = {
	sendOtp,
	verifyOtp,
	updateShop,
	getAuthState,
	clearAuthState,
};
