import { useEffect, useMemo, useState } from "react";
import { useForm, type UseFormSetError } from "react-hook-form";
import { toast } from "sonner";

import projectService from "@/api/services/projectService";
import type { Project } from "#/entity";
import { Button } from "@/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/ui/form";
import { Input } from "@/ui/input";
import { Switch } from "@/ui/switch";
import { Textarea } from "@/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";

import type { Task } from "#/entity";
import type { TaskCreateReq, TaskUpdateReq } from "@/api/services/taskService";

export type TaskFormMode = "create" | "edit";

export type TaskFormValues = {
	project: string;
	title: string;
	description: string;
	status: string;
	priority: string;
	estimated_hours: string;
	actual_hours: string;
	progress_percent: string;
	start_date: string;
	due_date: string;
	completed_at: string;
	billable: boolean;
	hourly_rate: string;
	notes: string;
	is_active: boolean;
};

type TaskFormProps = {
	mode: TaskFormMode;
	initialValues?: Task | null;
	onSave: (payload: TaskCreateReq | TaskUpdateReq) => Promise<void>;
	onSuccess?: () => void;
	submitLabel?: string;
};

const toDateInputValue = (value?: string | null) => {
	if (!value) return "";
	if (value.includes("T")) return value.slice(0, 10);
	return value;
};

const toDateTimeInputValue = (value?: string | null) => {
	if (!value) return "";
	if (value.includes("T")) return value.slice(0, 16);
	return value;
};

const buildFormValues = (task?: Task | null): TaskFormValues => ({
	project: task?.project ?? "",
	title: task?.title ?? "",
	description: task?.description ?? "",
	status: task?.status ?? "",
	priority: task?.priority ?? "",
	estimated_hours: task?.estimated_hours !== null && task?.estimated_hours !== undefined ? String(task.estimated_hours) : "",
	actual_hours: task?.actual_hours !== null && task?.actual_hours !== undefined ? String(task.actual_hours) : "",
	progress_percent: task?.progress_percent !== null && task?.progress_percent !== undefined ? String(task.progress_percent) : "",
	start_date: toDateInputValue(task?.start_date),
	due_date: toDateInputValue(task?.due_date),
	completed_at: toDateTimeInputValue(task?.completed_at),
	billable: task?.billable ?? false,
	hourly_rate: task?.hourly_rate !== null && task?.hourly_rate !== undefined ? String(task.hourly_rate) : "",
	notes: task?.notes ?? "",
	is_active: task?.is_active ?? true,
});

const toOptionalNumber = (value: string) => (value.trim() === "" ? null : Number(value));

const buildPayload = (values: TaskFormValues, mode: TaskFormMode): TaskCreateReq | TaskUpdateReq => {
	const payload: TaskCreateReq = {
		project: values.project,
		title: values.title.trim(),
		description: values.description.trim() || "",
		status: values.status.trim() || "",
		priority: values.priority.trim() || "",
		estimated_hours: toOptionalNumber(values.estimated_hours),
		actual_hours: toOptionalNumber(values.actual_hours),
		progress_percent: toOptionalNumber(values.progress_percent),
		start_date: values.start_date.trim() || null,
		due_date: values.due_date.trim() || null,
		completed_at: values.completed_at.trim() || null,
		billable: values.billable,
		hourly_rate: toOptionalNumber(values.hourly_rate),
		notes: values.notes.trim() || "",
	};

	if (mode === "edit") {
		return { ...payload, is_active: values.is_active };
	}

	return payload;
};

const extractErrorMessage = (error: any) => {
	const data = error?.response?.data;
	return data?.message || data?.detail || error?.message || "Operation failed";
};

const applyFieldErrors = (error: any, setError: UseFormSetError<TaskFormValues>, values: TaskFormValues) => {
	const data = error?.response?.data;
	if (!data || typeof data !== "object") return;

	Object.entries(data).forEach(([key, value]) => {
		if (key === "non_field_errors" || key === "detail") return;
		if (!(key in values)) return;
		const message = Array.isArray(value) ? value[0] : String(value);
		setError(key as keyof TaskFormValues, { type: "server", message });
	});
};

const statusOptions = [
	{ value: "todo", label: "To Do" },
	{ value: "in_progress", label: "In Progress" },
	{ value: "blocked", label: "Blocked" },
	{ value: "done", label: "Done" },
];

const priorityOptions = [
	{ value: "low", label: "Low" },
	{ value: "medium", label: "Medium" },
	{ value: "high", label: "High" },
	{ value: "urgent", label: "Urgent" },
];

export function TaskForm({ mode, initialValues, onSave, onSuccess, submitLabel }: TaskFormProps) {
	const [saving, setSaving] = useState(false);
	const [projects, setProjects] = useState<Project[]>([]);
	const [projectsLoading, setProjectsLoading] = useState(false);
	const formValues = useMemo(() => buildFormValues(initialValues), [initialValues]);

	const form = useForm<TaskFormValues>({
		defaultValues: formValues,
	});

	useEffect(() => {
		form.reset(formValues);
	}, [formValues, form]);

	useEffect(() => {
		let active = true;
		const loadProjects = async () => {
			setProjectsLoading(true);
			try {
				const data = await projectService.listProjects();
				if (active) setProjects(data ?? []);
			} catch {
				if (active) setProjects([]);
			} finally {
				if (active) setProjectsLoading(false);
			}
		};
		loadProjects();
		return () => {
			active = false;
		};
	}, []);

	const handleSubmit = async (values: TaskFormValues) => {
		let hasError = false;
		const startDate = values.start_date.trim();
		const dueDate = values.due_date.trim();

		if (startDate && dueDate && dueDate < startDate) {
			form.setError("due_date", { type: "validate", message: "Due date cannot be before start date." });
			hasError = true;
		}
		if (values.billable && values.hourly_rate.trim() === "") {
			form.setError("hourly_rate", { type: "validate", message: "Hourly rate is required for billable tasks." });
			hasError = true;
		}
		if (hasError) return;

		setSaving(true);
		try {
			const payload = buildPayload(values, mode);
			await onSave(payload);
			toast.success(mode === "create" ? "Task created successfully." : "Task updated successfully.");
			onSuccess?.();
		} catch (error: any) {
			applyFieldErrors(error, form.setError, values);
			toast.error(extractErrorMessage(error));
		} finally {
			setSaving(false);
		}
	};

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
					<FormField
						control={form.control}
						name="project"
						rules={{ required: "Project is required." }}
						render={({ field }) => (
							<FormItem>
								<FormLabel>Project</FormLabel>
								<FormControl>
									<Select value={field.value} onValueChange={field.onChange}>
										<SelectTrigger className="w-full">
											<SelectValue placeholder={projectsLoading ? "Loading projects..." : "Select project"} />
										</SelectTrigger>
										<SelectContent>
											{projects.map((project) => (
												<SelectItem key={project.id} value={project.id}>
													{project.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name="title"
						rules={{ required: "Task title is required." }}
						render={({ field }) => (
							<FormItem>
								<FormLabel>Title</FormLabel>
								<FormControl>
									<Input {...field} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name="status"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Status</FormLabel>
								<FormControl>
									<Select value={field.value} onValueChange={field.onChange}>
										<SelectTrigger className="w-full">
											<SelectValue placeholder="Select status" />
										</SelectTrigger>
										<SelectContent>
											{statusOptions.map((option) => (
												<SelectItem key={option.value} value={option.value}>
													{option.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name="priority"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Priority</FormLabel>
								<FormControl>
									<Select value={field.value} onValueChange={field.onChange}>
										<SelectTrigger className="w-full">
											<SelectValue placeholder="Select priority" />
										</SelectTrigger>
										<SelectContent>
											{priorityOptions.map((option) => (
												<SelectItem key={option.value} value={option.value}>
													{option.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>

				<FormField
					control={form.control}
					name="description"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Description</FormLabel>
							<FormControl>
								<Textarea rows={3} {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
					<FormField
						control={form.control}
						name="estimated_hours"
						rules={{
							validate: (value) =>
								value.trim() === "" || Number(value) >= 0 || "Estimated hours must be 0 or greater.",
						}}
						render={({ field }) => (
							<FormItem>
								<FormLabel>Estimated Hours</FormLabel>
								<FormControl>
									<Input type="number" step="0.1" min="0" {...field} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name="actual_hours"
						rules={{
							validate: (value) =>
								value.trim() === "" || Number(value) >= 0 || "Actual hours must be 0 or greater.",
						}}
						render={({ field }) => (
							<FormItem>
								<FormLabel>Actual Hours</FormLabel>
								<FormControl>
									<Input type="number" step="0.1" min="0" {...field} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name="progress_percent"
						rules={{
							validate: (value) => {
								if (value.trim() === "") return true;
								const parsed = Number(value);
								if (Number.isNaN(parsed)) return "Progress must be a number.";
								if (parsed < 0 || parsed > 100) return "Progress must be between 0 and 100.";
								return true;
							},
						}}
						render={({ field }) => (
							<FormItem>
								<FormLabel>Progress (%)</FormLabel>
								<FormControl>
									<Input type="number" step="1" min="0" max="100" {...field} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name="hourly_rate"
						rules={{
							validate: (value) => (value.trim() === "" || Number(value) >= 0 || "Hourly rate must be 0 or greater."),
						}}
						render={({ field }) => (
							<FormItem>
								<FormLabel>Hourly Rate</FormLabel>
								<FormControl>
									<Input type="number" step="0.01" min="0" {...field} />
								</FormControl>
								<FormDescription>Required when billable.</FormDescription>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>

				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
					<FormField
						control={form.control}
						name="start_date"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Start Date</FormLabel>
								<FormControl>
									<Input type="date" {...field} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name="due_date"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Due Date</FormLabel>
								<FormControl>
									<Input type="date" {...field} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name="completed_at"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Completed At</FormLabel>
								<FormControl>
									<Input type="datetime-local" {...field} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>

				<FormField
					control={form.control}
					name="notes"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Notes</FormLabel>
							<FormControl>
								<Textarea rows={4} {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="billable"
					render={({ field }) => (
						<FormItem className="flex flex-row items-center justify-between rounded-lg border px-4 py-3">
							<div>
								<FormLabel>Billable</FormLabel>
								<FormDescription>Billable tasks require an hourly rate.</FormDescription>
							</div>
							<FormControl>
								<Switch checked={field.value} onCheckedChange={field.onChange} />
							</FormControl>
						</FormItem>
					)}
				/>

				{mode === "edit" && (
					<FormField
						control={form.control}
						name="is_active"
						render={({ field }) => (
							<FormItem className="flex flex-row items-center justify-between rounded-lg border px-4 py-3">
								<div>
									<FormLabel>Active</FormLabel>
									<FormDescription>Inactive tasks are hidden from active workflows.</FormDescription>
								</div>
								<FormControl>
									<Switch checked={field.value} onCheckedChange={field.onChange} />
								</FormControl>
							</FormItem>
						)}
					/>
				)}

				<div className="flex justify-end gap-2">
					<Button type="submit" disabled={saving}>
						{saving ? "Saving..." : submitLabel || (mode === "create" ? "Create Task" : "Save Changes")}
					</Button>
				</div>
			</form>
		</Form>
	);
}

export default TaskForm;
