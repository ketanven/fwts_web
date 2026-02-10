import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import taskService from "@/api/services/taskService";
import { useParams, useRouter } from "@/routes/hooks";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader } from "@/ui/card";

import type { Task } from "#/entity";

const formatValue = (value?: string | number | null) => {
	if (value === null || value === undefined || value === "") return "-";
	return String(value);
};

const formatDate = (value?: string | null) => {
	if (!value) return "-";
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return value;
	return parsed.toLocaleDateString();
};

const formatDateTime = (value?: string | null) => {
	if (!value) return "-";
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return value;
	return parsed.toLocaleString();
};

export default function TaskDetailPage() {
	const { id } = useParams();
	const { push } = useRouter();
	const [task, setTask] = useState<Task | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		let active = true;
		const loadTask = async () => {
			if (!id) return;
			setLoading(true);
			try {
				const data = await taskService.getTask(id);
				if (active) setTask(data);
			} catch (error: any) {
				const message = error?.response?.data?.message || error?.response?.data?.detail || error?.message || "Failed to load task.";
				toast.error(message);
			} finally {
				if (active) setLoading(false);
			}
		};
		loadTask();
		return () => {
			active = false;
		};
	}, [id]);

	const billableLabel = useMemo(() => (task?.billable ? "Yes" : "No"), [task]);

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>Task Details</div>
					<div className="flex gap-2">
						<Button variant="outline" onClick={() => push("/management/tasks")}>
							Back to List
						</Button>
						<Button onClick={() => push(`/management/tasks/${id}/edit`)}>Edit</Button>
					</div>
				</div>
			</CardHeader>
			<CardContent>
				{loading ? (
					<div className="py-10 text-sm text-muted-foreground">Loading task...</div>
				) : (
					<div className="space-y-6">
						<div className="flex flex-col gap-2">
							<div className="text-lg font-semibold">{task?.title}</div>
							<div className="text-sm text-muted-foreground">{task?.project_name || task?.project}</div>
							<Badge variant={task?.is_active === false ? "error" : "success"} className="w-fit">
								{task?.is_active === false ? "Inactive" : "Active"}
							</Badge>
						</div>

						<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
							<div>
								<div className="text-xs text-muted-foreground">Status</div>
								<div className="text-sm font-medium">{formatValue(task?.status)}</div>
							</div>
							<div>
								<div className="text-xs text-muted-foreground">Priority</div>
								<div className="text-sm font-medium">{formatValue(task?.priority)}</div>
							</div>
							<div>
								<div className="text-xs text-muted-foreground">Estimated Hours</div>
								<div className="text-sm font-medium">{formatValue(task?.estimated_hours)}</div>
							</div>
							<div>
								<div className="text-xs text-muted-foreground">Actual Hours</div>
								<div className="text-sm font-medium">{formatValue(task?.actual_hours)}</div>
							</div>
							<div>
								<div className="text-xs text-muted-foreground">Progress</div>
								<div className="text-sm font-medium">
									{task?.progress_percent !== null && task?.progress_percent !== undefined ? `${task.progress_percent}%` : "-"}
								</div>
							</div>
							<div>
								<div className="text-xs text-muted-foreground">Billable</div>
								<div className="text-sm font-medium">{billableLabel}</div>
							</div>
							<div>
								<div className="text-xs text-muted-foreground">Hourly Rate</div>
								<div className="text-sm font-medium">{formatValue(task?.hourly_rate)}</div>
							</div>
							<div>
								<div className="text-xs text-muted-foreground">Start Date</div>
								<div className="text-sm font-medium">{formatDate(task?.start_date)}</div>
							</div>
							<div>
								<div className="text-xs text-muted-foreground">Due Date</div>
								<div className="text-sm font-medium">{formatDate(task?.due_date)}</div>
							</div>
							<div>
								<div className="text-xs text-muted-foreground">Completed At</div>
								<div className="text-sm font-medium">{formatDateTime(task?.completed_at)}</div>
							</div>
						</div>

						<div>
							<div className="text-xs text-muted-foreground">Description</div>
							<div className="text-sm font-medium whitespace-pre-wrap">{formatValue(task?.description)}</div>
						</div>

						<div>
							<div className="text-xs text-muted-foreground">Notes</div>
							<div className="text-sm font-medium whitespace-pre-wrap">{formatValue(task?.notes)}</div>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
