import { useState } from "react";
import ListColumn from "../components/ListColumn";
import PricingSettings from "../components/settings/PricingSettings";
import ShopProfileSettings from "../components/settings/ShopProfileSettings";
import AutomationSettings from "../components/settings/AutomationSettings";

const SECTIONS = [
	{ id: "pricing", label: "Pricing", description: "Print rates by paper, color & sides" },
	{ id: "profile", label: "Shop Profile", description: "Manage shop name, address & capabilities" },
	{ id: "automation", label: "Automated Printing", description: "Auto-print incoming jobs from a queue" },
];

// Settings tab — a left column of setting sections; the selected section's
// management UI renders in the right pane.
function SettingsTab() {
	const [section, setSection] = useState("pricing");

	return (
		<>
			<ListColumn title="Settings">
				{SECTIONS.map((s) => (
					<button
						key={s.id}
						className={`db-entry ${section === s.id ? "db-entry--active" : ""}`}
						onClick={() => setSection(s.id)}
					>
						<div className="db-entry__info">
							<span className="db-entry__name">{s.label}</span>
							<span className="db-entry__meta">{s.description}</span>
						</div>
					</button>
				))}
			</ListColumn>

			<div className="db-detail">
				{section === "pricing" ? (
					<PricingSettings />
				) : section === "profile" ? (
					<ShopProfileSettings />
				) : section === "automation" ? (
					<AutomationSettings />
				) : (
					<div className="db-detail__empty">
						<p>Select a setting to manage.</p>
					</div>
				)}
			</div>
		</>
	);
}

export default SettingsTab;
