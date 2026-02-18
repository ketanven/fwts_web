import kanbanService from "@/api/services/kanbanService";
import { Icon } from "@/components/icon";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { ScrollArea, ScrollBar } from "@/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import {
	DndContext,
	type DragEndEvent,
	DragOverlay,
	type DragStartEvent,
	PointerSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { useEffect, useRef, useState } from "react";
import { useEvent } from "react-use";
import { toast } from "sonner";
import KanbanColumn from "./kanban-column";
import KanbanTask from "./kanban-task";
import type { Column, DndDataType, Task, TaskPriority } from "./types";

type BoardOption = { id: string; name: string; color?: string };

const defaultState: DndDataType = {
	tasks: {},
	columns: {},
	columnOrder: [],
};

const asRecord = (value: unknown) => (value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, any>) : {});
const firstArrayByKeys = (source: Record<string, any>, keys: string[]): Record<string, any>[] | undefined => {
	for (const key of keys) {
		const value = source[key];
		if (Array.isArray(value)) return value as Record<string, any>[];
	}
	return undefined;
};

const normalizePriority = (value: unknown): TaskPriority => {
	const raw = String(value || "").toLowerCase();
	if (raw === "urgent") return "urgent" as TaskPriority;
	if (raw === "high") return "high" as TaskPriority;
	if (raw === "low") return "low" as TaskPriority;
	return "medium" as TaskPriority;
};

const toKanbanData = (boardDetail: unknown): DndDataType => {
	const detail = asRecord(boardDetail);
	const detailData = asRecord(detail.data);
	const boardData = asRecord(detail.board);
	const columnRows =
		firstArrayByKeys(detail, ["columns", "kanban_columns", "board_columns", "items"]) ||
		firstArrayByKeys(detailData, ["columns", "kanban_columns", "board_columns", "items"]) ||
		firstArrayByKeys(boardData, ["columns", "kanban_columns", "board_columns", "items"]) ||
		[];
	const sortedColumns = [...columnRows].sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0));

	const columns: DndDataType["columns"] = {};
	const tasks: DndDataType["tasks"] = {};
	const columnOrder: string[] = [];

	sortedColumns.forEach((columnRow) => {
		const column = asRecord(columnRow);
		const columnId = String(column.id ?? "");
		if (!columnId) return;
		const cards =
			firstArrayByKeys(column, ["cards", "kanban_cards", "tasks", "items"]) ||
			firstArrayByKeys(asRecord(column.data), ["cards", "kanban_cards", "tasks", "items"]) ||
			[];
		const sortedCards = [...cards].sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0));

		const taskIds: string[] = [];
		sortedCards.forEach((cardRow) => {
			const card = asRecord(cardRow);
			const taskId = String(card.id ?? card.card_id ?? "");
			if (!taskId) return;
			tasks[taskId] = {
				id: taskId,
				title: String(card.title ?? "Untitled"),
				reporter: "",
				priority: normalizePriority(card.priority),
				status: String(card.status ?? "todo"),
				columnId,
				projectId: card.project ? String(card.project) : undefined,
				taskId: card.task ? String(card.task) : undefined,
				date: card.due_date || undefined,
				description: String(card.description ?? ""),
				comments: [],
				attachments: [],
			};
			taskIds.push(taskId);
		});

		columns[columnId] = {
			id: columnId,
			title: String(column.name ?? column.title ?? "Untitled"),
			taskIds,
		};
		columnOrder.push(columnId);
	});

	return { tasks, columns, columnOrder };
};

export default function Kanban() {
	const [state, setState] = useState<DndDataType>(defaultState);
	const [boards, setBoards] = useState<BoardOption[]>([]);
	const [selectedBoardId, setSelectedBoardId] = useState("");
	const [boardNameDraft, setBoardNameDraft] = useState("");
	const [newBoardName, setNewBoardName] = useState("");
	const [activeId, setActiveId] = useState<string | null>(null);
	const [activeType, setActiveType] = useState<"column" | "task" | null>(null);
	const [addingColumn, setAddingColumn] = useState(false);
	const [loading, setLoading] = useState(true);
	const [actionLoading, setActionLoading] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: {
				distance: 8,
			},
		}),
	);

	const loadBoardData = async (boardId: string) => {
		if (!boardId) {
			setState(defaultState);
			return;
		}
		const detail = await kanbanService.getBoard(boardId);
		setState(toKanbanData(detail));
	};

	const loadBoards = async () => {
		setLoading(true);
		try {
			const boardRows = await kanbanService.listBoards();
			const normalized = boardRows
				.map((row) => {
			const board = asRecord(row);
			const id = String(board.id ?? board.uuid ?? board.board_id ?? "");
			if (!id) return null;
			return { id, name: String(board.name ?? board.title ?? "Untitled board"), color: String(board.color ?? "") };
		})
				.filter(Boolean) as BoardOption[];
			setBoards(normalized);
			const nextBoardId = normalized[0]?.id || "";
			setSelectedBoardId(nextBoardId);
			setBoardNameDraft(normalized[0]?.name || "");
			await loadBoardData(nextBoardId);
		} catch (error: any) {
			const message = error?.response?.data?.message || error?.response?.data?.detail || error?.message || "Failed to load boards.";
			toast.error(message);
			setState(defaultState);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		loadBoards();
	}, []);

	const handleBoardChange = async (boardId: string) => {
		setSelectedBoardId(boardId);
		const board = boards.find((item) => item.id === boardId);
		setBoardNameDraft(board?.name || "");
		await loadBoardData(boardId);
	};

	const runAction = async (action: () => Promise<unknown>, successMessage: string, reloadCurrentBoard = true) => {
		try {
			setActionLoading(true);
			await action();
			if (reloadCurrentBoard && selectedBoardId) {
				await loadBoardData(selectedBoardId);
			}
			if (reloadCurrentBoard) {
				const boardRows = await kanbanService.listBoards();
				const normalized = boardRows
					.map((row) => {
				const board = asRecord(row);
				const id = String(board.id ?? board.uuid ?? board.board_id ?? "");
				if (!id) return null;
				return { id, name: String(board.name ?? board.title ?? "Untitled board"), color: String(board.color ?? "") };
			})
					.filter(Boolean) as BoardOption[];
				setBoards(normalized);
			}
			toast.success(successMessage);
		} catch (error: any) {
			const message = error?.response?.data?.message || error?.response?.data?.detail || error?.message || "Action failed.";
			toast.error(message);
		} finally {
			setActionLoading(false);
		}
	};

	const handleCreateBoard = async () => {
		if (!newBoardName.trim()) return;
		await runAction(
			() =>
				kanbanService.createBoard({
					name: newBoardName.trim(),
					description: "",
					color: "#0ea5e9",
					icon: "layout",
					visibility: "private",
					sort_order: boards.length + 1,
					is_archived: false,
				}),
			"Board created.",
			false,
		);
		setNewBoardName("");
		await loadBoards();
	};

	const handleRenameBoard = async () => {
		if (!selectedBoardId || !boardNameDraft.trim()) return;
		await runAction(
			() => kanbanService.updateBoard(selectedBoardId, { name: boardNameDraft.trim() }),
			"Board updated.",
			false,
		);
		await loadBoards();
		await handleBoardChange(selectedBoardId);
	};

	const handleDeleteBoard = async () => {
		if (!selectedBoardId) return;
		await runAction(() => kanbanService.deleteBoard(selectedBoardId), "Board deleted.", false);
		await loadBoards();
	};

	const handleDragStart = (event: DragStartEvent) => {
		const activeValue = String(event.active.id);
		setActiveId(activeValue);
		setActiveType(state.columns[activeValue] ? "column" : "task");
	};

	const persistColumnSort = async (nextOrder: string[]) => {
		await Promise.all(
			nextOrder.map((columnId, index) =>
				kanbanService.updateColumn(columnId, {
					sort_order: index + 1,
				}),
			),
		);
	};

	const handleDragEnd = async (event: DragEndEvent) => {
		const { active, over } = event;
		if (!over) {
			setActiveId(null);
			setActiveType(null);
			return;
		}

		const activeDragId = String(active.id);
		const overDragId = String(over.id);

		if (activeDragId !== overDragId) {
			if (activeType === "column") {
				const oldIndex = state.columnOrder.indexOf(activeDragId);
				const newIndex = state.columnOrder.indexOf(overDragId);
				if (oldIndex >= 0 && newIndex >= 0) {
					const nextOrder = arrayMove(state.columnOrder, oldIndex, newIndex);
					setState((prev) => ({ ...prev, columnOrder: nextOrder }));
					try {
						await persistColumnSort(nextOrder);
					} catch {
						await loadBoardData(selectedBoardId);
					}
				}
			} else {
				const activeColumn = Object.values(state.columns).find((col) => col.taskIds.includes(activeDragId));
				const overColumn = Object.values(state.columns).find((col) => col.taskIds.includes(overDragId) || col.id === overDragId);
				if (activeColumn && overColumn) {
					if (activeColumn.id === overColumn.id) {
						const currentIdx = activeColumn.taskIds.indexOf(activeDragId);
						const overIdx = activeColumn.taskIds.indexOf(overDragId);
						const newTaskIds = arrayMove(activeColumn.taskIds, currentIdx, overIdx);
						setState((prev) => ({
							...prev,
							columns: {
								...prev.columns,
								[activeColumn.id]: {
									...prev.columns[activeColumn.id],
									taskIds: newTaskIds,
								},
							},
						}));
						try {
							await kanbanService.moveCard(activeDragId, { column_id: activeColumn.id, sort_order: overIdx + 1 });
						} catch {
							await loadBoardData(selectedBoardId);
						}
					} else {
						const sourceTaskIds = activeColumn.taskIds.filter((id) => id !== activeDragId);
						const destinationTaskIds = [...overColumn.taskIds];
						const overTaskIndex = overColumn.taskIds.indexOf(overDragId);
						const insertIndex = overTaskIndex >= 0 ? overTaskIndex : destinationTaskIds.length;
						destinationTaskIds.splice(insertIndex, 0, activeDragId);
						setState((prev) => ({
							...prev,
							columns: {
								...prev.columns,
								[activeColumn.id]: { ...prev.columns[activeColumn.id], taskIds: sourceTaskIds },
								[overColumn.id]: { ...prev.columns[overColumn.id], taskIds: destinationTaskIds },
							},
						}));
						try {
							await kanbanService.moveCard(activeDragId, { column_id: overColumn.id, sort_order: insertIndex + 1 });
						} catch {
							await loadBoardData(selectedBoardId);
						}
					}
				}
			}
		}

		setActiveId(null);
		setActiveType(null);
	};

	const createColumn = async (column: Column) => {
		if (!selectedBoardId) return;
		await runAction(
			() =>
				kanbanService.createColumn(selectedBoardId, {
					name: column.title,
					color: "#f59e0b",
					limit_count: 0,
					sort_order: state.columnOrder.length + 1,
					is_done_column: false,
				}),
			"Column created.",
		);
	};

	const createTask = async (columnId: string, task: Task) => {
		await runAction(
			() =>
				kanbanService.createCard(columnId, {
					project: task.projectId || null,
					task: task.taskId || null,
					title: task.title,
					description: task.description || "",
					priority: task.priority,
					due_date: typeof task.date === "string" ? task.date : task.date ? new Date(task.date).toISOString().slice(0, 10) : null,
					estimate_hours: "0.00",
					actual_hours: "0.00",
					status: task.status || "todo",
					sort_order: (state.columns[columnId]?.taskIds.length || 0) + 1,
					is_archived: false,
				}),
			"Card created.",
		);
	};

	const deleteColumn = async (columnId: string) => {
		await runAction(() => kanbanService.deleteColumn(columnId), "Column deleted.", true);
	};

	const clearColumn = async (columnId: string) => {
		const column = state.columns[columnId];
		if (!column) return;
		await runAction(
			() => Promise.all(column.taskIds.map((taskId) => kanbanService.deleteCard(taskId))),
			"Column cleared.",
			true,
		);
	};

	const renameColumn = async (column: Column) => {
		await runAction(
			() =>
				kanbanService.updateColumn(column.id, {
					name: column.title,
				}),
			"Column renamed.",
			true,
		);
	};

	const deleteTask = async (taskId: string) => {
		await runAction(() => kanbanService.deleteCard(taskId), "Card deleted.", true);
	};

	const changeTaskStatus = async (taskId: string, status: string) => {
		setState((prev) => ({
			...prev,
			tasks: {
				...prev.tasks,
				[taskId]: {
					...prev.tasks[taskId],
					status,
				},
			},
		}));
		try {
			await kanbanService.updateCard(taskId, { status });
		} catch {
			await loadBoardData(selectedBoardId);
		}
	};

	const handleClickOutside = async (event: MouseEvent) => {
		if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
			const inputVal = inputRef.current.value;
			if (inputVal.trim()) {
				await createColumn({
					id: "",
					title: inputVal.trim(),
					taskIds: [],
				});
			}
			setAddingColumn(false);
		}
	};
	useEvent("click", handleClickOutside);

	if (loading) {
		return <div className="p-4 text-sm text-muted-foreground">Loading Kanban boards...</div>;
	}

	return (
		<ScrollArea type="hover">
			<div className="mb-4 flex flex-wrap items-center gap-2">
				<Select value={selectedBoardId || undefined} onValueChange={handleBoardChange}>
					<SelectTrigger className="h-9 w-56">
						<SelectValue placeholder="Select board" />
					</SelectTrigger>
					<SelectContent>
						{boards.map((board) => (
							<SelectItem key={board.id} value={board.id}>
								{board.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<Input className="h-9 w-56" value={boardNameDraft} onChange={(e) => setBoardNameDraft(e.target.value)} placeholder="Board name" />
				<Button variant="outline" onClick={handleRenameBoard} disabled={actionLoading || !selectedBoardId}>
					Rename Board
				</Button>
				<Button variant="destructive" onClick={handleDeleteBoard} disabled={actionLoading || !selectedBoardId}>
					Delete Board
				</Button>
				<Input className="h-9 w-56" value={newBoardName} onChange={(e) => setNewBoardName(e.target.value)} placeholder="New board" />
				<Button onClick={handleCreateBoard} disabled={actionLoading || !newBoardName.trim()}>
					Create Board
				</Button>
			</div>

			<div className="flex w-full">
				<DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
					<div className="flex h-full items-start gap-6 p-1">
						<SortableContext items={state.columnOrder} strategy={horizontalListSortingStrategy}>
							{state.columnOrder.map((columnId, index) => {
								const column = state.columns[columnId];
								const tasks = column.taskIds.map((taskId) => state.tasks[taskId]).filter(Boolean);

								return (
									<KanbanColumn
										key={columnId}
										id={columnId}
										index={index}
										column={column}
										tasks={tasks}
										createTask={createTask}
										clearColumn={clearColumn}
										deleteColumn={deleteColumn}
										renameColumn={renameColumn}
										deleteTask={deleteTask}
										changeTaskStatus={changeTaskStatus}
									/>
								);
							})}
						</SortableContext>

						<DragOverlay>
							{activeId && activeType === "column" ? (
								<KanbanColumn
									id={activeId}
									index={state.columnOrder.indexOf(activeId)}
									column={state.columns[activeId]}
									tasks={state.columns[activeId]?.taskIds.map((id) => state.tasks[id]).filter(Boolean) || []}
									createTask={createTask}
									clearColumn={clearColumn}
									deleteColumn={deleteColumn}
									renameColumn={renameColumn}
									deleteTask={deleteTask}
									changeTaskStatus={changeTaskStatus}
									isDragging
								/>
							) : null}
							{activeId && activeType === "task" ? (
								<KanbanTask id={activeId} task={state.tasks[activeId]} onDeleteTask={deleteTask} onChangeTaskStatus={changeTaskStatus} isDragging />
							) : null}
						</DragOverlay>
					</div>
				</DndContext>

				<div className="ml-[1.6rem] mt-[0.25rem] min-w-[280px]">
					{addingColumn ? (
						<Input ref={inputRef} placeholder="Column Name" autoFocus />
					) : (
						<Button
							variant="outline"
							onClick={(e) => {
								e.stopPropagation();
								setAddingColumn(true);
							}}
							className="inline-flex! w-full! items-center justify-center text-xs! font-semibold!"
							disabled={!selectedBoardId || actionLoading}
						>
							<Icon icon="carbon:add" size={20} />
							<div>Add Column</div>
						</Button>
					)}
				</div>
			</div>
			<ScrollBar orientation="horizontal" />
		</ScrollArea>
	);
}
