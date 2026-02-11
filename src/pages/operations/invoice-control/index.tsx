import { Icon } from "@/components/icon";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";

const invoicePreview = {
	next: "INV-2026-CLIENT01-0005",
	pattern: "INV-{YEAR}-{CLIENTCODE}-{SEQUENCE}",
	clientCode: "CLIENT01",
	sequence: "0005",
};

const revisions = [
	{ version: "v1", date: "2026-01-28 10:42", editor: "You", change: "Initial draft generated", state: "Draft" },
	{ version: "v2", date: "2026-01-29 17:20", editor: "You", change: "Updated hourly line item and due date", state: "Submitted" },
	{ version: "v3", date: "2026-01-31 09:11", editor: "You", change: "Added late fee note after submission", state: "Revised" },
	{ version: "v4", date: "2026-02-02 14:03", editor: "You", change: "Adjusted tax percentage based on locale", state: "Revised" },
];

const stateVariant = (state: string) => {
	if (state === "Draft") return "info";
	if (state === "Submitted") return "success";
	return "warning";
};

export default function InvoiceControlPage() {
	return (
		<div className="space-y-4">
			<Card className="overflow-hidden border-0 shadow-md">
				<CardContent className="relative p-0">
					<div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-indigo-900 to-fuchsia-800 opacity-95" />
					<div className="relative grid gap-3 p-6 text-white lg:grid-cols-3">
						<div className="lg:col-span-2 space-y-2">
							<Badge variant="default">Smart Numbering & Versioning</Badge>
							<h2 className="text-2xl font-semibold">Automatic invoice numbers with revision history after submission.</h2>
							<p className="text-sm text-white/80">Keep a transparent edit timeline for audit confidence and client trust.</p>
						</div>
						<div className="rounded-xl bg-black/20 p-4">
							<div className="text-xs text-white/70">Next Invoice Number</div>
							<div className="mt-2 text-2xl font-semibold">{invoicePreview.next}</div>
						</div>
					</div>
				</CardContent>
			</Card>

			<div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
				<Card className="xl:col-span-2">
					<CardHeader className="pb-0">
						<CardTitle>Numbering Configuration</CardTitle>
						<CardDescription>UI-only settings panel, API can be connected later.</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3">
						<div className="rounded-lg border p-4">
							<div className="text-xs text-muted-foreground">Pattern</div>
							<div className="font-mono text-sm mt-1">{invoicePreview.pattern}</div>
						</div>
						<div className="grid gap-3 md:grid-cols-3">
							<div className="rounded-lg border p-4">
								<div className="text-xs text-muted-foreground">Year</div>
								<div className="text-xl font-semibold">2026</div>
							</div>
							<div className="rounded-lg border p-4">
								<div className="text-xs text-muted-foreground">Client Code</div>
								<div className="text-xl font-semibold">{invoicePreview.clientCode}</div>
							</div>
							<div className="rounded-lg border p-4">
								<div className="text-xs text-muted-foreground">Sequence</div>
								<div className="text-xl font-semibold">{invoicePreview.sequence}</div>
							</div>
						</div>
						<div className="flex flex-wrap gap-2">
							<Button><Icon icon="solar:refresh-bold-duotone" /> Regenerate Preview</Button>
							<Button variant="outline"><Icon icon="solar:settings-bold-duotone" /> Edit Pattern</Button>
							<Button variant="secondary"><Icon icon="solar:history-bold-duotone" /> Export Revision Log</Button>
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
					<CardDescription>Track edits after invoice submission.</CardDescription>
				</CardHeader>
				<CardContent className="space-y-3">
					{revisions.map((item, index) => (
						<div key={item.version} className="relative rounded-lg border p-4">
							{index < revisions.length - 1 ? <div className="absolute left-[18px] top-[46px] h-[48px] w-px bg-border" /> : null}
							<div className="flex items-start gap-3">
								<div className="mt-1 h-3 w-3 rounded-full bg-primary" />
								<div className="flex-1">
									<div className="flex flex-wrap items-center justify-between gap-2">
										<div className="font-semibold">{item.version}</div>
										<Badge variant={stateVariant(item.state)}>{item.state}</Badge>
									</div>
									<div className="text-xs text-muted-foreground mt-1">{item.date} • {item.editor}</div>
									<div className="text-sm mt-1">{item.change}</div>
								</div>
							</div>
						</div>
					))}
				</CardContent>
			</Card>
		</div>
	);
}
