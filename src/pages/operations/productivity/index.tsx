import { Chart, useChart } from "@/components/chart";
import { Badge } from "@/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Progress } from "@/ui/progress";

const weeklyScore = [72, 78, 81, 76, 84, 88, 86];
const taskPerformance = [
	{ task: "Homepage Wireframes", estimate: 8, actual: 7.1, onTime: true },
	{ task: "Payments Integration", estimate: 14, actual: 15.4, onTime: false },
	{ task: "Client Revision Pack", estimate: 6, actual: 5.7, onTime: true },
	{ task: "QA Regression", estimate: 5, actual: 4.9, onTime: true },
	{ task: "Proposal Update", estimate: 3, actual: 4.2, onTime: false },
];

const onTimeRate = (taskPerformance.filter((task) => task.onTime).length / taskPerformance.length) * 100;
const estimatedTotal = taskPerformance.reduce((sum, task) => sum + task.estimate, 0);
const actualTotal = taskPerformance.reduce((sum, task) => sum + task.actual, 0);
const productivityScore = Math.round((onTimeRate * 0.6 + Math.max(0, 100 - ((actualTotal - estimatedTotal) / estimatedTotal) * 100) * 0.4));

export default function ProductivityPage() {
	const scoreOptions = useChart({
		chart: { toolbar: { show: false } },
		stroke: { curve: "smooth", width: 3 },
		dataLabels: { enabled: false },
		xaxis: { categories: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] },
		colors: ["#f97316"],
	});
	const compareOptions = useChart({
		chart: { toolbar: { show: false } },
		dataLabels: { enabled: false },
		xaxis: { categories: taskPerformance.map((task) => task.task.split(" ").slice(0, 2).join(" ")) },
		colors: ["#22c55e", "#ef4444"],
		plotOptions: { bar: { borderRadius: 6, columnWidth: "46%" } },
	});

	return (
		<div className="space-y-4">
			<Card className="overflow-hidden border-0 shadow-md">
				<CardContent className="relative p-0">
					<div className="absolute inset-0 bg-gradient-to-r from-orange-900 via-amber-800 to-yellow-700 opacity-95" />
					<div className="relative grid gap-3 p-6 text-white lg:grid-cols-3">
						<div className="lg:col-span-2 space-y-2">
							<Badge variant="warning">Work Productivity Score</Badge>
							<h2 className="text-2xl font-semibold">Compare estimated vs actual and track on-time delivery health.</h2>
							<p className="text-sm text-white/80">Weekly productivity score is shown as a dashboard KPI for fast decision making.</p>
						</div>
						<div className="rounded-xl bg-black/20 p-4">
							<div className="text-xs text-white/70">Current Score</div>
							<div className="text-5xl font-bold">{productivityScore}</div>
							<div className="text-xs text-white/70">/100 this week</div>
						</div>
					</div>
				</CardContent>
			</Card>

			<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
				<Card>
					<CardHeader className="pb-0"><CardTitle>On-time Tasks</CardTitle></CardHeader>
					<CardContent>
						<div className="text-3xl font-semibold">{onTimeRate.toFixed(0)}%</div>
						<Progress value={onTimeRate} className="mt-2" />
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-0"><CardTitle>Estimated Hours</CardTitle></CardHeader>
					<CardContent><div className="text-3xl font-semibold">{estimatedTotal.toFixed(1)}h</div></CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-0"><CardTitle>Actual Hours</CardTitle></CardHeader>
					<CardContent><div className="text-3xl font-semibold">{actualTotal.toFixed(1)}h</div></CardContent>
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
							<div className="text-sm text-muted-foreground mt-1">Estimate {task.estimate}h • Actual {task.actual}h</div>
						</div>
					))}
				</CardContent>
			</Card>
		</div>
	);
}
