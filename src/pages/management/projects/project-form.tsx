import { useEffect, useMemo, useState } from "react";
import { useForm, type UseFormSetError } from "react-hook-form";
import { toast } from "sonner";

import clientService from "@/api/services/clientService";
import type { Client } from "#/entity";
import { Button } from "@/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/ui/form";
import { Input } from "@/ui/input";
import { Switch } from "@/ui/switch";
import { Textarea } from "@/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";

import type { Project } from "#/entity";
import type { ProjectCreateReq, ProjectUpdateReq } from "@/api/services/projectService";

export type ProjectFormMode = "create" | "edit";

export type ProjectFormValues = {
	client: string;
	name: string;
	description: string;
	status: string;
	priority: string;
	billing_type: string;
	hourly_rate: string;
	fixed_price: string;
	currency: string;
	estimated_hours: string;
	progress_percent: string;
	start_date: string;
	due_date: string;
	notes: string;
	metadata: string;
	is_active: boolean;
};

type ProjectFormProps = {
	mode: ProjectFormMode;
	initialValues?: Project | null;
	onSave: (payload: ProjectCreateReq | ProjectUpdateReq) => Promise<void>;
	onSuccess?: () => void;
	submitLabel?: string;
};

const toDateInputValue = (value?: string | null) => {
	if (!value) return "";
	if (value.includes("T")) return value.slice(0, 10);
	return value;
};

const buildFormValues = (project?: Project | null): ProjectFormValues => ({
	client: project?.client ?? "",
	name: project?.name ?? "",
	description: project?.description ?? "",
	status: project?.status ?? "",
	priority: project?.priority ?? "",
	billing_type: project?.billing_type ?? "",
	hourly_rate: project?.hourly_rate !== null && project?.hourly_rate !== undefined ? String(project.hourly_rate) : "",
	fixed_price: project?.fixed_price !== null && project?.fixed_price !== undefined ? String(project.fixed_price) : "",
	currency: project?.currency ?? "",
	estimated_hours: project?.estimated_hours !== null && project?.estimated_hours !== undefined ? String(project.estimated_hours) : "",
	progress_percent: project?.progress_percent !== null && project?.progress_percent !== undefined ? String(project.progress_percent) : "",
	start_date: toDateInputValue(project?.start_date),
	due_date: toDateInputValue(project?.due_date),
	notes: project?.notes ?? "",
	metadata: project?.metadata ? JSON.stringify(project.metadata, null, 2) : "",
	is_active: project?.is_active ?? true,
});

const toOptionalNumber = (value: string) => (value.trim() === "" ? null : Number(value));

const buildPayload = (values: ProjectFormValues, mode: ProjectFormMode): ProjectCreateReq | ProjectUpdateReq => {
	const payload: ProjectCreateReq = {
		client: values.client,
		name: values.name.trim(),
		description: values.description.trim() || "",
		status: values.status.trim() || "",
		priority: values.priority.trim() || "",
		billing_type: values.billing_type.trim() || "",
		hourly_rate: toOptionalNumber(values.hourly_rate),
		fixed_price: toOptionalNumber(values.fixed_price),
		currency: values.currency.trim() ? values.currency.trim().toUpperCase() : "",
		estimated_hours: toOptionalNumber(values.estimated_hours),
		progress_percent: toOptionalNumber(values.progress_percent),
		start_date: values.start_date.trim() || null,
		due_date: values.due_date.trim() || null,
		notes: values.notes.trim() || "",
		metadata: values.metadata.trim() ? JSON.parse(values.metadata) : null,
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

const applyFieldErrors = (error: any, setError: UseFormSetError<ProjectFormValues>, values: ProjectFormValues) => {
	const data = error?.response?.data;
	if (!data || typeof data !== "object") return;

	Object.entries(data).forEach(([key, value]) => {
		if (key === "non_field_errors" || key === "detail") return;
		if (!(key in values)) return;
		const message = Array.isArray(value) ? value[0] : String(value);
		setError(key as keyof ProjectFormValues, { type: "server", message });
	});
};

const billingOptions = [
	{ value: "hourly", label: "Hourly" },
	{ value: "fixed", label: "Fixed" },
];

const statusOptions = [
	{ value: "planned", label: "Planned" },
	{ value: "in_progress", label: "In Progress" },
	{ value: "completed", label: "Completed" },
	{ value: "on_hold", label: "On Hold" },
	{ value: "canceled", label: "Canceled" },
];

const priorityOptions = [
	{ value: "low", label: "Low" },
	{ value: "medium", label: "Medium" },
	{ value: "high", label: "High" },
	{ value: "urgent", label: "Urgent" },
];

export function ProjectForm({ mode, initialValues, onSave, onSuccess, submitLabel }: ProjectFormProps) {
	const [saving, setSaving] = useState(false);
	const [clients, setClients] = useState<Client[]>([]);
	const [clientsLoading, setClientsLoading] = useState(false);
	const formValues = useMemo(() => buildFormValues(initialValues), [initialValues]);

	const form = useForm<ProjectFormValues>({
		defaultValues: formValues,
	});

	useEffect(() => {
		form.reset(formValues);
	}, [formValues, form]);

	useEffect(() => {
		let active = true;
		const loadClients = async () => {
			setClientsLoading(true);
			try {
				const data = await clientService.listClients();
				if (active) setClients(data ?? []);
			} catch {
				if (active) setClients([]);
			} finally {
				if (active) setClientsLoading(false);
			}
		};
		loadClients();
		return () => {
			active = false;
		};
	}, []);

	const handleSubmit = async (values: ProjectFormValues) => {
		let hasError = false;
		const startDate = values.start_date.trim();
		const dueDate = values.due_date.trim();
		const billingType = values.billing_type.trim();

		if (startDate && dueDate && dueDate < startDate) {
			form.setError("due_date", { type: "validate", message: "Due date cannot be before start date." });
			hasError = true;
		}
		if (billingType === "hourly" && values.hourly_rate.trim() === "") {
			form.setError("hourly_rate", { type: "validate", message: "Hourly rate is required for hourly billing." });
			hasError = true;
		}
		if (billingType === "fixed" && values.fixed_price.trim() === "") {
			form.setError("fixed_price", { type: "validate", message: "Fixed price is required for fixed billing." });
			hasError = true;
		}

		if (hasError) return;

		setSaving(true);
		try {
			const payload = buildPayload(values, mode);
			await onSave(payload);
			toast.success(mode === "create" ? "Project created successfully." : "Project updated successfully.");
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
						name="client"
						rules={{ required: "Client is required." }}
						render={({ field }) => (
							<FormItem>
								<FormLabel>Client</FormLabel>
								<FormControl>
									<Select value={field.value} onValueChange={field.onChange}>
										<SelectTrigger className="w-full">
											<SelectValue placeholder={clientsLoading ? "Loading clients..." : "Select client"} />
										</SelectTrigger>
										<SelectContent>
											{clients.map((client) => (
												<SelectItem key={client.id} value={client.id}>
													{client.name}
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
						name="name"
						rules={{ required: "Project name is required." }}
						render={({ field }) => (
							<FormItem>
								<FormLabel>Project Name</FormLabel>
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
						name="billing_type"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Billing Type</FormLabel>
								<FormControl>
									<Select value={field.value} onValueChange={field.onChange}>
										<SelectTrigger className="w-full">
											<SelectValue placeholder="Select billing type" />
										</SelectTrigger>
										<SelectContent>
											{billingOptions.map((option) => (
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
						name="currency"
						rules={{
							validate: (value) =>
								value.trim() === "" || /^[A-Za-z]{3}$/.test(value.trim()) || "Use a 3-letter currency code.",
						}}
						render={({ field }) => (
							<FormItem>
								<FormLabel>Currency</FormLabel>
								<FormControl>
									<Input placeholder="USD" {...field} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name="hourly_rate"
						rules={{
							validate: (value) =>
								value.trim() === "" || Number(value) >= 0 || "Hourly rate must be 0 or greater.",
						}}
						render={({ field }) => (
							<FormItem>
								<FormLabel>Hourly Rate</FormLabel>
								<FormControl>
									<Input type="number" step="0.01" min="0" {...field} />
								</FormControl>
								<FormDescription>Required for hourly billing.</FormDescription>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name="fixed_price"
						rules={{
							validate: (value) =>
								value.trim() === "" || Number(value) >= 0 || "Fixed price must be 0 or greater.",
						}}
						render={({ field }) => (
							<FormItem>
								<FormLabel>Fixed Price</FormLabel>
								<FormControl>
									<Input type="number" step="0.01" min="0" {...field} />
								</FormControl>
								<FormDescription>Required for fixed billing.</FormDescription>
								<FormMessage />
							</FormItem>
						)}
					/>
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
					name="metadata"
					rules={{
						validate: (value) => {
							if (value.trim() === "") return true;
							try {
								JSON.parse(value);
								return true;
							} catch {
								return "Metadata must be valid JSON.";
							}
						},
					}}
					render={({ field }) => (
						<FormItem>
							<FormLabel>Metadata (JSON)</FormLabel>
							<FormControl>
								<Textarea rows={5} placeholder='{"source":"referral"}' {...field} />
							</FormControl>
							<FormDescription>Optional structured data stored with the project.</FormDescription>
							<FormMessage />
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
									<FormDescription>Inactive projects are hidden from active workflows.</FormDescription>
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
						{saving ? "Saving..." : submitLabel || (mode === "create" ? "Create Project" : "Save Changes")}
					</Button>
				</div>
			</form>
		</Form>
	);
}

export default ProjectForm;
