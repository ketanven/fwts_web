import { useEffect } from "react";
import { useRefreshProfile, useUserToken } from "@/store/userStore";

export default function AuthBootstrap({ children }: { children: React.ReactNode }) {
	const { accessToken } = useUserToken();
	const refreshProfile = useRefreshProfile();

	useEffect(() => {
		refreshProfile();
	}, [accessToken, refreshProfile]);

	return <>{children}</>;
}
