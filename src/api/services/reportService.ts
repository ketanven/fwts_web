import apiClient from "../apiClient";
import { REPORTS_API } from "../endpoints";
import userStore from "@/store/userStore";

type ReportPayload = Record<string, any>;

type ReportExportPayload = {
	report_type: "earnings" | "time_allocation" | "project_performance" | "client_analytics" | "monthly";
	period_type: "weekly" | "monthly" | "quarterly";
	filters_json?: Record<string, any>;
	file_format: "csv" | "xlsx" | "pdf";
};

const getAuthHeaders = () => {
	const { userToken } = userStore.getState();
	const accessToken = userToken?.accessToken;
	return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
};

const getEarnings = () =>
	apiClient.get<ReportPayload>({
		url: REPORTS_API.earnings,
		headers: getAuthHeaders(),
	});

const getTimeAllocation = () =>
	apiClient.get<ReportPayload>({
		url: REPORTS_API.timeAllocation,
		headers: getAuthHeaders(),
	});

const getProjectPerformance = () =>
	apiClient.get<ReportPayload>({
		url: REPORTS_API.projectPerformance,
		headers: getAuthHeaders(),
	});

const getClientAnalytics = () =>
	apiClient.get<ReportPayload>({
		url: REPORTS_API.clientAnalytics,
		headers: getAuthHeaders(),
	});

const getMonthly = () =>
	apiClient.get<ReportPayload>({
		url: REPORTS_API.monthly,
		headers: getAuthHeaders(),
	});

const createExport = (payload: ReportExportPayload) =>
	apiClient.post<ReportPayload>({
		url: REPORTS_API.export,
		data: payload,
		headers: { "x-skip-error-toast": true, ...getAuthHeaders() },
	});

export default {
	getEarnings,
	getTimeAllocation,
	getProjectPerformance,
	getClientAnalytics,
	getMonthly,
	createExport,
};

export type { ReportExportPayload };
