import { GLOBAL_CONFIG } from "@/global-config";
import { useUserToken } from "@/store/userStore";
import { Navigate, Outlet } from "react-router";
import { Suspense } from "react";

export default function AuthRouteGuard() {
	const { accessToken } = useUserToken();

	if (accessToken) {
		return <Navigate to={GLOBAL_CONFIG.defaultRoute} replace />;
	}

	return (
		<Suspense>
			<Outlet />
		</Suspense>
	);
}
