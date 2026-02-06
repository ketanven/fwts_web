import { useMutation } from "@tanstack/react-query";
import { useCallback } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import userService, { type SignInReq } from "@/api/services/userService";

import type { UserInfo, UserToken } from "#/entity";
import { StorageEnum } from "#/enum";

type UserStore = {
	userInfo: Partial<UserInfo>;
	userToken: UserToken;

	actions: {
		setUserInfo: (userInfo: UserInfo) => void;
		setUserToken: (token: UserToken) => void;
		clearUserInfoAndToken: () => void;
	};
};

const useUserStore = create<UserStore>()(
	persist(
		(set) => ({
			userInfo: {},
			userToken: {},
			actions: {
				setUserInfo: (userInfo) => {
					set({ userInfo });
				},
				setUserToken: (userToken) => {
					set({ userToken });
				},
				clearUserInfoAndToken() {
					set({ userInfo: {}, userToken: {} });
				},
			},
		}),
		{
			name: "userStore", // name of the item in the storage (must be unique)
			storage: createJSONStorage(() => sessionStorage),
			partialize: (state) => ({
				[StorageEnum.UserInfo]: state.userInfo,
				[StorageEnum.UserToken]: state.userToken,
			}),
		},
	),
);

export const useUserInfo = () => useUserStore((state) => state.userInfo);
export const useUserToken = () => useUserStore((state) => state.userToken);
export const useUserPermissions = () => useUserStore((state) => state.userInfo.permissions || []);
export const useUserRoles = () => useUserStore((state) => state.userInfo.roles || []);
export const useUserActions = () => useUserStore((state) => state.actions);

export const useRefreshProfile = () => {
	const { setUserInfo } = useUserActions();

	const refreshProfile = useCallback(async () => {
		try {
			const user = await userService.profile();
			setUserInfo(user);
		} catch (err) {
			// Ignore profile failures for unauthenticated users
		}
	}, [setUserInfo]);

	return refreshProfile;
};

export const useSignIn = () => {
	const { setUserToken, setUserInfo } = useUserActions();
	const refreshProfile = useRefreshProfile();

	const signInMutation = useMutation({
		mutationFn: userService.signin,
	});

	const signIn = async (data: SignInReq) => {
		try {
			const res = await signInMutation.mutateAsync(data);
			const accessToken = res.accessToken ?? res.access ?? res.token;
			const refreshToken = res.refreshToken ?? res.refresh;
			if (accessToken || refreshToken) {
				setUserToken({ accessToken, refreshToken });
			}
			if (res.user) {
				setUserInfo(res.user);
			}
			await refreshProfile();
		} catch (err) {
			throw err;
		}
	};

	return signIn;
};

export const useSignUp = () => {
	const { setUserToken, setUserInfo } = useUserActions();
	const refreshProfile = useRefreshProfile();

	const signUpMutation = useMutation({
		mutationFn: userService.signup,
	});

	const signUp = async (data: Parameters<typeof userService.signup>[0]) => {
		try {
			const res = await signUpMutation.mutateAsync(data);
			const accessToken = res.accessToken ?? res.access ?? res.token;
			const refreshToken = res.refreshToken ?? res.refresh;
			if (accessToken || refreshToken) {
				setUserToken({ accessToken, refreshToken });
			}
			if (res.user) {
				setUserInfo(res.user);
			}
			await refreshProfile();
		} catch (err) {
			throw err;
		}
	};

	return signUp;
};

export default useUserStore;
