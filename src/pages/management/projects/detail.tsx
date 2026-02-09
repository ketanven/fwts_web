import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import projectService from "@/api/services/projectService";
import { useParams, useRouter } from "@/routes/hooks";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader } from "@/ui/card";

import type { Project } from "#/entity";

const formatValue = (value?: string | number | null) => {
	if (value === null || value === undefined || value === "") return "-";
	return String(value);
};

const formatDate = (value?: string | null) => {
	if (!value) return "-";
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return value;
	return parsed.toLocaleDateString();
};

export default function ProjectDetailPage() {
	const { id } = useParams();
	const { push } = useRouter();
	const [project, setProject] = useState<Project | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		let active = true;
		const loadProject = async () => {
			if (!id) return;
			setLoading(true);
			try {
				const data = await projectService.getProject(id);
				if (active) setProject(data);
			} catch (error: any) {
				const message = error?.response?.data?.message || error?.response?.data?.detail || error?.message || "Failed to load project.";
				toast.error(message);
			} finally {
				if (active) setLoading(false);
			}
		};
		loadProject();
		return () => {
			active = false;
		};
	}, [id]);

	const metadata = useMemo(() => {
		if (!project?.metadata) return null;
		return JSON.stringify(project.metadata, null, 2);
	}, [project]);

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>Project Details</div>
					<div className="flex gap-2">
						<Button variant="outline" onClick={() => push("/management/projects")}>
							Back to List
						</Button>
						<Button onClick={() => push(`/management/projects/${id}/edit`)}>Edit</Button>
					</div>
				</div>
			</CardHeader>
			<CardContent>
				{loading ? (
					<div className="py-10 text-sm text-muted-foreground">Loading project...</div>
				) : (
					<div className="space-y-6">
						<div className="flex flex-col gap-2">
							<div className="text-lg font-semibold">{project?.name}</div>
							<div className="text-sm text-muted-foreground">{project?.client_name || project?.client}</div>
							<Badge variant={project?.is_active === false ? "error" : "success"} className="w-fit">
								{project?.is_active === false ? "Inactive" : "Active"}
							</Badge>
						</div>

						<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
							<div>
								<div className="text-xs text-muted-foreground">Status</div>
								<div className="text-sm font-medium">{formatValue(project?.status)}</div>
							</div>
							<div>
								<div className="text-xs text-muted-foreground">Priority</div>
								<div className="text-sm font-medium">{formatValue(project?.priority)}</div>
							</div>
							<div>
								<div className="text-xs text-muted-foreground">Billing Type</div>
								<div className="text-sm font-medium">{formatValue(project?.billing_type)}</div>
							</div>
							<div>
								<div className="text-xs text-muted-foreground">Currency</div>
								<div className="text-sm font-medium">{formatValue(project?.currency)}</div>
							</div>
							<div>
								<div className="text-xs text-muted-foreground">Hourly Rate</div>
								<div className="text-sm font-medium">{formatValue(project?.hourly_rate)}</div>
							</div>
							<div>
								<div className="text-xs text-muted-foreground">Fixed Price</div>
								<div className="text-sm font-medium">{formatValue(project?.fixed_price)}</div>
							</div>
							<div>
								<div className="text-xs text-muted-foreground">Estimated Hours</div>
								<div className="text-sm font-medium">{formatValue(project?.estimated_hours)}</div>
							</div>
							<div>
								<div className="text-xs text-muted-foreground">Progress</div>
								<div className="text-sm font-medium">
									{project?.progress_percent !== null && project?.progress_percent !== undefined ? `${project.progress_percent}%` : "-"}
								</div>
							</div>
							<div>
								<div className="text-xs text-muted-foreground">Start Date</div>
								<div className="text-sm font-medium">{formatDate(project?.start_date)}</div>
							</div>
							<div>
								<div className="text-xs text-muted-foreground">Due Date</div>
								<div className="text-sm font-medium">{formatDate(project?.due_date)}</div>
							</div>
						</div>

						<div>
							<div className="text-xs text-muted-foreground">Description</div>
							<div className="text-sm font-medium whitespace-pre-wrap">{formatValue(project?.description)}</div>
						</div>

						<div>
							<div className="text-xs text-muted-foreground">Notes</div>
							<div className="text-sm font-medium whitespace-pre-wrap">{formatValue(project?.notes)}</div>
						</div>

						<div>
							<div className="text-xs text-muted-foreground">Metadata</div>
							{metadata ? (
								<pre className="mt-2 rounded-md bg-muted p-3 text-xs whitespace-pre-wrap">{metadata}</pre>
							) : (
								<div className="text-sm font-medium">-</div>
							)}
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
