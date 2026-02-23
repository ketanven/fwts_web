import reportService, { type ReportExportPayload } from "@/api/services/reportService";
import { Chart, useChart } from "@/components/chart";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Input } from "@/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type AnyRec = Record<string, any>;

type ClientRevenue = { client: string; amount: number; share: number };
type ProjectPerf = { project: string; completion: number; profitability: number; risk: string };

const asRecord = (value: unknown): AnyRec => (value && typeof value === "object" && !Array.isArray(value) ? (value as AnyRec) : {});
const asArray = <T = unknown>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

const toNumber = (value: unknown, fallback = 0) => {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : fallback;
};

const pick = (obj: AnyRec, keys: string[], fallback: unknown = undefined) => {
	for (const key of keys) {
		if (obj[key] !== undefined && obj[key] !== null) return obj[key];
	}
	return fallback;
};

const formatCurrency = (value: number, currency = "USD") => {
	try {
		return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(value);
	} catch {
		return `$${value.toFixed(2)}`;
	}
};

const dateInput = (date: Date) => date.toISOString().slice(0, 10);

export default function ReportingPage() {
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [earningsRes, setEarningsRes] = useState<AnyRec>({});
	const [allocationRes, setAllocationRes] = useState<AnyRec>({});
	const [projectRes, setProjectRes] = useState<AnyRec>({});
	const [clientRes, setClientRes] = useState<AnyRec>({});
	const [monthlyRes, setMonthlyRes] = useState<AnyRec>({});

	const [exportReportType, setExportReportType] = useState<ReportExportPayload["report_type"]>("earnings");
	const [exportPeriodType, setExportPeriodType] = useState<ReportExportPayload["period_type"]>("monthly");
	const [exportFormat, setExportFormat] = useState<ReportExportPayload["file_format"]>("csv");
	const [exportDateFrom, setExportDateFrom] = useState(dateInput(new Date(new Date().setDate(1))));
	const [exportDateTo, setExportDateTo] = useState(dateInput(new Date()));
	const [exportClientId, setExportClientId] = useState("");
	const [exportLoading, setExportLoading] = useState(false);

	const loadReports = useCallback(async () => {
		try {
			setRefreshing(true);
			const [earnings, allocation, projectPerformance, clientAnalytics, monthly] = await Promise.all([
				reportService.getEarnings(),
				reportService.getTimeAllocation(),
				reportService.getProjectPerformance(),
				reportService.getClientAnalytics(),
				reportService.getMonthly(),
			]);
			setEarningsRes(asRecord(earnings));
			setAllocationRes(asRecord(allocation));
			setProjectRes(asRecord(projectPerformance));
			setClientRes(asRecord(clientAnalytics));
			setMonthlyRes(asRecord(monthly));
		} catch (error: any) {
			const message = error?.response?.data?.message || error?.response?.data?.detail || error?.message || "Failed to load reports.";
			toast.error(message);
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	}, []);

	useEffect(() => {
		loadReports();
	}, [loadReports]);

	const monthlyEarnings = useMemo(() => {
		const chart = asRecord(pick(monthlyRes, ["chart"], {}));
		const values = asArray<number>(pick(chart, ["values", "data"], pick(monthlyRes, ["series", "earnings", "monthly_earnings"], []))).map((v) =>
			toNumber(v, 0),
		);
		if (values.length) return values;
		const points = asArray<AnyRec>(pick(monthlyRes, ["items", "data", "trend"], []));
		if (points.length) return points.map((row) => toNumber(pick(row, ["value", "amount", "earnings"], 0), 0));
		return [0, 0, 0, 0, 0, 0];
	}, [monthlyRes]);

	const monthlyCategories = useMemo(() => {
		const chart = asRecord(pick(monthlyRes, ["chart"], {}));
		const categories = asArray<string>(pick(chart, ["categories", "labels"], pick(monthlyRes, ["categories", "labels"], [])));
		if (categories.length) return categories;
		const points = asArray<AnyRec>(pick(monthlyRes, ["items", "data", "trend"], []));
		if (points.length) return points.map((row, idx) => String(pick(row, ["label", "month", "period"], `P${idx + 1}`)));
		return ["Sep", "Oct", "Nov", "Dec", "Jan", "Feb"];
	}, [monthlyRes]);

	const clientEarnings = useMemo(() => {
		const rows = asArray<AnyRec>(pick(clientRes, ["clients", "items", "data", "client_analytics"], []));
		const mapped = rows.map((row, idx) => {
			const amount = toNumber(pick(row, ["amount", "revenue", "earnings"], 0), 0);
			return {
				client: String(pick(row, ["client", "name", "client_name"], `Client ${idx + 1}`)),
				amount,
				share: toNumber(pick(row, ["share", "percent", "contribution"], 0), 0),
			} as ClientRevenue;
		});
		if (mapped.length) {
			const total = mapped.reduce((sum, row) => sum + row.amount, 0);
			return mapped.map((row) => ({ ...row, share: row.share || (total > 0 ? (row.amount / total) * 100 : 0) }));
		}
		return [] as ClientRevenue[];
	}, [clientRes]);

	const timeAllocation = useMemo(() => {
		const rows = asArray<AnyRec>(pick(allocationRes, ["allocation", "items", "data", "time_allocation"], []));
		if (rows.length) {
			return rows.map((row) => toNumber(pick(row, ["value", "percent", "percentage", "hours"], 0), 0));
		}
		const direct = asArray<number>(pick(allocationRes, ["values", "series"], []));
		if (direct.length) return direct.map((v) => toNumber(v, 0));
		return [100];
	}, [allocationRes]);

	const timeAllocationLabels = useMemo(() => {
		const rows = asArray<AnyRec>(pick(allocationRes, ["allocation", "items", "data", "time_allocation"], []));
		if (rows.length) return rows.map((row, idx) => String(pick(row, ["label", "name", "category"], `Category ${idx + 1}`)));
		const labels = asArray<string>(pick(allocationRes, ["labels", "categories"], []));
		if (labels.length) return labels;
		return ["All"];
	}, [allocationRes]);

	const projectPerformance = useMemo(() => {
		const rows = asArray<AnyRec>(pick(projectRes, ["projects", "items", "data", "project_performance"], []));
		return rows.map((row, idx) => ({
			project: String(pick(row, ["project", "name", "project_name"], `Project ${idx + 1}`)),
			completion: toNumber(pick(row, ["completion", "progress", "completion_percent"], 0), 0),
			profitability: toNumber(pick(row, ["profitability", "margin", "profitability_percent"], 0), 0),
			risk: String(pick(row, ["risk", "risk_level", "status"], "Low")),
		})) as ProjectPerf[];
	}, [projectRes]);

	const totalAmount = useMemo(() => {
		const earningsTotal = toNumber(pick(earningsRes, ["total_earnings", "total", "amount"], NaN), NaN);
		if (Number.isFinite(earningsTotal)) return earningsTotal;
		return monthlyEarnings.reduce((a, b) => a + b, 0);
	}, [earningsRes, monthlyEarnings]);

	const earningOptions = useChart({
		chart: { toolbar: { show: false } },
		stroke: { curve: "smooth", width: 3 },
		dataLabels: { enabled: false },
		xaxis: { categories: monthlyCategories },
		colors: ["#0ea5e9"],
	});

	const allocationOptions = useChart({
		labels: timeAllocationLabels,
		legend: { position: "bottom" },
		dataLabels: { enabled: false },
		colors: ["#22c55e", "#f59e0b", "#6366f1", "#ec4899", "#0ea5e9", "#ef4444"],
		plotOptions: { pie: { donut: { size: "68%" } } },
	});

	const handleExport = async () => {
		try {
			setExportLoading(true);
			const payload: ReportExportPayload = {
				report_type: exportReportType,
				period_type: exportPeriodType,
				file_format: exportFormat,
				filters_json: {
					date_from: exportDateFrom || undefined,
					date_to: exportDateTo || undefined,
					client_id: exportClientId.trim() || undefined,
				},
			};
			const response = asRecord(await reportService.createExport(payload));
			const status = String(pick(response, ["export_status", "status"], "created"));
			toast.success(`Report export ${status}.`);
		} catch (error: any) {
			const message = error?.response?.data?.message || error?.response?.data?.detail || error?.message || "Failed to export report.";
			toast.error(message);
		} finally {
			setExportLoading(false);
		}
	};

	if (loading) {
		return (
			<div className="space-y-4">
				<Card>
					<CardContent className="py-10 text-sm text-muted-foreground">Loading reports...</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<Card className="overflow-hidden border-0 shadow-md">
				<CardContent className="relative p-0">
					<div className="absolute inset-0 bg-gradient-to-r from-emerald-900 via-teal-800 to-cyan-700 opacity-95" />
					<div className="relative grid gap-3 p-6 text-white lg:grid-cols-3">
						<div className="space-y-2 lg:col-span-2">
							<Badge variant="success">Comprehensive Reporting</Badge>
							<h2 className="text-2xl font-semibold">Understand earnings, time allocation, and project performance.</h2>
							<p className="text-sm text-white/80">Live data from reports earnings/time-allocation/project-performance/client-analytics/monthly APIs.</p>
						</div>
						<div className="rounded-xl bg-black/20 p-4">
							<div className="text-xs text-white/70">Total Earnings</div>
							<div className="text-4xl font-bold">{formatCurrency(totalAmount)}</div>
							<Button variant="secondary" size="sm" className="mt-3" onClick={loadReports} disabled={refreshing}>
								{refreshing ? "Refreshing..." : "Refresh"}
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>

			<div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
				<Card className="xl:col-span-2">
					<CardHeader className="pb-0">
						<CardTitle>Monthly Earnings</CardTitle>
					</CardHeader>
					<CardContent>
						<Chart type="area" height={280} options={earningOptions} series={[{ name: "Earnings", data: monthlyEarnings }]} />
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-0">
						<CardTitle>Time Allocation</CardTitle>
						<CardDescription>How your tracked time is distributed.</CardDescription>
					</CardHeader>
					<CardContent>
						<Chart type="donut" height={280} options={allocationOptions} series={timeAllocation} />
					</CardContent>
				</Card>
			</div>

			<div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
				<Card>
					<CardHeader className="pb-0">
						<CardTitle>Client-wise Revenue</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						{clientEarnings.map((row) => (
							<div key={row.client} className="rounded-lg border p-4">
								<div className="flex items-center justify-between">
									<div className="font-medium">{row.client}</div>
									<div className="font-semibold">{formatCurrency(row.amount)}</div>
								</div>
								<div className="mt-1 text-xs text-muted-foreground">{row.share.toFixed(1)}% contribution</div>
							</div>
						))}
						{!clientEarnings.length ? <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No client analytics found.</div> : null}
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-0">
						<CardTitle>Project Performance</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						{projectPerformance.map((row) => (
							<div key={row.project} className="rounded-lg border p-4">
								<div className="flex items-center justify-between gap-2">
									<div className="font-medium">{row.project}</div>
									<Badge variant={row.risk.toLowerCase() === "high" ? "error" : row.risk.toLowerCase() === "medium" ? "warning" : "success"}>
										{row.risk} Risk
									</Badge>
								</div>
								<div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
									<span>Completion {row.completion.toFixed(0)}%</span>
									<span>Profitability {row.profitability.toFixed(0)}%</span>
								</div>
							</div>
						))}
						{!projectPerformance.length ? <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No project performance found.</div> : null}
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader className="pb-0">
					<CardTitle>Export Report</CardTitle>
					<CardDescription>POST `/reports/export/`</CardDescription>
				</CardHeader>
				<CardContent className="grid gap-3 md:grid-cols-6">
					<Select value={exportReportType} onValueChange={(v) => setExportReportType(v as ReportExportPayload["report_type"])}>
						<SelectTrigger>
							<SelectValue placeholder="Report type" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="earnings">Earnings</SelectItem>
							<SelectItem value="time_allocation">Time Allocation</SelectItem>
							<SelectItem value="project_performance">Project Performance</SelectItem>
							<SelectItem value="client_analytics">Client Analytics</SelectItem>
							<SelectItem value="monthly">Monthly</SelectItem>
						</SelectContent>
					</Select>
					<Select value={exportPeriodType} onValueChange={(v) => setExportPeriodType(v as ReportExportPayload["period_type"])}>
						<SelectTrigger>
							<SelectValue placeholder="Period" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="weekly">Weekly</SelectItem>
							<SelectItem value="monthly">Monthly</SelectItem>
							<SelectItem value="quarterly">Quarterly</SelectItem>
						</SelectContent>
					</Select>
					<Select value={exportFormat} onValueChange={(v) => setExportFormat(v as ReportExportPayload["file_format"])}>
						<SelectTrigger>
							<SelectValue placeholder="Format" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="csv">CSV</SelectItem>
							<SelectItem value="xlsx">XLSX</SelectItem>
							<SelectItem value="pdf">PDF</SelectItem>
						</SelectContent>
					</Select>
					<Input type="date" value={exportDateFrom} onChange={(e) => setExportDateFrom(e.target.value)} />
					<Input type="date" value={exportDateTo} onChange={(e) => setExportDateTo(e.target.value)} />
					<Input value={exportClientId} onChange={(e) => setExportClientId(e.target.value)} placeholder="Client UUID (optional)" />
					<Button className="md:col-span-6" onClick={handleExport} disabled={exportLoading}>
						{exportLoading ? "Exporting..." : "Create Export"}
					</Button>
				</CardContent>
			</Card>
		</div>
	);
}
