import { Chart, useChart } from "@/components/chart";
import { Icon } from "@/components/icon";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Progress } from "@/ui/progress";

const invoices = [
	{ id: "INV-2026-NS-0001", client: "Northstar Studio", type: "Hourly", amount: 1420, status: "Paid", due: "2026-02-05", paid: 1420 },
	{ id: "INV-2026-OL-0008", client: "Orbit Labs", type: "Fixed", amount: 2200, status: "Partially Paid", due: "2026-02-14", paid: 1200 },
	{ id: "INV-2026-MT-0011", client: "Metrica", type: "Hourly", amount: 980, status: "Pending", due: "2026-02-17", paid: 0 },
	{ id: "INV-2026-FB-0014", client: "Flowbase", type: "Fixed", amount: 3600, status: "Overdue", due: "2026-02-02", paid: 0 },
];

const statusVariant = (status: string) => {
	if (status === "Paid") return "success";
	if (status === "Partially Paid") return "warning";
	if (status === "Pending") return "info";
	return "error";
};

const formatCurrency = (value: number) => `$${value.toLocaleString()}`;

export default function InvoicingPage() {
	const revenueSeries = [{ name: "Billed", data: [4200, 3900, 4650, 5100, 5400, 5800] }];
	const revenueOptions = useChart({
		chart: { toolbar: { show: false } },
		stroke: { curve: "smooth", width: 3 },
		dataLabels: { enabled: false },
		xaxis: { categories: ["Sep", "Oct", "Nov", "Dec", "Jan", "Feb"] },
		colors: ["#2563eb"],
	});

	const totalAmount = invoices.reduce((sum, invoice) => sum + invoice.amount, 0);
	const collectedAmount = invoices.reduce((sum, invoice) => sum + invoice.paid, 0);
	const collectionRate = (collectedAmount / totalAmount) * 100;

	return (
		<div className="space-y-4">
			<Card className="overflow-hidden border-0 shadow-md">
				<CardContent className="relative p-0">
					<div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-blue-900 to-cyan-700 opacity-95" />
					<div className="relative grid gap-3 p-6 text-white lg:grid-cols-3">
						<div className="lg:col-span-2 space-y-2">
							<Badge variant="warning">Automated Invoicing</Badge>
							<h2 className="text-2xl font-semibold">Generate polished invoices from hourly or fixed pricing.</h2>
							<p className="text-sm text-white/80">Track payment status in one place and keep visibility on collection velocity.</p>
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
						<CardDescription>Dummy data for payment status workflow UI.</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3">
						{invoices.map((invoice) => {
							const duePercent = Math.round((invoice.paid / invoice.amount) * 100);
							return (
								<div key={invoice.id} className="rounded-lg border p-4">
									<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
										<div>
											<div className="font-semibold">{invoice.id}</div>
											<div className="text-xs text-muted-foreground">{invoice.client} • {invoice.type}</div>
										</div>
										<div className="flex items-center gap-2">
											<Badge variant={statusVariant(invoice.status)}>{invoice.status}</Badge>
											<div className="font-semibold">{formatCurrency(invoice.amount)}</div>
										</div>
									</div>
									<div className="mt-2 text-xs text-muted-foreground">Due: {invoice.due}</div>
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
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="pb-0">
						<CardTitle>Invoice Actions</CardTitle>
						<CardDescription>UI actions for future API binding.</CardDescription>
					</CardHeader>
					<CardContent className="space-y-2">
						<Button className="w-full"><Icon icon="solar:add-circle-bold-duotone" /> Create Invoice</Button>
						<Button className="w-full" variant="outline"><Icon icon="solar:document-text-bold-duotone" /> Generate PDF</Button>
						<Button className="w-full" variant="secondary"><Icon icon="solar:letter-bold-duotone" /> Send Reminder</Button>
						<Button className="w-full" variant="ghost"><Icon icon="solar:card-bold-duotone" /> Mark as Paid</Button>
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader className="pb-0">
					<CardTitle>Monthly Invoicing Trend</CardTitle>
				</CardHeader>
				<CardContent>
					<Chart type="area" height={280} options={revenueOptions} series={revenueSeries} />
				</CardContent>
			</Card>
		</div>
	);
}
