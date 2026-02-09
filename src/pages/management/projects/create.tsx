import projectService from "@/api/services/projectService";
import { useRouter } from "@/routes/hooks";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader } from "@/ui/card";

import ProjectForm from "./project-form";

export default function ProjectCreatePage() {
	const { push } = useRouter();

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>Create Project</div>
					<Button variant="outline" onClick={() => push("/management/projects")}>
						Back to List
					</Button>
				</div>
			</CardHeader>
			<CardContent>
				<ProjectForm
					mode="create"
					onSave={(payload) => projectService.createProject(payload)}
					onSuccess={() => push("/management/projects")}
					submitLabel="Create Project"
				/>
			</CardContent>
		</Card>
	);
}
