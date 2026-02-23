import apiClient from "../apiClient";
import { CLIENT_TRUST_API } from "../endpoints";
import userStore from "@/store/userStore";

type TrustPayload = Record<string, any>;

type TrustRulesPayload = Partial<{
	rule_name: string;
	on_time_weight: string;
	delay_penalty_weight: string;
	overdue_penalty_weight: string;
	severe_overdue_threshold_days: number;
	trusted_min_score: string;
	moderate_min_score: string;
	watch_min_score: string;
	is_active: boolean;
}>;

const getAuthHeaders = () => {
	const { userToken } = userStore.getState();
	const accessToken = userToken?.accessToken;
	return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
};

const getSummary = () =>
	apiClient.get<TrustPayload>({
		url: CLIENT_TRUST_API.summary,
		headers: getAuthHeaders(),
	});

const getClients = () =>
	apiClient.get<TrustPayload>({
		url: CLIENT_TRUST_API.clients,
		headers: getAuthHeaders(),
	});

const getClientHistory = (clientId: string) =>
	apiClient.get<TrustPayload>({
		url: CLIENT_TRUST_API.clientHistory(clientId),
		headers: getAuthHeaders(),
	});

const recalculate = () =>
	apiClient.post<TrustPayload>({
		url: CLIENT_TRUST_API.recalculate,
		headers: { "x-skip-error-toast": true, ...getAuthHeaders() },
	});

const updateRules = (payload: TrustRulesPayload) =>
	apiClient.patch<TrustPayload>({
		url: CLIENT_TRUST_API.rules,
		data: payload,
		headers: { "x-skip-error-toast": true, ...getAuthHeaders() },
	});

const getAlerts = () =>
	apiClient.get<TrustPayload>({
		url: CLIENT_TRUST_API.alerts,
		headers: getAuthHeaders(),
	});

export default {
	getSummary,
	getClients,
	getClientHistory,
	recalculate,
	updateRules,
	getAlerts,
};

export type { TrustRulesPayload };
