import apiClient from "../apiClient";
import { PRODUCTIVITY_API } from "../endpoints";
import userStore from "@/store/userStore";

type ProductivityPayload = Record<string, any>;

type ProductivityRulesPayload = Partial<{
	rule_name: string;
	weight_on_time: string;
	weight_estimate_accuracy: string;
	weight_utilization: string;
	target_utilization_percent: string;
	overrun_penalty_factor: string;
	is_active: boolean;
}>;

const getAuthHeaders = () => {
	const { userToken } = userStore.getState();
	const accessToken = userToken?.accessToken;
	return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
};

const getSummary = () =>
	apiClient.get<ProductivityPayload>({
		url: PRODUCTIVITY_API.summary,
		headers: getAuthHeaders(),
	});

const getWeeklyTrend = () =>
	apiClient.get<ProductivityPayload>({
		url: PRODUCTIVITY_API.weeklyTrend,
		headers: getAuthHeaders(),
	});

const getTaskVariance = () =>
	apiClient.get<ProductivityPayload>({
		url: PRODUCTIVITY_API.taskVariance,
		headers: getAuthHeaders(),
	});

const getOnTimeRate = () =>
	apiClient.get<ProductivityPayload>({
		url: PRODUCTIVITY_API.onTimeRate,
		headers: getAuthHeaders(),
	});

const getUtilization = () =>
	apiClient.get<ProductivityPayload>({
		url: PRODUCTIVITY_API.utilization,
		headers: getAuthHeaders(),
	});

const updateRules = (payload: ProductivityRulesPayload) =>
	apiClient.patch<ProductivityPayload>({
		url: PRODUCTIVITY_API.rules,
		data: payload,
		headers: { "x-skip-error-toast": true, ...getAuthHeaders() },
	});

export default {
	getSummary,
	getWeeklyTrend,
	getTaskVariance,
	getOnTimeRate,
	getUtilization,
	updateRules,
};

export type { ProductivityRulesPayload };
