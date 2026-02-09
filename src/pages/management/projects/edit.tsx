import { useEffect, useState } from "react";
import { toast } from "sonner";

import projectService from "@/api/services/projectService";
import { useParams, useRouter } from "@/routes/hooks";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader } from "@/ui/card";

import type { Project } from "#/entity";
import ProjectForm from "./project-form";

export default function ProjectEditPage() {
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
				if (active) {
					setProject(data);
				}
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

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>Edit Project</div>
					<Button variant="outline" onClick={() => push("/management/projects")}>
						Back to List
					</Button>
				</div>
			</CardHeader>
			<CardContent>
				{loading ? (
					<div className="py-10 text-sm text-muted-foreground">Loading project...</div>
				) : (
					<ProjectForm
						mode="edit"
						initialValues={project}
						onSave={(payload) => (id ? projectService.updateProject(id, payload) : Promise.resolve())}
						onSuccess={() => push("/management/projects")}
						submitLabel="Save Changes"
					/>
				)}
			</CardContent>
		</Card>
	);
}
