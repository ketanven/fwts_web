import apiClient from "../apiClient";
import { TASK_API } from "../endpoints";
import userStore from "@/store/userStore";

import type { Task } from "#/entity";

type PaginatedResponse<T> = {
	count: number;
	next: string | null;
	previous: string | null;
	results: T[];
};

export type TaskCreateReq = {
	project: string;
	title: string;
	description?: string;
	status?: string;
	priority?: string;
	estimated_hours?: number | null;
	actual_hours?: number | null;
	progress_percent?: number | null;
	start_date?: string | null;
	due_date?: string | null;
	completed_at?: string | null;
	billable?: boolean;
	hourly_rate?: number | null;
	notes?: string;
};

export type TaskUpdateReq = TaskCreateReq & {
	is_active?: boolean;
};

const getAuthHeaders = () => {
	const { userToken } = userStore.getState();
	const accessToken = userToken?.accessToken;
	return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
};

const listTasks = async () => {
	const data = await apiClient.get<Task[] | PaginatedResponse<Task>>({
		url: TASK_API.list,
		headers: getAuthHeaders(),
	});

	if (Array.isArray(data)) return data;
	if (data && typeof data === "object" && "results" in data && Array.isArray(data.results)) return data.results;
	return [];
};

const getTask = (taskId: string) =>
	apiClient.get<Task>({
		url: TASK_API.detail(taskId),
		headers: getAuthHeaders(),
	});

const createTask = (data: TaskCreateReq) =>
	apiClient.post<Task>({
		url: TASK_API.list,
		data,
		headers: { "x-skip-error-toast": true, ...getAuthHeaders() },
	});

const updateTask = (taskId: string, data: TaskUpdateReq) =>
	apiClient.patch<Task>({
		url: TASK_API.detail(taskId),
		data,
		headers: { "x-skip-error-toast": true, ...getAuthHeaders() },
	});

const deleteTask = (taskId: string) =>
	apiClient.delete<void>({
		url: TASK_API.detail(taskId),
		headers: { "x-skip-error-toast": true, ...getAuthHeaders() },
	});

export default {
	listTasks,
	getTask,
	createTask,
	updateTask,
	deleteTask,
};
