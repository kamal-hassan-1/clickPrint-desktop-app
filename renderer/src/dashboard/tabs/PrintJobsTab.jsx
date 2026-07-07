import { useState, useEffect } from "react";
import { useJobs } from "../JobsContext";
import { ACTIVE_STATUSES, getJobPrintMode } from "../jobUtils";
import ListColumn from "../components/ListColumn";
import WelcomePane from "../components/WelcomePane";
import JobDetailCard from "../components/JobDetailCard";
import ConfirmDialog from "../components/ConfirmDialog";
import { CheckIcon, TrashIcon, SearchIcon, PrinterIcon } from "../icons";

// Per-file print progress is persisted here so it survives a reload. Entries are
// pruned as soon as their job reaches a terminal state (completed/declined) so
// the map never accumulates dead jobs.
const PRINTED_STORAGE_KEY = "clickprint:printedFiles";

function loadPrintedFiles() {
	try {
		return JSON.parse(localStorage.getItem(PRINTED_STORAGE_KEY)) || {};
	} catch {
		return {};
	}
}

// Print Jobs tab: active job queue list on the left, job details on the right.
// Each file can be previewed in the OS viewer or printed silently with its own
// settings; the whole job can be declined or marked complete from the header.
function PrintJobsTab() {
	const { printJobs, setPrintJobs, jobsLoading } = useJobs();
	const [selectedEntry, setSelectedEntry] = useState(null);

	// Job pending a decline confirmation (the "Are you sure?" dialog).
	const [pendingCancel, setPendingCancel] = useState(null);

	// Job pending a mark-complete confirmation.
	const [pendingComplete, setPendingComplete] = useState(null);

	// Phone-number search query.
	const [query, setQuery] = useState("");

	// Per-file print progress, kept in React state (and mirrored to localStorage):
	// { [jobId]: { [fileId]: true } }.
	const [printedFiles, setPrintedFiles] = useState(loadPrintedFiles);

	// Jobs with an in-flight "Print all" batch: { [jobId]: true }.
	const [printingJob, setPrintingJob] = useState({});

	// Mirror print progress to localStorage on every change so a reload keeps it.
	useEffect(() => {
		try {
			localStorage.setItem(PRINTED_STORAGE_KEY, JSON.stringify(printedFiles));
		} catch (err) {
			console.warn("[Renderer] failed to persist print progress:", err.message);
		}
	}, [printedFiles]);

	// Reconcile persisted progress against the authoritative job list: drop print
	// progress for any job the server no longer lists (e.g. removed/cancelled from
	// another device). This is race-safe because our own optimistic status changes
	// keep the job *in* printJobs (they map, never remove) — only a server-driven
	// full-list replace drops it. The non-empty guard prevents a still-loading or
	// failed initial fetch (both empty) from wiping in-progress state.
	useEffect(() => {
		if (printJobs.length === 0) return;
		const present = new Set(printJobs.map((j) => j._id));
		setPrintedFiles((prev) => {
			let changed = false;
			const next = {};
			for (const jobId of Object.keys(prev)) {
				if (present.has(jobId)) next[jobId] = prev[jobId];
				else changed = true;
			}
			return changed ? next : prev;
		});
	}, [printJobs]);

	// Oldest job first, so #1 is the next one up in the queue. The top (oldest)
	// job gets a special dashed highlight below.
	const entries = printJobs
		.filter((j) => ACTIVE_STATUSES.has(j.rawStatus))
		.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
		.map((job) => {
			const n = job.createdBy?.number || "";
			const sn = n.startsWith("0") ? n.slice(1) : n;
			const formattedNumber = "0".concat(sn.slice(2));
			return { ...job, formattedNumber };
		});

	// Apply the phone-number search (also matches the customer name). The queue
	// numbering / "top" highlight still reflect each job's position in the full
	// queue, not the filtered view.
	const q = query.trim().toLowerCase();
	const visible = q
		? entries.filter((e) =>
				`${e.formattedNumber || ""} ${e.createdBy?.name || ""}`.toLowerCase().includes(q)
			)
		: entries;

	// Optimistically applies a status change to a job, both in the list and in the
	// current selection. Returns a revert function for use on request failure.
	const applyStatus = (jobId, status, rawStatus) => {
		const prevJob = printJobs.find((j) => j._id === jobId);
		setPrintJobs((prevJobs) =>
			prevJobs.map((j) => (j._id === jobId ? { ...j, status, rawStatus } : j))
		);
		setSelectedEntry((prev) => (prev?._id === jobId ? { ...prev, status, rawStatus } : prev));
		return () => {
			if (!prevJob) return;
			setPrintJobs((prevJobs) =>
				prevJobs.map((j) => (j._id === jobId ? { ...j, status: prevJob.status, rawStatus: prevJob.rawStatus } : j))
			);
		};
	};

	// Confirmed decline: optimistically drop the job from the active list and tell
	// the backend. If the request fails, the optimistic change is reverted.
	const handleConfirmCancel = async () => {
		const job = pendingCancel;
		if (!job) return;
		setPendingCancel(null);
		setSelectedEntry(null);

		const revert = applyStatus(job._id, "completed", "cancelled");
		try {
			const result = await window.electronAPI.updateJobStatus(job._id, "cancelled");
			if (!result?.success) throw new Error(result?.message || "request failed");
			clearJobPrinted(job._id);
		} catch (err) {
			console.error("[Renderer] failed to cancel job:", err);
			revert();
		}
	};

	// Confirmed complete: drop the job from the active list, hide its detail pane
	// and notify the backend. Reverted if the backend rejects the change.
	const handleConfirmComplete = async () => {
		const job = pendingComplete;
		if (!job) return;
		setPendingComplete(null);
		setSelectedEntry(null);

		const revert = applyStatus(job._id, "completed", "completed");
		try {
			const result = await window.electronAPI.updateJobStatus(job._id, "completed");
			if (!result?.success) throw new Error(result?.message || "request failed");
			clearJobPrinted(job._id);
		} catch (err) {
			console.error("[Renderer] failed to mark job complete:", err);
			revert();
		}
	};

	// Opens a single file in the OS default viewer. Errors are logged, not shown.
	const handlePreviewFile = async (file) => {
		try {
			const result = await window.electronAPI.openFile(file.fileId);
			if (!result?.success) throw new Error(result?.message || "open failed");
		} catch (err) {
			console.error("[Renderer] failed to preview file:", err);
		}
	};

	// ── Printing ────────────────────────────────────────────────────────────────

	const isFilePrinted = (jobId, fileId) => !!printedFiles[jobId]?.[fileId];

	const markFilePrinted = (jobId, fileId) => {
		setPrintedFiles((prev) => ({
			...prev,
			[jobId]: { ...(prev[jobId] || {}), [fileId]: true },
		}));
	};

	// Drops a job's print progress from state (and thus from localStorage). Called
	// once a job reaches a terminal state so persisted progress doesn't pile up.
	const clearJobPrinted = (jobId) => {
		setPrintedFiles((prev) => {
			if (!prev[jobId]) return prev;
			const next = { ...prev };
			delete next[jobId];
			return next;
		});
	};

	// Moves the job to "printing" on the backend once (optimistic + PATCH). A
	// no-op if it's already there. Errors are logged, never surfaced.
	const ensurePrintingStatus = async (job) => {
		if (job.rawStatus === "printing") return;
		applyStatus(job._id, "processing", "printing");
		try {
			const result = await window.electronAPI.updateJobStatus(job._id, "printing");
			if (!result?.success) throw new Error(result?.message || "request failed");
		} catch (err) {
			console.error("[Renderer] failed to set job printing:", err);
		}
	};

	// Silently sends one file to the printer queue with its own settings. Returns
	// true on success, false on failure (logged, not shown).
	const printOneFile = async (file) => {
		try {
			const result = await window.electronAPI.printFile(file.fileId, file.settings);
			if (!result?.success) throw new Error(result?.message || "print failed");
			return true;
		} catch (err) {
			console.error("[Renderer] failed to print file:", err);
			return false;
		}
	};

	// Marks the job complete on the backend and drops it from the active list.
	const completeJob = async (job) => {
		const revert = applyStatus(job._id, "completed", "completed");
		setSelectedEntry((prev) => (prev?._id === job._id ? null : prev));
		try {
			const result = await window.electronAPI.updateJobStatus(job._id, "completed");
			if (!result?.success) throw new Error(result?.message || "request failed");
			clearJobPrinted(job._id);
		} catch (err) {
			console.error("[Renderer] failed to complete job:", err);
			revert();
		}
	};

	// Manual single-file print. Marks the file printed on success and, if it was
	// the last remaining document, completes the whole job.
	const handlePrintFile = async (file) => {
		const job = selectedEntry;
		if (!job || printingJob[job._id] || isFilePrinted(job._id, file.fileId)) return;

		await ensurePrintingStatus(job);
		const ok = await printOneFile(file);
		if (!ok) return;

		markFilePrinted(job._id, file.fileId);
		const printedForJob = { ...(printedFiles[job._id] || {}), [file.fileId]: true };
		const files = job.files || [];
		if (files.length && files.every((f) => printedForJob[f.fileId])) {
			await completeJob(job);
		}
	};

	// "Print all": PATCH printing, then silently queue every not-yet-printed doc,
	// marking each as it prints. A failed doc is skipped so the rest proceed. If
	// every doc ends up printed, PATCH completed and drop the job.
	const handlePrintAll = async () => {
		const job = selectedEntry;
		if (!job || printingJob[job._id]) return;

		setPrintingJob((prev) => ({ ...prev, [job._id]: true }));
		await ensurePrintingStatus(job);

		const files = job.files || [];
		const printedForJob = { ...(printedFiles[job._id] || {}) };
		const remaining = files.filter((f) => !printedForJob[f.fileId]);

		for (const file of remaining) {
			const ok = await printOneFile(file);
			if (ok) {
				printedForJob[file.fileId] = true;
				markFilePrinted(job._id, file.fileId);
			}
			// Failed doc: skip it and carry on with the rest.
		}

		setPrintingJob((prev) => ({ ...prev, [job._id]: false }));

		if (files.length && files.every((f) => printedForJob[f.fileId])) {
			await completeJob(job);
		}
	};

	return (
		<>
			<ListColumn title="Print Jobs" count={visible.length}>
				<div className="db-search">
					<SearchIcon />
					<input
						className="db-search__input"
						type="text"
						placeholder="Search any print job…"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
					/>
					{query && (
						<button className="db-search__clear" onClick={() => setQuery("")} title="Clear">
							×
						</button>
					)}
				</div>

				{jobsLoading ? (
					<div className="db-coming-soon">
						<div className="spinner spinner--dark" />
						<p>Loading jobs…</p>
					</div>
				) : visible.length === 0 ? (
					<div className="db-coming-soon">
						<p>{q ? "No jobs match that number" : "No active print jobs"}</p>
					</div>
				) : (
					visible.map((entry) => {
						const queueIndex = entries.indexOf(entry);
						return (
							<button
								key={entry._id}
								className={`db-entry db-entry--job ${selectedEntry?._id === entry._id ? "db-entry--active" : ""} ${queueIndex === 0 ? "db-entry--top" : ""}`}
								onClick={() => setSelectedEntry(entry)}
							>
								<span className="db-entry__qnum">{queueIndex + 1}</span>
								<div className="db-entry__info">
									<div className="db-entry__line">
										<span className="db-entry__name">{entry.formattedNumber || "Unknown number"}</span>
										<span className="db-entry__price">Rs. {entry.price}</span>
									</div>
									<div className="db-entry__line">
										<span className="db-entry__sub">
											{entry.createdBy?.name ? `${entry.createdBy.name} · ` : ""}
											{entry.copies} {entry.copies === 1 ? "copy" : "copies"} · {getJobPrintMode(entry, true)} · {entry.filesCount} {entry.filesCount === 1 ? "file" : "files"}
										</span>
										<span className="db-entry__right">
											<span className="db-entry__time">{entry.time}</span>
											<span className={`db-entry__dot db-entry__dot--${entry.status}`} />
										</span>
									</div>
								</div>
							</button>
						);
					})
				)}
			</ListColumn>

			<div className="db-detail">
				{selectedEntry ? (() => {
					const jobPrinted = printedFiles[selectedEntry._id] || {};
					const isPrintingAll = !!printingJob[selectedEntry._id];
					const remainingCount = (selectedEntry.files || []).filter((f) => !jobPrinted[f.fileId]).length;

					return (
						<JobDetailCard
							entry={selectedEntry}
							onPreviewFile={handlePreviewFile}
							onPrintFile={handlePrintFile}
							printedFileIds={jobPrinted}
							printingAll={isPrintingAll}
							headerActions={
								selectedEntry.status !== "completed" ? (
									<>
										<button
											className="btn-outline btn-outline-danger"
											onClick={() => setPendingCancel(selectedEntry)}
											disabled={isPrintingAll}
										>
											<TrashIcon />
											Decline Job
										</button>
										<button
											className="btn-outline"
											onClick={() => setPendingComplete(selectedEntry)}
											disabled={isPrintingAll}
										>
											<CheckIcon />
											Mark as Complete
										</button>
										<button
											className="btn-gradient"
											onClick={handlePrintAll}
											disabled={isPrintingAll || remainingCount === 0}
										>
											{isPrintingAll ? (
												<>
													<div className="spinner spinner--dark" style={{ borderTopColor: "#111b21", width: "14px", height: "14px" }} />
													Printing…
												</>
											) : (
												<>
													<PrinterIcon />
													Print ({remainingCount} {remainingCount === 1 ? "doc" : "docs"})
												</>
											)}
										</button>
									</>
								) : null
							}
						/>
					);
				})() : (
					<WelcomePane />
				)}
			</div>

			{pendingCancel && (
				<ConfirmDialog
					title="Decline this job?"
					message={`Are you sure you want to cancel "${pendingCancel.fileName}"? This will notify the customer and cannot be undone.`}
					confirmLabel="Yes, decline"
					cancelLabel="Keep job"
					danger
					onConfirm={handleConfirmCancel}
					onCancel={() => setPendingCancel(null)}
				/>
			)}

			{pendingComplete && (
				<ConfirmDialog
					title="Mark this job as complete?"
					message={`Are you sure "${pendingComplete.fileName}" is done? This action can't be undone, and the customer will be notified that their print is ready.`}
					confirmLabel="Yes, mark complete"
					cancelLabel="Not yet"
					onConfirm={handleConfirmComplete}
					onCancel={() => setPendingComplete(null)}
				/>
			)}
		</>
	);
}

export default PrintJobsTab;
