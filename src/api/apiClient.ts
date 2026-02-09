import { GLOBAL_CONFIG } from "@/global-config";
import { t } from "@/locales/i18n";
import userStore from "@/store/userStore";
import axios, { type AxiosRequestConfig, type AxiosError, type AxiosResponse } from "axios";
import { toast } from "sonner";
import type { Result } from "#/api";
import { ResultStatus } from "#/enum";

const axiosInstance = axios.create({
	baseURL: GLOBAL_CONFIG.apiBaseUrl,
	timeout: 50000,
	headers: { "Content-Type": "application/json;charset=utf-8" },
});

axiosInstance.interceptors.request.use(
	(config) => {
		const { userToken } = userStore.getState();
		const accessToken = userToken?.accessToken;
		config.headers = config.headers ?? {};
		if (accessToken) {
			config.headers.Authorization = `Bearer ${accessToken}`;
		} else {
			delete config.headers.Authorization;
		}
		return config;
	},
	(error) => Promise.reject(error),
);

axiosInstance.interceptors.response.use(
	(res: AxiosResponse<Result<any> | any>) => {
		if (!res.data) throw new Error(t("sys.api.apiRequestFailed"));

		// Support both legacy { status, data, message } and raw REST responses
		if (typeof res.data === "object" && res.data !== null && "status" in res.data) {
			const { status, data, message } = res.data as Result<any>;
			if (status === ResultStatus.SUCCESS || (status >= 200 && status < 300)) {
				return data;
			}
			throw new Error(message || t("sys.api.apiRequestFailed"));
		}

		return res.data;
	},
	(error: AxiosError<Result | any>) => {
		const { response, message, config } = error || {};
		const errMsg = response?.data?.message || message || t("sys.api.errorMessage");
		
		// Check if this request should skip error toast
		const skipErrorToast = (config as any)?.skipErrorToast || (config?.headers as Record<string, any>)?.["x-skip-error-toast"];
		
		if (!skipErrorToast && response?.status !== 400) {
			toast.error(errMsg, { position: "top-center" });
		}
		
		if (response?.status === 401) {
			userStore.getState().actions.clearUserInfoAndToken();
		}
		return Promise.reject(error);
	},
);

class APIClient {
	get<T = unknown>(config: AxiosRequestConfig): Promise<T> {
		return this.request<T>({ ...config, method: "GET" });
	}
	post<T = unknown>(config: AxiosRequestConfig): Promise<T> {
		return this.request<T>({ ...config, method: "POST" });
	}
	put<T = unknown>(config: AxiosRequestConfig): Promise<T> {
		return this.request<T>({ ...config, method: "PUT" });
	}
	patch<T = unknown>(config: AxiosRequestConfig): Promise<T> {
		return this.request<T>({ ...config, method: "PATCH" });
	}
	delete<T = unknown>(config: AxiosRequestConfig): Promise<T> {
		return this.request<T>({ ...config, method: "DELETE" });
	}
	request<T = unknown>(config: AxiosRequestConfig): Promise<T> {
		return axiosInstance.request<any, T>(config);
	}
}

export default new APIClient();
