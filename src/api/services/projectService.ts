import apiClient from "../apiClient";
import { PROJECT_API } from "../endpoints";
import userStore from "@/store/userStore";

import type { Project } from "#/entity";

type PaginatedResponse<T> = {
	count: number;
	next: string | null;
	previous: string | null;
	results: T[];
};

export type ProjectCreateReq = {
	client: string;
	name: string;
	description?: string;
	status?: string;
	priority?: string;
	billing_type?: string;
	hourly_rate?: number | null;
	fixed_price?: number | null;
	currency?: string;
	estimated_hours?: number | null;
	progress_percent?: number | null;
	start_date?: string | null;
	due_date?: string | null;
	notes?: string;
	metadata?: Record<string, any> | null;
};

export type ProjectUpdateReq = ProjectCreateReq & {
	is_active?: boolean;
};

const getAuthHeaders = () => {
	const { userToken } = userStore.getState();
	const accessToken = userToken?.accessToken;
	return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
};

const listProjects = async () => {
	const data = await apiClient.get<Project[] | PaginatedResponse<Project>>({
		url: PROJECT_API.list,
		headers: getAuthHeaders(),
	});

	if (Array.isArray(data)) return data;
	if (data && typeof data === "object" && "results" in data && Array.isArray(data.results)) return data.results;
	return [];
};

const getProject = (projectId: string) =>
	apiClient.get<Project>({
		url: PROJECT_API.detail(projectId),
		headers: getAuthHeaders(),
	});

const createProject = (data: ProjectCreateReq) =>
	apiClient.post<Project>({
		url: PROJECT_API.list,
		data,
		headers: { "x-skip-error-toast": true, ...getAuthHeaders() },
	});

const updateProject = (projectId: string, data: ProjectUpdateReq) =>
	apiClient.patch<Project>({
		url: PROJECT_API.detail(projectId),
		data,
		headers: { "x-skip-error-toast": true, ...getAuthHeaders() },
	});

const deleteProject = (projectId: string) =>
	apiClient.delete<void>({
		url: PROJECT_API.detail(projectId),
		headers: { "x-skip-error-toast": true, ...getAuthHeaders() },
	});

export default {
	listProjects,
	getProject,
	createProject,
	updateProject,
	deleteProject,
};
