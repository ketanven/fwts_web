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

		const isWrapped =
			typeof res.data === "object" &&
			res.data !== null &&
			"status" in res.data &&
			"data" in res.data;

		if (!isWrapped) {
			return res.data;
		}

		const { status, data, message } = res.data as Result<any>;
		if (status === ResultStatus.SUCCESS) {
			return data;
		}
		throw new Error(message || t("sys.api.apiRequestFailed"));
	},
	(error: AxiosError<Result | any>) => {
		const { response, message } = error || {};
		const shouldSkipToast = (error.config?.headers as Record<string, any>)?.["x-skip-error-toast"];
		const errMsg = response?.data?.message || message || t("sys.api.errorMessage");
		if (!shouldSkipToast) {
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
	delete<T = unknown>(config: AxiosRequestConfig): Promise<T> {
		return this.request<T>({ ...config, method: "DELETE" });
	}
	request<T = unknown>(config: AxiosRequestConfig): Promise<T> {
		return axiosInstance.request<any, T>(config);
	}
}

export default new APIClient();
