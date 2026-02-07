import { useEffect, useMemo, useState } from "react";
import type { ColumnsType } from "antd/es/table";
import { Table } from "antd";
import { toast } from "sonner";

import clientService from "@/api/services/clientService";
import { Icon } from "@/components/icon";
import { usePathname, useRouter } from "@/routes/hooks";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader } from "@/ui/card";

import type { Client } from "#/entity";

const formatDate = (value?: string | null) => {
	if (!value) return "-";
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return value;
	return parsed.toLocaleDateString();
};

export default function ClientPage() {
	const { push } = useRouter();
	const pathname = usePathname();
	const [clients, setClients] = useState<Client[]>([]);
	const [loading, setLoading] = useState(false);

	const fetchClients = async () => {
		setLoading(true);
		try {
			const data = await clientService.listClients();
			setClients(data ?? []);
		} catch {
			setClients([]);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchClients();
	}, []);

	const handleDelete = async (client: Client) => {
		const confirmed = window.confirm(`Delete ${client.name}? This action cannot be undone.`);
		if (!confirmed) return;

		try {
			await clientService.deleteClient(client.id);
			toast.success("Client deleted successfully.");
			fetchClients();
		} catch (error: any) {
			const message = error?.response?.data?.message || error?.response?.data?.detail || error?.message || "Delete failed.";
			toast.error(message);
		}
	};

	const columns: ColumnsType<Client> = useMemo(
		() => [
			{
				title: "Client",
				dataIndex: "name",
				width: 260,
				render: (_, record) => (
					<div className="flex flex-col">
						<span className="text-sm font-medium">{record.name}</span>
						<span className="text-xs text-text-secondary">{record.email}</span>
					</div>
				),
			},
			{
				title: "Company",
				dataIndex: "company_name",
				width: 180,
				render: (value) => value || "-",
			},
			{
				title: "Phone",
				dataIndex: "phone",
				width: 140,
				render: (value) => value || "-",
			},
			{
				title: "Currency",
				dataIndex: "currency",
				width: 100,
				render: (value) => value || "-",
			},
			{
				title: "Hourly Rate",
				dataIndex: "hourly_rate",
				width: 120,
				render: (value) => (value !== null && value !== undefined ? value : "-"),
			},
			{
				title: "Status",
				dataIndex: "is_active",
				align: "center",
				width: 120,
				render: (value) => <Badge variant={value === false ? "error" : "success"}>{value === false ? "Inactive" : "Active"}</Badge>,
			},
			{
				title: "Updated",
				dataIndex: "updated_at",
				width: 140,
				render: (value) => formatDate(value),
			},
			{
				title: "Action",
				key: "operation",
				align: "center",
				width: 140,
				render: (_, record) => (
					<div className="flex w-full justify-center text-gray-500">
						<Button variant="ghost" size="icon" onClick={() => push(`${pathname}/${record.id}`)}>
							<Icon icon="mdi:card-account-details" size={18} />
						</Button>
						<Button variant="ghost" size="icon" onClick={() => push(`${pathname}/${record.id}/edit`)}>
							<Icon icon="solar:pen-bold-duotone" size={18} />
						</Button>
						<Button variant="ghost" size="icon" onClick={() => handleDelete(record)}>
							<Icon icon="mingcute:delete-2-fill" size={18} className="text-error!" />
						</Button>
					</div>
				),
			},
		],
		[pathname],
	);

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>Client List</div>
					<Button onClick={() => push(`${pathname}/new`)}>New</Button>
				</div>
			</CardHeader>
			<CardContent>
				<Table
					rowKey="id"
					size="small"
					scroll={{ x: "max-content" }}
					pagination={false}
					columns={columns}
					dataSource={clients}
					loading={loading}
				/>
			</CardContent>
		</Card>
	);
}
