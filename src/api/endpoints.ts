export const USER_API = {
	register: "/register/",
	login: "/login/",
	profile: "/profile/",
	changePassword: "/change-password/",
	forgotPassword: "/forgot-password/",
	resetPassword: "/reset-password/",
	logout: "/logout/",
	refresh: "/refresh/",
};

export const CLIENT_API = {
	list: "/clients/",
	detail: (clientId: string) => `/clients/${clientId}/`,
};

export const PROJECT_API = {
	list: "/projects/",
	detail: (projectId: string) => `/projects/${projectId}/`,
};

export const TASK_API = {
	list: "/tasks/",
	detail: (taskId: string) => `/tasks/${taskId}/`,
};

export const WORKBENCH_API = {
	overview: "/workbench/overview/",
	projects: "/workbench/projects/",
	projectTasks: (projectId: string) => `/workbench/projects/${projectId}/tasks/`,
	activeTimer: "/workbench/timer/active/",
	timerStart: "/workbench/timer/start/",
	timerPause: "/workbench/timer/pause/",
	timerResume: "/workbench/timer/resume/",
	timerBreakStart: "/workbench/timer/break/start/",
	timerBreakStop: "/workbench/timer/break/stop/",
	timerStop: "/workbench/timer/stop/",
	manualTimeEntry: "/workbench/time-entries/manual/",
	timeEntries: "/workbench/time-entries/",
	timeEntryDetail: (entryId: number) => `/workbench/time-entries/${entryId}/`,
	timeEntriesSync: "/workbench/time-entries/sync/",
};

export const ANALYSIS_API = {
	summary: "/analysis/summary/",
	webAnalytics: "/analysis/web-analytics/",
	earningsTrend: "/analysis/earnings-trend/",
	timeAllocation: "/analysis/time-allocation/",
	topClients: "/analysis/top-clients/",
	taskAccuracy: "/analysis/task-accuracy/",
	invoiceHealth: "/analysis/invoice-health/",
	export: "/analysis/export/",
};

export const INVOICE_API = {
	stats: "/invoices/stats/",
	fromTimeEntries: "/invoices/from-time-entries/",
	generate: "/invoices/generate/",
	list: "/invoices/",
	detail: (invoiceId: string) => `/invoices/${invoiceId}/`,
	submit: (invoiceId: string) => `/invoices/${invoiceId}/submit/`,
	send: (invoiceId: string) => `/invoices/${invoiceId}/send/`,
	reminder: (invoiceId: string) => `/invoices/${invoiceId}/reminder/`,
	markPaid: (invoiceId: string) => `/invoices/${invoiceId}/mark-paid/`,
	payments: (invoiceId: string) => `/invoices/${invoiceId}/payments/`,
	pdf: (invoiceId: string) => `/invoices/${invoiceId}/pdf/`,
	versions: (invoiceId: string) => `/invoices/${invoiceId}/versions/`,
	versionDetail: (invoiceId: string, versionId: string | number) => `/invoices/${invoiceId}/versions/${versionId}/`,
	versionRestore: (invoiceId: string, versionId: string | number) => `/invoices/${invoiceId}/versions/${versionId}/restore/`,
	numberingConfig: "/invoice-numbering/config/",
	numberingNext: "/invoice-numbering/next/",
};

export const CALENDAR_API = {
	events: "/calendar/events/",
	eventDetail: (eventId: string | number) => `/calendar/events/${eventId}/`,
	feedTasks: "/calendar/feeds/tasks/",
	feedInvoices: "/calendar/feeds/invoices/",
};

export const KANBAN_API = {
	boards: "/kanban/boards/",
	boardDetail: (boardId: string | number) => `/kanban/boards/${boardId}/`,
	boardColumns: (boardId: string | number) => `/kanban/boards/${boardId}/columns/`,
	columnDetail: (columnId: string | number) => `/kanban/columns/${columnId}/`,
	columnCards: (columnId: string | number) => `/kanban/columns/${columnId}/cards/`,
	cardDetail: (cardId: string | number) => `/kanban/cards/${cardId}/`,
	cardMove: (cardId: string | number) => `/kanban/cards/${cardId}/move/`,
};

export const REPORTS_API = {
	earnings: "/reports/earnings/",
	timeAllocation: "/reports/time-allocation/",
	projectPerformance: "/reports/project-performance/",
	clientAnalytics: "/reports/client-analytics/",
	monthly: "/reports/monthly/",
	export: "/reports/export/",
};

export const PRODUCTIVITY_API = {
	summary: "/productivity/summary/",
	weeklyTrend: "/productivity/weekly-trend/",
	taskVariance: "/productivity/task-variance/",
	onTimeRate: "/productivity/on-time-rate/",
	utilization: "/productivity/utilization/",
	rules: "/productivity/rules/",
};

export const CLIENT_TRUST_API = {
	summary: "/client-trust/summary/",
	clients: "/client-trust/clients/",
	clientHistory: (clientId: string) => `/client-trust/clients/${clientId}/history/`,
	recalculate: "/client-trust/recalculate/",
	rules: "/client-trust/rules/",
	alerts: "/client-trust/alerts/",
};
