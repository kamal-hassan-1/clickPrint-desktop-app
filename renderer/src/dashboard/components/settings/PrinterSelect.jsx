import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDownIcon } from "../../icons";

// Dropdown for picking one of the shop's registered printers, with a status dot
// per entry (green = online, grey = offline). The menu is portaled with fixed
// positioning because the surrounding modal scrolls (overflow-y: auto), which
// would otherwise clip an absolutely-positioned menu.
function PrinterSelect({ printers, value, onChange, disabled }) {
	const [open, setOpen] = useState(false);
	const [pos, setPos] = useState(null);
	const triggerRef = useRef(null);
	const menuRef = useRef(null);

	const selected = printers.find((p) => p._id === value) || null;

	const openMenu = () => {
		const rect = triggerRef.current?.getBoundingClientRect();
		if (rect) setPos({ top: rect.bottom + 6, left: rect.left, width: rect.width });
		setOpen(true);
	};

	useEffect(() => {
		if (!open) return;
		const onDown = (e) => {
			if (menuRef.current?.contains(e.target) || triggerRef.current?.contains(e.target)) return;
			setOpen(false);
		};
		const onKey = (e) => e.key === "Escape" && setOpen(false);
		const close = () => setOpen(false);
		document.addEventListener("mousedown", onDown);
		document.addEventListener("keydown", onKey);
		window.addEventListener("resize", close);
		window.addEventListener("scroll", close, true);
		return () => {
			document.removeEventListener("mousedown", onDown);
			document.removeEventListener("keydown", onKey);
			window.removeEventListener("resize", close);
			window.removeEventListener("scroll", close, true);
		};
	}, [open]);

	return (
		<>
			<button
				type="button"
				ref={triggerRef}
				className="form-input printer-select__trigger"
				onClick={() => (open ? setOpen(false) : openMenu())}
				disabled={disabled}
			>
				{selected ? (
					<span className="printer-select__value">
						<span className={`printer-dot ${selected.online ? "printer-dot--on" : "printer-dot--off"}`} />
						{selected.label}
					</span>
				) : (
					<span className="printer-select__placeholder">Select a printer</span>
				)}
				<ChevronDownIcon />
			</button>

			{open && pos && createPortal(
				<div
					ref={menuRef}
					className="printer-select__menu"
					style={{ position: "fixed", top: pos.top, left: pos.left, minWidth: pos.width }}
				>
					{printers.map((p) => (
						<button
							type="button"
							key={p._id}
							className={`printer-select__item ${p._id === value ? "printer-select__item--on" : ""}`}
							onClick={() => {
								onChange(p._id);
								setOpen(false);
							}}
						>
							<span className={`printer-dot ${p.online ? "printer-dot--on" : "printer-dot--off"}`} />
							<span className="printer-select__item-name">{p.label}</span>
							<span className="printer-select__item-status">{p.online ? "Online" : "Offline"}</span>
						</button>
					))}
				</div>,
				document.body
			)}
		</>
	);
}

export default PrinterSelect;
