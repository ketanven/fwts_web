import { Icon } from "@/components/icon";
import type { NavProps } from "@/components/nav";
import { Badge } from "@/ui/badge";

export const frontendNavData: NavProps["data"] = [
	{
		items: [
			{
				title: "sys.nav.workbench",
				path: "/workbench",
				icon: <Icon icon="local:ic-workbench" size="24" />,
			},
			{
				title: "sys.nav.analysis",
				path: "/analysis",
				icon: <Icon icon="local:ic-analysis" size="24" />,
			},
			{
				title: "sys.nav.management",
				path: "/management",
				icon: <Icon icon="local:ic-management" size="24" />,
				open: true,
				children: [
					{
						title: "sys.nav.client",
						path: "/management/client",
					},
					{
						title: "sys.nav.projects",
						path: "/management/projects",
					},
					{
						title: "sys.nav.tasks",
						path: "/management/tasks",
					},
				],
			},
			{
				title: "sys.nav.operations.index",
				path: "/operations",
				icon: <Icon icon="solar:case-round-minimalistic-bold-duotone" size="24" />,
				open: true,
				children: [
					{
						title: "sys.nav.operations.invoicing",
						path: "/operations/invoicing",
					},
					{
						title: "sys.nav.operations.reporting",
						path: "/operations/reporting",
					},
					{
						title: "sys.nav.operations.invoice_control",
						path: "/operations/invoice-control",
					},
					{
						title: "sys.nav.operations.productivity",
						path: "/operations/productivity",
					},
					{
						title: "sys.nav.operations.client_trust",
						path: "/operations/client-trust",
					},
				],
			},
			{
				title: "sys.nav.calendar",
				path: "/calendar",
				icon: <Icon icon="solar:calendar-bold-duotone" size="24" />,
				info: <Badge variant="warning">+12</Badge>,
			},
			{
				title: "sys.nav.kanban",
				path: "/kanban",
				icon: <Icon icon="solar:clipboard-bold-duotone" size="24" />,
			},
		],
	},
];
