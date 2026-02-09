import apiClient from "../apiClient";
import { CLIENT_API } from "../endpoints";
import userStore from "@/store/userStore";

import type { Client } from "#/entity";

type PaginatedResponse<T> = {
	count: number;
	next: string | null;
	previous: string | null;
	results: T[];
};

export type ClientCreateReq = {
	name: string;
	company_name?: string;
	email: string;
	phone?: string;
	address_line1?: string;
	address_line2?: string;
	city?: string;
	state?: string;
	postal_code?: string;
	country?: string;
	tax_id?: string;
	currency?: string;
	hourly_rate?: number | null;
	payment_terms_days?: number | null;
	trust_score?: number | null;
	notes?: string;
	metadata?: Record<string, any> | null;
};

export type ClientUpdateReq = ClientCreateReq & {
	is_active?: boolean;
};

const getAuthHeaders = () => {
	const { userToken } = userStore.getState();
	const accessToken = userToken?.accessToken;
	return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
};

const listClients = async () => {
	const data = await apiClient.get<Client[] | PaginatedResponse<Client>>({
		url: CLIENT_API.list,
		headers: getAuthHeaders(),
	});

	if (Array.isArray(data)) return data;
	if (data && typeof data === "object" && "results" in data && Array.isArray(data.results)) return data.results;
	return [];
};

const getClient = (clientId: string) =>
	apiClient.get<Client>({
		url: CLIENT_API.detail(clientId),
		headers: getAuthHeaders(),
	});

const createClient = (data: ClientCreateReq) =>
	apiClient.post<Client>({
		url: CLIENT_API.list,
		data,
		headers: { "x-skip-error-toast": true, ...getAuthHeaders() },
	});

const updateClient = (clientId: string, data: ClientUpdateReq) =>
	apiClient.patch<Client>({
		url: CLIENT_API.detail(clientId),
		data,
		headers: { "x-skip-error-toast": true, ...getAuthHeaders() },
	});

const deleteClient = (clientId: string) =>
	apiClient.delete<void>({
		url: CLIENT_API.detail(clientId),
		headers: { "x-skip-error-toast": true, ...getAuthHeaders() },
	});

export default {
	listClients,
	getClient,
	createClient,
	updateClient,
	deleteClient,
};
