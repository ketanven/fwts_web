import type { RouteObject } from "react-router";
import { Navigate } from "react-router";
import { Component } from "./utils";

export function getFrontendDashboardRoutes(): RouteObject[] {
	const frontendDashboardRoutes: RouteObject[] = [
		{ path: "workbench", element: Component("/pages/dashboard/workbench") },
		{ path: "analysis", element: Component("/pages/dashboard/analysis") },
		{
			path: "components",
			children: [
				{ index: true, element: <Navigate to="animate" replace /> },
				{ path: "animate", element: Component("/pages/components/animate") },
				{ path: "scroll", element: Component("/pages/components/scroll") },
				{ path: "icon", element: Component("/pages/components/icon") },
				{ path: "upload", element: Component("/pages/components/upload") },
				{ path: "chart", element: Component("/pages/components/chart") },
				{ path: "toast", element: Component("/pages/components/toast") },
			],
		},
		{
			path: "management",
			children: [
				{ index: true, element: <Navigate to="user" replace /> },
				{
					path: "client",
					children: [
						{ index: true, element: Component("/pages/management/client") },
						{ path: "new", element: Component("/pages/management/client/create") },
						{ path: ":id", element: Component("/pages/management/client/detail") },
						{ path: ":id/edit", element: Component("/pages/management/client/edit") },
					],
				},
				{
					path: "projects",
					children: [
						{ index: true, element: Component("/pages/management/projects") },
						{ path: "new", element: Component("/pages/management/projects/create") },
						{ path: ":id", element: Component("/pages/management/projects/detail") },
						{ path: ":id/edit", element: Component("/pages/management/projects/edit") },
					],
				},
				{
					path: "user",
					children: [
						{ index: true, element: <Navigate to="profile" replace /> },
						{ path: "profile", element: Component("/pages/management/user/profile") },
						{ path: "account", element: Component("/pages/management/user/account") },
					],
				},
				{
					path: "system",
					children: [
						{ index: true, element: <Navigate to="permission" replace /> },
						{ path: "permission", element: Component("/pages/management/system/permission") },
						{ path: "role", element: Component("/pages/management/system/role") },
						{ path: "user", element: Component("/pages/management/system/user") },
						{ path: "user/:id", element: Component("/pages/management/system/user/detail") },
					],
				},
			],
		},
		{
			path: "error",
			children: [
				{ index: true, element: <Navigate to="403" replace /> },
				{ path: "403", element: Component("/pages/sys/error/Page403") },
				{ path: "404", element: Component("/pages/sys/error/Page404") },
				{ path: "500", element: Component("/pages/sys/error/Page500") },
			],
		},
		{ path: "calendar", element: Component("/pages/sys/others/calendar") },
		{ path: "kanban", element: Component("/pages/sys/others/kanban") },
	];
	return frontendDashboardRoutes;
}
