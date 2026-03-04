import clientService from "@/api/services/clientService";
import invoiceService from "@/api/services/invoiceService";
import projectService from "@/api/services/projectService";
import { Icon } from "@/components/icon";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Input } from "@/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import type { Client, Project } from "#/entity";

type GenerateResponse = Blob | Record<string, any>;

const unwrapResponseData = (value: unknown) => {
	if (!value || typeof value !== "object" || Array.isArray(value)) return {} as Record<string, any>;
	const root = value as Record<string, any>;
	if (root.data && typeof root.data === "object" && !Array.isArray(root.data)) return root.data as Record<string, any>;
	return root;
};

const sanitizeFileName = (value: string) => value.replace(/[^a-z0-9-]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase();

const triggerDownload = (blob: Blob, fileName: string) => {
	if (typeof window === "undefined") return;
	const blobUrl = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = blobUrl;
	link.download = fileName;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	setTimeout(() => URL.revokeObjectURL(blobUrl), 30_000);
};

const downloadFromApiResponse = async (res: GenerateResponse, fileName: string) => {
	if (res instanceof Blob) {
		if ((res.type || "").includes("application/pdf") || (res.type || "").includes("application/octet-stream") || !res.type) {
			triggerDownload(res, fileName);
			return;
		}

		if ((res.type || "").includes("application/json")) {
			const payload = unwrapResponseData(JSON.parse(await res.text()));
			const fileUrl = String(payload.url || payload.file_url || payload.pdf_url || "").trim();
			if (fileUrl && typeof window !== "undefined") {
				window.open(fileUrl, "_blank", "noopener,noreferrer");
				return;
			}
			throw new Error(String(payload.message || payload.detail || "Invoice PDF was not returned by API."));
		}

		triggerDownload(res, fileName);
		return;
	}

	const payload = unwrapResponseData(res);
	const fileUrl = String(payload.url || payload.file_url || payload.pdf_url || "").trim();
	if (fileUrl && typeof window !== "undefined") {
		window.open(fileUrl, "_blank", "noopener,noreferrer");
		return;
	}

	throw new Error(String(payload.message || payload.detail || "Invoice PDF was not returned by API."));
};

export default function InvoicingPage() {
	const [clients, setClients] = useState<Client[]>([]);
	const [projects, setProjects] = useState<Project[]>([]);
	const [selectedClientId, setSelectedClientId] = useState("");
	const [selectedProjectId, setSelectedProjectId] = useState("");
	const [bankName, setBankName] = useState("");
	const [accountName, setAccountName] = useState("");
	const [accountNumber, setAccountNumber] = useState("");
	const [swiftIfsc, setSwiftIfsc] = useState("");
	const [loading, setLoading] = useState(true);
	const [generating, setGenerating] = useState(false);

	const loadOptions = useCallback(async () => {
		setLoading(true);
		try {
			const [clientsRes, projectsRes] = await Promise.all([clientService.listClients(), projectService.listProjects()]);
			setClients((clientsRes || []).filter((client) => client.is_active !== false));
			setProjects((projectsRes || []).filter((project) => project.is_active !== false));
		} catch (error: any) {
			const message = error?.response?.data?.message || error?.response?.data?.detail || error?.message || "Failed to load clients and projects.";
			toast.error(message);
			setClients([]);
			setProjects([]);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		loadOptions();
	}, [loadOptions]);

	const clientProjects = useMemo(() => {
		if (!selectedClientId) return [] as Project[];
		return projects.filter((project) => String(project.client) === selectedClientId);
	}, [projects, selectedClientId]);

	useEffect(() => {
		if (!selectedProjectId) return;
		const existsForClient = clientProjects.some((project) => project.id === selectedProjectId);
		if (!existsForClient) setSelectedProjectId("");
	}, [clientProjects, selectedProjectId]);

	const selectedClient = useMemo(() => clients.find((client) => client.id === selectedClientId) || null, [clients, selectedClientId]);
	const selectedProject = useMemo(() => projects.find((project) => project.id === selectedProjectId) || null, [projects, selectedProjectId]);

	const handleGenerateInvoice = async () => {
		if (!selectedClientId) {
			toast.error("Please select a client.");
			return;
		}
		if (!selectedProjectId) {
			toast.error("Please select a project.");
			return;
		}
		if (!bankName.trim() || !accountName.trim() || !accountNumber.trim() || !swiftIfsc.trim()) {
			toast.error("Please enter all Bank / Payout details.");
			return;
		}

		try {
			setGenerating(true);
			const response = await invoiceService.generateInvoicePdf({
				client_id: selectedClientId,
				project_id: selectedProjectId,
				payout_details: {
					bank_name: bankName.trim(),
					account_name: accountName.trim(),
					account_number: accountNumber.trim(),
					swift_ifsc: swiftIfsc.trim(),
				},
			});

			const safeClient = sanitizeFileName(selectedClient?.name || selectedClientId);
			const safeProject = sanitizeFileName(selectedProject?.name || selectedProjectId);
			const fileName = `invoice-${safeClient}-${safeProject}.pdf`;

			await downloadFromApiResponse(response, fileName);
			toast.success("Invoice generated successfully.");
		} catch (error: any) {
			const message = error?.response?.data?.message || error?.response?.data?.detail || error?.message || "Failed to generate invoice PDF.";
			toast.error(message);
		} finally {
			setGenerating(false);
		}
	};

	if (loading) {
		return (
			<div className="space-y-4">
				<Card>
					<CardContent className="py-10 text-sm text-muted-foreground">Loading invoice options...</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<Card className="overflow-hidden border-0 shadow-sm">
				<CardContent className="relative p-0">
					<div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700" />
					<div className="relative flex flex-col gap-3 p-6 text-white md:flex-row md:items-center md:justify-between">
						<div className="space-y-2">
							<Badge variant="secondary">Invoice</Badge>
							<h2 className="text-2xl font-semibold">Generate Invoice PDF</h2>
							<p className="text-sm text-white/80">Select a client and project, then generate and download the invoice PDF.</p>
						</div>
						<Button variant="secondary" onClick={loadOptions} disabled={generating}>
							<Icon icon="solar:refresh-bold-duotone" /> Refresh
						</Button>
					</div>
				</CardContent>
			</Card>

			<div className="grid gap-4 lg:grid-cols-3">
				<Card className="lg:col-span-2">
					<CardHeader>
						<CardTitle>Invoice Details</CardTitle>
						<CardDescription>Only required fields for now. You can connect your final backend API later.</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="grid gap-4 md:grid-cols-2">
							<div className="space-y-2">
								<div className="text-sm font-medium">Client</div>
								<Select value={selectedClientId} onValueChange={setSelectedClientId}>
									<SelectTrigger>
										<SelectValue placeholder="Select client" />
									</SelectTrigger>
									<SelectContent>
										{clients.map((client) => (
											<SelectItem key={client.id} value={client.id}>
												{client.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-2">
								<div className="text-sm font-medium">Project</div>
								<Select value={selectedProjectId} onValueChange={setSelectedProjectId} disabled={!selectedClientId}>
									<SelectTrigger>
										<SelectValue placeholder={selectedClientId ? "Select project" : "Select client first"} />
									</SelectTrigger>
									<SelectContent>
										{clientProjects.map((project) => (
											<SelectItem key={project.id} value={project.id}>
												{project.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>

						<div className="space-y-3">
							<div className="text-sm font-medium">Bank / Payout Details</div>
							<div className="grid gap-3 md:grid-cols-2">
								<Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Bank Name" />
								<Input value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="Account Name" />
								<Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="Account Number" />
								<Input value={swiftIfsc} onChange={(e) => setSwiftIfsc(e.target.value)} placeholder="SWIFT / IFSC" />
							</div>
						</div>

						<Button
							className="w-full md:w-auto"
							onClick={handleGenerateInvoice}
							disabled={generating || !selectedClientId || !selectedProjectId || !bankName.trim() || !accountName.trim() || !accountNumber.trim() || !swiftIfsc.trim()}
						>
							<Icon icon="solar:file-download-bold-duotone" /> {generating ? "Generating..." : "Generate Invoice"}
						</Button>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Summary</CardTitle>
						<CardDescription>Quick confirmation before generating.</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3 text-sm">
						<div className="rounded-md border p-3">
							<div className="text-muted-foreground">Selected Client</div>
							<div className="font-medium">{selectedClient?.name || "-"}</div>
						</div>
						<div className="rounded-md border p-3">
							<div className="text-muted-foreground">Selected Project</div>
							<div className="font-medium">{selectedProject?.name || "-"}</div>
						</div>
						<div className="rounded-md border p-3">
							<div className="text-muted-foreground">Bank Name</div>
							<div className="font-medium">{bankName || "-"}</div>
						</div>
						<div className="text-xs text-muted-foreground">PDF is expected from backend API response and will be downloaded automatically.</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
