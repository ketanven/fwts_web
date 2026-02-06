import { lazy } from "react";
import type { RouteObject } from "react-router";
import AuthRouteGuard from "@/routes/components/auth-route-guard";

const LoginPage = lazy(() => import("@/pages/sys/login"));
const RegisterPage = lazy(() => import("@/pages/sys/register"));
const authCustom: RouteObject[] = [
	{
		path: "login",
		element: <LoginPage />,
	},
	{
		path: "register",
		element: <RegisterPage />,
	},
];

export const authRoutes: RouteObject[] = [
	{
		path: "auth",
		element: <AuthRouteGuard />,
		children: [...authCustom],
	},
];
