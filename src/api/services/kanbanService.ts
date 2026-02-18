import apiClient from "../apiClient";
import { KANBAN_API } from "../endpoints";
import userStore from "@/store/userStore";

type PaginatedResponse<T> = {
	count: number;
	next: string | null;
	previous: string | null;
	results: T[];
};

type BoardPayload = Partial<{
	name: string;
	description: string;
	color: string;
	icon: string;
	visibility: string;
	sort_order: number;
	is_archived: boolean;
}>;

type ColumnPayload = Partial<{
	name: string;
	color: string;
	limit_count: number;
	sort_order: number;
	is_done_column: boolean;
}>;

type CardPayload = Partial<{
	project: string | null;
	task: string | null;
	title: string;
	description: string;
	priority: string;
	due_date: string | null;
	estimate_hours: string;
	actual_hours: string;
	status: string;
	sort_order: number;
	is_archived: boolean;
}>;

type CardMovePayload = {
	column_id: string | number;
	sort_order?: number;
};

const getAuthHeaders = () => {
	const { userToken } = userStore.getState();
	const accessToken = userToken?.accessToken;
	return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
};

const unwrapList = <T>(data: T[] | PaginatedResponse<T> | { data?: T[] } | undefined): T[] => {
	if (Array.isArray(data)) return data;
	if (data && typeof data === "object" && "results" in data && Array.isArray(data.results)) return data.results;
	if (data && typeof data === "object" && "data" in data && Array.isArray(data.data)) return data.data;
	if (data && typeof data === "object" && "items" in data && Array.isArray((data as any).items)) return (data as any).items;
	if (data && typeof data === "object" && "boards" in data && Array.isArray((data as any).boards)) return (data as any).boards;
	if (data && typeof data === "object" && "columns" in data && Array.isArray((data as any).columns)) return (data as any).columns;
	if (data && typeof data === "object" && "cards" in data && Array.isArray((data as any).cards)) return (data as any).cards;
	return [];
};

const listBoards = async () => {
	const data = await apiClient.get<any[] | PaginatedResponse<any> | { data?: any[] }>({
		url: KANBAN_API.boards,
		headers: getAuthHeaders(),
	});
	return unwrapList(data);
};

const createBoard = (payload: BoardPayload) =>
	apiClient.post<Record<string, any>>({
		url: KANBAN_API.boards,
		data: payload,
		headers: { "x-skip-error-toast": true, ...getAuthHeaders() },
	});

const getBoard = (boardId: string | number) =>
	apiClient.get<Record<string, any>>({
		url: KANBAN_API.boardDetail(boardId),
		headers: getAuthHeaders(),
	});

const updateBoard = (boardId: string | number, payload: BoardPayload) =>
	apiClient.patch<Record<string, any>>({
		url: KANBAN_API.boardDetail(boardId),
		data: payload,
		headers: { "x-skip-error-toast": true, ...getAuthHeaders() },
	});

const deleteBoard = (boardId: string | number) =>
	apiClient.delete<void>({
		url: KANBAN_API.boardDetail(boardId),
		headers: { "x-skip-error-toast": true, ...getAuthHeaders() },
	});

const createColumn = (boardId: string | number, payload: ColumnPayload) =>
	apiClient.post<Record<string, any>>({
		url: KANBAN_API.boardColumns(boardId),
		data: payload,
		headers: { "x-skip-error-toast": true, ...getAuthHeaders() },
	});

const updateColumn = (columnId: string | number, payload: ColumnPayload) =>
	apiClient.patch<Record<string, any>>({
		url: KANBAN_API.columnDetail(columnId),
		data: payload,
		headers: { "x-skip-error-toast": true, ...getAuthHeaders() },
	});

const deleteColumn = (columnId: string | number) =>
	apiClient.delete<void>({
		url: KANBAN_API.columnDetail(columnId),
		headers: { "x-skip-error-toast": true, ...getAuthHeaders() },
	});

const createCard = (columnId: string | number, payload: CardPayload) =>
	apiClient.post<Record<string, any>>({
		url: KANBAN_API.columnCards(columnId),
		data: payload,
		headers: { "x-skip-error-toast": true, ...getAuthHeaders() },
	});

const updateCard = (cardId: string | number, payload: CardPayload) =>
	apiClient.patch<Record<string, any>>({
		url: KANBAN_API.cardDetail(cardId),
		data: payload,
		headers: { "x-skip-error-toast": true, ...getAuthHeaders() },
	});

const deleteCard = (cardId: string | number) =>
	apiClient.delete<void>({
		url: KANBAN_API.cardDetail(cardId),
		headers: { "x-skip-error-toast": true, ...getAuthHeaders() },
	});

const moveCard = (cardId: string | number, payload: CardMovePayload) =>
	apiClient.post<Record<string, any>>({
		url: KANBAN_API.cardMove(cardId),
		data: payload,
		headers: { "x-skip-error-toast": true, ...getAuthHeaders() },
	});

export default {
	listBoards,
	createBoard,
	getBoard,
	updateBoard,
	deleteBoard,
	createColumn,
	updateColumn,
	deleteColumn,
	createCard,
	updateCard,
	deleteCard,
	moveCard,
};

export type { BoardPayload, CardMovePayload, CardPayload, ColumnPayload };
