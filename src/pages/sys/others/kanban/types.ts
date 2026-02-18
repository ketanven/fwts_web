export enum TaskPriority {
	LOW = "low",
	MEDIUM = "medium",
	HIGH = "high",
	URGENT = "urgent",
}

export enum TaskTag {
	frontend = "FrontEnd",
	backend = "BackEnd",
	fullstack = "FullStack",
	DevOps = "DevOps",
	AI = "AI",
	DBA = "DBA",
	UI = "UI",
	UE = "UE",
	QA = "QA",
}

export type TaskComment = {
	username: string;
	avatar: string;
	content: string;
	time: Date;
};

export type Task = {
	id: string;
	title: string;
	reporter: string; // avatar
	priority: TaskPriority;
	status?: string;
	columnId?: string;
	projectId?: string;
	taskId?: string;
	assignee?: string[]; // avatar array
	tags?: string[];
	date?: Date | string;
	description?: string;
	comments?: TaskComment[];
	attachments?: string[];
};
export type Tasks = Record<string, Task>;

export type Column = {
	id: string;
	title: string;
	taskIds: string[];
};
export type Columns = Record<string, Column>;

export type DndDataType = {
	tasks: Tasks;
	columns: Columns;
	columnOrder: string[];
};
