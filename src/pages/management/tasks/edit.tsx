import { useEffect, useState } from "react";
import { toast } from "sonner";

import taskService from "@/api/services/taskService";
import { useParams, useRouter } from "@/routes/hooks";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader } from "@/ui/card";

import type { Task } from "#/entity";
import TaskForm from "./task-form";

export default function TaskEditPage() {
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
				if (active) {
					setTask(data);
				}
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

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>Edit Task</div>
					<Button variant="outline" onClick={() => push("/management/tasks")}>
						Back to List
					</Button>
				</div>
			</CardHeader>
			<CardContent>
				{loading ? (
					<div className="py-10 text-sm text-muted-foreground">Loading task...</div>
				) : (
					<TaskForm
						mode="edit"
						initialValues={task}
						onSave={(payload) => (id ? taskService.updateTask(id, payload) : Promise.resolve())}
						onSuccess={() => push("/management/tasks")}
						submitLabel="Save Changes"
					/>
				)}
			</CardContent>
		</Card>
	);
}
