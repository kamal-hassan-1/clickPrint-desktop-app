const { BrowserWindow } = require("electron");

// Virtual / document-writer printers we never want to surface — except
// "Microsoft Print to PDF", which is intentionally kept (handled below).
const VIRTUAL_RE = /(xps document writer|microsoft xps|onenote|send to onenote|\bfax\b)/i;

function isVirtualPrinter(name = "") {
	if (/microsoft print to pdf/i.test(name)) return false; // keep this one
	return VIRTUAL_RE.test(name);
}

// Lists real, connected printers (plus Microsoft Print to PDF) via Chromium's
// printer enumeration. Requires a live webContents to query.
async function listPrinters(win) {
	if (!win || win.isDestroyed()) return [];
	const printers = await win.webContents.getPrintersAsync();
	return printers
		.filter((p) => !isVirtualPrinter(p.displayName || p.name))
		.map((p) => ({
			name: p.name,
			displayName: p.displayName || p.name,
			description: p.description || "",
			status: p.status, // 0 = idle/ready on Windows
			isDefault: !!p.isDefault,
		}));
}

const TEST_HTML = `<!doctype html><html><head><meta charset="utf-8"><style>
  body{font-family:Arial,Helvetica,sans-serif;margin:60px;color:#111}
  h1{font-size:26px;margin:0 0 6px}
  .sub{color:#555;margin-bottom:26px;font-size:14px}
  .bars{display:flex;gap:6px;margin:22px 0}
  .bars span{display:block;width:34px;height:56px;border-radius:4px}
  table{border-collapse:collapse;margin-top:16px}
  td,th{border:1px solid #333;padding:8px 14px;font-size:13px;text-align:left}
  .foot{margin-top:32px;font-size:12px;color:#888}
</style></head><body>
  <h1>ClickPrint &mdash; Printer Test Page</h1>
  <div class="sub">If you can read this clearly, your printer is configured correctly.</div>
  <div class="bars">
    <span style="background:#00bcd4"></span><span style="background:#e91e63"></span>
    <span style="background:#ffc107"></span><span style="background:#4caf50"></span>
    <span style="background:#111"></span>
  </div>
  <table>
    <tr><th>Check</th><th>Expected</th></tr>
    <tr><td>Text rendering</td><td>Crisp, no smudging</td></tr>
    <tr><td>Color bars</td><td>Cyan / Magenta / Yellow / Green / Black</td></tr>
    <tr><td>Alignment</td><td>Even margins on all sides</td></tr>
  </table>
  <div class="foot">Printed __WHEN__ on __DEVICE__</div>
</body></html>`;

// Prints a self-contained test page to the given printer (silently, directly).
// Resolves once spooled; a flaky/missing completion callback is assumed-spooled
// after a grace period so the renderer never hangs.
async function printTestPage(deviceName) {
	const win = new BrowserWindow({ show: false });
	try {
		const html = TEST_HTML
			.replace("__WHEN__", new Date().toLocaleString())
			.replace("__DEVICE__", deviceName || "the default printer");
		await win.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(html));
		await new Promise((r) => setTimeout(r, 200));

		await new Promise((resolve, reject) => {
			let settled = false;
			const finish = (fn, arg) => {
				if (settled) return;
				settled = true;
				clearTimeout(timer);
				fn(arg);
			};

			const options = { silent: true, printBackground: true };
			if (deviceName) options.deviceName = deviceName;

			win.webContents.print(options, (success, failureReason) => {
				console.log(`[Printers] test print callback: success=${success} reason=${failureReason}`);
				if (success) finish(resolve);
				else finish(reject, new Error(failureReason || "print failed"));
			});

			const timer = setTimeout(() => {
				console.log("[Printers] test print callback timed out, assuming spooled");
				finish(resolve);
			}, 8000);
		});
	} finally {
		if (!win.isDestroyed()) win.destroy();
	}
}

module.exports = { listPrinters, printTestPage, isVirtualPrinter };
