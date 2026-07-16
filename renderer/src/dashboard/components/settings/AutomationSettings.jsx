import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import ConfirmDialog from "../ConfirmDialog";
import { useAutoPrint } from "../../AutoPrintContext";

// Automated printing settings — a single persisted toggle. Guards: can only be
// turned ON when a real printer is selected (not Microsoft Print to PDF), and
// turning it OFF while a queue is draining asks for confirmation.
function AutomationSettings() {
	const { autoPrintEnabled, enableAutoPrint, disableAutoPrint, queueCount, selectedPrinter, printersReady, refreshPrinterState } = useAutoPrint();
	const [confirmOff, setConfirmOff] = useState(false);

	// Refresh the validated printer state when entering this section.
	useEffect(() => {
		refreshPrinterState();
	}, [refreshPrinterState]);

	const loaded = printersReady;
	const isPdf = /print to pdf/i.test(selectedPrinter?.name || "");
	const canEnable = !!selectedPrinter && !isPdf;

	const handleToggle = () => {
		if (autoPrintEnabled) {
			// Turning OFF — warn if a queue is still draining (edge case 1).
			if (queueCount > 0) setConfirmOff(true);
			else disableAutoPrint();
		} else {
			if (!canEnable) return; // guarded (edge case 3)
			enableAutoPrint();
		}
	};

	return (
		<div className="db-detail__view">
			<div className="settings-panel__header">
				<div>
					<h3 className="db-detail__title" style={{ marginBottom: "4px" }}>Automated Printing</h3>
					<p className="settings-panel__sub">
						When on, every new job is added to a print queue and printed automatically — no manual action needed.
					</p>
				</div>
			</div>

			<div className="automation-row">
				<div className="automation-row__text">
					<span className="automation-row__title">Auto-print incoming jobs</span>
					<span className="automation-row__hint">
						{autoPrintEnabled
							? queueCount > 0
								? `On · ${queueCount} job${queueCount === 1 ? "" : "s"} in queue`
								: "On · waiting for jobs"
							: "Off · jobs are printed manually"}
					</span>
				</div>
				<button
					type="button"
					className={`toggle ${autoPrintEnabled ? "toggle--on" : ""}`}
					onClick={handleToggle}
					disabled={!loaded || (!autoPrintEnabled && !canEnable)}
					role="switch"
					aria-checked={autoPrintEnabled}
				>
					<span className="toggle__knob" />
				</button>
			</div>

			{loaded && !autoPrintEnabled && !canEnable && (
				<div className="form-error" style={{ marginTop: "16px" }}>
					{selectedPrinter
						? "Automated printing can’t use “Microsoft Print to PDF”. Select a real printer in the Printers tab first."
						: "Select a printer in the Printers tab before turning on automated printing."}
				</div>
			)}

			{confirmOff && createPortal(
				<ConfirmDialog
					title="Turn off automated printing?"
					message={`There ${queueCount === 1 ? "is" : "are"} still ${queueCount} job${queueCount === 1 ? "" : "s"} in the queue. ${queueCount === 1 ? "It" : "They"} will finish printing, but no new jobs will be added to the queue. Turn it off?`}
					confirmLabel="Turn off"
					cancelLabel="Keep on"
					onConfirm={() => {
						setConfirmOff(false);
						disableAutoPrint();
					}}
					onCancel={() => setConfirmOff(false)}
				/>,
				document.body
			)}
		</div>
	);
}

export default AutomationSettings;
