import apiClient from "../apiClient";
import { CALENDAR_API } from "../endpoints";
import userStore from "@/store/userStore";

type PaginatedResponse<T> = {
	count: number;
	next: string | null;
	previous: string | null;
	results: T[];
};

type ListCalendarEventsQuery = {
	start_at?: string;
	end_at?: string;
	source_type?: string;
};

type CalendarEventPayload = {
	title?: string;
	description?: string;
	event_type?: string;
	start_at?: string;
	end_at?: string;
	all_day?: boolean;
	timezone?: string;
	location?: string;
	color?: string;
	source_type?: string;
	source_id?: string;
	reminder_minutes_before?: number;
	recurrence_rule?: string;
	status?: string;
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

const listEvents = async (params?: ListCalendarEventsQuery) => {
	const data = await apiClient.get<any[] | PaginatedResponse<any> | { data?: any[] }>({
		url: CALENDAR_API.events,
		params,
		headers: getAuthHeaders(),
	});
	return unwrapList(data);
};

const createEvent = (payload: CalendarEventPayload) =>
	apiClient.post<Record<string, any>>({
		url: CALENDAR_API.events,
		data: payload,
		headers: { "x-skip-error-toast": true, ...getAuthHeaders() },
	});

const getEvent = (eventId: string | number) =>
	apiClient.get<Record<string, any>>({
		url: CALENDAR_API.eventDetail(eventId),
		headers: getAuthHeaders(),
	});

const updateEvent = (eventId: string | number, payload: CalendarEventPayload) =>
	apiClient.patch<Record<string, any>>({
		url: CALENDAR_API.eventDetail(eventId),
		data: payload,
		headers: { "x-skip-error-toast": true, ...getAuthHeaders() },
	});

const deleteEvent = (eventId: string | number) =>
	apiClient.delete<void>({
		url: CALENDAR_API.eventDetail(eventId),
		headers: { "x-skip-error-toast": true, ...getAuthHeaders() },
	});

const listTaskFeed = async () => {
	const data = await apiClient.get<any[] | PaginatedResponse<any> | { data?: any[] }>({
		url: CALENDAR_API.feedTasks,
		headers: getAuthHeaders(),
	});
	return unwrapList(data);
};

const listInvoiceFeed = async () => {
	const data = await apiClient.get<any[] | PaginatedResponse<any> | { data?: any[] }>({
		url: CALENDAR_API.feedInvoices,
		headers: getAuthHeaders(),
	});
	return unwrapList(data);
};

export default {
	listEvents,
	createEvent,
	getEvent,
	updateEvent,
	deleteEvent,
	listTaskFeed,
	listInvoiceFeed,
};

export type { CalendarEventPayload, ListCalendarEventsQuery };
