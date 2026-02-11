import { Chart, useChart } from "@/components/chart";
import { Badge } from "@/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";

const clients = [
	{ name: "Northstar Studio", onTime: 92, delayed: 1, overdue: 0, score: 93, level: "Trusted" },
	{ name: "Orbit Labs", onTime: 68, delayed: 3, overdue: 1, score: 71, level: "Watch" },
	{ name: "Metrica", onTime: 81, delayed: 2, overdue: 0, score: 84, level: "Trusted" },
	{ name: "Flowbase", onTime: 44, delayed: 4, overdue: 2, score: 49, level: "Risk" },
	{ name: "PixelForge", onTime: 76, delayed: 2, overdue: 1, score: 78, level: "Moderate" },
];

const levelVariant = (level: string) => {
	if (level === "Trusted") return "success";
	if (level === "Moderate") return "info";
	if (level === "Watch") return "warning";
	return "error";
};

export default function ClientTrustPage() {
	const scoreOptions = useChart({
		chart: { toolbar: { show: false } },
		dataLabels: { enabled: false },
		xaxis: { categories: clients.map((client) => client.name.split(" ")[0]) },
		colors: ["#14b8a6"],
		plotOptions: { bar: { borderRadius: 6, columnWidth: "45%" } },
	});

	return (
		<div className="space-y-4">
			<Card className="overflow-hidden border-0 shadow-md">
				<CardContent className="relative p-0">
					<div className="absolute inset-0 bg-gradient-to-r from-teal-900 via-cyan-800 to-blue-800 opacity-95" />
					<div className="relative grid gap-3 p-6 text-white lg:grid-cols-3">
						<div className="lg:col-span-2 space-y-2">
							<Badge variant="info">Client Trust Level</Badge>
							<h2 className="text-2xl font-semibold">Rate clients by payment behavior to identify reliable vs risky accounts.</h2>
							<p className="text-sm text-white/80">Automatic rating logic UI based on on-time, delayed, and overdue invoice patterns.</p>
						</div>
						<div className="rounded-xl bg-black/20 p-4">
							<div className="text-xs text-white/70">Average Trust Score</div>
							<div className="text-5xl font-bold">{Math.round(clients.reduce((sum, c) => sum + c.score, 0) / clients.length)}</div>
						</div>
					</div>
				</CardContent>
			</Card>

			<div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
				<Card className="xl:col-span-2">
					<CardHeader className="pb-0">
						<CardTitle>Trust Score by Client</CardTitle>
					</CardHeader>
					<CardContent>
						<Chart type="bar" height={300} options={scoreOptions} series={[{ name: "Score", data: clients.map((client) => client.score) }]} />
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-0">
						<CardTitle>Rating Logic</CardTitle>
						<CardDescription>UI-only rule set for backend implementation later.</CardDescription>
					</CardHeader>
					<CardContent className="space-y-2 text-sm">
						<div className="rounded-lg border p-3">Score = on-time weight - delayed penalty - overdue penalty</div>
						<div className="rounded-lg border p-3">80+ Trusted, 65-79 Moderate, 50-64 Watch, {'<'}50 Risk</div>
						<div className="rounded-lg border p-3">Auto-flag clients with 2+ overdue invoices.</div>
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader className="pb-0">
					<CardTitle>Client Payment Behavior Table</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					{clients.map((client) => (
						<div key={client.name} className="rounded-lg border p-4">
							<div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
								<div className="font-medium">{client.name}</div>
								<Badge variant={levelVariant(client.level)}>{client.level}</Badge>
							</div>
							<div className="mt-1 text-sm text-muted-foreground">
								On-time: {client.onTime}% • Delayed invoices: {client.delayed} • Overdue invoices: {client.overdue} • Score: {client.score}
							</div>
						</div>
					))}
				</CardContent>
			</Card>
		</div>
	);
}
