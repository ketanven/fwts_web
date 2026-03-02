import analysisService from "@/api/services/analysisService";
import { Chart } from "@/components/chart/chart";
import { useChart } from "@/components/chart/useChart";
import Icon from "@/components/icon/icon";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { Progress } from "@/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { Text, Title } from "@/ui/typography";
import { cn } from "@/utils";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type TimeType = "day" | "week" | "month";
type AnalysisData = Record<string, any>;

type ParsedClient = { name: string; revenue: number; hours: number; trust: string };
type ParsedTask = { task: string; estimated: number; actual: number; status: string };
type ParsedAllocation = { label: string; value: number; color: string };

const timeOptions: { label: string; value: TimeType }[] = [
	{ label: "Day", value: "day" },
	{ label: "Week", value: "week" },
	{ label: "Month", value: "month" },
];

const allocationColors = ["#22c55e", "#f59e0b", "#6366f1", "#ec4899", "#0ea5e9", "#a855f7", "#ef4444"];

const asRecord = (value: unknown): AnalysisData => (value && typeof value === "object" && !Array.isArray(value) ? (value as AnalysisData) : {});
const asArray = <T = unknown>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);
const firstArrayByKeys = (source: AnalysisData, keys: string[]): AnalysisData[] | undefined => {
	for (const key of keys) {
		if (Array.isArray(source[key])) return source[key] as AnalysisData[];
	}
	return undefined;
};
const firstArrayValue = (source: AnalysisData): AnalysisData[] | undefined => {
	for (const value of Object.values(source)) {
		if (Array.isArray(value)) return value as AnalysisData[];
	}
	return undefined;
};
const getRows = (value: unknown, preferredKeys: string[]): AnalysisData[] => {
	if (Array.isArray(value)) return value as AnalysisData[];
	const root = asRecord(value);
	const nested = [root, asRecord(root.data), asRecord(root.result), asRecord(root.payload)];
	for (const source of nested) {
		const direct = firstArrayByKeys(source, preferredKeys);
		if (direct) return direct;
		const fallback = firstArrayByKeys(source, ["results", "items", "data", "rows", "list"]);
		if (fallback) return fallback;
		const anyArray = firstArrayValue(source);
		if (anyArray) return anyArray;
	}
	return [];
};
const getContextObject = (value: unknown): AnalysisData => {
	if (Array.isArray(value)) return {};
	const root = asRecord(value);
	const nested = asRecord(root.data);
	if (Object.keys(nested).length > 0 && !Array.isArray(root.data)) return nested;
	return root;
};

const toNumber = (value: unknown, fallback = 0) => {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : fallback;
};

const pick = (obj: AnalysisData, keys: string[], fallback: unknown = undefined) => {
	for (const key of keys) {
		if (obj[key] !== undefined && obj[key] !== null) return obj[key];
	}
	return fallback;
};

const pickNumber = (obj: AnalysisData, keys: string[], fallback = 0) => toNumber(pick(obj, keys, fallback), fallback);
const pickString = (obj: AnalysisData, keys: string[], fallback = "") => String(pick(obj, keys, fallback) ?? fallback);

const formatCurrency = (value: number, currency = "USD") => {
	if (!Number.isFinite(value)) return "-";
	try {
		return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(value);
	} catch {
		return `$${value.toFixed(2)}`;
	}
};

const formatSecondsToClock = (seconds: number) => {
	const safe = Math.max(0, Math.floor(seconds));
	const hours = Math.floor(safe / 3600);
	const minutes = Math.floor((safe % 3600) / 60);
	const secs = safe % 60;
	if (hours > 0) return `${hours}h ${minutes}m`;
	return `${minutes}m ${secs}s`;
};

function Trend({ value }: { value: number }) {
	const trendClass = value > 0 ? "text-success" : value < 0 ? "text-error" : "text-muted-foreground";
	return (
		<span className={cn(trendClass, "flex items-center gap-1 font-bold")}>
			{value > 0 ? (
				<Icon icon="mdi:arrow-up" className="inline-block align-middle" size={16} />
			) : value < 0 ? (
				<Icon icon="mdi:arrow-down" className="inline-block align-middle" size={16} />
			) : null}
			{Math.abs(value).toFixed(1)}%
		</span>
	);
}

export default function Analysis() {
	const [timeType, setTimeType] = useState<TimeType>("day");
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [summary, setSummary] = useState<unknown>({});
	const [webAnalytics, setWebAnalytics] = useState<unknown>({});
	const [earningsTrend, setEarningsTrend] = useState<unknown>({});
	const [timeAllocation, setTimeAllocation] = useState<unknown>({});
	const [topClients, setTopClients] = useState<unknown>({});
	const [taskAccuracy, setTaskAccuracy] = useState<unknown>({});
	const [invoiceHealth, setInvoiceHealth] = useState<unknown>({});
	const [exportData, setExportData] = useState<unknown>({});

	const days = timeType === "day" ? 1 : timeType === "week" ? 7 : 30;
	const period = timeType === "month" ? "monthly" : "weekly";

	const loadAnalysis = useCallback(async () => {
		try {
			setRefreshing(true);
				const [summaryRes, webRes, earningsRes, allocationRes, clientsRes, accuracyRes, invoiceRes, exportRes] = await Promise.all([
				analysisService.getSummary(),
				analysisService.getWebAnalytics(days),
				analysisService.getEarningsTrend(period),
				analysisService.getTimeAllocation(),
				analysisService.getTopClients(),
				analysisService.getTaskAccuracy(),
				analysisService.getInvoiceHealth(),
				analysisService.getExport(),
				]);
				setSummary(summaryRes);
				setWebAnalytics(webRes);
				setEarningsTrend(earningsRes);
				setTimeAllocation(allocationRes);
				setTopClients(clientsRes);
				setTaskAccuracy(accuracyRes);
				setInvoiceHealth(invoiceRes);
				setExportData(exportRes);
		} catch (error: any) {
			const message = error?.response?.data?.message || error?.response?.data?.detail || error?.message || "Failed to load analysis data.";
			toast.error(message);
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	}, [days, period]);

	useEffect(() => {
		loadAnalysis();
	}, [loadAnalysis]);

	const summaryData = useMemo(() => {
		const root = getContextObject(summary);
		const billable = pickNumber(root, ["billable_hours", "billableHours", "total_billable_hours"], 0);
		const billableChange = pickNumber(root, ["billable_hours_change", "billableHoursChange"], 0);
		const billableTarget = pickNumber(root, ["billable_target_progress", "billableTargetProgress", "target_progress"], 0);
		const earnings = pickNumber(root, ["total_earnings", "earnings", "revenue"], 0);
		const earningsChange = pickNumber(root, ["earnings_change", "revenue_change", "earningsGrowth"], 0);
		const utilization = pickNumber(root, ["utilization_rate", "utilization", "utilizationRate"], 0);
		const utilizationChange = pickNumber(root, ["utilization_change", "utilizationChange"], 0);
		const productivity = pickNumber(root, ["productivity_score", "productivity", "productivityScore"], 0);
		const productivityChange = pickNumber(root, ["productivity_change", "productivityChange"], 0);
		const onTimeRate = pickNumber(root, ["on_time_rate", "onTimeRate", "delivery_rate"], 0);
		const onTimeRateChange = pickNumber(root, ["on_time_rate_change", "onTimeRateChange"], 0);

		return {
			billable,
			billableChange,
			billableTarget: Math.max(0, Math.min(100, billableTarget || utilization)),
			earnings,
			earningsChange,
			utilization: Math.max(0, Math.min(100, utilization)),
			utilizationChange,
			productivity: Math.max(0, Math.min(100, productivity)),
			productivityChange,
			onTimeRate: Math.max(0, Math.min(100, onTimeRate)),
			onTimeRateChange,
		};
	}, [summary]);

	const webData = useMemo(() => {
		const root = getContextObject(webAnalytics);
		const chart = asRecord(pick(root, ["chart"], {}));
		const categories = asArray<string>(pick(chart, ["categories"], pick(root, ["categories", "labels"], [])));
		const rawSeries = asArray<AnalysisData>(pick(chart, ["series"], pick(root, ["series"], [])));
		let series = rawSeries
			.map((item, idx) => {
				const row = asRecord(item);
				return {
					name: pickString(row, ["name", "label"], `Series ${idx + 1}`),
					data: asArray<number>(pick(row, ["data", "values"], [])).map((v) => toNumber(v, 0)),
				};
			})
			.filter((row) => row.data.length > 0);
		let computedCategories = categories;
		const rows = getRows(webAnalytics, ["data", "trend", "points", "items"]);
		if (!series.length && rows.length) {
			series = [
				{
					name: "Hours",
					data: rows.map((row) => toNumber(pick(asRecord(row), ["hours", "value", "amount"], 0), 0)),
				},
			];
			computedCategories = rows.map((row, idx) => pickString(asRecord(row), ["date", "label", "period", "name"], `P${idx + 1}`));
		}
		const primarySeries = series[0]?.data || [];
		const fallbackTotal = primarySeries.reduce((sum, value) => sum + toNumber(value, 0), 0);
		const fallbackAvg = primarySeries.length ? fallbackTotal / primarySeries.length : 0;

		return {
			pageViews: pickNumber(root, ["page_views", "pageViews", "total_page_views"], fallbackTotal),
			pageViewsChange: pickNumber(root, ["page_views_change", "pageViewsChange"], 0),
			avgTimeSeconds: pickNumber(root, ["avg_time_seconds", "avg_time", "avgTimeSeconds"], fallbackAvg * 3600),
			avgTimeChange: pickNumber(root, ["avg_time_change", "avgTimeChange"], 0),
			categories: computedCategories,
			series: series.length ? series : [{ name: "Traffic", data: [0, 0, 0, 0, 0, 0, 0] }],
		};
	}, [webAnalytics]);

	const earningsData = useMemo(() => {
		const root = getContextObject(earningsTrend);
		const chart = asRecord(pick(root, ["chart"], {}));
		const categories = asArray<string>(pick(chart, ["categories"], pick(root, ["categories", "labels"], [])));
		const seriesRows = asArray<AnalysisData>(pick(chart, ["series"], pick(root, ["series"], [])));

		if (seriesRows.length > 0) {
			const first = asRecord(seriesRows[0]);
			const values = asArray<number>(pick(first, ["data", "values"], [])).map((item) => toNumber(item, 0));
			return {
				series: values.length ? values : [0, 0, 0, 0],
				categories: categories.length ? categories : values.map((_, idx) => `P${idx + 1}`),
			};
		}

		const list = getRows(earningsTrend, ["trend", "points", "items", "data"]);
		if (list.length > 0) {
			return {
				series: list.map((row) => pickNumber(asRecord(row), ["value", "amount", "earnings", "hours"], 0)),
				categories: list.map((row, idx) => pickString(asRecord(row), ["label", "period", "date", "name"], `P${idx + 1}`)),
			};
		}

		return {
			series: [0, 0, 0, 0],
			categories: ["P1", "P2", "P3", "P4"],
		};
	}, [earningsTrend]);

	const allocationData = useMemo(() => {
		const root = getContextObject(timeAllocation);
		const list = getRows(timeAllocation, ["allocation", "time_allocation", "items", "data"]);
		let rows: ParsedAllocation[] = list
			.map((row, idx) => {
				const item = asRecord(row);
				return {
					label: pickString(item, ["label", "name", "category", "type"], `Category ${idx + 1}`),
					value: pickNumber(item, ["value", "percent", "percentage", "hours", "duration"], 0),
					color: pickString(item, ["color"], allocationColors[idx % allocationColors.length]),
				};
			})
			.filter((item) => item.value > 0);
		if (!rows.length) {
			const objectRows = Object.entries(root)
				.filter(([, value]) => Number.isFinite(Number(value)))
				.map(([key, value], idx) => ({
					label: key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
					value: toNumber(value, 0),
					color: allocationColors[idx % allocationColors.length],
				}))
				.filter((item) => item.value > 0);
			rows = objectRows;
		}
		return rows.length ? rows : [{ label: "No Data", value: 100, color: "#94a3b8" }];
	}, [timeAllocation]);

	const clientRows = useMemo(() => {
		const list = getRows(topClients, ["clients", "top_clients", "items", "data"]);
		return list.map((row, idx) => {
			const item = asRecord(row);
			return {
				name: pickString(item, ["name", "client", "client_name"], `Client ${idx + 1}`),
				revenue: pickNumber(item, ["revenue", "amount", "earnings"], 0),
				hours: pickNumber(item, ["hours", "billable_hours", "tracked_hours"], 0),
				trust: pickString(item, ["trust", "status", "health"], "Moderate"),
			} as ParsedClient;
		});
	}, [topClients]);

	const taskRows = useMemo(() => {
		const list = getRows(taskAccuracy, ["tasks", "task_accuracy", "items", "data"]);
		return list.map((row, idx) => {
			const item = asRecord(row);
			const variance = pickNumber(item, ["variance_hours", "variance"], 0);
			const statusFallback = variance > 0 ? "Delayed" : "On Time";
			return {
				task: pickString(item, ["task", "title", "name"], `Task ${idx + 1}`),
				estimated: pickNumber(item, ["estimated", "estimated_hours", "estimate"], 0),
				actual: pickNumber(item, ["actual", "actual_hours", "actual_spent"], 0),
				status: pickString(item, ["status", "accuracy_status"], statusFallback),
			} as ParsedTask;
		});
	}, [taskAccuracy]);

	const invoiceData = useMemo(() => {
		const root = getContextObject(invoiceHealth);
		return {
			paid: pickNumber(root, ["paid", "paid_count", "paid_invoices"], 0),
			pending: pickNumber(root, ["pending", "pending_count", "pending_invoices"], 0),
			overdue: pickNumber(root, ["overdue", "overdue_count", "overdue_invoices"], 0),
		};
	}, [invoiceHealth]);

	const quickInsight = useMemo(() => {
		const topAllocation = [...allocationData].sort((a, b) => b.value - a.value)[0];
		const delayed = taskRows.filter((row) => String(row.status).toLowerCase().includes("delay")).length;
		if (!topAllocation) return "No analysis insight available yet.";
		return `${topAllocation.label} has highest allocation (${topAllocation.value.toFixed(0)}%). Delayed tasks: ${delayed}.`;
	}, [allocationData, taskRows]);

	const webChartOptions = useChart({
		xaxis: { categories: webData.categories },
		chart: { toolbar: { show: false } },
		dataLabels: { enabled: false },
		stroke: { curve: "smooth", width: 3 },
	});

	const earningsChartOptions = useChart({
		xaxis: { categories: earningsData.categories },
		chart: { toolbar: { show: false } },
		stroke: { curve: "smooth", width: 3 },
		dataLabels: { enabled: false },
		colors: ["#0ea5e9"],
	});

	const allocationChartOptions = useChart({
		labels: allocationData.map((item) => item.label),
		colors: allocationData.map((item) => item.color),
		stroke: { show: false },
		legend: { position: "bottom" },
		dataLabels: { enabled: false },
		plotOptions: { pie: { donut: { size: "66%" } } },
	});

	const trustVariant = (value: string) => {
		const normalized = value.toLowerCase();
		const numeric = Number(value);
		if (Number.isFinite(numeric)) {
			if (numeric >= 75) return "success";
			if (numeric >= 50) return "info";
			if (numeric >= 25) return "warning";
			return "error";
		}
		if (normalized.includes("trust") || normalized.includes("good")) return "success";
		if (normalized.includes("moderate") || normalized.includes("info")) return "info";
		if (normalized.includes("watch") || normalized.includes("warn") || normalized.includes("pending")) return "warning";
		return "error";
	};

	const taskDelta = (estimated: number, actual: number) => {
		if (estimated <= 0) return 0;
		return ((actual - estimated) / estimated) * 100;
	};

	const exportRoot = getContextObject(exportData);
	const exportUrl = pickString(exportRoot, ["url", "file_url", "download_url"], "");
	const exportLabel = pickString(exportRoot, ["label", "name", "export_name"], "Export Ready");

	if (loading) {
		return (
			<div className="space-y-4">
				<Card>
					<CardContent className="py-10 text-sm text-muted-foreground">Loading analysis data...</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
				<div>
					<Title as="h4" className="mb-1 text-xl">
						Freelancer Analytics
					</Title>
					<Text variant="body2" className="text-muted-foreground">
						Live backend analytics from summary, web analytics, earnings trend, allocation, clients, tasks, invoices, and export APIs.
					</Text>
				</div>
				<div className="flex items-center gap-2">
					<Text variant="body2" className="text-muted-foreground">
						Show by:
					</Text>
					<Select value={timeType} onValueChange={(v) => setTimeType(v as TimeType)}>
						<SelectTrigger className="h-9 w-32">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{timeOptions.map((opt) => (
								<SelectItem key={opt.value} value={opt.value}>
									{opt.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Button variant="outline" onClick={loadAnalysis} disabled={refreshing}>
						{refreshing ? "Refreshing..." : "Refresh"}
					</Button>
				</div>
			</div>

			<div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
				<Card>
					<CardHeader className="pb-2">
						<CardTitle>
							<Text variant="subTitle2">Billable Hours</Text>
						</CardTitle>
					</CardHeader>
					<CardContent>
						<Title as="h3" className="text-2xl">
							{summaryData.billable.toFixed(1)}h
						</Title>
						<div className="mt-1 flex items-center gap-2">
							<Trend value={summaryData.billableChange} />
							<Text variant="caption" className="text-muted-foreground">
								vs previous period
							</Text>
						</div>
						<div className="mt-3">
							<div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
								<span>Target progress</span>
								<span>{summaryData.billableTarget.toFixed(0)}%</span>
							</div>
							<Progress value={summaryData.billableTarget} />
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="pb-2">
						<CardTitle>
							<Text variant="subTitle2">Total Earnings</Text>
						</CardTitle>
					</CardHeader>
					<CardContent>
						<Title as="h3" className="text-2xl">
							{formatCurrency(summaryData.earnings)}
						</Title>
						<div className="mt-1 flex items-center gap-2">
							<Trend value={summaryData.earningsChange} />
							<Text variant="caption" className="text-muted-foreground">
								revenue growth
							</Text>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="pb-2">
						<CardTitle>
							<Text variant="subTitle2">Utilization Rate</Text>
						</CardTitle>
					</CardHeader>
					<CardContent>
						<Title as="h3" className="text-2xl">
							{summaryData.utilization.toFixed(0)}%
						</Title>
						<div className="mt-1 flex items-center gap-2">
							<Trend value={summaryData.utilizationChange} />
							<Text variant="caption" className="text-muted-foreground">
								billable capacity
							</Text>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="pb-2">
						<CardTitle>
							<Text variant="subTitle2">Productivity Score</Text>
						</CardTitle>
					</CardHeader>
					<CardContent>
						<Title as="h3" className="text-2xl">
							{summaryData.productivity.toFixed(0)}/100
						</Title>
						<div className="mt-1 flex items-center gap-2">
							<Trend value={summaryData.productivityChange} />
							<Text variant="caption" className="text-muted-foreground">
								task efficiency
							</Text>
						</div>
					</CardContent>
				</Card>
			</div>

			<div className="flex flex-col gap-4 xl:grid xl:grid-cols-4">
				<Card className="col-span-4 xl:col-span-3">
					<CardHeader className="flex flex-row items-center justify-between pb-2">
						<CardTitle>
							<Title as="h3" className="text-lg">
								Web Analytics
							</Title>
						</CardTitle>
					</CardHeader>
					<CardContent className="flex flex-col gap-2">
						<div className="flex flex-wrap items-center gap-6">
							<div>
								<Text variant="subTitle2" className="text-muted-foreground">
									Page views
								</Text>
								<div className="flex items-end gap-2">
									<Title as="h3" className="text-2xl">
										{webData.pageViews.toLocaleString()}
									</Title>
									<Trend value={webData.pageViewsChange} />
								</div>
							</div>
							<div>
								<Text variant="subTitle2" className="text-muted-foreground">
									Avg. Time on page
								</Text>
								<div className="flex items-end gap-2">
									<Title as="h3" className="text-2xl">
										{formatSecondsToClock(webData.avgTimeSeconds)}
									</Title>
									<Trend value={webData.avgTimeChange} />
								</div>
							</div>
						</div>
						<div className="mt-2 min-h-[200px] w-full">
							<Chart type="line" height={320} options={webChartOptions} series={webData.series} />
						</div>
					</CardContent>
				</Card>

				<div className="h-full xl:col-span-1">
					<div className="flex h-full flex-col gap-4 md:flex-row xl:flex-col">
						<Card className="flex-1">
							<CardHeader className="pb-2">
								<CardTitle>
									<Text variant="subTitle2">Invoice Health</Text>
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-2">
								<div className="flex items-center justify-between text-sm">
									<span className="text-muted-foreground">Paid</span>
									<span className="font-semibold text-success">{invoiceData.paid}</span>
								</div>
								<div className="flex items-center justify-between text-sm">
									<span className="text-muted-foreground">Pending</span>
									<span className="font-semibold text-warning">{invoiceData.pending}</span>
								</div>
								<div className="flex items-center justify-between text-sm">
									<span className="text-muted-foreground">Overdue</span>
									<span className="font-semibold text-error">{invoiceData.overdue}</span>
								</div>
							</CardContent>
						</Card>
						<Card className="flex-1">
							<CardHeader className="pb-2">
								<CardTitle>
									<Text variant="subTitle2">On-time Delivery</Text>
								</CardTitle>
							</CardHeader>
							<CardContent>
								<Title as="h3" className="text-2xl">
									{summaryData.onTimeRate.toFixed(0)}%
								</Title>
								<div className="mt-1 flex items-center gap-2">
									<Trend value={summaryData.onTimeRateChange} />
									<Text variant="caption" className="text-muted-foreground">
										delivery trend
									</Text>
								</div>
								<Progress value={summaryData.onTimeRate} className="mt-3" />
							</CardContent>
						</Card>
						<Card className="flex-1">
							<CardHeader className="pb-2">
								<CardTitle>
									<Text variant="subTitle2">Quick Insight</Text>
								</CardTitle>
							</CardHeader>
							<CardContent className="text-sm text-muted-foreground">{quickInsight}</CardContent>
						</Card>
					</div>
				</div>
			</div>

			<div className="grid grid-cols-12 gap-4">
				<Card className="col-span-12 xl:col-span-8">
					<CardHeader>
						<CardTitle>
							<Title as="h3" className="text-lg">
								Earnings Trend
							</Title>
						</CardTitle>
					</CardHeader>
					<CardContent>
						<Chart type="area" height={300} options={earningsChartOptions} series={[{ name: "Earnings", data: earningsData.series }]} />
					</CardContent>
				</Card>

				<Card className="col-span-12 xl:col-span-4">
					<CardHeader>
						<CardTitle>
							<Title as="h3" className="text-lg">
								Time Allocation
							</Title>
						</CardTitle>
					</CardHeader>
					<CardContent>
						<Chart type="donut" height={300} options={allocationChartOptions} series={allocationData.map((item) => item.value)} />
					</CardContent>
				</Card>

				<Card className="col-span-12 xl:col-span-6">
					<CardHeader>
						<CardTitle>
							<Title as="h3" className="text-lg">
								Top Clients
							</Title>
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="overflow-x-auto">
							<table className="w-full text-sm">
								<thead>
									<tr>
										<th className="py-2 text-left">Client</th>
										<th className="py-2 text-right">Revenue</th>
										<th className="py-2 text-right">Hours</th>
										<th className="py-2 text-right">Trust</th>
									</tr>
								</thead>
								<tbody>
									{clientRows.map((row) => (
										<tr key={row.name} className="border-t">
											<td className="py-2">{row.name}</td>
											<td className="py-2 text-right">{formatCurrency(row.revenue)}</td>
											<td className="py-2 text-right">{row.hours.toFixed(1)}h</td>
											<td className="py-2 text-right">
												<Badge variant={trustVariant(row.trust)}>{row.trust}</Badge>
											</td>
										</tr>
									))}
									{clientRows.length === 0 ? (
										<tr>
											<td className="py-4 text-center text-muted-foreground" colSpan={4}>
												No client analytics available.
											</td>
										</tr>
									) : null}
								</tbody>
							</table>
						</div>
					</CardContent>
				</Card>

				<Card className="col-span-12 xl:col-span-6">
					<CardHeader>
						<CardTitle>
							<Title as="h3" className="text-lg">
								Estimated vs Actual Task Hours
							</Title>
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						{taskRows.map((task) => {
							const delta = taskDelta(task.estimated, task.actual);
							const consumed = task.estimated > 0 ? Math.min(100, (task.actual / task.estimated) * 100) : 0;
							return (
								<div key={task.task} className="rounded-lg border p-3">
									<div className="flex flex-wrap items-center justify-between gap-2">
										<div className="font-medium">{task.task}</div>
										<Badge variant={String(task.status).toLowerCase().includes("delay") ? "error" : "success"}>{task.status}</Badge>
									</div>
									<div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
										<span>
											Est {task.estimated.toFixed(1)}h / Actual {task.actual.toFixed(1)}h
										</span>
										<Trend value={delta} />
									</div>
									<Progress value={consumed} className="mt-2" />
								</div>
							);
						})}
						{taskRows.length === 0 ? <div className="rounded-lg border p-4 text-sm text-muted-foreground">No task accuracy analytics available.</div> : null}
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader className="flex flex-row items-center justify-between">
					<CardTitle>
						<Title as="h3" className="text-lg">
							Analysis Export
						</Title>
					</CardTitle>
					{exportUrl ? (
						<Button variant="outline" asChild>
							<a href={exportUrl} target="_blank" rel="noreferrer">
								Download
							</a>
						</Button>
					) : null}
				</CardHeader>
				<CardContent className="text-sm text-muted-foreground">
					<div>{exportLabel || "Export endpoint connected."}</div>
					{exportUrl ? <div className="mt-1 break-all">{exportUrl}</div> : <div className="mt-1">No export URL returned yet.</div>}
				</CardContent>
			</Card>
		</div>
	);
}
