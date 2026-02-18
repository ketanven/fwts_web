import invoiceService from "@/api/services/invoiceService";
import { Icon } from "@/components/icon";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Input } from "@/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const asRecord = (value: unknown) => (value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, any>) : {});

const stateVariant = (state: string) => {
	const normalized = state.toLowerCase();
	if (normalized === "draft") return "info";
	if (normalized === "submitted" || normalized === "sent") return "success";
	if (normalized === "revised") return "warning";
	if (normalized === "paid") return "success";
	return "secondary";
};

type InvoiceOpt = { id: string; label: string };

export default function InvoiceControlPage() {
	const [loading, setLoading] = useState(true);
	const [actionLoading, setActionLoading] = useState(false);
	const [config, setConfig] = useState<Record<string, any>>({});
	const [nextNumber, setNextNumber] = useState("");
	const [invoices, setInvoices] = useState<InvoiceOpt[]>([]);
	const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
	const [versions, setVersions] = useState<Record<string, any>[]>([]);
	const [versionLabel, setVersionLabel] = useState("Manual Snapshot");
	const [changeSummary, setChangeSummary] = useState("Saved from invoice control panel");

	const loadInvoiceMeta = useCallback(async () => {
		const list = await invoiceService.listInvoices();
		const mapped = list
		.map((item) => {
			const row = asRecord(item);
			const id = String(row.id ?? row.invoice_id ?? "");
			const number = String(row.invoice_number ?? row.number ?? id ?? "-");
			if (!id) return null;
			return { id, label: number };
		})
			.filter(Boolean) as InvoiceOpt[];
		setInvoices(mapped);
		if (!selectedInvoiceId && mapped[0]?.id) setSelectedInvoiceId(mapped[0].id);
	}, [selectedInvoiceId]);

	const loadVersions = useCallback(async () => {
		if (!selectedInvoiceId) {
			setVersions([]);
			return;
		}
		const list = await invoiceService.listInvoiceVersions(selectedInvoiceId);
		setVersions(list.map((item) => asRecord(item)));
	}, [selectedInvoiceId]);

	const loadAll = useCallback(async () => {
		setLoading(true);
		try {
			const [cfgRes, nextRes] = await Promise.all([invoiceService.getInvoiceNumberingConfig(), invoiceService.getNextInvoiceNumber()]);
			setConfig(asRecord(cfgRes));
			setNextNumber(String((nextRes as any)?.next_number || (nextRes as any)?.invoice_number || "-"));
			await loadInvoiceMeta();
		} catch (error: any) {
			toast.error(error?.response?.data?.message || error?.message || "Failed to load invoice control data.");
		} finally {
			setLoading(false);
		}
	}, [loadInvoiceMeta]);

	useEffect(() => {
		loadAll();
	}, [loadAll]);

	useEffect(() => {
		loadVersions();
	}, [loadVersions]);

	const preview = useMemo(() => {
		const prefix = String(config.prefix || "INV");
		const separator = String(config.separator || "-");
		const includeYear = Boolean(config.include_year ?? true);
		const includeMonth = Boolean(config.include_month ?? false);
		const sequencePadding = Number(config.sequence_padding ?? 4);
		const now = new Date();
		const year = String(now.getFullYear());
		const month = String(now.getMonth() + 1).padStart(2, "0");
		const sequence = String(1).padStart(Number.isFinite(sequencePadding) ? sequencePadding : 4, "0");
		const parts = [prefix];
		if (includeYear) parts.push(year);
		if (includeMonth) parts.push(month);
		parts.push(sequence);
		return {
			pattern: String(config.format_template || `${prefix}{SEP}{YEAR}{SEP}{SEQUENCE}`),
			clientCode: "CLIENT",
			sequence,
			next: nextNumber || parts.join(separator),
		};
	}, [config, nextNumber]);

	const runAction = async (action: () => Promise<unknown>, message: string, reloadVersionsAfter = false) => {
		try {
			setActionLoading(true);
			await action();
			if (reloadVersionsAfter) await loadVersions();
			toast.success(message);
		} catch (error: any) {
			toast.error(error?.response?.data?.message || error?.message || "Action failed.");
		} finally {
			setActionLoading(false);
		}
	};

	const handleRegeneratePreview = async () => {
		try {
			setActionLoading(true);
			const nextRes = await invoiceService.getNextInvoiceNumber();
			setNextNumber(String((nextRes as any)?.next_number || (nextRes as any)?.invoice_number || "-"));
		} catch (error: any) {
			toast.error(error?.response?.data?.message || error?.message || "Failed to fetch next invoice number.");
		} finally {
			setActionLoading(false);
		}
	};

	const handleToggleActive = async () => {
		await runAction(
			() => invoiceService.updateInvoiceNumberingConfig({ is_active: !(config.is_active ?? true) }),
			"Numbering config updated.",
		);
		const cfgRes = await invoiceService.getInvoiceNumberingConfig();
		setConfig(asRecord(cfgRes));
	};

	const handleCreateVersion = async () => {
		if (!selectedInvoiceId) {
			toast.error("Select an invoice first.");
			return;
		}
		await runAction(
			() => invoiceService.createInvoiceVersion(selectedInvoiceId, { version_label: versionLabel, change_summary: changeSummary }),
			"Invoice version created.",
			true,
		);
	};

	const handleVersionDetail = async (versionId: string | number) => {
		if (!selectedInvoiceId) return;
		try {
			setActionLoading(true);
			const detail = await invoiceService.getInvoiceVersion(selectedInvoiceId, versionId);
			toast.success(`Version ${String((detail as any)?.version_label || versionId)} loaded.`);
		} catch (error: any) {
			toast.error(error?.response?.data?.message || error?.message || "Failed to load version detail.");
		} finally {
			setActionLoading(false);
		}
	};

	const handleRestoreVersion = async (versionId: string | number) => {
		if (!selectedInvoiceId) return;
		await runAction(() => invoiceService.restoreInvoiceVersion(selectedInvoiceId, versionId), "Invoice version restored.", true);
	};

	if (loading) {
		return (
			<div className="space-y-4">
				<Card>
					<CardContent className="py-10 text-sm text-muted-foreground">Loading invoice control...</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<Card className="overflow-hidden border-0 shadow-md">
				<CardContent className="relative p-0">
					<div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-indigo-900 to-fuchsia-800 opacity-95" />
					<div className="relative grid gap-3 p-6 text-white lg:grid-cols-3">
						<div className="space-y-2 lg:col-span-2">
							<Badge variant="default">Smart Numbering & Versioning</Badge>
							<h2 className="text-2xl font-semibold">Automatic invoice numbers with revision history after submission.</h2>
							<p className="text-sm text-white/80">Connected to numbering config, next number, and invoice version APIs.</p>
						</div>
						<div className="rounded-xl bg-black/20 p-4">
							<div className="text-xs text-white/70">Next Invoice Number</div>
							<div className="mt-2 text-2xl font-semibold">{preview.next}</div>
						</div>
					</div>
				</CardContent>
			</Card>

			<div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
				<Card className="xl:col-span-2">
					<CardHeader className="pb-0">
						<CardTitle>Numbering Configuration</CardTitle>
						<CardDescription>GET/PATCH `/invoice-numbering/config/` and GET `/invoice-numbering/next/`.</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3">
						<div className="rounded-lg border p-4">
							<div className="text-xs text-muted-foreground">Pattern</div>
							<div className="mt-1 font-mono text-sm">{preview.pattern}</div>
						</div>
						<div className="grid gap-3 md:grid-cols-3">
							<div className="rounded-lg border p-4">
								<div className="text-xs text-muted-foreground">Year</div>
								<div className="text-xl font-semibold">{new Date().getFullYear()}</div>
							</div>
							<div className="rounded-lg border p-4">
								<div className="text-xs text-muted-foreground">Client Code</div>
								<div className="text-xl font-semibold">{preview.clientCode}</div>
							</div>
							<div className="rounded-lg border p-4">
								<div className="text-xs text-muted-foreground">Sequence</div>
								<div className="text-xl font-semibold">{preview.sequence}</div>
							</div>
						</div>
						<div className="flex flex-wrap gap-2">
							<Button onClick={handleRegeneratePreview} disabled={actionLoading}>
								<Icon icon="solar:refresh-bold-duotone" /> Regenerate Preview
							</Button>
							<Button variant="outline" onClick={handleToggleActive} disabled={actionLoading}>
								<Icon icon="solar:settings-bold-duotone" /> Toggle Active
							</Button>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-0">
						<CardTitle>Version Rules</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2 text-sm">
						<div className="rounded-lg border p-3">Increment revision when line-items, taxes, due date, or total changes.</div>
						<div className="rounded-lg border p-3">Preserve all submitted versions for full audit trail.</div>
						<div className="rounded-lg border p-3">Show who edited and when for every post-submit update.</div>
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader className="pb-0">
					<CardTitle>Invoice Revision Timeline</CardTitle>
					<CardDescription>GET/POST versions + GET detail + POST restore.</CardDescription>
				</CardHeader>
				<CardContent className="space-y-3">
					<div className="grid gap-2 md:grid-cols-4">
						<Select value={selectedInvoiceId} onValueChange={setSelectedInvoiceId}>
							<SelectTrigger className="md:col-span-1">
								<SelectValue placeholder="Select invoice" />
							</SelectTrigger>
							<SelectContent>
								{invoices.map((item) => (
									<SelectItem key={item.id} value={item.id}>
										{item.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<Input className="md:col-span-1" value={versionLabel} onChange={(e) => setVersionLabel(e.target.value)} placeholder="Version label" />
						<Input className="md:col-span-2" value={changeSummary} onChange={(e) => setChangeSummary(e.target.value)} placeholder="Change summary" />
					</div>
					<div className="flex flex-wrap gap-2">
						<Button onClick={handleCreateVersion} disabled={actionLoading || !selectedInvoiceId}>
							<Icon icon="solar:history-bold-duotone" /> Create Version
						</Button>
						<Button variant="outline" onClick={loadVersions} disabled={actionLoading || !selectedInvoiceId}>
							<Icon icon="solar:refresh-bold-duotone" /> Refresh Versions
						</Button>
					</div>

					{versions.map((item, index) => {
						const versionId = item.id ?? item.version_id ?? item.version ?? index;
						const versionLabelText = String(item.version_label ?? item.version ?? `v${index + 1}`);
						const state = String(item.state ?? item.status ?? "Revised");
						const date = String(item.created_at ?? item.date ?? "-");
						const editor = String(item.updated_by_name ?? item.editor ?? "You");
						const change = String(item.change_summary ?? item.change ?? "No summary");
						return (
							<div key={`${versionId}`} className="relative rounded-lg border p-4">
								{index < versions.length - 1 ? <div className="absolute left-[18px] top-[46px] h-[48px] w-px bg-border" /> : null}
								<div className="flex items-start gap-3">
									<div className="mt-1 h-3 w-3 rounded-full bg-primary" />
									<div className="flex-1">
										<div className="flex flex-wrap items-center justify-between gap-2">
											<div className="font-semibold">{versionLabelText}</div>
											<div className="flex items-center gap-2">
												<Badge variant={stateVariant(state)}>{state}</Badge>
												<Button size="sm" variant="outline" onClick={() => handleVersionDetail(versionId)} disabled={actionLoading}>
													Detail
												</Button>
												<Button size="sm" onClick={() => handleRestoreVersion(versionId)} disabled={actionLoading}>
													Restore
												</Button>
											</div>
										</div>
										<div className="mt-1 text-xs text-muted-foreground">
											{date} • {editor}
										</div>
										<div className="mt-1 text-sm">{change}</div>
									</div>
								</div>
							</div>
						);
					})}
					{!versions.length ? <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">No versions found for selected invoice.</div> : null}
				</CardContent>
			</Card>
		</div>
	);
}
