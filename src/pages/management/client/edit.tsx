import { useEffect, useState } from "react";
import { toast } from "sonner";

import clientService from "@/api/services/clientService";
import { useParams, useRouter } from "@/routes/hooks";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader } from "@/ui/card";

import type { Client } from "#/entity";
import ClientForm from "./client-form";

export default function ClientEditPage() {
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
				if (active) {
					setClient(data);
				}
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

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>Edit Client</div>
					<Button variant="outline" onClick={() => push("/management/client")}>
						Back to List
					</Button>
				</div>
			</CardHeader>
			<CardContent>
				{loading ? (
					<div className="py-10 text-sm text-muted-foreground">Loading client...</div>
				) : (
					<ClientForm
						mode="edit"
						initialValues={client}
						onSave={(payload) => (id ? clientService.updateClient(id, payload) : Promise.resolve())}
						onSuccess={() => push("/management/client")}
						submitLabel="Save Changes"
					/>
				)}
			</CardContent>
		</Card>
	);
}
