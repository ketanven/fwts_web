import { Chart, useChart } from "@/components/chart";
import { Badge } from "@/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";

const monthlyEarnings = [8200, 7600, 9100, 10200, 9800, 11300];
const clientEarnings = [
	{ client: "Northstar Studio", amount: 14200, share: 32 },
	{ client: "Orbit Labs", amount: 11800, share: 26 },
	{ client: "Metrica", amount: 8600, share: 19 },
	{ client: "Flowbase", amount: 7300, share: 16 },
	{ client: "Other", amount: 3100, share: 7 },
];

const timeAllocation = [44, 28, 18, 10];
const projectPerformance = [
	{ project: "Website Redesign", completion: 76, profitability: 84, risk: "Low" },
	{ project: "Freelancer Mobile App", completion: 58, profitability: 72, risk: "Medium" },
	{ project: "Marketing Site Sprint", completion: 91, profitability: 88, risk: "Low" },
	{ project: "Payments Revamp", completion: 42, profitability: 61, risk: "High" },
];

const formatCurrency = (value: number) => `$${value.toLocaleString()}`;

export default function ReportingPage() {
	const earningOptions = useChart({
		chart: { toolbar: { show: false } },
		stroke: { curve: "smooth", width: 3 },
		dataLabels: { enabled: false },
		xaxis: { categories: ["Sep", "Oct", "Nov", "Dec", "Jan", "Feb"] },
		colors: ["#0ea5e9"],
	});
	const allocationOptions = useChart({
		labels: ["Billable", "Meetings", "Admin", "Learning"],
		legend: { position: "bottom" },
		dataLabels: { enabled: false },
		colors: ["#22c55e", "#f59e0b", "#6366f1", "#ec4899"],
		plotOptions: { pie: { donut: { size: "68%" } } },
	});

	return (
		<div className="space-y-4">
			<Card className="overflow-hidden border-0 shadow-md">
				<CardContent className="relative p-0">
					<div className="absolute inset-0 bg-gradient-to-r from-emerald-900 via-teal-800 to-cyan-700 opacity-95" />
					<div className="relative grid gap-3 p-6 text-white lg:grid-cols-3">
						<div className="lg:col-span-2 space-y-2">
							<Badge variant="success">Comprehensive Reporting</Badge>
							<h2 className="text-2xl font-semibold">Understand earnings, time allocation, and project performance.</h2>
							<p className="text-sm text-white/80">Client-wise and monthly analytics UI ready for API integration.</p>
						</div>
						<div className="rounded-xl bg-black/20 p-4">
							<div className="text-xs text-white/70">6-Month Earnings</div>
							<div className="text-4xl font-bold">{formatCurrency(monthlyEarnings.reduce((a, b) => a + b, 0))}</div>
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
								<div className="text-xs text-muted-foreground mt-1">{row.share}% contribution</div>
							</div>
						))}
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
									<Badge variant={row.risk === "High" ? "error" : row.risk === "Medium" ? "warning" : "success"}>{row.risk} Risk</Badge>
								</div>
								<div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
									<span>Completion {row.completion}%</span>
									<span>Profitability {row.profitability}%</span>
								</div>
							</div>
						))}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
