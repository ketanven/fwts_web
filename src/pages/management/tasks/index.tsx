import { useEffect, useMemo, useState } from "react";
import type { ColumnsType } from "antd/es/table";
import { Table } from "antd";
import { toast } from "sonner";

import taskService from "@/api/services/taskService";
import { Icon } from "@/components/icon";
import { usePathname, useRouter } from "@/routes/hooks";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader } from "@/ui/card";
import ConfirmDialog from "@/components/common/confirm-dialog";

import type { Task } from "#/entity";

const formatDateTime = (value?: string | null) => {
	if (!value) return "-";
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return value;
	return parsed.toLocaleString();
};

export default function TaskPage() {
	const { push } = useRouter();
	const pathname = usePathname();
	const [tasks, setTasks] = useState<Task[]>([]);
	const [loading, setLoading] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [confirmOpen, setConfirmOpen] = useState(false);
	const [selectedTask, setSelectedTask] = useState<Task | null>(null);

	const fetchTasks = async () => {
		setLoading(true);
		try {
			const data = await taskService.listTasks();
			setTasks(data ?? []);
		} catch {
			setTasks([]);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchTasks();
	}, []);

	const handleDelete = async () => {
		if (!selectedTask) return;
		try {
			setDeleting(true);
			await taskService.deleteTask(selectedTask.id);
			toast.success("Task deleted successfully.");
			fetchTasks();
			setConfirmOpen(false);
			setSelectedTask(null);
		} catch (error: any) {
			const message = error?.response?.data?.message || error?.response?.data?.detail || error?.message || "Delete failed.";
			toast.error(message);
		} finally {
			setDeleting(false);
		}
	};

	const columns: ColumnsType<Task> = useMemo(
		() => [
			{
				title: "Task",
				dataIndex: "title",
				width: 260,
				render: (_, record) => (
					<div className="flex flex-col">
						<span className="text-sm font-medium">{record.title}</span>
						<span className="text-xs text-text-secondary">{record.project_name || record.project}</span>
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
				title: "Progress",
				dataIndex: "progress_percent",
				width: 120,
				render: (value) => (value !== null && value !== undefined ? `${value}%` : "-"),
			},
			{
				title: "Billable",
				dataIndex: "billable",
				align: "center",
				width: 120,
				render: (value) => <Badge variant={value ? "success" : "secondary"}>{value ? "Yes" : "No"}</Badge>,
			},
			{
				title: "Due",
				dataIndex: "due_date",
				width: 160,
				render: (value) => (value ? new Date(value).toLocaleDateString() : "-"),
			},
			{
				title: "Updated",
				dataIndex: "updated_at",
				width: 180,
				render: (value) => formatDateTime(value),
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
								setSelectedTask(record);
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
				title={`Delete ${selectedTask?.title ?? "task"}?`}
				description="This action cannot be undone."
				confirmText="Yes, delete"
				cancelText="No"
				confirmVariant="destructive"
				loading={deleting}
				onConfirm={handleDelete}
				onCancel={() => {
					if (deleting) return;
					setConfirmOpen(false);
					setSelectedTask(null);
				}}
			/>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>Task List</div>
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
					dataSource={tasks}
					loading={loading}
				/>
			</CardContent>
		</Card>
	);
}
