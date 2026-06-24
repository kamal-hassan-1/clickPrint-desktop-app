import React, { useState, useEffect } from "react";
import TitleBar from "./components/TitleBar";
import LoginScreen from "./screens/LoginScreen";
import OtpScreen from "./screens/OtpScreen";

function App() {
	const [screen, setScreen] = useState("login"); // "login" | "otp"
	const [phoneNumber, setPhoneNumber] = useState("");
	const [theme, setTheme] = useState(() => {
		const savedTheme = localStorage.getItem("theme");
		if (savedTheme) return savedTheme;
		return window.matchMedia("(prefers-color-scheme: dark)").matches
			? "dark"
			: "light";
	});

	useEffect(() => {
		document.documentElement.setAttribute("data-theme", theme);
		localStorage.setItem("theme", theme);
	}, [theme]);

	const toggleTheme = () => {
		setTheme((prev) => (prev === "dark" ? "light" : "dark"));
	};

	const navigateToOtp = (number) => {
		setPhoneNumber(number);
		setScreen("otp");
	};

	const navigateToLogin = () => {
		setScreen("login");
	};

	const handleLoginSuccess = (data) => {
		// For now, just show a success state — future screens will go here
		console.log("Login successful!", data);
	};

	return (
		<div className="app-container">
			<TitleBar theme={theme} onToggleTheme={toggleTheme} />
			<div className="app-content">
				{screen === "login" && <LoginScreen onOtpSent={navigateToOtp} />}
				{screen === "otp" && (
					<OtpScreen
						phoneNumber={phoneNumber}
						onBack={navigateToLogin}
						onVerified={handleLoginSuccess}
					/>
				)}
			</div>
		</div>
	);
}

export default App;
