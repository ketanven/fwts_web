import clientTrustService, { type TrustRulesPayload } from "@/api/services/clientTrustService";
import { Chart, useChart } from "@/components/chart";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Input } from "@/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type AnyRec = Record<string, any>;
type TrustClient = { id: string; name: string; onTime: number; delayed: number; overdue: number; score: number; level: string };

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

const levelVariant = (level: string) => {
	const normalized = String(level).toLowerCase();
	if (normalized.includes("trusted")) return "success";
	if (normalized.includes("moderate")) return "info";
	if (normalized.includes("watch")) return "warning";
	return "error";
};

export default function ClientTrustPage() {
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [summaryRes, setSummaryRes] = useState<AnyRec>({});
	const [clientsRes, setClientsRes] = useState<AnyRec>({});
	const [alertsRes, setAlertsRes] = useState<AnyRec>({});
	const [selectedClientId, setSelectedClientId] = useState("");
	const [clientHistory, setClientHistory] = useState<AnyRec[]>([]);
	const [historyLoading, setHistoryLoading] = useState(false);
	const [recalcLoading, setRecalcLoading] = useState(false);
	const [rulesLoading, setRulesLoading] = useState(false);
	const [rulesDraft, setRulesDraft] = useState<TrustRulesPayload>({
		rule_name: "trust-v2",
		on_time_weight: "50.00",
		delay_penalty_weight: "25.00",
		overdue_penalty_weight: "25.00",
		severe_overdue_threshold_days: 30,
		trusted_min_score: "80.00",
		moderate_min_score: "60.00",
		watch_min_score: "40.00",
		is_active: true,
	});

	const loadData = useCallback(async () => {
		try {
			setRefreshing(true);
			const [summary, clients, alerts] = await Promise.all([
				clientTrustService.getSummary(),
				clientTrustService.getClients(),
				clientTrustService.getAlerts(),
			]);
			setSummaryRes(asRecord(summary));
			setClientsRes(asRecord(clients));
			setAlertsRes(asRecord(alerts));

			const rules = asRecord(pick(asRecord(summary), ["rules", "trust_rules"], {}));
			if (Object.keys(rules).length) {
				setRulesDraft((prev) => ({
					...prev,
					rule_name: String(pick(rules, ["rule_name"], prev.rule_name || "trust-v2")),
					on_time_weight: String(pick(rules, ["on_time_weight"], prev.on_time_weight || "50.00")),
					delay_penalty_weight: String(pick(rules, ["delay_penalty_weight"], prev.delay_penalty_weight || "25.00")),
					overdue_penalty_weight: String(pick(rules, ["overdue_penalty_weight"], prev.overdue_penalty_weight || "25.00")),
					severe_overdue_threshold_days: toNumber(
						pick(rules, ["severe_overdue_threshold_days"], prev.severe_overdue_threshold_days || 30),
						30,
					),
					trusted_min_score: String(pick(rules, ["trusted_min_score"], prev.trusted_min_score || "80.00")),
					moderate_min_score: String(pick(rules, ["moderate_min_score"], prev.moderate_min_score || "60.00")),
					watch_min_score: String(pick(rules, ["watch_min_score"], prev.watch_min_score || "40.00")),
					is_active: Boolean(pick(rules, ["is_active"], prev.is_active ?? true)),
				}));
			}
		} catch (error: any) {
			const message = error?.response?.data?.message || error?.response?.data?.detail || error?.message || "Failed to load client trust data.";
			toast.error(message);
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	}, []);

	useEffect(() => {
		loadData();
	}, [loadData]);

	const clients = useMemo(() => {
		const rows = asArray<AnyRec>(pick(clientsRes, ["clients", "items", "data"], []));
		return rows.map((row, idx) => ({
			id: String(pick(row, ["id", "client_id", "uuid"], "")),
			name: String(pick(row, ["name", "client", "client_name"], `Client ${idx + 1}`)),
			onTime: toNumber(pick(row, ["on_time", "on_time_percent", "onTime"], 0), 0),
			delayed: toNumber(pick(row, ["delayed", "delayed_invoices"], 0), 0),
			overdue: toNumber(pick(row, ["overdue", "overdue_invoices"], 0), 0),
			score: toNumber(pick(row, ["score", "trust_score"], 0), 0),
			level: String(pick(row, ["level", "trust_level", "rating"], "Moderate")),
		})) as TrustClient[];
	}, [clientsRes]);

	useEffect(() => {
		if (!selectedClientId && clients[0]?.id) {
			setSelectedClientId(clients[0].id);
		}
	}, [clients, selectedClientId]);

	const loadClientHistory = useCallback(async (clientId: string) => {
		if (!clientId) {
			setClientHistory([]);
			return;
		}
		try {
			setHistoryLoading(true);
			const res = asRecord(await clientTrustService.getClientHistory(clientId));
			setClientHistory(asArray<AnyRec>(pick(res, ["history", "items", "data"], [])));
		} catch (error: any) {
			toast.error(error?.response?.data?.message || error?.message || "Failed to load client history.");
			setClientHistory([]);
		} finally {
			setHistoryLoading(false);
		}
	}, []);

	useEffect(() => {
		if (selectedClientId) loadClientHistory(selectedClientId);
	}, [loadClientHistory, selectedClientId]);

	const averageScore = useMemo(() => {
		const direct = toNumber(pick(summaryRes, ["average_trust_score", "avg_score", "score"], NaN), NaN);
		if (Number.isFinite(direct)) return Math.round(direct);
		if (!clients.length) return 0;
		return Math.round(clients.reduce((sum, c) => sum + c.score, 0) / clients.length);
	}, [summaryRes, clients]);

	const scoreOptions = useChart({
		chart: { toolbar: { show: false } },
		dataLabels: { enabled: false },
		xaxis: { categories: clients.map((client) => client.name.split(" ")[0]) },
		colors: ["#14b8a6"],
		plotOptions: { bar: { borderRadius: 6, columnWidth: "45%" } },
	});

	const alerts = useMemo(() => asArray<AnyRec>(pick(alertsRes, ["alerts", "items", "data"], [])), [alertsRes]);

	const handleRecalculate = async () => {
		try {
			setRecalcLoading(true);
			await clientTrustService.recalculate();
			toast.success("Client trust recalculated.");
			await loadData();
		} catch (error: any) {
			toast.error(error?.response?.data?.message || error?.message || "Failed to recalculate trust.");
		} finally {
			setRecalcLoading(false);
		}
	};

	const handleSaveRules = async () => {
		try {
			setRulesLoading(true);
			await clientTrustService.updateRules(rulesDraft);
			toast.success("Client trust rules updated.");
			await loadData();
		} catch (error: any) {
			toast.error(error?.response?.data?.message || error?.message || "Failed to update trust rules.");
		} finally {
			setRulesLoading(false);
		}
	};

	if (loading) {
		return (
			<div className="space-y-4">
				<Card>
					<CardContent className="py-10 text-sm text-muted-foreground">Loading client trust data...</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<Card className="overflow-hidden border-0 shadow-md">
				<CardContent className="relative p-0">
					<div className="absolute inset-0 bg-gradient-to-r from-teal-900 via-cyan-800 to-blue-800 opacity-95" />
					<div className="relative grid gap-3 p-6 text-white lg:grid-cols-3">
						<div className="space-y-2 lg:col-span-2">
							<Badge variant="info">Client Trust Level</Badge>
							<h2 className="text-2xl font-semibold">Rate clients by payment behavior to identify reliable vs risky accounts.</h2>
							<p className="text-sm text-white/80">Live trust summary, clients, history, alerts, recalculate, and rules APIs connected.</p>
						</div>
						<div className="rounded-xl bg-black/20 p-4">
							<div className="text-xs text-white/70">Average Trust Score</div>
							<div className="text-5xl font-bold">{averageScore}</div>
							<Button variant="secondary" size="sm" className="mt-3" onClick={loadData} disabled={refreshing}>
								{refreshing ? "Refreshing..." : "Refresh"}
							</Button>
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
						<CardTitle>Actions</CardTitle>
						<CardDescription>Recalculate trust and update rules.</CardDescription>
					</CardHeader>
					<CardContent className="space-y-2 text-sm">
						<Button className="w-full" onClick={handleRecalculate} disabled={recalcLoading}>
							{recalcLoading ? "Recalculating..." : "Recalculate Trust"}
						</Button>
						<div className="rounded-lg border p-3">Alerts: {alerts.length}</div>
						{alerts.slice(0, 3).map((alert, idx) => (
							<div key={`${idx}`} className="rounded-lg border p-3 text-xs text-muted-foreground">
								{String(pick(alert, ["message", "title", "description"], "Alert"))}
							</div>
						))}
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader className="pb-0">
					<CardTitle>Client Payment Behavior Table</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					{clients.map((client) => (
						<div key={client.id || client.name} className="rounded-lg border p-4">
							<div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
								<div className="font-medium">{client.name}</div>
								<Badge variant={levelVariant(client.level)}>{client.level}</Badge>
							</div>
							<div className="mt-1 text-sm text-muted-foreground">
								On-time: {client.onTime}% • Delayed invoices: {client.delayed} • Overdue invoices: {client.overdue} • Score: {client.score}
							</div>
						</div>
					))}
					{!clients.length ? <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No client trust data found.</div> : null}
				</CardContent>
			</Card>

			<div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
				<Card>
					<CardHeader className="pb-0">
						<CardTitle>Client History</CardTitle>
						<CardDescription>GET `/client-trust/clients/&lt;client_id&gt;/history/`</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3">
						<Select value={selectedClientId || undefined} onValueChange={setSelectedClientId}>
							<SelectTrigger>
								<SelectValue placeholder="Select client" />
							</SelectTrigger>
							<SelectContent>
								{clients.filter((c) => c.id).map((client) => (
									<SelectItem key={client.id} value={client.id}>
										{client.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						{historyLoading ? <div className="text-sm text-muted-foreground">Loading history...</div> : null}
						{clientHistory.map((row, idx) => (
							<div key={`${idx}`} className="rounded-lg border p-3 text-sm">
								<div className="font-medium">{String(pick(row, ["label", "title", "period"], "History item"))}</div>
								<div className="text-xs text-muted-foreground">
									Score {toNumber(pick(row, ["score", "trust_score"], 0), 0)} • On-time {toNumber(pick(row, ["on_time", "on_time_percent"], 0), 0)}%
								</div>
							</div>
						))}
						{!clientHistory.length && !historyLoading ? <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No history found.</div> : null}
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="pb-0">
						<CardTitle>Trust Rules</CardTitle>
						<CardDescription>PATCH `/client-trust/rules/`</CardDescription>
					</CardHeader>
					<CardContent className="grid gap-3 md:grid-cols-2">
						<Input value={rulesDraft.rule_name || ""} onChange={(e) => setRulesDraft((prev) => ({ ...prev, rule_name: e.target.value }))} placeholder="Rule name" />
						<Input
							value={rulesDraft.on_time_weight || ""}
							onChange={(e) => setRulesDraft((prev) => ({ ...prev, on_time_weight: e.target.value }))}
							placeholder="On-time weight"
						/>
						<Input
							value={rulesDraft.delay_penalty_weight || ""}
							onChange={(e) => setRulesDraft((prev) => ({ ...prev, delay_penalty_weight: e.target.value }))}
							placeholder="Delay penalty weight"
						/>
						<Input
							value={rulesDraft.overdue_penalty_weight || ""}
							onChange={(e) => setRulesDraft((prev) => ({ ...prev, overdue_penalty_weight: e.target.value }))}
							placeholder="Overdue penalty weight"
						/>
						<Input
							type="number"
							value={String(rulesDraft.severe_overdue_threshold_days ?? 30)}
							onChange={(e) => setRulesDraft((prev) => ({ ...prev, severe_overdue_threshold_days: Number(e.target.value || 0) }))}
							placeholder="Severe overdue threshold"
						/>
						<Input
							value={rulesDraft.trusted_min_score || ""}
							onChange={(e) => setRulesDraft((prev) => ({ ...prev, trusted_min_score: e.target.value }))}
							placeholder="Trusted min score"
						/>
						<Input
							value={rulesDraft.moderate_min_score || ""}
							onChange={(e) => setRulesDraft((prev) => ({ ...prev, moderate_min_score: e.target.value }))}
							placeholder="Moderate min score"
						/>
						<Input
							value={rulesDraft.watch_min_score || ""}
							onChange={(e) => setRulesDraft((prev) => ({ ...prev, watch_min_score: e.target.value }))}
							placeholder="Watch min score"
						/>
						<Button className="md:col-span-2" onClick={handleSaveRules} disabled={rulesLoading}>
							{rulesLoading ? "Saving..." : `Save Rules (${rulesDraft.is_active ? "Active" : "Inactive"})`}
						</Button>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
