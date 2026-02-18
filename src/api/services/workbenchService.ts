import type { Project, Task } from "#/entity";

import apiClient from "../apiClient";
import { WORKBENCH_API } from "../endpoints";
import userStore from "@/store/userStore";

type PaginatedResponse<T> = {
	count: number;
	next: string | null;
	previous: string | null;
	results: T[];
};

export type WorkbenchOverview = Record<string, any>;

export type WorkbenchTimerStatus = "idle" | "running" | "paused" | "break";

export type WorkbenchActiveTimer = {
	id?: number | string;
	project_id?: string;
	project?: string;
	project_name?: string;
	task_id?: string;
	task?: string;
	task_name?: string;
	started_at?: string | null;
	status?: WorkbenchTimerStatus | string;
	break_started_at?: string | null;
	elapsed_seconds?: number;
	break_seconds?: number;
	local_session_uuid?: string;
	offline_mode?: boolean;
	is_active?: boolean;
};

export type TimerStartReq = {
	project_id: string;
	task_id: string;
	started_from?: string;
	offline_mode?: boolean;
	local_session_uuid?: string;
};

export type TimerBreakStartReq = {
	reason?: string;
};

export type TimerStopReq = {
	note?: string;
};

export type ManualTimeEntryReq = {
	project: string;
	task: string;
	entry_date: string;
	start_time?: string;
	end_time?: string;
	duration_seconds?: number;
	is_manual?: boolean;
	source?: string;
	note?: string;
	is_billable?: boolean;
	hourly_rate_snapshot?: string;
	amount_snapshot?: string;
	local_entry_uuid?: string;
	sync_status?: string;
};

export type WorkbenchTimeEntry = {
	id: number;
	project: string;
	project_name?: string;
	task: string;
	task_name?: string;
	entry_date: string;
	start_time?: string | null;
	end_time?: string | null;
	duration_seconds?: number;
	is_manual?: boolean;
	source?: string;
	note?: string;
	is_billable?: boolean;
	hourly_rate_snapshot?: string | null;
	amount_snapshot?: string | null;
	local_entry_uuid?: string | null;
	sync_status?: string;
	created_at?: string;
	updated_at?: string;
};

export type ListTimeEntriesQuery = {
	date_from?: string;
	date_to?: string;
	project_id?: string;
	task_id?: string;
};

export type TimeEntryUpdateReq = Partial<ManualTimeEntryReq>;

export type SyncEntriesReq = {
	batch_uuid: string;
	entries: ManualTimeEntryReq[];
};

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

const getOverview = () =>
	apiClient.get<WorkbenchOverview>({
		url: WORKBENCH_API.overview,
		headers: getAuthHeaders(),
	});

const listProjects = async () => {
	const data = await apiClient.get<Project[] | PaginatedResponse<Project> | { data?: Project[] }>({
		url: WORKBENCH_API.projects,
		headers: getAuthHeaders(),
	});
	return unwrapList(data);
};

const listProjectTasks = async (projectId: string) => {
	const data = await apiClient.get<Task[] | PaginatedResponse<Task> | { data?: Task[] }>({
		url: WORKBENCH_API.projectTasks(projectId),
		headers: getAuthHeaders(),
	});
	return unwrapList(data);
};

const getActiveTimer = () =>
	apiClient.get<WorkbenchActiveTimer | null>({
		url: WORKBENCH_API.activeTimer,
		headers: { "x-skip-error-toast": true, ...getAuthHeaders() },
	});

const startTimer = (data: TimerStartReq) =>
	apiClient.post<WorkbenchActiveTimer>({
		url: WORKBENCH_API.timerStart,
		data,
		headers: { "x-skip-error-toast": true, ...getAuthHeaders() },
	});

const pauseTimer = () =>
	apiClient.post<WorkbenchActiveTimer>({
		url: WORKBENCH_API.timerPause,
		headers: { "x-skip-error-toast": true, ...getAuthHeaders() },
	});

const resumeTimer = () =>
	apiClient.post<WorkbenchActiveTimer>({
		url: WORKBENCH_API.timerResume,
		headers: { "x-skip-error-toast": true, ...getAuthHeaders() },
	});

const startBreak = (data?: TimerBreakStartReq) =>
	apiClient.post<WorkbenchActiveTimer>({
		url: WORKBENCH_API.timerBreakStart,
		data,
		headers: { "x-skip-error-toast": true, ...getAuthHeaders() },
	});

const stopBreak = () =>
	apiClient.post<WorkbenchActiveTimer>({
		url: WORKBENCH_API.timerBreakStop,
		headers: { "x-skip-error-toast": true, ...getAuthHeaders() },
	});

const stopTimer = (data?: TimerStopReq) =>
	apiClient.post<WorkbenchActiveTimer>({
		url: WORKBENCH_API.timerStop,
		data,
		headers: { "x-skip-error-toast": true, ...getAuthHeaders() },
	});

const createManualEntry = (data: ManualTimeEntryReq) =>
	apiClient.post<WorkbenchTimeEntry>({
		url: WORKBENCH_API.manualTimeEntry,
		data,
		headers: { "x-skip-error-toast": true, ...getAuthHeaders() },
	});

const listTimeEntries = async (params?: ListTimeEntriesQuery) => {
	const data = await apiClient.get<WorkbenchTimeEntry[] | PaginatedResponse<WorkbenchTimeEntry> | { data?: WorkbenchTimeEntry[] }>({
		url: WORKBENCH_API.timeEntries,
		params,
		headers: getAuthHeaders(),
	});
	return unwrapList(data);
};

const updateTimeEntry = (entryId: number, data: TimeEntryUpdateReq) =>
	apiClient.patch<WorkbenchTimeEntry>({
		url: WORKBENCH_API.timeEntryDetail(entryId),
		data,
		headers: { "x-skip-error-toast": true, ...getAuthHeaders() },
	});

const deleteTimeEntry = (entryId: number) =>
	apiClient.delete<void>({
		url: WORKBENCH_API.timeEntryDetail(entryId),
		headers: { "x-skip-error-toast": true, ...getAuthHeaders() },
	});

const syncTimeEntries = (data: SyncEntriesReq) =>
	apiClient.post<any>({
		url: WORKBENCH_API.timeEntriesSync,
		data,
		headers: { "x-skip-error-toast": true, ...getAuthHeaders() },
	});

export default {
	getOverview,
	listProjects,
	listProjectTasks,
	getActiveTimer,
	startTimer,
	pauseTimer,
	resumeTimer,
	startBreak,
	stopBreak,
	stopTimer,
	createManualEntry,
	listTimeEntries,
	updateTimeEntry,
	deleteTimeEntry,
	syncTimeEntries,
};
