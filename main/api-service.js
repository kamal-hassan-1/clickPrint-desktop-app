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

// ──────────── Auth API ────────────

/**
 * POST /api/auth/otp
 * Request an OTP to be sent to the given phone number.
 * @param {string} number — full phone number without '+', e.g. "923235400291"
 */
async function sendOtp(number) {
	try {
		const response = await fetch(`${API_BASE_URL}/auth/otp`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ number }),
		});

		const data = await response.json();

		if (data.success) {
			// Remember phone number for verify step
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

/**
 * POST /api/auth/verify
 * Verify the OTP code and receive a JWT token + profile.
 * @param {string} code   — the 5-digit OTP code
 * @param {string} number — the phone number the OTP was sent to
 */
async function verifyOtp(code, number) {
	try {
		const response = await fetch(`${API_BASE_URL}/auth/verify`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ code, number }),
		});

		const data = await response.json();

		if (data.success) {
			// Store auth state in main process memory
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

module.exports = {
	sendOtp,
	verifyOtp,
	getAuthState,
	clearAuthState,
};
