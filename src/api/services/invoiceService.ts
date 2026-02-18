import apiClient from "../apiClient";
import { INVOICE_API } from "../endpoints";
import userStore from "@/store/userStore";

type PaginatedResponse<T> = {
	count: number;
	next: string | null;
	previous: string | null;
	results: T[];
};

type InvoiceStatus = "draft" | "submitted" | "sent" | "paid" | "overdue";

type ListInvoicesQuery = {
	status?: InvoiceStatus;
	client_id?: string;
	date_from?: string;
	date_to?: string;
};

type LineItemPayload = {
	item_type?: string;
	title: string;
	description?: string;
	quantity: string;
	unit: string;
	unit_price: string;
	tax_percent?: string;
	discount_percent?: string;
	line_total: string;
	sort_order?: number;
	task?: string | null;
	time_entry?: number | null;
};

type InvoiceCreatePayload = {
	invoice_number: string;
	client: string;
	project?: string;
	issue_date: string;
	due_date: string;
	currency?: string;
	invoice_type?: string;
	status?: InvoiceStatus;
	subtotal?: string;
	discount_total?: string;
	tax_total?: string;
	total_amount?: string;
	paid_amount?: string;
	balance_amount?: string;
	notes?: string;
	terms?: string;
	metadata_json?: Record<string, any>;
	line_items?: LineItemPayload[];
};

type InvoiceUpdatePayload = Partial<InvoiceCreatePayload>;

type CreateFromTimeEntriesPayload = {
	client_id: string;
	project_id?: string;
	time_entry_ids?: number[];
	issue_date?: string;
	due_date?: string;
	currency?: string;
};

type MarkPaidPayload = {
	payment_date?: string;
	amount?: string;
	payment_method?: string;
	transaction_reference?: string;
};

type CreatePaymentPayload = {
	payment_date: string;
	amount: string;
	currency: string;
	payment_method?: string;
	transaction_reference?: string;
	payment_note?: string;
	status?: string;
};

type CreateVersionPayload = {
	version_label?: string;
	change_summary?: string;
};

type NumberingConfigPayload = Partial<{
	prefix: string;
	separator: string;
	include_year: boolean;
	include_month: boolean;
	sequence_padding: number;
	reset_rule: string;
	format_template: string;
	is_active: boolean;
}>;

const getAuthHeaders = () => {
	const { userToken } = userStore.getState();
	const accessToken = userToken?.accessToken;
	return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
};

const unwrapList = <T>(data: T[] | PaginatedResponse<T> | { data?: T[] } | undefined): T[] => {
	if (Array.isArray(data)) return data;
	if (data && typeof data === "object" && "results" in data && Array.isArray(data.results)) return data.results;
	if (data && typeof data === "object" && "data" in data && Array.isArray(data.data)) return data.data;
	return [];
};

const getInvoiceStats = () =>
	apiClient.get<Record<string, any>>({
		url: INVOICE_API.stats,
		headers: getAuthHeaders(),
	});

const createFromTimeEntries = (payload: CreateFromTimeEntriesPayload) =>
	apiClient.post<Record<string, any>>({
		url: INVOICE_API.fromTimeEntries,
		data: payload,
		headers: { "x-skip-error-toast": true, ...getAuthHeaders() },
	});

const listInvoices = async (params?: ListInvoicesQuery) => {
	const data = await apiClient.get<any[] | PaginatedResponse<any> | { data?: any[] }>({
		url: INVOICE_API.list,
		params,
		headers: getAuthHeaders(),
	});
	return unwrapList(data);
};

const createInvoice = (payload: InvoiceCreatePayload) =>
	apiClient.post<Record<string, any>>({
		url: INVOICE_API.list,
		data: payload,
		headers: { "x-skip-error-toast": true, ...getAuthHeaders() },
	});

const getInvoice = (invoiceId: string) =>
	apiClient.get<Record<string, any>>({
		url: INVOICE_API.detail(invoiceId),
		headers: getAuthHeaders(),
	});

const updateInvoice = (invoiceId: string, payload: InvoiceUpdatePayload) =>
	apiClient.patch<Record<string, any>>({
		url: INVOICE_API.detail(invoiceId),
		data: payload,
		headers: { "x-skip-error-toast": true, ...getAuthHeaders() },
	});

const submitInvoice = (invoiceId: string) =>
	apiClient.post<Record<string, any>>({
		url: INVOICE_API.submit(invoiceId),
		headers: { "x-skip-error-toast": true, ...getAuthHeaders() },
	});

const sendInvoice = (invoiceId: string) =>
	apiClient.post<Record<string, any>>({
		url: INVOICE_API.send(invoiceId),
		headers: { "x-skip-error-toast": true, ...getAuthHeaders() },
	});

const sendInvoiceReminder = (invoiceId: string) =>
	apiClient.post<Record<string, any>>({
		url: INVOICE_API.reminder(invoiceId),
		headers: { "x-skip-error-toast": true, ...getAuthHeaders() },
	});

const markInvoicePaid = (invoiceId: string, payload?: MarkPaidPayload) =>
	apiClient.post<Record<string, any>>({
		url: INVOICE_API.markPaid(invoiceId),
		data: payload,
		headers: { "x-skip-error-toast": true, ...getAuthHeaders() },
	});

const listInvoicePayments = async (invoiceId: string) => {
	const data = await apiClient.get<any[] | PaginatedResponse<any> | { data?: any[] }>({
		url: INVOICE_API.payments(invoiceId),
		headers: getAuthHeaders(),
	});
	return unwrapList(data);
};

const createInvoicePayment = (invoiceId: string, payload: CreatePaymentPayload) =>
	apiClient.post<Record<string, any>>({
		url: INVOICE_API.payments(invoiceId),
		data: payload,
		headers: { "x-skip-error-toast": true, ...getAuthHeaders() },
	});

const getInvoicePdf = (invoiceId: string) =>
	apiClient.request<Blob | Record<string, any>>({
		url: INVOICE_API.pdf(invoiceId),
		method: "GET",
		responseType: "blob",
		headers: getAuthHeaders(),
	});

const listInvoiceVersions = async (invoiceId: string) => {
	const data = await apiClient.get<any[] | PaginatedResponse<any> | { data?: any[] }>({
		url: INVOICE_API.versions(invoiceId),
		headers: getAuthHeaders(),
	});
	return unwrapList(data);
};

const createInvoiceVersion = (invoiceId: string, payload: CreateVersionPayload) =>
	apiClient.post<Record<string, any>>({
		url: INVOICE_API.versions(invoiceId),
		data: payload,
		headers: { "x-skip-error-toast": true, ...getAuthHeaders() },
	});

const getInvoiceVersion = (invoiceId: string, versionId: string | number) =>
	apiClient.get<Record<string, any>>({
		url: INVOICE_API.versionDetail(invoiceId, versionId),
		headers: getAuthHeaders(),
	});

const restoreInvoiceVersion = (invoiceId: string, versionId: string | number) =>
	apiClient.post<Record<string, any>>({
		url: INVOICE_API.versionRestore(invoiceId, versionId),
		headers: { "x-skip-error-toast": true, ...getAuthHeaders() },
	});

const getInvoiceNumberingConfig = () =>
	apiClient.get<Record<string, any>>({
		url: INVOICE_API.numberingConfig,
		headers: getAuthHeaders(),
	});

const updateInvoiceNumberingConfig = (payload: NumberingConfigPayload) =>
	apiClient.patch<Record<string, any>>({
		url: INVOICE_API.numberingConfig,
		data: payload,
		headers: { "x-skip-error-toast": true, ...getAuthHeaders() },
	});

const getNextInvoiceNumber = () =>
	apiClient.get<Record<string, any>>({
		url: INVOICE_API.numberingNext,
		headers: getAuthHeaders(),
	});

export default {
	getInvoiceStats,
	createFromTimeEntries,
	listInvoices,
	createInvoice,
	getInvoice,
	updateInvoice,
	submitInvoice,
	sendInvoice,
	sendInvoiceReminder,
	markInvoicePaid,
	listInvoicePayments,
	createInvoicePayment,
	getInvoicePdf,
	listInvoiceVersions,
	createInvoiceVersion,
	getInvoiceVersion,
	restoreInvoiceVersion,
	getInvoiceNumberingConfig,
	updateInvoiceNumberingConfig,
	getNextInvoiceNumber,
};

export type {
	CreateFromTimeEntriesPayload,
	CreatePaymentPayload,
	CreateVersionPayload,
	InvoiceCreatePayload,
	InvoiceUpdatePayload,
	LineItemPayload,
	ListInvoicesQuery,
	MarkPaidPayload,
	NumberingConfigPayload,
};
