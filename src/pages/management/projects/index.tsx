import { useEffect, useMemo, useState } from "react";
import type { ColumnsType } from "antd/es/table";
import { Table } from "antd";
import { toast } from "sonner";

import projectService from "@/api/services/projectService";
import { Icon } from "@/components/icon";
import { usePathname, useRouter } from "@/routes/hooks";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader } from "@/ui/card";
import ConfirmDialog from "@/components/common/confirm-dialog";

import type { Project } from "#/entity";

const formatDate = (value?: string | null) => {
	if (!value) return "-";
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return value;
	return parsed.toLocaleDateString();
};

const formatCurrency = (value?: number | null, currency?: string) => {
	if (value === null || value === undefined) return "-";
	if (!currency) return String(value);
	return `${currency.toUpperCase()} ${value}`;
};

export default function ProjectPage() {
	const { push } = useRouter();
	const pathname = usePathname();
	const [projects, setProjects] = useState<Project[]>([]);
	const [loading, setLoading] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [confirmOpen, setConfirmOpen] = useState(false);
	const [selectedProject, setSelectedProject] = useState<Project | null>(null);

	const fetchProjects = async () => {
		setLoading(true);
		try {
			const data = await projectService.listProjects();
			setProjects(data ?? []);
		} catch {
			setProjects([]);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchProjects();
	}, []);

	const handleDelete = async () => {
		if (!selectedProject) return;
		try {
			setDeleting(true);
			await projectService.deleteProject(selectedProject.id);
			toast.success("Project deleted successfully.");
			fetchProjects();
			setConfirmOpen(false);
			setSelectedProject(null);
		} catch (error: any) {
			const message = error?.response?.data?.message || error?.response?.data?.detail || error?.message || "Delete failed.";
			toast.error(message);
		} finally {
			setDeleting(false);
		}
	};

	const columns: ColumnsType<Project> = useMemo(
		() => [
			{
				title: "Project",
				dataIndex: "name",
				width: 260,
				render: (_, record) => (
					<div className="flex flex-col">
						<span className="text-sm font-medium">{record.name}</span>
						<span className="text-xs text-text-secondary">{record.client_name || record.client}</span>
					</div>
				),
			},
			{
				title: "Status",
				dataIndex: "status",
				width: 140,
				render: (value) => value || "-",
			},
			{
				title: "Priority",
				dataIndex: "priority",
				width: 120,
				render: (value) => value || "-",
			},
			{
				title: "Billing",
				dataIndex: "billing_type",
				width: 140,
				render: (value) => value || "-",
			},
			{
				title: "Budget",
				key: "budget",
				width: 160,
				render: (_, record) =>
					record.billing_type === "hourly"
						? formatCurrency(record.hourly_rate, record.currency)
						: record.billing_type === "fixed"
							? formatCurrency(record.fixed_price, record.currency)
							: "-",
			},
			{
				title: "Progress",
				dataIndex: "progress_percent",
				width: 120,
				render: (value) => (value !== null && value !== undefined ? `${value}%` : "-"),
			},
			{
				title: "Dates",
				key: "dates",
				width: 180,
				render: (_, record) => (
					<div className="flex flex-col text-xs">
						<span>Start: {formatDate(record.start_date)}</span>
						<span>Due: {formatDate(record.due_date)}</span>
					</div>
				),
			},
			{
				title: "Active",
				dataIndex: "is_active",
				align: "center",
				width: 120,
				render: (value) => <Badge variant={value === false ? "error" : "success"}>{value === false ? "Inactive" : "Active"}</Badge>,
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
						<Button
							variant="ghost"
							size="icon"
							onClick={() => {
								setSelectedProject(record);
								setConfirmOpen(true);
							}}
						>
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
			<ConfirmDialog
				open={confirmOpen}
				title={`Delete ${selectedProject?.name ?? "project"}?`}
				description="This action cannot be undone."
				confirmText="Yes, delete"
				cancelText="No"
				confirmVariant="destructive"
				loading={deleting}
				onConfirm={handleDelete}
				onCancel={() => {
					if (deleting) return;
					setConfirmOpen(false);
					setSelectedProject(null);
				}}
			/>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>Project List</div>
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
					dataSource={projects}
					loading={loading}
				/>
			</CardContent>
		</Card>
	);
}
