import apiClient from "../apiClient";
import { USER_API } from "../endpoints";

import type { UserInfo, UserToken } from "#/entity";

export interface SignInReq {
	email: string;
	password: string;
}

export interface SignUpReq {
	first_name: string;
	last_name: string;
	email: string;
	password: string;
}
export type SignInRes = Partial<UserToken> & { user?: UserInfo } & Record<string, any>;

export const UserApi = {
	SignIn: USER_API.login,
	SignUp: USER_API.register,
	Logout: USER_API.logout,
	Refresh: USER_API.refresh,
	Profile: USER_API.profile,
	ChangePassword: USER_API.changePassword,
	ForgotPassword: USER_API.forgotPassword,
	ResetPassword: USER_API.resetPassword,
} as const;

const signin = (data: SignInReq) =>
	apiClient.post<SignInRes>({
		url: UserApi.SignIn,
		data,
		skipErrorToast: true,
	} as any);
const signup = (data: SignUpReq) => apiClient.post<SignInRes>({ url: UserApi.SignUp, data });
const logout = () => apiClient.get({ url: UserApi.Logout });
const profile = () => apiClient.get<UserInfo>({ url: UserApi.Profile, skipErrorToast: true } as any);

export default {
	signin,
	signup,
	profile,
	logout,
};
