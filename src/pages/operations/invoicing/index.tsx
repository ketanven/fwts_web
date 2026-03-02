import invoiceService, { type InvoiceCreatePayload, type ListInvoicesQuery } from "@/api/services/invoiceService";
import { Chart, useChart } from "@/components/chart";
import { Icon } from "@/components/icon";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Input } from "@/ui/input";
import { Progress } from "@/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type InvoiceRow = {
	invoiceId: string;
	invoiceNumber: string;
	client: string;
	clientId?: string;
	projectId?: string;
	type: string;
	amount: number;
	paid: number;
	status: string;
	dueDate: string;
	issueDate: string;
	currency: string;
	notes: string;
	raw: Record<string, any>;
};

const toNumber = (value: unknown, fallback = 0) => {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : fallback;
};

const asRecord = (value: unknown) => (value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, any>) : {});

const normalizeInvoice = (invoice: unknown): InvoiceRow => {
	const row = asRecord(invoice);
	const amount = toNumber(row.total_amount ?? row.amount ?? row.grand_total, 0);
	const paid = toNumber(row.paid_amount ?? row.paid ?? row.collected_amount, 0);
	const invoiceId = String(row.id ?? row.invoice_id ?? "");
	const invoiceNumber = String(row.invoice_number ?? row.number ?? invoiceId ?? "-");
	return {
		invoiceId,
		invoiceNumber,
		client: String(row.client_name ?? row.client_display ?? row.client ?? "-"),
		clientId: row.client ? String(row.client) : undefined,
		projectId: row.project ? String(row.project) : undefined,
		type: String(row.invoice_type ?? "hourly"),
		amount,
		paid,
		status: String(row.status ?? "draft"),
		dueDate: String(row.due_date ?? "-"),
		issueDate: String(row.issue_date ?? row.created_at ?? ""),
		currency: String(row.currency ?? "USD"),
		notes: String(row.notes ?? ""),
		raw: row,
	};
};

const statusVariant = (status: string) => {
	const normalized = status.toLowerCase();
	if (normalized === "paid") return "success";
	if (normalized === "submitted" || normalized === "sent") return "info";
	if (normalized === "draft") return "secondary";
	if (normalized.includes("partial") || normalized === "pending") return "warning";
	return "error";
};

const formatCurrency = (value: number, currency = "USD") => {
	try {
		return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(value);
	} catch {
		return `$${value.toFixed(2)}`;
	}
};

const dateInput = (date: Date) => date.toISOString().slice(0, 10);

export default function InvoicingPage() {
	const [stats, setStats] = useState<Record<string, any>>({});
	const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
	const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
	const [payments, setPayments] = useState<Record<string, any[]>>({});
	const [statusFilter, setStatusFilter] = useState<string>("all");
	const [clientFilter, setClientFilter] = useState("");
	const [noteDraft, setNoteDraft] = useState("");
	const [loading, setLoading] = useState(true);
	const [actionLoading, setActionLoading] = useState(false);

	const loadInvoices = useCallback(async () => {
		const params: ListInvoicesQuery = {};
		if (statusFilter !== "all") params.status = statusFilter as ListInvoicesQuery["status"];
		if (clientFilter.trim()) params.client_id = clientFilter.trim();
		const list = await invoiceService.listInvoices(params);
		const normalized = list.map(normalizeInvoice).filter((item) => item.invoiceId);
		setInvoices(normalized);
		if (!selectedInvoiceId && normalized[0]?.invoiceId) {
			setSelectedInvoiceId(normalized[0].invoiceId);
			setNoteDraft(normalized[0].notes || "");
		}
	}, [clientFilter, selectedInvoiceId, statusFilter]);

	const loadAll = useCallback(async () => {
		setLoading(true);
		try {
			const [statsRes] = await Promise.all([invoiceService.getInvoiceStats(), loadInvoices()]);
			setStats(asRecord(statsRes));
		} catch (error: any) {
			const message = error?.response?.data?.message || error?.response?.data?.detail || error?.message || "Failed to load invoices.";
			toast.error(message);
		} finally {
			setLoading(false);
		}
	}, [loadInvoices]);

	useEffect(() => {
		loadAll();
	}, [loadAll]);

	const selectedInvoice = useMemo(() => invoices.find((item) => item.invoiceId === selectedInvoiceId) || null, [invoices, selectedInvoiceId]);

	useEffect(() => {
		if (selectedInvoice) setNoteDraft(selectedInvoice.notes || "");
	}, [selectedInvoice]);

	const totalAmount = useMemo(() => {
		const apiTotal = toNumber(stats.total_invoiced ?? stats.total_amount, NaN);
		if (Number.isFinite(apiTotal)) return apiTotal;
		return invoices.reduce((sum, invoice) => sum + invoice.amount, 0);
	}, [invoices, stats]);

	const collectedAmount = useMemo(() => {
		const apiCollected = toNumber(stats.total_collected ?? stats.paid_amount, NaN);
		if (Number.isFinite(apiCollected)) return apiCollected;
		return invoices.reduce((sum, invoice) => sum + invoice.paid, 0);
	}, [invoices, stats]);

	const collectionRate = totalAmount > 0 ? (collectedAmount / totalAmount) * 100 : 0;

	const revenueData = useMemo(() => {
		const monthMap = new Map<string, number>();
		for (let i = 5; i >= 0; i -= 1) {
			const d = new Date();
			d.setMonth(d.getMonth() - i);
			const key = d.toLocaleString("en-US", { month: "short" });
			monthMap.set(key, 0);
		}
		invoices.forEach((invoice) => {
			if (!invoice.issueDate) return;
			const d = new Date(invoice.issueDate);
			if (Number.isNaN(d.getTime())) return;
			const key = d.toLocaleString("en-US", { month: "short" });
			if (!monthMap.has(key)) return;
			monthMap.set(key, (monthMap.get(key) || 0) + invoice.amount);
		});
		return {
			categories: Array.from(monthMap.keys()),
			values: Array.from(monthMap.values()).map((v) => Number(v.toFixed(2))),
		};
	}, [invoices]);

	const revenueOptions = useChart({
		chart: { toolbar: { show: false } },
		stroke: { curve: "smooth", width: 3 },
		dataLabels: { enabled: false },
		xaxis: { categories: revenueData.categories },
		colors: ["#2563eb"],
	});

	const runAction = async (action: () => Promise<unknown>, successMessage: string) => {
		try {
			setActionLoading(true);
			await action();
			await loadAll();
			if (selectedInvoiceId) {
				const paymentList = await invoiceService.listInvoicePayments(selectedInvoiceId);
				setPayments((prev) => ({ ...prev, [selectedInvoiceId]: paymentList }));
			}
			toast.success(successMessage);
		} catch (error: any) {
			const message = error?.response?.data?.message || error?.response?.data?.detail || error?.message || "Action failed.";
			toast.error(message);
		} finally {
			setActionLoading(false);
		}
	};

	const handleLoadPayments = async () => {
		if (!selectedInvoiceId) return;
		try {
			setActionLoading(true);
			const paymentList = await invoiceService.listInvoicePayments(selectedInvoiceId);
			setPayments((prev) => ({ ...prev, [selectedInvoiceId]: paymentList }));
		} catch (error: any) {
			toast.error(error?.response?.data?.message || error?.message || "Failed to load payments.");
		} finally {
			setActionLoading(false);
		}
	};

	const handleCreateInvoice = async () => {
		const source = selectedInvoice || invoices[0];
		if (!source?.clientId) {
			toast.error("No client available to create invoice.");
			return;
		}
		const next = await invoiceService.getNextInvoiceNumber();
		const nextNumber = String((next as any)?.next_number || (next as any)?.invoice_number || `INV-${Date.now()}`);
		const issueDate = dateInput(new Date());
		const dueDate = dateInput(new Date(Date.now() + 7 * 24 * 3600 * 1000));
		const payload: InvoiceCreatePayload = {
			invoice_number: nextNumber,
			client: source.clientId,
			project: source.projectId,
			issue_date: issueDate,
			due_date: dueDate,
			currency: source.currency || "USD",
			invoice_type: source.type || "hourly",
			status: "draft",
			subtotal: "0.00",
			discount_total: "0.00",
			tax_total: "0.00",
			total_amount: "0.00",
			paid_amount: "0.00",
			balance_amount: "0.00",
			notes: "Auto-created from dashboard",
			terms: "Pay within 7 days",
			metadata_json: {},
			line_items: [
				{
					item_type: "service",
					title: "Freelance Services",
					description: "Auto-generated line item",
					quantity: "1.00",
					unit: "hour",
					unit_price: "0.00",
					tax_percent: "0.00",
					discount_percent: "0.00",
					line_total: "0.00",
					sort_order: 0,
					task: null,
					time_entry: null,
				},
			],
		};
		await runAction(() => invoiceService.createInvoice(payload), "Invoice created.");
	};

	const handleCreateFromTimeEntries = async () => {
		if (!selectedInvoice?.clientId) {
			toast.error("Select an invoice with client to use this action.");
			return;
		}
		await runAction(
			() =>
				invoiceService.createFromTimeEntries({
					client_id: selectedInvoice.clientId as string,
					project_id: selectedInvoice.projectId,
					currency: selectedInvoice.currency || "USD",
				}),
			"Invoice generated from time entries.",
		);
	};

	const handleViewDetail = async () => {
		if (!selectedInvoiceId) return;
		try {
			setActionLoading(true);
			const detail = await invoiceService.getInvoice(selectedInvoiceId);
			const status = String((detail as any)?.status || "unknown");
			toast.success(`Invoice detail loaded (status: ${status}).`);
		} catch (error: any) {
			toast.error(error?.response?.data?.message || error?.message || "Failed to get invoice detail.");
		} finally {
			setActionLoading(false);
		}
	};

	const handleSaveNote = async () => {
		if (!selectedInvoiceId) return;
		await runAction(() => invoiceService.updateInvoice(selectedInvoiceId, { notes: noteDraft }), "Invoice updated.");
	};

	const handleSubmit = async () => {
		if (!selectedInvoiceId) return;
		await runAction(() => invoiceService.submitInvoice(selectedInvoiceId), "Invoice submitted.");
	};

	const handleSend = async () => {
		if (!selectedInvoiceId) return;
		await runAction(() => invoiceService.sendInvoice(selectedInvoiceId), "Invoice sent.");
	};

	const handleReminder = async () => {
		if (!selectedInvoiceId) return;
		await runAction(() => invoiceService.sendInvoiceReminder(selectedInvoiceId), "Reminder sent.");
	};

	const handleMarkPaid = async () => {
		if (!selectedInvoiceId || !selectedInvoice) return;
		await runAction(
			() =>
				invoiceService.markInvoicePaid(selectedInvoiceId, {
					payment_date: dateInput(new Date()),
					amount: String(Math.max(0, selectedInvoice.amount - selectedInvoice.paid).toFixed(2)),
					payment_method: "bank_transfer",
					transaction_reference: `AUTO-${Date.now()}`,
				}),
			"Invoice marked paid.",
		);
	};

	const handleAddPayment = async () => {
		if (!selectedInvoiceId || !selectedInvoice) return;
		await runAction(
			() =>
				invoiceService.createInvoicePayment(selectedInvoiceId, {
					payment_date: dateInput(new Date()),
					amount: "50.00",
					currency: selectedInvoice.currency || "USD",
					payment_method: "upi",
					transaction_reference: `UPI-${Date.now()}`,
					payment_note: "Quick partial payment",
					status: "completed",
				}),
			"Payment added.",
		);
	};

	const handleGeneratePdf = async () => {
		if (!selectedInvoiceId) return;
		try {
			setActionLoading(true);
			const data = await invoiceService.getInvoicePdf(selectedInvoiceId);
			if (typeof window === "undefined") return;
			if (data instanceof Blob) {
				if ((data.type || "").includes("application/json")) {
					const text = await data.text();
					let parsed: any = {};
					try {
						parsed = JSON.parse(text);
					} catch {
						parsed = {};
					}
					const wrapped = parsed?.data && typeof parsed.data === "object" ? parsed.data : parsed;
					const url = String(wrapped?.url || wrapped?.file_url || wrapped?.pdf_url || "");
					if (url) {
						window.open(url, "_blank", "noopener,noreferrer");
						toast.success("PDF opened.");
						return;
					}
					const message = String(wrapped?.message || wrapped?.detail || "").trim();
					if (message) {
						toast.error(message);
						return;
					}
					toast.error("PDF API returned JSON instead of a file.");
					return;
				}

				const blobUrl = URL.createObjectURL(data);
				const link = document.createElement("a");
				link.href = blobUrl;
				link.download = `${selectedInvoice?.invoiceNumber || selectedInvoiceId}.pdf`;
				document.body.appendChild(link);
				link.click();
				document.body.removeChild(link);
				setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
				toast.success("PDF downloaded.");
				return;
			}
			const url = String((data as any)?.url || (data as any)?.file_url || "");
			if (url) {
				window.open(url, "_blank", "noopener,noreferrer");
				toast.success("PDF opened.");
				return;
			}
			toast.info("PDF response received.");
		} catch (error: any) {
			toast.error(error?.response?.data?.message || error?.message || "Failed to generate PDF.");
		} finally {
			setActionLoading(false);
		}
	};

	const selectedPayments = selectedInvoiceId ? payments[selectedInvoiceId] || [] : [];

	if (loading) {
		return (
			<div className="space-y-4">
				<Card>
					<CardContent className="py-10 text-sm text-muted-foreground">Loading invoicing data...</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<Card className="overflow-hidden border-0 shadow-md">
				<CardContent className="relative p-0">
					<div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-blue-900 to-cyan-700 opacity-95" />
					<div className="relative grid gap-3 p-6 text-white lg:grid-cols-3">
						<div className="space-y-2 lg:col-span-2">
							<Badge variant="warning">Automated Invoicing</Badge>
							<h2 className="text-2xl font-semibold">Generate polished invoices from hourly or fixed pricing.</h2>
							<p className="text-sm text-white/80">Live API integration for stats, list, creation, payments, reminders, and PDF export.</p>
						</div>
						<div className="rounded-xl bg-black/20 p-4">
							<div className="text-xs text-white/70">Collection Rate</div>
							<div className="text-4xl font-bold">{collectionRate.toFixed(0)}%</div>
							<Progress value={collectionRate} className="mt-2" />
						</div>
					</div>
				</CardContent>
			</Card>

			<div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
				<Card>
					<CardHeader className="pb-0">
						<CardTitle>Total Invoiced</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-3xl font-semibold">{formatCurrency(totalAmount)}</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-0">
						<CardTitle>Total Collected</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-3xl font-semibold">{formatCurrency(collectedAmount)}</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-0">
						<CardTitle>Outstanding</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-3xl font-semibold">{formatCurrency(totalAmount - collectedAmount)}</div>
					</CardContent>
				</Card>
			</div>

			<div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
				<Card className="xl:col-span-2">
					<CardHeader className="pb-0">
						<CardTitle>Invoice List</CardTitle>
						<CardDescription>GET `/invoices/` with status/client filters and live state actions.</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3">
						<div className="grid gap-2 md:grid-cols-3">
							<Select value={statusFilter} onValueChange={setStatusFilter}>
								<SelectTrigger>
									<SelectValue placeholder="Status" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All</SelectItem>
									<SelectItem value="draft">Draft</SelectItem>
									<SelectItem value="submitted">Submitted</SelectItem>
									<SelectItem value="sent">Sent</SelectItem>
									<SelectItem value="paid">Paid</SelectItem>
									<SelectItem value="overdue">Overdue</SelectItem>
								</SelectContent>
							</Select>
							<Input value={clientFilter} onChange={(e) => setClientFilter(e.target.value)} placeholder="Client UUID (optional)" />
							<Button variant="outline" onClick={loadAll} disabled={actionLoading}>Refresh</Button>
						</div>

						{invoices.map((invoice) => {
							const duePercent = invoice.amount > 0 ? Math.round((invoice.paid / invoice.amount) * 100) : 0;
							const isSelected = selectedInvoiceId === invoice.invoiceId;
							return (
								<div
									key={invoice.invoiceId}
									className={`cursor-pointer rounded-lg border p-4 ${isSelected ? "border-primary" : ""}`}
									onClick={() => setSelectedInvoiceId(invoice.invoiceId)}
								>
									<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
										<div>
											<div className="font-semibold">{invoice.invoiceNumber}</div>
											<div className="text-xs text-muted-foreground">
												{invoice.client} • {invoice.type}
											</div>
										</div>
										<div className="flex items-center gap-2">
											<Badge variant={statusVariant(invoice.status)}>{invoice.status}</Badge>
											<div className="font-semibold">{formatCurrency(invoice.amount, invoice.currency)}</div>
										</div>
									</div>
									<div className="mt-2 text-xs text-muted-foreground">Due: {invoice.dueDate}</div>
									<div className="mt-2">
										<div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
											<span>Payment Progress</span>
											<span>{duePercent}%</span>
										</div>
										<Progress value={duePercent} />
									</div>
								</div>
							);
						})}
						{!invoices.length ? <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">No invoices found.</div> : null}
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="pb-0">
						<CardTitle>Invoice Actions</CardTitle>
						<CardDescription>Create/update/submit/send/reminder/paid/payments/pdf endpoints.</CardDescription>
					</CardHeader>
					<CardContent className="space-y-2">
						<Button className="w-full" onClick={handleCreateInvoice} disabled={actionLoading}>
							<Icon icon="solar:add-circle-bold-duotone" /> Create Invoice
						</Button>
						<Button className="w-full" variant="outline" onClick={handleCreateFromTimeEntries} disabled={actionLoading || !selectedInvoice}>
							<Icon icon="solar:clock-circle-bold-duotone" /> From Time Entries
						</Button>
						<Button className="w-full" variant="secondary" onClick={handleSubmit} disabled={actionLoading || !selectedInvoiceId}>
							<Icon icon="solar:document-text-bold-duotone" /> Submit
						</Button>
						<Button className="w-full" variant="secondary" onClick={handleSend} disabled={actionLoading || !selectedInvoiceId}>
							<Icon icon="solar:letter-bold-duotone" /> Send
						</Button>
						<Button className="w-full" variant="outline" onClick={handleReminder} disabled={actionLoading || !selectedInvoiceId}>
							<Icon icon="solar:bell-bold-duotone" /> Reminder
						</Button>
						<Button className="w-full" variant="ghost" onClick={handleMarkPaid} disabled={actionLoading || !selectedInvoiceId}>
							<Icon icon="solar:card-bold-duotone" /> Mark Paid
						</Button>
						<Button className="w-full" variant="outline" onClick={handleAddPayment} disabled={actionLoading || !selectedInvoiceId}>
							<Icon icon="solar:wallet-bold-duotone" /> Add Payment
						</Button>
						<Button className="w-full" variant="outline" onClick={handleLoadPayments} disabled={actionLoading || !selectedInvoiceId}>
							<Icon icon="solar:list-bold-duotone" /> Load Payments ({selectedPayments.length})
						</Button>
						<Button className="w-full" variant="outline" onClick={handleGeneratePdf} disabled={actionLoading || !selectedInvoiceId}>
							<Icon icon="solar:document-bold-duotone" /> Generate PDF
						</Button>
						<Button className="w-full" variant="outline" onClick={handleViewDetail} disabled={actionLoading || !selectedInvoiceId}>
							<Icon icon="solar:eye-bold-duotone" /> View Detail
						</Button>
						<Input value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} placeholder="Update note" />
						<Button className="w-full" variant="outline" onClick={handleSaveNote} disabled={actionLoading || !selectedInvoiceId}>
							<Icon icon="solar:pen-bold-duotone" /> Save Note
						</Button>
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader className="pb-0">
					<CardTitle>Monthly Invoicing Trend</CardTitle>
				</CardHeader>
				<CardContent>
					<Chart type="area" height={280} options={revenueOptions} series={[{ name: "Billed", data: revenueData.values }]} />
				</CardContent>
			</Card>
		</div>
	);
}
