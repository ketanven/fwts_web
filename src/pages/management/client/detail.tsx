import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import clientService from "@/api/services/clientService";
import { useParams, useRouter } from "@/routes/hooks";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader } from "@/ui/card";

import type { Client } from "#/entity";

const formatValue = (value?: string | number | null) => {
	if (value === null || value === undefined || value === "") return "-";
	return String(value);
};

export default function ClientDetailPage() {
	const { id } = useParams();
	const { push } = useRouter();
	const [client, setClient] = useState<Client | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		let active = true;
		const loadClient = async () => {
			if (!id) return;
			setLoading(true);
			try {
				const data = await clientService.getClient(id);
				if (active) setClient(data);
			} catch (error: any) {
				const message = error?.response?.data?.message || error?.response?.data?.detail || error?.message || "Failed to load client.";
				toast.error(message);
			} finally {
				if (active) setLoading(false);
			}
		};
		loadClient();
		return () => {
			active = false;
		};
	}, [id]);

	const metadata = useMemo(() => {
		if (!client?.metadata) return null;
		return JSON.stringify(client.metadata, null, 2);
	}, [client]);

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>Client Details</div>
					<div className="flex gap-2">
						<Button variant="outline" onClick={() => push("/management/client")}>
							Back to List
						</Button>
						<Button onClick={() => push(`/management/client/${id}/edit`)}>Edit</Button>
					</div>
				</div>
			</CardHeader>
			<CardContent>
				{loading ? (
					<div className="py-10 text-sm text-muted-foreground">Loading client...</div>
				) : (
					<div className="space-y-6">
						<div className="flex flex-col gap-2">
							<div className="text-lg font-semibold">{client?.name}</div>
							<div className="text-sm text-muted-foreground">{client?.email}</div>
							<Badge variant={client?.is_active === false ? "error" : "success"} className="w-fit">
								{client?.is_active === false ? "Inactive" : "Active"}
							</Badge>
						</div>

						<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
							<div>
								<div className="text-xs text-muted-foreground">Company</div>
								<div className="text-sm font-medium">{formatValue(client?.company_name)}</div>
							</div>
							<div>
								<div className="text-xs text-muted-foreground">Phone</div>
								<div className="text-sm font-medium">{formatValue(client?.phone)}</div>
							</div>
							<div>
								<div className="text-xs text-muted-foreground">Address</div>
								<div className="text-sm font-medium">{formatValue(client?.address_line1)}</div>
							</div>
							<div>
								<div className="text-xs text-muted-foreground">Address Line 2</div>
								<div className="text-sm font-medium">{formatValue(client?.address_line2)}</div>
							</div>
							<div>
								<div className="text-xs text-muted-foreground">City</div>
								<div className="text-sm font-medium">{formatValue(client?.city)}</div>
							</div>
							<div>
								<div className="text-xs text-muted-foreground">State</div>
								<div className="text-sm font-medium">{formatValue(client?.state)}</div>
							</div>
							<div>
								<div className="text-xs text-muted-foreground">Postal Code</div>
								<div className="text-sm font-medium">{formatValue(client?.postal_code)}</div>
							</div>
							<div>
								<div className="text-xs text-muted-foreground">Country</div>
								<div className="text-sm font-medium">{formatValue(client?.country)}</div>
							</div>
							<div>
								<div className="text-xs text-muted-foreground">Tax ID</div>
								<div className="text-sm font-medium">{formatValue(client?.tax_id)}</div>
							</div>
							<div>
								<div className="text-xs text-muted-foreground">Currency</div>
								<div className="text-sm font-medium">{formatValue(client?.currency)}</div>
							</div>
							<div>
								<div className="text-xs text-muted-foreground">Hourly Rate</div>
								<div className="text-sm font-medium">{formatValue(client?.hourly_rate)}</div>
							</div>
							<div>
								<div className="text-xs text-muted-foreground">Payment Terms (days)</div>
								<div className="text-sm font-medium">{formatValue(client?.payment_terms_days)}</div>
							</div>
							<div>
								<div className="text-xs text-muted-foreground">Trust Score</div>
								<div className="text-sm font-medium">{formatValue(client?.trust_score)}</div>
							</div>
						</div>

						<div>
							<div className="text-xs text-muted-foreground">Notes</div>
							<div className="text-sm font-medium whitespace-pre-wrap">{formatValue(client?.notes)}</div>
						</div>

						<div>
							<div className="text-xs text-muted-foreground">Metadata</div>
							{metadata ? (
								<pre className="mt-2 rounded-md bg-muted p-3 text-xs whitespace-pre-wrap">{metadata}</pre>
							) : (
								<div className="text-sm font-medium">-</div>
							)}
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
