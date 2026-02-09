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
