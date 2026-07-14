import { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import {
	HomeIcon,
	PrintJobsIcon,
	PrinterIcon,
	HistoryIcon,
	SettingsIcon,
	LogoutIcon,
} from "../icons";

const TABS = [
	{ to: "jobs", label: "Print Jobs", Icon: PrintJobsIcon },
	{ to: "printers", label: "Printers", Icon: PrinterIcon },
	{ to: "history", label: "History", Icon: HistoryIcon },
];

// ── Leaf icon (matches the Claude Code reference) ────────────────────────────
const LeafIcon = () => (
	<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
		<path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 3.5 19 2c1 2 2 4.5 2 8 0 5.5-4.78 10-10 10Z" />
		<path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
	</svg>
);

// ── Arrow-right icon for the relaunch action ─────────────────────────────────
const ArrowRightIcon = () => (
	<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
		<line x1="5" y1="12" x2="19" y2="12" />
		<polyline points="12 5 19 12 12 19" />
	</svg>
);

/**
 * Claude-Code-style in-sidebar update banner.
 *
 * States:
 *  idle       – nothing shown (default)
 *  checking   – briefly shown while checking for updates
 *  downloading – shows a progress bar while the update downloads
 *  ready      – "Relaunch to update" prompt (mirrors the reference image)
 *  error      – silently goes back to idle after a timeout
 */
function UpdateBanner() {
	const [state, setState] = useState("idle"); // idle | checking | downloading | ready | error
	const [version, setVersion] = useState("");
	const [progress, setProgress] = useState(0);

	useEffect(() => {
		if (!window.electronAPI?.onUpdateEvent) return;

		const cleanup = window.electronAPI.onUpdateEvent((channel, payload) => {
			switch (channel) {
				case "updater:checking":
					setState("checking");
					break;
				case "updater:available":
					setVersion(payload.version || "");
					setState("downloading");
					setProgress(0);
					break;
				case "updater:not-available":
					setState("idle");
					break;
				case "updater:progress":
					setState("downloading");
					setProgress(Math.round(payload.percent || 0));
					break;
				case "updater:downloaded":
					setVersion(payload.version || "");
					setState("ready");
					break;
				case "updater:error":
					setState("idle");
					break;
			}
		});

		return cleanup;
	}, []);

	const handleRelaunch = () => {
		window.electronAPI?.restartToUpdate();
	};

	if (state === "idle") return null;

	// ── Downloading state: compact progress ──────────────────────────────
	if (state === "checking" || state === "downloading") {
		return (
			<div className="update-banner update-banner--downloading">
				<div className="update-banner__icon">
					<LeafIcon />
				</div>
				<div className="update-banner__body">
					<span className="update-banner__title">
						{state === "checking" ? "Checking…" : "Updating…"}
					</span>
					{state === "downloading" && (
						<div className="update-banner__progress-track">
							<div
								className="update-banner__progress-bar"
								style={{ width: `${progress}%` }}
							/>
						</div>
					)}
				</div>
			</div>
		);
	}

	// ── Ready state: "Relaunch to update" (Claude Code style) ────────────
	if (state === "ready") {
		return (
			<button className="update-banner update-banner--ready" onClick={handleRelaunch} title="Click to relaunch and update">
				<div className="update-banner__icon">
					<LeafIcon />
				</div>
				<div className="update-banner__body">
					<span className="update-banner__title">Relaunch to update</span>
					<span className="update-banner__version">v{version}</span>
				</div>
				<span className="update-banner__arrow">
					<ArrowRightIcon />
				</span>
			</button>
		);
	}

	return null;
}

// Left vertical navigation (WhatsApp-style). Each item is a router NavLink so the state follows the URL.
function Sidebar() {
	return (
		<nav className="db-sidebar">
			<div className="db-sidebar__top">
				<div className="tooltip-wrapper">
					<NavLink
						to="home"
						className={({ isActive }) =>
							`db-sidebar__home-btn ${isActive ? "db-sidebar__home-btn--active" : ""}`
						}
					>
						<HomeIcon />
					</NavLink>
					<span className="tooltip-text">Dashboard</span>
				</div>

				<div className="db-sidebar__nav">
					{TABS.map(({ to, label, Icon }) => (
						<div key={to} className="tooltip-wrapper">
							<NavLink
								to={to}
								className={({ isActive }) => `db-tab ${isActive ? "db-tab--active" : ""}`}
							>
								<span className="db-tab__icon">
									<Icon />
								</span>
							</NavLink>
							<span className="tooltip-text">{label}</span>
						</div>
					))}
				</div>
			</div>

			{/* Bottom settings & logout icon */}
			<div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "auto", width: "100%", alignItems: "center" }}>
				{/* ── Update banner (shown only when an update is available) ── */}
				<UpdateBanner />

				<div className="tooltip-wrapper">
					<NavLink
						to="settings"
						className={({ isActive }) => `db-tab ${isActive ? "db-tab--active" : ""}`}
					>
						<span className="db-tab__icon">
							<SettingsIcon />
						</span>
					</NavLink>
					<span className="tooltip-text">Settings</span>
				</div>

				<div className="tooltip-wrapper">
					<NavLink
						to="logout"
						className={({ isActive }) => `db-tab ${isActive ? "db-tab--active" : ""}`}
					>
						<span className="db-tab__icon" style={{ color: "var(--color-accent)" }}>
							<LogoutIcon />
						</span>
					</NavLink>
					<span className="tooltip-text">Logout</span>
				</div>
			</div>
		</nav>
	);
}

export default Sidebar;
