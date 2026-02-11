import { Chart } from "@/components/chart/chart";
import { useChart } from "@/components/chart/useChart";
import Icon from "@/components/icon/icon";
import { Badge } from "@/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { Progress } from "@/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { Text, Title } from "@/ui/typography";
import { cn } from "@/utils";
import { useState } from "react";

const timeOptions = [
	{ label: "Day", value: "day" },
	{ label: "Week", value: "week" },
	{ label: "Month", value: "month" },
];

const dashboardData = {
	webAnalytic: {
		day: {
			pageViews: 32124,
			pageViewsChange: 4.2,
			avgTime: "3m 16s",
			avgTimeChange: -0.2,
			chart: {
				series: [
					{ name: "Natural", data: [40000, 60000, 90000, 100000, 80000, 70000, 60000, 50000, 70000, 90000, 80000, 90000] },
					{ name: "Referral", data: [30000, 40000, 50000, 60000, 50000, 40000, 30000, 40000, 50000, 60000, 50000, 40000] },
					{ name: "Direct", data: [50000, 60000, 40000, 30000, 40000, 50000, 60000, 70000, 80000, 70000, 60000, 50000] },
				],
				categories: ["01 Jun", "02 Jun", "03 Jun", "04 Jun", "05 Jun", "06 Jun", "07 Jun", "08 Jun", "09 Jun", "10 Jun", "11 Jun", "12 Jun"],
			},
		},
		week: {
			pageViews: 210324,
			pageViewsChange: 2.1,
			avgTime: "3m 10s",
			avgTimeChange: -0.5,
			chart: {
				series: [
					{ name: "Natural", data: [400000, 600000, 900000, 1000000, 800000, 700000, 600000, 500000, 700000, 900000, 800000, 900000] },
					{ name: "Referral", data: [300000, 400000, 500000, 600000, 500000, 400000, 300000, 400000, 500000, 600000, 500000, 400000] },
					{ name: "Direct", data: [500000, 600000, 400000, 300000, 400000, 500000, 600000, 700000, 800000, 700000, 600000, 500000] },
				],
				categories: ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5", "Week 6", "Week 7", "Week 8", "Week 9", "Week 10", "Week 11", "Week 12"],
			},
		},
		month: {
			pageViews: 420354,
			pageViewsChange: 4.8,
			avgTime: "3m 18s",
			avgTimeChange: -0.3,
			chart: {
				series: [
					{ name: "Natural", data: [50000, 60000, 65000, 67000, 62000, 64000, 66000, 68000, 69000, 70000, 71000, 72000] },
					{ name: "Referral", data: [40000, 42000, 43000, 44000, 45000, 46000, 47000, 48000, 49000, 50000, 51000, 52000] },
					{ name: "Direct", data: [45000, 47000, 48000, 49000, 50000, 51000, 52000, 53000, 54000, 55000, 56000, 57000] },
				],
				categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
			},
		},
	},
	freelancer: {
		day: {
			billableHours: { value: 7.6, change: 6.1, target: 95 },
			earnings: { value: 540, change: 4.7 },
			utilization: { value: 83, change: 2.4 },
			productivity: { value: 86, change: 5.2 },
			invoiceHealth: { paid: 4, pending: 2, overdue: 1 },
			onTimeRate: { value: 78, change: 1.6 },
			earningsTrend: [420, 380, 520, 490, 610, 540, 560],
			allocation: [
				{ label: "Client Work", value: 62, color: "#22c55e" },
				{ label: "Meetings", value: 14, color: "#f59e0b" },
				{ label: "Admin", value: 12, color: "#6366f1" },
				{ label: "Learning", value: 12, color: "#ec4899" },
			],
			topClients: [
				{ name: "Northstar Studio", revenue: 1200, hours: 15.2, trust: "Trusted" },
				{ name: "Orbit Labs", revenue: 980, hours: 13.4, trust: "Watch" },
				{ name: "Metrica", revenue: 770, hours: 10.1, trust: "Trusted" },
			],
			taskAccuracy: [
				{ task: "Homepage Wireframes", estimated: 8, actual: 7.2, status: "On Time" },
				{ task: "Payment Integration", estimated: 14, actual: 15.4, status: "Delayed" },
				{ task: "Client Handoff Pack", estimated: 6, actual: 5.4, status: "On Time" },
				{ task: "Regression QA", estimated: 5, actual: 4.8, status: "On Time" },
			],
		},
		week: {
			billableHours: { value: 38.4, change: 8.2, target: 88 },
			earnings: { value: 3140, change: 11.6 },
			utilization: { value: 79, change: 3.1 },
			productivity: { value: 82, change: 4.3 },
			invoiceHealth: { paid: 9, pending: 5, overdue: 2 },
			onTimeRate: { value: 74, change: -1.2 },
			earningsTrend: [2620, 2840, 2980, 3050, 3190, 3140, 3260],
			allocation: [
				{ label: "Client Work", value: 58, color: "#22c55e" },
				{ label: "Meetings", value: 17, color: "#f59e0b" },
				{ label: "Admin", value: 13, color: "#6366f1" },
				{ label: "Learning", value: 12, color: "#ec4899" },
			],
			topClients: [
				{ name: "Northstar Studio", revenue: 4200, hours: 52.2, trust: "Trusted" },
				{ name: "Orbit Labs", revenue: 3680, hours: 47.7, trust: "Moderate" },
				{ name: "Flowbase", revenue: 2190, hours: 29.4, trust: "Risk" },
			],
			taskAccuracy: [
				{ task: "Homepage Wireframes", estimated: 8, actual: 7.6, status: "On Time" },
				{ task: "Payment Integration", estimated: 14, actual: 15.8, status: "Delayed" },
				{ task: "Client Handoff Pack", estimated: 6, actual: 6.2, status: "On Time" },
				{ task: "Regression QA", estimated: 5, actual: 5.5, status: "Delayed" },
			],
		},
		month: {
			billableHours: { value: 154.6, change: 12.4, target: 91 },
			earnings: { value: 12480, change: 14.8 },
			utilization: { value: 81, change: 4.8 },
			productivity: { value: 84, change: 6.2 },
			invoiceHealth: { paid: 21, pending: 8, overdue: 3 },
			onTimeRate: { value: 76, change: 2.1 },
			earningsTrend: [8450, 9030, 9640, 10120, 10880, 11640, 12480],
			allocation: [
				{ label: "Client Work", value: 61, color: "#22c55e" },
				{ label: "Meetings", value: 16, color: "#f59e0b" },
				{ label: "Admin", value: 13, color: "#6366f1" },
				{ label: "Learning", value: 10, color: "#ec4899" },
			],
			topClients: [
				{ name: "Northstar Studio", revenue: 16200, hours: 204.2, trust: "Trusted" },
				{ name: "Orbit Labs", revenue: 13840, hours: 177.3, trust: "Moderate" },
				{ name: "Metrica", revenue: 10450, hours: 139.1, trust: "Trusted" },
			],
			taskAccuracy: [
				{ task: "Homepage Wireframes", estimated: 32, actual: 29.3, status: "On Time" },
				{ task: "Payment Integration", estimated: 56, actual: 61.2, status: "Delayed" },
				{ task: "Client Handoff Pack", estimated: 24, actual: 22.8, status: "On Time" },
				{ task: "Regression QA", estimated: 20, actual: 21.1, status: "On Time" },
			],
		},
	},
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
			{Math.abs(value)}%
		</span>
	);
}

export default function Analysis() {
	const [timeType, setTimeType] = useState<"day" | "week" | "month">("day");
	const webAnalytic = dashboardData.webAnalytic[timeType];
	const freelancer = dashboardData.freelancer[timeType];

	const webChartOptions = useChart({
		xaxis: { categories: webAnalytic.chart.categories },
	});

	const earningsChartOptions = useChart({
		xaxis: { categories: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] },
		chart: { toolbar: { show: false } },
		stroke: { curve: "smooth", width: 3 },
		dataLabels: { enabled: false },
		colors: ["#0ea5e9"],
	});

	const allocationChartOptions = useChart({
		labels: freelancer.allocation.map((item) => item.label),
		colors: freelancer.allocation.map((item) => item.color),
		stroke: { show: false },
		legend: { position: "bottom" },
		dataLabels: { enabled: false },
		plotOptions: {
			pie: {
				donut: { size: "66%" },
			},
		},
	});

	const trustVariant = (value: string) => {
		if (value === "Trusted") return "success";
		if (value === "Moderate") return "info";
		if (value === "Watch") return "warning";
		return "error";
	};

	const taskDelta = (estimated: number, actual: number) => ((actual - estimated) / estimated) * 100;

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
				<div>
					<Title as="h4" className="text-xl mb-1">
						Freelancer Analytics
					</Title>
					<Text variant="body2" className="text-muted-foreground">
						Track billable performance, delivery reliability, and client health.
					</Text>
				</div>
				<div className="flex items-center gap-2">
					<Text variant="body2" className="text-muted-foreground">
						Show by:
					</Text>
					<Select value={timeType} onValueChange={(v) => setTimeType(v as "day" | "week" | "month")}>
						<SelectTrigger className="w-32 h-9">
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
							{freelancer.billableHours.value}h
						</Title>
						<div className="flex items-center gap-2 mt-1">
							<Trend value={freelancer.billableHours.change} />
							<Text variant="caption" className="text-muted-foreground">
								vs previous period
							</Text>
						</div>
						<div className="mt-3">
							<div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
								<span>Target progress</span>
								<span>{freelancer.billableHours.target}%</span>
							</div>
							<Progress value={freelancer.billableHours.target} />
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
							${freelancer.earnings.value.toLocaleString()}
						</Title>
						<div className="flex items-center gap-2 mt-1">
							<Trend value={freelancer.earnings.change} />
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
							{freelancer.utilization.value}%
						</Title>
						<div className="flex items-center gap-2 mt-1">
							<Trend value={freelancer.utilization.change} />
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
							{freelancer.productivity.value}/100
						</Title>
						<div className="flex items-center gap-2 mt-1">
							<Trend value={freelancer.productivity.change} />
							<Text variant="caption" className="text-muted-foreground">
								task efficiency
							</Text>
						</div>
					</CardContent>
				</Card>
			</div>

			<div className="flex flex-col xl:grid grid-cols-4 gap-4">
				<Card className="col-span-4 xl:col-span-3">
					<CardHeader className="flex flex-row items-center justify-between pb-2">
						<CardTitle>
							<Title as="h3" className="text-lg">
								Web analytic
							</Title>
						</CardTitle>
					</CardHeader>
					<CardContent className="flex flex-col gap-2">
						<div className="flex flex-wrap gap-6 items-center">
							<div>
								<Text variant="subTitle2" className="text-muted-foreground">
									Page views
								</Text>
								<div className="flex items-end gap-2">
									<Title as="h3" className="text-2xl">
										{webAnalytic.pageViews.toLocaleString()}
									</Title>
									<Trend value={webAnalytic.pageViewsChange} />
								</div>
							</div>
							<div>
								<Text variant="subTitle2" className="text-muted-foreground">
									Avg. Time on page
								</Text>
								<div className="flex items-end gap-2">
									<Title as="h3" className="text-2xl">
										{webAnalytic.avgTime}
									</Title>
									<Trend value={webAnalytic.avgTimeChange} />
								</div>
							</div>
						</div>
						<div className="w-full min-h-[200px] mt-2">
							<Chart type="line" height={320} options={webChartOptions} series={webAnalytic.chart.series} />
						</div>
					</CardContent>
				</Card>

				<div className="xl:col-span-1 h-full">
					<div className="flex flex-col xl:flex-col md:flex-row gap-4 h-full">
						<Card className="flex-1">
							<CardHeader className="pb-2">
								<CardTitle>
									<Text variant="subTitle2">Invoice Health</Text>
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-2">
								<div className="flex items-center justify-between text-sm">
									<span className="text-muted-foreground">Paid</span>
									<span className="font-semibold text-success">{freelancer.invoiceHealth.paid}</span>
								</div>
								<div className="flex items-center justify-between text-sm">
									<span className="text-muted-foreground">Pending</span>
									<span className="font-semibold text-warning">{freelancer.invoiceHealth.pending}</span>
								</div>
								<div className="flex items-center justify-between text-sm">
									<span className="text-muted-foreground">Overdue</span>
									<span className="font-semibold text-error">{freelancer.invoiceHealth.overdue}</span>
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
									{freelancer.onTimeRate.value}%
								</Title>
								<div className="flex items-center gap-2 mt-1">
									<Trend value={freelancer.onTimeRate.change} />
									<Text variant="caption" className="text-muted-foreground">
										delivery trend
									</Text>
								</div>
								<Progress value={freelancer.onTimeRate.value} className="mt-3" />
							</CardContent>
						</Card>
						<Card className="flex-1">
							<CardHeader className="pb-2">
								<CardTitle>
									<Text variant="subTitle2">Quick Insight</Text>
								</CardTitle>
							</CardHeader>
							<CardContent className="text-sm text-muted-foreground">
								Highest time allocation is on client work, while estimate overruns are mostly from integration tasks.
							</CardContent>
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
						<Chart type="area" height={300} options={earningsChartOptions} series={[{ name: "Earnings", data: freelancer.earningsTrend }]} />
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
						<Chart type="donut" height={300} options={allocationChartOptions} series={freelancer.allocation.map((item) => item.value)} />
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
										<th className="text-left py-2">Client</th>
										<th className="text-right py-2">Revenue</th>
										<th className="text-right py-2">Hours</th>
										<th className="text-right py-2">Trust</th>
									</tr>
								</thead>
								<tbody>
									{freelancer.topClients.map((row) => (
										<tr key={row.name} className="border-t">
											<td className="py-2">{row.name}</td>
											<td className="py-2 text-right">${row.revenue.toLocaleString()}</td>
											<td className="py-2 text-right">{row.hours.toFixed(1)}h</td>
											<td className="py-2 text-right">
												<Badge variant={trustVariant(row.trust)}>{row.trust}</Badge>
											</td>
										</tr>
									))}
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
						{freelancer.taskAccuracy.map((task) => {
							const delta = taskDelta(task.estimated, task.actual);
							const consumed = Math.min(100, (task.actual / task.estimated) * 100);
							return (
								<div key={task.task} className="rounded-lg border p-3">
									<div className="flex flex-wrap items-center justify-between gap-2">
										<div className="font-medium">{task.task}</div>
										<Badge variant={task.status === "On Time" ? "success" : "error"}>{task.status}</Badge>
									</div>
									<div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
										<span>
											Est {task.estimated}h / Actual {task.actual.toFixed(1)}h
										</span>
										<Trend value={delta} />
									</div>
									<Progress value={consumed} className="mt-2" />
								</div>
							);
						})}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
