import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import ConfirmDialog from "../ConfirmDialog";
import { Segmented } from "./Segmented";
import { TrashIcon } from "../../icons";

const PAGE_TYPES = ["A4", "A5", "A3", "Letter", "Legal"];

// Create / edit form for a single price, shown inside a modal. Remounted (keyed)
// per selection so the fields reset cleanly.
function PriceForm({ price, error, saving, onSave, onCancel }) {
	const isNew = !price._id;
	const [rate, setRate] = useState(price.rate ?? "");
	const [colored, setColored] = useState(price.keys?.colored ?? false);
	const [pageType, setPageType] = useState(price.keys?.pageType || "A4");
	const [sidedness, setSidedness] = useState(price.keys?.sidedness ?? false);

	// Conventional name derived from the keys, used as a default if left blank.
	const suggestedName = `${pageType}-${colored ? "CL" : "BW"}-${sidedness ? "DS" : "SS"}`;
	const isRateInvalid = rate === "" || isNaN(Number(rate)) || Number(rate) < 1 || Number(rate) > 50;
	const isSubmitDisabled = saving || isRateInvalid;

	const submit = (e) => {
		e.preventDefault();
		onSave({
			name: suggestedName,
			rate: Number(rate) || 0,
			keys: { colored, pageType, sidedness },
		});
	};

	return (
		<form className="price-form" onSubmit={submit}>
			<h3 className="modal-title">{isNew ? "New Price" : "Edit Price"}</h3>

			{error && <div className="form-error">{error}</div>}

			<div className="form-field">
				<label className="form-label" style={{ marginBottom: "1.5rem" }}>Name: {suggestedName}</label>
			</div>

			<div className="form-field">
				<label className="form-label">Rate (Rs. per page)</label>
				<input
					className="form-input"
					type="number"
					min="1"
					max="50"
					step="1"
					value={rate}
					onChange={(e) => setRate(e.target.value)}
					required
				/>
				{isRateInvalid && <span className="form-hint">Enter a rate between Rs. 1 and Rs. 50 per page.</span>}
			</div>

			<div className="form-field">
				<label className="form-label">Paper Size</label>
				<select className="form-input" value={pageType} onChange={(e) => setPageType(e.target.value)}>
					{PAGE_TYPES.map((pt) => (
						<option key={pt} value={pt}>{pt}</option>
					))}
				</select>
			</div>

			<div className="form-field">
				<label className="form-label">Color</label>
				<Segmented
					value={colored}
					onChange={setColored}
					options={[
						{ label: "Black & White", value: false, activeClass: "segmented__btn--active" },
						{ label: "Color", value: true, activeClass: "segmented__btn--colorful" },
					]}
				/>
			</div>

			<div className="form-field">
				<label className="form-label">Sidedness</label>
				<Segmented
					value={sidedness}
					onChange={setSidedness}
					options={[
						{ label: "Single", value: false },
						{ label: "Double", value: true },
					]}
				/>
			</div>

			<div className="action-panel">
				<button type="button" className="btn-outline" onClick={onCancel} disabled={saving}>
					Cancel
				</button>
				<button
					type="submit"
					className="btn-gradient"
					disabled={isSubmitDisabled}
				>
					{saving ? "Saving…" : isNew ? "Create Price" : "Save Changes"}
				</button>
			</div>
		</form>
	);
}

// Pricing settings panel — the shop's print pricing CRUD, rendered in the right
// detail pane. The price list lives here with a "New Price" action; creating or
// editing opens the form in a modal.
function PricingSettings() {
	const [prices, setPrices] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [editing, setEditing] = useState(null); // price object, { keys: {} } for new, or null
	const [saving, setSaving] = useState(false);
	const [confirmDelete, setConfirmDelete] = useState(null);
	const [pendingOverwrite, setPendingOverwrite] = useState(null);

	useEffect(() => {
		setError(null);
		setPendingOverwrite(null);
	}, [editing]);

	const loadPrices = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const result = await window.electronAPI.fetchPrices();
			if (result.success) setPrices(result.data.prices || []);
			else setError(result.message || "Failed to load prices.");
		} catch (err) {
			console.error("[Renderer] failed to load prices:", err);
			setError("Failed to load prices.");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		loadPrices();
	}, [loadPrices]);

	const handleSave = async (data) => {
		if (!editing._id) {
			const existingPrice = prices.find((p) => p.name === data.name);
			if (existingPrice) {
				setPendingOverwrite({ existingPrice, data });
				return;
			}
		}

		setSaving(true);
		setError(null);
		try {
			const result = editing._id
				? await window.electronAPI.updatePrice(editing._id, data)
				: await window.electronAPI.createPrice(data);
			if (result.success) {
				await loadPrices();
				setEditing(null);
			} else {
				setError(result.message || "Failed to save price.");
			}
		} finally {
			setSaving(false);
		}
	};

	const handleConfirmOverwrite = async () => {
		if (!pendingOverwrite) return;
		const { existingPrice, data } = pendingOverwrite;
		setPendingOverwrite(null);
		setSaving(true);
		setError(null);
		try {
			const result = await window.electronAPI.updatePrice(existingPrice._id, data);
			if (result.success) {
				await loadPrices();
				setEditing(null);
			} else {
				setError(result.message || "Failed to overwrite price.");
			}
		} finally {
			setSaving(false);
		}
	};

	const handleDelete = async (price) => {
		setConfirmDelete(null);
		setSaving(true);
		setError(null);
		try {
			const result = await window.electronAPI.deletePrice(price._id);
			if (result.success) {
				await loadPrices();
				setEditing(null);
			} else {
				setError(result.message || "Failed to delete price.");
			}
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="db-detail__view">
			<div className="settings-panel__header">
				<div>
					<h3 className="db-detail__title" style={{ marginBottom: "4px" }}>Pricing</h3>
					<p className="settings-panel__sub">Manage the print rates customers are charged.</p>
				</div>
				<button className="btn-gradient settings-panel__action" onClick={() => setEditing({ keys: {} })}>
					+ New Price
				</button>
			</div>

			{error && !editing && <div className="form-error">{error}</div>}

			{loading ? (
				<div className="db-coming-soon">
					<div className="spinner spinner--dark" />
					<p>Loading prices…</p>
				</div>
			) : prices.length === 0 ? (
				<div className="db-detail__empty">
					<p>No prices yet. Add your first print price to get started.</p>
				</div>
			) : (
				<div className="price-list">
					{prices.map((price) => (
						<div
							key={price._id}
							className="db-entry db-entry--price"
							role="button"
							tabIndex={0}
							onClick={() => setEditing(price)}
							onKeyDown={(e) => {
								if (e.key === "Enter" || e.key === " ") {
									e.preventDefault();
									setEditing(price);
								}
							}}
						>
							<div className="db-entry__info">
								<span className="db-entry__name">{price.name}</span>
								<span className="db-entry__meta">
									{price.keys?.pageType} · {price.keys?.colored ? "Color" : "B&W"} · {price.keys?.sidedness ? "Double" : "Single"}
								</span>
							</div>
							<div className="db-entry__price-actions">
								<span className="db-entry__price">Rs. {price.rate}</span>
								<button
									type="button"
									className="db-entry__delete-btn"
									title="Delete this price"
									onClick={(e) => {
										e.stopPropagation();
										setConfirmDelete(price);
									}}
								>
									<TrashIcon />
								</button>
							</div>
						</div>
					))}
				</div>
			)}

			{editing && createPortal(
				<div className="modal-overlay" onClick={() => !saving && setEditing(null)}>
					<div className="modal-card modal-card--wide" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
						<PriceForm
							key={editing._id || "new"}
							price={editing}
							error={error}
							saving={saving}
							onSave={handleSave}
							onCancel={() => setEditing(null)}
						/>
					</div>
				</div>,
				document.body
			)}

			{confirmDelete && createPortal(
				<ConfirmDialog
					title="Delete this price?"
					message={`Are you sure you want to delete "${confirmDelete.name}"? This cannot be undone.`}
					confirmLabel="Delete"
					cancelLabel="Cancel"
					danger
					onConfirm={() => handleDelete(confirmDelete)}
					onCancel={() => setConfirmDelete(null)}
				/>,
				document.body
			)}

			{pendingOverwrite && createPortal(
				<ConfirmDialog
					title="Overwrite Pricing"
					message={`A pricing structure for "${pendingOverwrite.existingPrice.name}" already exists. Overwrite the existing price with this new rate?`}
					confirmLabel="Overwrite Pricing"
					cancelLabel="Cancel"
					onConfirm={handleConfirmOverwrite}
					onCancel={() => setPendingOverwrite(null)}
				/>,
				document.body
			)}
		</div>
	);
}

export default PricingSettings;
