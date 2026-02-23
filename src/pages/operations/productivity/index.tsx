import productivityService, { type ProductivityRulesPayload } from "@/api/services/productivityService";
import { Chart, useChart } from "@/components/chart";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Input } from "@/ui/input";
import { Progress } from "@/ui/progress";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type AnyRec = Record<string, any>;
type TaskPerf = { task: string; estimate: number; actual: number; onTime: boolean };

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

export default function ProductivityPage() {
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [summaryRes, setSummaryRes] = useState<AnyRec>({});
	const [weeklyRes, setWeeklyRes] = useState<AnyRec>({});
	const [varianceRes, setVarianceRes] = useState<AnyRec>({});
	const [onTimeRes, setOnTimeRes] = useState<AnyRec>({});
	const [utilizationRes, setUtilizationRes] = useState<AnyRec>({});
	const [rulesDraft, setRulesDraft] = useState<ProductivityRulesPayload>({
		rule_name: "default-v2",
		weight_on_time: "40.00",
		weight_estimate_accuracy: "35.00",
		weight_utilization: "25.00",
		target_utilization_percent: "80.00",
		overrun_penalty_factor: "1.20",
		is_active: true,
	});
	const [savingRules, setSavingRules] = useState(false);

	const loadData = useCallback(async () => {
		try {
			setRefreshing(true);
			const [summary, weekly, variance, onTime, utilization] = await Promise.all([
				productivityService.getSummary(),
				productivityService.getWeeklyTrend(),
				productivityService.getTaskVariance(),
				productivityService.getOnTimeRate(),
				productivityService.getUtilization(),
			]);
			setSummaryRes(asRecord(summary));
			setWeeklyRes(asRecord(weekly));
			setVarianceRes(asRecord(variance));
			setOnTimeRes(asRecord(onTime));
			setUtilizationRes(asRecord(utilization));

			const mergedRules = asRecord(pick(asRecord(summary), ["rules", "productivity_rules"], {}));
			if (Object.keys(mergedRules).length) {
				setRulesDraft((prev) => ({
					...prev,
					rule_name: String(pick(mergedRules, ["rule_name"], prev.rule_name || "default-v2")),
					weight_on_time: String(pick(mergedRules, ["weight_on_time"], prev.weight_on_time || "40.00")),
					weight_estimate_accuracy: String(
						pick(mergedRules, ["weight_estimate_accuracy"], prev.weight_estimate_accuracy || "35.00"),
					),
					weight_utilization: String(pick(mergedRules, ["weight_utilization"], prev.weight_utilization || "25.00")),
					target_utilization_percent: String(
						pick(mergedRules, ["target_utilization_percent"], prev.target_utilization_percent || "80.00"),
					),
					overrun_penalty_factor: String(
						pick(mergedRules, ["overrun_penalty_factor"], prev.overrun_penalty_factor || "1.20"),
					),
					is_active: Boolean(pick(mergedRules, ["is_active"], prev.is_active ?? true)),
				}));
			}
		} catch (error: any) {
			const message = error?.response?.data?.message || error?.response?.data?.detail || error?.message || "Failed to load productivity data.";
			toast.error(message);
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	}, []);

	useEffect(() => {
		loadData();
	}, [loadData]);

	const weeklyScore = useMemo(() => {
		const chart = asRecord(pick(weeklyRes, ["chart"], {}));
		const points = asArray<number>(pick(chart, ["values", "data"], pick(weeklyRes, ["scores", "series", "data"], []))).map((v) =>
			toNumber(v, 0),
		);
		if (points.length) return points;
		const items = asArray<AnyRec>(pick(weeklyRes, ["items", "trend"], []));
		if (items.length) return items.map((row) => toNumber(pick(row, ["score", "value"], 0), 0));
		return [0, 0, 0, 0, 0, 0, 0];
	}, [weeklyRes]);

	const weeklyCategories = useMemo(() => {
		const chart = asRecord(pick(weeklyRes, ["chart"], {}));
		const labels = asArray<string>(pick(chart, ["categories", "labels"], pick(weeklyRes, ["categories", "labels"], [])));
		if (labels.length) return labels;
		if (weeklyScore.length === 7) return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
		return weeklyScore.map((_, idx) => `P${idx + 1}`);
	}, [weeklyRes, weeklyScore]);

	const taskPerformance = useMemo(() => {
		const rows = asArray<AnyRec>(pick(varianceRes, ["tasks", "items", "data", "task_variance"], []));
		return rows.map((row, idx) => {
			const estimate = toNumber(pick(row, ["estimate", "estimated", "estimated_hours"], 0), 0);
			const actual = toNumber(pick(row, ["actual", "actual_hours", "actual_spent"], 0), 0);
			const onTimeRaw = pick(row, ["on_time", "is_on_time", "onTime"], undefined);
			const status = String(pick(row, ["status", "delivery_status"], "")).toLowerCase();
			const onTime = onTimeRaw === undefined ? !status.includes("delay") : Boolean(onTimeRaw);
			return {
				task: String(pick(row, ["task", "title", "name"], `Task ${idx + 1}`)),
				estimate,
				actual,
				onTime,
			} as TaskPerf;
		});
	}, [varianceRes]);

	const onTimeRate = useMemo(() => {
		const direct = toNumber(pick(onTimeRes, ["on_time_rate", "rate", "value", "percent"], NaN), NaN);
		if (Number.isFinite(direct)) return direct;
		if (!taskPerformance.length) return 0;
		return (taskPerformance.filter((task) => task.onTime).length / taskPerformance.length) * 100;
	}, [onTimeRes, taskPerformance]);

	const estimatedTotal = useMemo(() => {
		const direct = toNumber(pick(summaryRes, ["estimated_total", "estimated_hours", "total_estimated_hours"], NaN), NaN);
		if (Number.isFinite(direct)) return direct;
		return taskPerformance.reduce((sum, task) => sum + task.estimate, 0);
	}, [summaryRes, taskPerformance]);

	const actualTotal = useMemo(() => {
		const direct = toNumber(pick(summaryRes, ["actual_total", "actual_hours", "total_actual_hours"], NaN), NaN);
		if (Number.isFinite(direct)) return direct;
		return taskPerformance.reduce((sum, task) => sum + task.actual, 0);
	}, [summaryRes, taskPerformance]);

	const utilizationRate = useMemo(() => {
		const direct = toNumber(pick(utilizationRes, ["utilization", "utilization_rate", "value", "percent"], NaN), NaN);
		if (Number.isFinite(direct)) return direct;
		return 0;
	}, [utilizationRes]);

	const productivityScore = useMemo(() => {
		const direct = toNumber(pick(summaryRes, ["productivity_score", "score", "current_score"], NaN), NaN);
		if (Number.isFinite(direct)) return Math.round(direct);
		const estimateAccuracy = estimatedTotal > 0 ? Math.max(0, 100 - ((actualTotal - estimatedTotal) / estimatedTotal) * 100) : 0;
		return Math.round(onTimeRate * 0.6 + estimateAccuracy * 0.4);
	}, [summaryRes, estimatedTotal, actualTotal, onTimeRate]);

	const scoreOptions = useChart({
		chart: { toolbar: { show: false } },
		stroke: { curve: "smooth", width: 3 },
		dataLabels: { enabled: false },
		xaxis: { categories: weeklyCategories },
		colors: ["#f97316"],
	});

	const compareOptions = useChart({
		chart: { toolbar: { show: false } },
		dataLabels: { enabled: false },
		xaxis: { categories: taskPerformance.map((task) => task.task.split(" ").slice(0, 2).join(" ")) },
		colors: ["#22c55e", "#ef4444"],
		plotOptions: { bar: { borderRadius: 6, columnWidth: "46%" } },
	});

	const handleSaveRules = async () => {
		try {
			setSavingRules(true);
			await productivityService.updateRules(rulesDraft);
			toast.success("Productivity rules updated.");
			await loadData();
		} catch (error: any) {
			const message = error?.response?.data?.message || error?.response?.data?.detail || error?.message || "Failed to update rules.";
			toast.error(message);
		} finally {
			setSavingRules(false);
		}
	};

	if (loading) {
		return (
			<div className="space-y-4">
				<Card>
					<CardContent className="py-10 text-sm text-muted-foreground">Loading productivity data...</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<Card className="overflow-hidden border-0 shadow-md">
				<CardContent className="relative p-0">
					<div className="absolute inset-0 bg-gradient-to-r from-orange-900 via-amber-800 to-yellow-700 opacity-95" />
					<div className="relative grid gap-3 p-6 text-white lg:grid-cols-3">
						<div className="space-y-2 lg:col-span-2">
							<Badge variant="warning">Work Productivity Score</Badge>
							<h2 className="text-2xl font-semibold">Compare estimated vs actual and track on-time delivery health.</h2>
							<p className="text-sm text-white/80">Live summary, weekly trend, variance, on-time, utilization, and rules update APIs connected.</p>
						</div>
						<div className="rounded-xl bg-black/20 p-4">
							<div className="text-xs text-white/70">Current Score</div>
							<div className="text-5xl font-bold">{productivityScore}</div>
							<div className="text-xs text-white/70">/100 this week</div>
							<Button variant="secondary" size="sm" className="mt-3" onClick={loadData} disabled={refreshing}>
								{refreshing ? "Refreshing..." : "Refresh"}
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>

			<div className="grid grid-cols-1 gap-4 md:grid-cols-4">
				<Card>
					<CardHeader className="pb-0">
						<CardTitle>On-time Tasks</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-3xl font-semibold">{onTimeRate.toFixed(0)}%</div>
						<Progress value={onTimeRate} className="mt-2" />
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-0">
						<CardTitle>Estimated Hours</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-3xl font-semibold">{estimatedTotal.toFixed(1)}h</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-0">
						<CardTitle>Actual Hours</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-3xl font-semibold">{actualTotal.toFixed(1)}h</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-0">
						<CardTitle>Utilization</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-3xl font-semibold">{utilizationRate.toFixed(0)}%</div>
						<Progress value={utilizationRate} className="mt-2" />
					</CardContent>
				</Card>
			</div>

			<div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
				<Card>
					<CardHeader className="pb-0">
						<CardTitle>Weekly Productivity Score Trend</CardTitle>
					</CardHeader>
					<CardContent>
						<Chart type="line" height={280} options={scoreOptions} series={[{ name: "Score", data: weeklyScore }]} />
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-0">
						<CardTitle>Estimated vs Actual by Task</CardTitle>
					</CardHeader>
					<CardContent>
						<Chart
							type="bar"
							height={280}
							options={compareOptions}
							series={[
								{ name: "Estimated", data: taskPerformance.map((item) => item.estimate) },
								{ name: "Actual", data: taskPerformance.map((item) => item.actual) },
							]}
						/>
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader className="pb-0">
					<CardTitle>Task-level Productivity Breakdown</CardTitle>
					<CardDescription>Quick read on where time estimation accuracy is drifting.</CardDescription>
				</CardHeader>
				<CardContent className="space-y-3">
					{taskPerformance.map((task) => (
						<div key={task.task} className="rounded-lg border p-4">
							<div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
								<div className="font-medium">{task.task}</div>
								<Badge variant={task.onTime ? "success" : "error"}>{task.onTime ? "On Time" : "Delayed"}</Badge>
							</div>
							<div className="mt-1 text-sm text-muted-foreground">Estimate {task.estimate}h • Actual {task.actual}h</div>
						</div>
					))}
					{!taskPerformance.length ? <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No task variance data found.</div> : null}
				</CardContent>
			</Card>

			<Card>
				<CardHeader className="pb-0">
					<CardTitle>Productivity Rules</CardTitle>
					<CardDescription>PATCH `/productivity/rules/`</CardDescription>
				</CardHeader>
				<CardContent className="grid gap-3 md:grid-cols-3">
					<Input value={rulesDraft.rule_name || ""} onChange={(e) => setRulesDraft((prev) => ({ ...prev, rule_name: e.target.value }))} placeholder="Rule name" />
					<Input
						value={rulesDraft.weight_on_time || ""}
						onChange={(e) => setRulesDraft((prev) => ({ ...prev, weight_on_time: e.target.value }))}
						placeholder="Weight on-time"
					/>
					<Input
						value={rulesDraft.weight_estimate_accuracy || ""}
						onChange={(e) => setRulesDraft((prev) => ({ ...prev, weight_estimate_accuracy: e.target.value }))}
						placeholder="Weight estimate accuracy"
					/>
					<Input
						value={rulesDraft.weight_utilization || ""}
						onChange={(e) => setRulesDraft((prev) => ({ ...prev, weight_utilization: e.target.value }))}
						placeholder="Weight utilization"
					/>
					<Input
						value={rulesDraft.target_utilization_percent || ""}
						onChange={(e) => setRulesDraft((prev) => ({ ...prev, target_utilization_percent: e.target.value }))}
						placeholder="Target utilization %"
					/>
					<Input
						value={rulesDraft.overrun_penalty_factor || ""}
						onChange={(e) => setRulesDraft((prev) => ({ ...prev, overrun_penalty_factor: e.target.value }))}
						placeholder="Overrun penalty"
					/>
					<Button className="md:col-span-3" onClick={handleSaveRules} disabled={savingRules}>
						{savingRules ? "Saving..." : `Save Rules (${rulesDraft.is_active ? "Active" : "Inactive"})`}
					</Button>
				</CardContent>
			</Card>
		</div>
	);
}
