import React, { useState, useEffect } from "react";
import TitleBar from "./components/TitleBar";
import LoginScreen from "./screens/LoginScreen";
import OtpScreen from "./screens/OtpScreen";
import DashboardScreen from "./screens/DashboardScreen";

function App() {
	const [screen, setScreen] = useState("login"); // "login" | "otp" | "dashboard"
	const [phoneNumber, setPhoneNumber] = useState("");
	const [shopProfile, setShopProfile] = useState(null);
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
		setShopProfile(data.profile);
		setScreen("dashboard");
	};

	const handleLogout = async () => {
		await window.electronAPI.logout();
		setShopProfile(null);
		setPhoneNumber("");
		setScreen("login");
	};

	if (screen === "dashboard" && shopProfile) {
		return (
			<div className="app-container">
				<TitleBar theme={theme} onToggleTheme={toggleTheme} />
				<div className="app-content">
					<DashboardScreen
						shopProfile={shopProfile}
						onLogout={handleLogout}
					/>
				</div>
			</div>
		);
	}

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
