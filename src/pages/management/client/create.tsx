import clientService from "@/api/services/clientService";
import { useRouter } from "@/routes/hooks";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader } from "@/ui/card";

import ClientForm from "./client-form";

export default function ClientCreatePage() {
	const { push } = useRouter();

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>Create Client</div>
					<Button variant="outline" onClick={() => push("/management/client")}>
						Back to List
					</Button>
				</div>
			</CardHeader>
			<CardContent>
				<ClientForm
					mode="create"
					onSave={(payload) => clientService.createClient(payload)}
					onSuccess={() => push("/management/client")}
					submitLabel="Create Client"
				/>
			</CardContent>
		</Card>
	);
}
