import React, { useState } from "react";
import TitleBar from "./components/TitleBar";
import LoginScreen from "./screens/LoginScreen";
import OtpScreen from "./screens/OtpScreen";

function App() {
	const [screen, setScreen] = useState("login"); // "login" | "otp"
	const [phoneNumber, setPhoneNumber] = useState("");

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
			<TitleBar />
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
