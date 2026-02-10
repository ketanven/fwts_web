import taskService from "@/api/services/taskService";
import { useRouter } from "@/routes/hooks";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader } from "@/ui/card";

import TaskForm from "./task-form";

export default function TaskCreatePage() {
	const { push } = useRouter();

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>Create Task</div>
					<Button variant="outline" onClick={() => push("/management/tasks")}>
						Back to List
					</Button>
				</div>
			</CardHeader>
			<CardContent>
				<TaskForm
					mode="create"
					onSave={(payload) => taskService.createTask(payload)}
					onSuccess={() => push("/management/tasks")}
					submitLabel="Create Task"
				/>
			</CardContent>
		</Card>
	);
}
