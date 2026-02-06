import { GLOBAL_CONFIG } from "@/global-config";
import { useUserToken } from "@/store/userStore";
import { Navigate } from "react-router";

export default function RootRedirect() {
	const { accessToken } = useUserToken();

	if (accessToken) {
		return <Navigate to={GLOBAL_CONFIG.defaultRoute} replace />;
	}

	return <Navigate to="/auth/register" replace />;
}
