import { useNavigate } from "react-router-dom";

function LogoutTab({ onLogout }) {
	const navigate = useNavigate();

	return (
		<div className="db-detail logout-tab">
			<div className="logout-tab__glow" />
			<div className="logout-tab__card">
				<div className="logout-tab__icon-wrap">
					<svg
						width="28"
						height="28"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
						<polyline points="16 17 21 12 16 7" />
						<line x1="21" y1="12" x2="9" y2="12" />
					</svg>
				</div>

				<h2 className="logout-tab__title">End your session?</h2>
				<p className="logout-tab__body">
					You're about to sign out of your ClickPrint session.
				</p>
				
				<div className="logout-tab__info-pill">
					<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
						<circle cx="12" cy="12" r="10" />
						<line x1="12" y1="8" x2="12" y2="12" />
						<line x1="12" y1="16" x2="12.01" y2="16" />
					</svg>
					Your account data and print history remain intact
				</div>

				<div className="logout-tab__actions">
					<button
						className="btn-outline logout-tab__btn-cancel"
						onClick={() => navigate("/jobs")}
					>
						Stay signed in
					</button>
					<button
						className="logout-tab__btn-confirm"
						onClick={onLogout}
					>
						<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
							<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
							<polyline points="16 17 21 12 16 7" />
							<line x1="21" y1="12" x2="9" y2="12" />
						</svg>
						Confirm logout
					</button>
				</div>
			</div>
		</div>
	);
}

export default LogoutTab;