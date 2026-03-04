import { Icon } from "@/components/icon";
import { useSettings } from "@/store/settingStore";
import { Button } from "@/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/ui/dropdown-menu";
import { Input } from "@/ui/input";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { type CSSProperties, useRef, useState } from "react";
import { useEvent } from "react-use";
import { ThemeMode } from "#/enum";
import KanbanTask from "./kanban-task";
import { type Column, type Task, TaskPriority } from "./types";

type Props = {
	id: string;
	index: number;
	column: Column;
	tasks: Task[];
	createTask: (columnId: string, task: Task) => Promise<void> | void;
	clearColumn: (columnId: string) => void;
	deleteColumn: (columnId: string) => void;
	renameColumn: (column: Column) => void;
	deleteTask?: (taskId: string) => void;
	changeTaskStatus?: (taskId: string, status: string) => void;
	isDragging?: boolean;
};

export default function KanbanColumn({
	id,
	column,
	tasks,
	createTask,
	clearColumn,
	deleteColumn,
	renameColumn,
	deleteTask,
	changeTaskStatus,
	isDragging,
}: Props) {
	const { themeMode } = useSettings();
	const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

	const style: CSSProperties = {
		transform: CSS.Transform.toString(transform),
		transition,
		height: "100%",
		padding: "16px",
		borderRadius: "16px",
		backgroundColor: themeMode === ThemeMode.Light ? "rgb(244, 246, 248)" : "rgba(145, 158, 171, 0.12)",
		opacity: isDragging ? 0.5 : 1,
	};

	const [addingTask, setAddingTask] = useState(false);
	const [newTaskTitle, setNewTaskTitle] = useState("");
	const [renamingTask, setRenamingTask] = useState(false);
	const [renameTitle, setRenameTitle] = useState(column.title);
	const renameTaskInputRef = useRef<HTMLInputElement>(null);

	const startRename = () => {
		setRenameTitle(column.title);
		setRenamingTask(true);
		setDropdownOpen(false);
	};

	const submitRename = () => {
		const value = renameTitle.trim();
		if (value && value !== column.title) {
			renameColumn({
				...column,
				title: value,
			});
		}
		setRenamingTask(false);
	};

	const handleCreateTask = async () => {
		const title = newTaskTitle.trim();
		if (!title) return;
		await createTask(column.id, {
			id: "",
			title,
			reporter: "",
			priority: TaskPriority.MEDIUM,
			status: "todo",
		});
		setNewTaskTitle("");
		setAddingTask(false);
	};

	const handleClickOutside = (event: MouseEvent) => {
		if (renameTaskInputRef.current && !renameTaskInputRef.current.contains(event.target as Node)) {
			submitRename();
		}
	};
	useEvent("click", handleClickOutside);

	const [dropdownOpen, setDropdownOpen] = useState(false);
	return (
		<div ref={setNodeRef} style={style}>
			<header
				{...(renamingTask ? {} : attributes)}
				{...(renamingTask ? {} : listeners)}
				className="mb-4 flex select-none items-center justify-between text-base font-semibold"
			>
				{renamingTask ? (
					<Input
						ref={renameTaskInputRef}
						value={renameTitle}
						onChange={(e) => setRenameTitle(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								e.preventDefault();
								submitRename();
							}
							if (e.key === "Escape") {
								setRenamingTask(false);
								setRenameTitle(column.title);
							}
						}}
						autoFocus
					/>
				) : (
					column.title
				)}
				<DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" size="icon" className="text-gray!">
							<Icon icon="dashicons:ellipsis" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem onClick={startRename}>
							<Icon icon="solar:pen-bold" />
							<span className="ml-2">rename</span>
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => clearColumn(column.id)}>
							<Icon icon="solar:eraser-bold" />
							<span className="ml-2">clear</span>
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => deleteColumn(column.id)} className="text-warning">
							<Icon icon="solar:trash-bin-trash-bold" />
							<span className="ml-2">delete</span>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</header>

			<SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
				<div className="min-h-[10px]">
					{tasks.map((task) => (
						<KanbanTask key={task.id} id={task.id} task={task} onDeleteTask={deleteTask} onChangeTaskStatus={changeTaskStatus} />
					))}
				</div>
			</SortableContext>

			<footer className="w-[248px]">
				{addingTask ? (
					<div className="space-y-2">
						<Input
							value={newTaskTitle}
							onChange={(e) => setNewTaskTitle(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									e.preventDefault();
									void handleCreateTask();
								}
								if (e.key === "Escape") {
									setAddingTask(false);
									setNewTaskTitle("");
								}
							}}
							placeholder="Task title"
							autoFocus
						/>
						<div className="flex gap-2">
							<Button className="h-8 flex-1 text-xs" onClick={() => void handleCreateTask()} disabled={!newTaskTitle.trim()}>
								Add
							</Button>
							<Button
								variant="outline"
								className="h-8 flex-1 text-xs"
								onClick={() => {
									setAddingTask(false);
									setNewTaskTitle("");
								}}
							>
								Cancel
							</Button>
						</div>
					</div>
				) : (
					<Button
						onClick={(e) => {
							e.stopPropagation();
							setAddingTask(true);
						}}
						className="flex! items-center justify-center text-xs! font-medium! w-full"
					>
						<Icon icon="carbon:add" size={20} />
						<span>Add Task</span>
					</Button>
				)}
			</footer>
		</div>
	);
}
