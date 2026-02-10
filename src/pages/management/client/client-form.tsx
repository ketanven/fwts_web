import { useEffect, useMemo, useState } from "react";
import { useForm, type UseFormSetError } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/ui/form";
import { Input } from "@/ui/input";
import { Switch } from "@/ui/switch";
import { Textarea } from "@/ui/textarea";

import type { Client } from "#/entity";
import type { ClientCreateReq, ClientUpdateReq } from "@/api/services/clientService";

export type ClientFormMode = "create" | "edit";

export type ClientFormValues = {
	name: string;
	company_name: string;
	email: string;
	phone: string;
	address_line1: string;
	address_line2: string;
	city: string;
	state: string;
	postal_code: string;
	country: string;
	tax_id: string;
	currency: string;
	hourly_rate: string;
	payment_terms_days: string;
	trust_score: string;
	notes: string;
	is_active: boolean;
};

type ClientFormProps = {
	mode: ClientFormMode;
	initialValues?: Client | null;
	onSave: (payload: ClientCreateReq | ClientUpdateReq) => Promise<void>;
	onSuccess?: () => void;
	submitLabel?: string;
};

const buildFormValues = (client?: Client | null): ClientFormValues => ({
	name: client?.name ?? "",
	company_name: client?.company_name ?? "",
	email: client?.email ?? "",
	phone: client?.phone ?? "",
	address_line1: client?.address_line1 ?? "",
	address_line2: client?.address_line2 ?? "",
	city: client?.city ?? "",
	state: client?.state ?? "",
	postal_code: client?.postal_code ?? "",
	country: client?.country ?? "",
	tax_id: client?.tax_id ?? "",
	currency: client?.currency ?? "",
	hourly_rate: client?.hourly_rate !== null && client?.hourly_rate !== undefined ? String(client.hourly_rate) : "",
	payment_terms_days:
		client?.payment_terms_days !== null && client?.payment_terms_days !== undefined ? String(client.payment_terms_days) : "",
	trust_score: client?.trust_score !== null && client?.trust_score !== undefined ? String(client.trust_score) : "",
	notes: client?.notes ?? "",
	is_active: client?.is_active ?? true,
});

const toOptionalNumber = (value: string) => (value.trim() === "" ? null : Number(value));
const toOptionalInteger = (value: string) => (value.trim() === "" ? null : Number.parseInt(value, 10));

const buildPayload = (values: ClientFormValues, mode: ClientFormMode): ClientCreateReq | ClientUpdateReq => {
	const payload: ClientCreateReq = {
		name: values.name.trim(),
		company_name: values.company_name.trim() || "",
		email: values.email.trim(),
		phone: values.phone.trim() || "",
		address_line1: values.address_line1.trim() || "",
		address_line2: values.address_line2.trim() || "",
		city: values.city.trim() || "",
		state: values.state.trim() || "",
		postal_code: values.postal_code.trim() || "",
		country: values.country.trim() || "",
		tax_id: values.tax_id.trim() || "",
		currency: values.currency.trim() ? values.currency.trim().toUpperCase() : "",
		hourly_rate: toOptionalNumber(values.hourly_rate),
		payment_terms_days: toOptionalInteger(values.payment_terms_days),
		trust_score: toOptionalNumber(values.trust_score),
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

const applyFieldErrors = (error: any, setError: UseFormSetError<ClientFormValues>, values: ClientFormValues) => {
	const data = error?.response?.data;
	if (!data || typeof data !== "object") return;

	Object.entries(data).forEach(([key, value]) => {
		if (key === "non_field_errors" || key === "detail") return;
		if (!(key in values)) return;
		const message = Array.isArray(value) ? value[0] : String(value);
		setError(key as keyof ClientFormValues, { type: "server", message });
	});
};

export function ClientForm({ mode, initialValues, onSave, onSuccess, submitLabel }: ClientFormProps) {
	const [saving, setSaving] = useState(false);
	const formValues = useMemo(() => buildFormValues(initialValues), [initialValues]);

	const form = useForm<ClientFormValues>({
		defaultValues: formValues,
	});

	useEffect(() => {
		form.reset(formValues);
	}, [formValues, form]);

	const handleSubmit = async (values: ClientFormValues) => {
		setSaving(true);
		try {
			const payload = buildPayload(values, mode);
			await onSave(payload);
			toast.success(mode === "create" ? "Client created successfully." : "Client updated successfully.");
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
							name="name"
							rules={{ required: "Name is required." }}
							render={({ field }) => (
								<FormItem>
									<FormLabel>Name</FormLabel>
									<FormControl>
										<Input {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					<FormField
							control={form.control}
							name="company_name"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Company Name</FormLabel>
									<FormControl>
										<Input {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					<FormField
							control={form.control}
							name="email"
							rules={{
								required: "Email is required.",
								pattern: { value: /\S+@\S+\.\S+/, message: "Enter a valid email address." },
							}}
							render={({ field }) => (
								<FormItem>
									<FormLabel>Email</FormLabel>
									<FormControl>
										<Input type="email" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					<FormField
							control={form.control}
							name="phone"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Phone</FormLabel>
									<FormControl>
										<Input {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
				</div>

				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
					<FormField
							control={form.control}
							name="address_line1"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Address Line 1</FormLabel>
									<FormControl>
										<Input {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					<FormField
							control={form.control}
							name="address_line2"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Address Line 2</FormLabel>
									<FormControl>
										<Input {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					<FormField
							control={form.control}
							name="city"
							render={({ field }) => (
								<FormItem>
									<FormLabel>City</FormLabel>
									<FormControl>
										<Input {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					<FormField
							control={form.control}
							name="state"
							render={({ field }) => (
								<FormItem>
									<FormLabel>State</FormLabel>
									<FormControl>
										<Input {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					<FormField
							control={form.control}
							name="postal_code"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Postal Code</FormLabel>
									<FormControl>
										<Input {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					<FormField
							control={form.control}
							name="country"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Country</FormLabel>
									<FormControl>
										<Input {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
				</div>

				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
					<FormField
							control={form.control}
							name="tax_id"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Tax ID</FormLabel>
									<FormControl>
										<Input {...field} />
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
									<FormMessage />
								</FormItem>
							)}
						/>
					<FormField
							control={form.control}
							name="payment_terms_days"
							rules={{
								validate: (value) => {
									if (value.trim() === "") return true;
									const parsed = Number(value);
									if (Number.isNaN(parsed) || parsed < 0) return "Payment terms must be 0 or greater.";
									if (!Number.isInteger(parsed)) return "Payment terms must be a whole number.";
									return true;
								},
							}}
							render={({ field }) => (
								<FormItem>
									<FormLabel>Payment Terms (days)</FormLabel>
									<FormControl>
										<Input type="number" min="0" step="1" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					<FormField
							control={form.control}
							name="trust_score"
							rules={{
								validate: (value) => {
									if (value.trim() === "") return true;
									const parsed = Number(value);
									if (Number.isNaN(parsed)) return "Trust score must be a number.";
									if (parsed < 0 || parsed > 100) return "Trust score must be between 0 and 100.";
									return true;
								},
							}}
							render={({ field }) => (
								<FormItem>
									<FormLabel>Trust Score</FormLabel>
									<FormControl>
										<Input type="number" min="0" max="100" step="1" {...field} />
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

				{mode === "edit" && (
					<FormField
						control={form.control}
						name="is_active"
						render={({ field }) => (
							<FormItem className="flex flex-row items-center justify-between rounded-lg border px-4 py-3">
								<div>
									<FormLabel>Active</FormLabel>
									<FormDescription>Inactive clients are hidden from active workflows.</FormDescription>
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
						{saving ? "Saving..." : submitLabel || (mode === "create" ? "Create Client" : "Save Changes")}
					</Button>
				</div>
			</form>
		</Form>
	);
}

export default ClientForm;
