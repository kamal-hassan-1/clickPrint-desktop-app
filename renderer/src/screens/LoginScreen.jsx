import React, { useState } from "react";

function LoginScreen({ onOtpSent }) {
	const [countryCode] = useState("+92");
	const [phone, setPhone] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	// Build full number: remove '+' prefix → "923012345678"
	const fullNumber = countryCode.slice(1) + phone;
	const isValidPhone =
		phone.length > 0 &&
		phone.length <= 11 &&
		/^[1-9]\d{7,14}$/.test(fullNumber);

	const handleContinue = async () => {
		if (!isValidPhone || loading) return;

		setError("");
		setLoading(true);

		try {
			// IPC call → main process → API
			const result = await window.electronAPI.sendOtp(fullNumber);

			if (result.success) {
				onOtpSent(fullNumber);
			} else {
				setError(result.message || "Failed to send OTP. Please try again.");
			}
		} catch (err) {
			setError("An unexpected error occurred. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	const handleKeyDown = (e) => {
		if (e.key === "Enter") {
			handleContinue();
		}
	};

	return (
		<div className="screen">
			<div style={{ marginTop: "40px" }}>
				{/* Logo / Brand Mark */}
				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: "10px",
						marginBottom: "40px",
					}}
				>
					<div
						style={{
							width: "42px",
							height: "42px",
							borderRadius: "12px",
							background:
								"linear-gradient(135deg, #00D9A3 0%, #00C793 100%)",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							boxShadow: "0 4px 20px rgba(0, 217, 163, 0.25)",
						}}
					>
						<svg
							width="22"
							height="22"
							viewBox="0 0 24 24"
							fill="none"
							stroke="white"
							strokeWidth="2.5"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<polyline points="6 9 6 2 18 2 18 9" />
							<path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
							<rect x="6" y="14" width="12" height="8" />
						</svg>
					</div>
					<div>
						<span
							style={{
								fontSize: "18px",
								fontWeight: "800",
								color: "var(--color-text-primary)",
								letterSpacing: "-0.3px",
							}}
						>
							Click
						</span>
						<span
							style={{
								fontSize: "18px",
								fontWeight: "800",
								color: "var(--color-primary)",
								letterSpacing: "-0.3px",
							}}
						>
							Print
						</span>
					</div>
				</div>

				<h1 className="screen__heading">Let's get started!</h1>
				<p className="screen__subheading">
					Please enter your mobile number to receive a verification code
				</p>

				<div className="input-group">
					<div className="country-code">
						<span>🇵🇰</span>
						<span>{countryCode}</span>
					</div>
					<div className="phone-input-wrapper">
						<input
							id="phone-input"
							className="phone-input"
							type="tel"
							placeholder="3012345678"
							value={phone}
							onChange={(e) => {
								// Only allow digits
								const val = e.target.value.replace(/\D/g, "");
								setPhone(val);
								setError("");
							}}
							onKeyDown={handleKeyDown}
							maxLength={11}
							autoFocus
						/>
					</div>
				</div>

				{error && (
					<p
						style={{
							fontSize: "13px",
							color: "var(--color-accent)",
							marginTop: "-16px",
							marginBottom: "16px",
							paddingLeft: "4px",
							animation: "fadeSlideIn 200ms ease",
						}}
					>
						{error}
					</p>
				)}
			</div>

			<button
				id="continue-btn"
				className="btn btn--primary btn--full btn--bottom"
				disabled={!isValidPhone || loading}
				onClick={handleContinue}
			>
				{loading ? (
					<div className="spinner" />
				) : (
					<>
						Continue
						<span className="btn__arrow">→</span>
					</>
				)}
			</button>
		</div>
	);
}

export default LoginScreen;
