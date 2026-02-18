import apiClient from "../apiClient";
import { ANALYSIS_API } from "../endpoints";
import userStore from "@/store/userStore";

type AnalysisPeriod = "weekly" | "monthly";
type AnalysisPayload = Record<string, any>;

const getAuthHeaders = () => {
	const { userToken } = userStore.getState();
	const accessToken = userToken?.accessToken;
	return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
};

const getSummary = () =>
	apiClient.get<AnalysisPayload>({
		url: ANALYSIS_API.summary,
		headers: getAuthHeaders(),
	});

const getWebAnalytics = (days = 14) =>
	apiClient.get<AnalysisPayload>({
		url: ANALYSIS_API.webAnalytics,
		params: { days },
		headers: getAuthHeaders(),
	});

const getEarningsTrend = (period: AnalysisPeriod = "monthly") =>
	apiClient.get<AnalysisPayload>({
		url: ANALYSIS_API.earningsTrend,
		params: { period },
		headers: getAuthHeaders(),
	});

const getTimeAllocation = () =>
	apiClient.get<AnalysisPayload>({
		url: ANALYSIS_API.timeAllocation,
		headers: getAuthHeaders(),
	});

const getTopClients = () =>
	apiClient.get<AnalysisPayload>({
		url: ANALYSIS_API.topClients,
		headers: getAuthHeaders(),
	});

const getTaskAccuracy = () =>
	apiClient.get<AnalysisPayload>({
		url: ANALYSIS_API.taskAccuracy,
		headers: getAuthHeaders(),
	});

const getInvoiceHealth = () =>
	apiClient.get<AnalysisPayload>({
		url: ANALYSIS_API.invoiceHealth,
		headers: getAuthHeaders(),
	});

const getExport = () =>
	apiClient.get<AnalysisPayload>({
		url: ANALYSIS_API.export,
		headers: getAuthHeaders(),
	});

export default {
	getSummary,
	getWebAnalytics,
	getEarningsTrend,
	getTimeAllocation,
	getTopClients,
	getTaskAccuracy,
	getInvoiceHealth,
	getExport,
};
