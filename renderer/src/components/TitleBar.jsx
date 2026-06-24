import React from "react";

function TitleBar() {
	const handleMinimize = () => window.electronAPI?.minimizeWindow();
	const handleMaximize = () => window.electronAPI?.maximizeWindow();
	const handleClose = () => window.electronAPI?.closeWindow();

	return (
		<>
			<div className="accent-line" />
			<div className="title-bar">
				<span className="title-bar__title">ClickPrint</span>
				<div className="title-bar__controls">
					<button
						className="title-bar__btn title-bar__btn--minimize"
						onClick={handleMinimize}
						aria-label="Minimize"
					/>
					<button
						className="title-bar__btn title-bar__btn--maximize"
						onClick={handleMaximize}
						aria-label="Maximize"
					/>
					<button
						className="title-bar__btn title-bar__btn--close"
						onClick={handleClose}
						aria-label="Close"
					/>
				</div>
			</div>
		</>
	);
}

export default TitleBar;
