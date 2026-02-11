import { Chart, useChart } from "@/components/chart";
import { Icon } from "@/components/icon";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Input } from "@/ui/input";
import { Progress } from "@/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { useEffect, useMemo, useState } from "react";

type Priority = "Low" | "Medium" | "High";
type TimerStatus = "idle" | "running" | "paused" | "break";

type Task = {
	id: string;
	name: string;
	description: string;
	priority: Priority;
	dueDate: string;
	estimateHours: number;
	ratePerHour: number;
	progress: number;
	baseLoggedHours: number;
	tags: string[];
};

type Project = {
	id: string;
	name: string;
	client: string;
	color: string;
	budget: number;
	tasks: Task[];
};

type TrackerState = {
	selectedProjectId: string;
	selectedTaskId: string;
	activeTaskId: string | null;
	status: TimerStatus;
	runningStartedAt: number | null;
	breakStartedAt: number | null;
	elapsedByTask: Record<string, number>;
	breakByTask: Record<string, number>;
	manualByTask: Record<string, number>;
};

const STORAGE_KEY = "freelancer-workbench-timer-v1";

const PROJECTS: Project[] = [
	{
		id: "p-web-redesign",
		name: "Website Redesign",
		client: "Northstar Studio",
		color: "#2563eb",
		budget: 4800,
		tasks: [
			{
				id: "t-web-wireframes",
				name: "Homepage Wireframes",
				description: "Design mobile and desktop wireframes for the landing experience.",
				priority: "High",
				dueDate: "2026-02-18",
				estimateHours: 8,
				ratePerHour: 65,
				progress: 72,
				baseLoggedHours: 3.5,
				tags: ["Design", "UX"],
			},
			{
				id: "t-web-components",
				name: "Component Library Setup",
				description: "Build reusable UI blocks and tokenized variants for speed.",
				priority: "Medium",
				dueDate: "2026-02-20",
				estimateHours: 12,
				ratePerHour: 70,
				progress: 40,
				baseLoggedHours: 2.1,
				tags: ["UI", "System"],
			},
			{
				id: "t-web-qa",
				name: "Cross-browser QA",
				description: "Validate responsive behavior and browser compatibility fixes.",
				priority: "Low",
				dueDate: "2026-02-24",
				estimateHours: 6,
				ratePerHour: 60,
				progress: 15,
				baseLoggedHours: 1.2,
				tags: ["Testing"],
			},
		],
	},
	{
		id: "p-mobile-app",
		name: "Freelancer Mobile App",
		client: "Orbit Labs",
		color: "#10b981",
		budget: 7600,
		tasks: [
			{
				id: "t-mobile-flow",
				name: "Onboarding Flow",
				description: "Finalize onboarding states and error handling screens.",
				priority: "High",
				dueDate: "2026-02-16",
				estimateHours: 10,
				ratePerHour: 80,
				progress: 64,
				baseLoggedHours: 4.8,
				tags: ["Mobile", "Product"],
			},
			{
				id: "t-mobile-payments",
				name: "Payments Integration",
				description: "Wire invoice payment status and receipt generation flow.",
				priority: "High",
				dueDate: "2026-02-22",
				estimateHours: 14,
				ratePerHour: 85,
				progress: 32,
				baseLoggedHours: 3.2,
				tags: ["API", "Billing"],
			},
			{
				id: "t-mobile-polish",
				name: "Animation Polish",
				description: "Polish transitions and improve perceived performance.",
				priority: "Medium",
				dueDate: "2026-02-26",
				estimateHours: 7,
				ratePerHour: 75,
				progress: 22,
				baseLoggedHours: 0.8,
				tags: ["Motion", "UX"],
			},
		],
	},
];

const ALL_TASKS = PROJECTS.flatMap((project) => project.tasks);
const TASK_PROJECT_MAP = ALL_TASKS.reduce<Record<string, string>>((acc, task) => {
	const project = PROJECTS.find((item) => item.tasks.some((projectTask) => projectTask.id === task.id));
	if (project) acc[task.id] = project.id;
	return acc;
}, {});

const DEFAULT_ELAPSED_BY_TASK = ALL_TASKS.reduce<Record<string, number>>((acc, task) => {
	acc[task.id] = task.baseLoggedHours * 60 * 60 * 1000;
	return acc;
}, {});

const defaultState = (): TrackerState => ({
	selectedProjectId: PROJECTS[0].id,
	selectedTaskId: PROJECTS[0].tasks[0].id,
	activeTaskId: null,
	status: "idle",
	runningStartedAt: null,
	breakStartedAt: null,
	elapsedByTask: DEFAULT_ELAPSED_BY_TASK,
	breakByTask: {},
	manualByTask: {},
});

const priorityVariant = (priority: Priority) => {
	if (priority === "High") return "error";
	if (priority === "Medium") return "warning";
	return "info";
};

const formatDuration = (ms: number) => {
	const safeMs = Math.max(0, Math.floor(ms));
	const hours = Math.floor(safeMs / 3600000);
	const minutes = Math.floor((safeMs % 3600000) / 60000);
	const seconds = Math.floor((safeMs % 60000) / 1000);
	return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
};

const formatHours = (ms: number) => `${(ms / 3600000).toFixed(2)}h`;
const formatCurrency = (value: number) => `$${value.toLocaleString()}`;

const getTaskById = (taskId: string | null) => ALL_TASKS.find((task) => task.id === taskId);

const flushRunning = (state: TrackerState, now: number) => {
	if (state.activeTaskId && state.status === "running" && state.runningStartedAt) {
		const delta = now - state.runningStartedAt;
		state.elapsedByTask[state.activeTaskId] = (state.elapsedByTask[state.activeTaskId] || 0) + Math.max(0, delta);
		state.runningStartedAt = null;
	}
};

const flushBreak = (state: TrackerState, now: number) => {
	if (state.activeTaskId && state.status === "break" && state.breakStartedAt) {
		const delta = now - state.breakStartedAt;
		state.breakByTask[state.activeTaskId] = (state.breakByTask[state.activeTaskId] || 0) + Math.max(0, delta);
		state.breakStartedAt = null;
	}
};

const loadStoredState = (): TrackerState => {
	if (typeof window === "undefined") return defaultState();
	try {
		const raw = window.localStorage.getItem(STORAGE_KEY);
		if (!raw) return defaultState();
		const parsed = JSON.parse(raw) as Partial<TrackerState>;
		const initial = defaultState();
		const selectedProjectId = PROJECTS.some((project) => project.id === parsed.selectedProjectId)
			? (parsed.selectedProjectId as string)
			: initial.selectedProjectId;
		const selectedProject = PROJECTS.find((project) => project.id === selectedProjectId) || PROJECTS[0];
		const selectedTaskId = selectedProject.tasks.some((task) => task.id === parsed.selectedTaskId)
			? (parsed.selectedTaskId as string)
			: selectedProject.tasks[0].id;
		const activeTaskValid = parsed.activeTaskId && ALL_TASKS.some((task) => task.id === parsed.activeTaskId);
		const status: TimerStatus = parsed.status && ["idle", "running", "paused", "break"].includes(parsed.status) ? parsed.status : "idle";
		return {
			selectedProjectId,
			selectedTaskId,
			activeTaskId: activeTaskValid ? parsed.activeTaskId || null : null,
			status: activeTaskValid ? status : "idle",
			runningStartedAt: activeTaskValid ? parsed.runningStartedAt || null : null,
			breakStartedAt: activeTaskValid ? parsed.breakStartedAt || null : null,
			elapsedByTask: { ...initial.elapsedByTask, ...(parsed.elapsedByTask || {}) },
			breakByTask: parsed.breakByTask || {},
			manualByTask: parsed.manualByTask || {},
		};
	} catch {
		return defaultState();
	}
};

export default function Workbench() {
	const [tracker, setTracker] = useState<TrackerState>(() => loadStoredState());
	const [manualHours, setManualHours] = useState("0");
	const [manualMinutes, setManualMinutes] = useState("0");
	const [now, setNow] = useState(Date.now());

	const selectedProject = useMemo(
		() => PROJECTS.find((project) => project.id === tracker.selectedProjectId) || PROJECTS[0],
		[tracker.selectedProjectId],
	);
	const selectedTask = useMemo(() => getTaskById(tracker.selectedTaskId) || selectedProject.tasks[0], [selectedProject.tasks, tracker.selectedTaskId]);
	const activeTask = useMemo(() => getTaskById(tracker.activeTaskId), [tracker.activeTaskId]);

	const getLiveElapsed = (taskId: string) => {
		const base = tracker.elapsedByTask[taskId] || 0;
		if (tracker.activeTaskId === taskId && tracker.status === "running" && tracker.runningStartedAt) {
			return base + (now - tracker.runningStartedAt);
		}
		return base;
	};

	const getLiveBreak = (taskId: string) => {
		const base = tracker.breakByTask[taskId] || 0;
		if (tracker.activeTaskId === taskId && tracker.status === "break" && tracker.breakStartedAt) {
			return base + (now - tracker.breakStartedAt);
		}
		return base;
	};

	const handleProjectChange = (projectId: string) => {
		const project = PROJECTS.find((item) => item.id === projectId);
		if (!project) return;
		setTracker((prev) => ({
			...prev,
			selectedProjectId: projectId,
			selectedTaskId: project.tasks[0]?.id || prev.selectedTaskId,
		}));
	};

	const handleStartTask = (taskId: string) => {
		const nextProjectId = TASK_PROJECT_MAP[taskId];
		const startAt = Date.now();
		setTracker((prev) => {
			const next: TrackerState = {
				...prev,
				elapsedByTask: { ...prev.elapsedByTask },
				breakByTask: { ...prev.breakByTask },
			};

			if (next.activeTaskId && next.activeTaskId !== taskId) {
				flushRunning(next, startAt);
				flushBreak(next, startAt);
				next.status = "idle";
			}

			if (next.activeTaskId === taskId && next.status === "running") {
				return {
					...next,
					selectedProjectId: nextProjectId || next.selectedProjectId,
					selectedTaskId: taskId,
				};
			}

			if (next.activeTaskId === taskId && next.status === "break") {
				flushBreak(next, startAt);
			}

			next.activeTaskId = taskId;
			next.status = "running";
			next.runningStartedAt = startAt;
			next.breakStartedAt = null;
			next.selectedProjectId = nextProjectId || next.selectedProjectId;
			next.selectedTaskId = taskId;
			return next;
		});
	};

	const handlePause = () => {
		const pauseAt = Date.now();
		setTracker((prev) => {
			const next: TrackerState = {
				...prev,
				elapsedByTask: { ...prev.elapsedByTask },
				breakByTask: { ...prev.breakByTask },
			};
			if (!next.activeTaskId) return prev;
			if (next.status === "running") flushRunning(next, pauseAt);
			if (next.status === "break") flushBreak(next, pauseAt);
			next.status = "paused";
			next.runningStartedAt = null;
			next.breakStartedAt = null;
			return next;
		});
	};

	const handleBreak = () => {
		const breakAt = Date.now();
		setTracker((prev) => {
			const next: TrackerState = {
				...prev,
				elapsedByTask: { ...prev.elapsedByTask },
				breakByTask: { ...prev.breakByTask },
			};
			if (!next.activeTaskId || next.status === "idle" || next.status === "break") return prev;
			if (next.status === "running") flushRunning(next, breakAt);
			next.status = "break";
			next.runningStartedAt = null;
			next.breakStartedAt = breakAt;
			return next;
		});
	};

	const handleResume = () => {
		const resumeAt = Date.now();
		setTracker((prev) => {
			const next: TrackerState = {
				...prev,
				elapsedByTask: { ...prev.elapsedByTask },
				breakByTask: { ...prev.breakByTask },
			};
			if (!next.activeTaskId || next.status === "idle" || next.status === "running") return prev;
			if (next.status === "break") flushBreak(next, resumeAt);
			next.status = "running";
			next.runningStartedAt = resumeAt;
			next.breakStartedAt = null;
			return next;
		});
	};

	const handleStop = () => {
		const stopAt = Date.now();
		setTracker((prev) => {
			const next: TrackerState = {
				...prev,
				elapsedByTask: { ...prev.elapsedByTask },
				breakByTask: { ...prev.breakByTask },
			};
			if (!next.activeTaskId) return prev;
			if (next.status === "running") flushRunning(next, stopAt);
			if (next.status === "break") flushBreak(next, stopAt);
			next.status = "idle";
			next.runningStartedAt = null;
			next.breakStartedAt = null;
			next.activeTaskId = null;
			return next;
		});
	};

	const handleAddManualTime = () => {
		const hours = Number.parseInt(manualHours, 10) || 0;
		const minutes = Number.parseInt(manualMinutes, 10) || 0;
		const totalMinutes = Math.max(0, hours * 60 + minutes);
		if (totalMinutes <= 0) return;
		const totalMs = totalMinutes * 60000;
		setTracker((prev) => ({
			...prev,
			elapsedByTask: {
				...prev.elapsedByTask,
				[prev.selectedTaskId]: (prev.elapsedByTask[prev.selectedTaskId] || 0) + totalMs,
			},
			manualByTask: {
				...prev.manualByTask,
				[prev.selectedTaskId]: (prev.manualByTask[prev.selectedTaskId] || 0) + totalMs,
			},
		}));
		setManualHours("0");
		setManualMinutes("0");
	};

	useEffect(() => {
		const intervalId = window.setInterval(() => setNow(Date.now()), 1000);
		return () => window.clearInterval(intervalId);
	}, []);

	useEffect(() => {
		window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tracker));
	}, [tracker]);

	const projectTasks = selectedProject.tasks;
	const projectHours = projectTasks.reduce((sum, task) => sum + getLiveElapsed(task.id), 0);
	const projectBillable = projectTasks.reduce((sum, task) => sum + (getLiveElapsed(task.id) / 3600000) * task.ratePerHour, 0);
	const projectCompletion = projectTasks.reduce((sum, task) => sum + task.progress, 0) / projectTasks.length;
	const activeTimerMs = activeTask ? getLiveElapsed(activeTask.id) : 0;
	const activeBreakMs = activeTask ? getLiveBreak(activeTask.id) : 0;
	const billableThisTask = activeTask ? (getLiveElapsed(activeTask.id) / 3600000) * activeTask.ratePerHour : 0;
	const utilizationRate = Math.min(100, (projectHours / (projectTasks.reduce((sum, task) => sum + task.estimateHours, 0) * 3600000)) * 100);

	const taskHoursSeries = projectTasks.map((task) => Number((getLiveElapsed(task.id) / 3600000).toFixed(2)));
	const weeklyTrend = [3.4, 4.1, 5.2, 3.8, 4.9, 5.6, Number((projectHours / 3600000 / 4).toFixed(2))];

	const taskChartOptions = useChart({
		chart: { toolbar: { show: false } },
		dataLabels: { enabled: false },
		xaxis: { categories: projectTasks.map((task) => task.name.split(" ").slice(0, 2).join(" ")) },
		colors: [selectedProject.color],
		plotOptions: { bar: { borderRadius: 6, columnWidth: "48%" } },
	});

	const trendOptions = useChart({
		chart: { toolbar: { show: false } },
		stroke: { curve: "smooth", width: 3 },
		dataLabels: { enabled: false },
		xaxis: { categories: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] },
		colors: ["#f59e0b"],
		grid: { borderColor: "rgba(148, 163, 184, 0.2)" },
	});

	const statusBadgeVariant = tracker.status === "running" ? "success" : tracker.status === "break" ? "warning" : tracker.status === "paused" ? "info" : "secondary";

	return (
		<div className="w-full space-y-4">
			<Card className="overflow-hidden border-0 shadow-md">
				<CardContent className="relative p-0">
					<div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-blue-900 to-cyan-700 opacity-95" />
					<div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-cyan-400/30 blur-3xl" />
					<div className="absolute -left-16 -bottom-24 h-72 w-72 rounded-full bg-indigo-300/20 blur-3xl" />
					<div className="relative grid gap-4 p-6 text-white lg:grid-cols-3">
						<div className="lg:col-span-2 space-y-3">
							<Badge variant="warning">Intelligent Time Tracking</Badge>
							<h2 className="text-2xl font-semibold leading-tight">Track one task at a time, pause cleanly, keep everything safe offline.</h2>
							<p className="text-sm text-white/80">
								Start, pause, break, stop, and add manual entries. Timer state is saved to local storage so ongoing work time survives refreshes and
								internet drops.
							</p>
							<div className="flex flex-wrap items-center gap-3 text-sm">
								<div className="flex items-center gap-2 rounded-md bg-white/10 px-3 py-2">
									<Icon icon="solar:clock-circle-bold-duotone" />
									<span>Single active task enforced</span>
								</div>
								<div className="flex items-center gap-2 rounded-md bg-white/10 px-3 py-2">
									<Icon icon="solar:cloud-check-bold-duotone" />
									<span>Offline-safe local session memory</span>
								</div>
							</div>
						</div>
						<div className="rounded-xl bg-black/20 p-4 backdrop-blur-sm">
							<div className="text-xs uppercase tracking-wide text-white/70">Current Active Timer</div>
							<div className="mt-2 text-4xl font-bold tabular-nums">{formatDuration(activeTimerMs)}</div>
							<div className="mt-2 flex items-center gap-2">
								<Badge variant={statusBadgeVariant}>{tracker.status.toUpperCase()}</Badge>
								{activeTask ? <span className="text-sm text-white/80">{activeTask.name}</span> : <span className="text-sm text-white/80">No task running</span>}
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			<div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
				<Card className="xl:col-span-2">
					<CardHeader className="pb-0">
						<CardTitle>Timer Controls</CardTitle>
						<CardDescription>Select project and task, then control your billable timer.</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="grid gap-3 md:grid-cols-2">
							<div className="space-y-2">
								<div className="text-xs font-medium text-muted-foreground">Project</div>
								<Select value={selectedProject.id} onValueChange={handleProjectChange}>
									<SelectTrigger className="w-full">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{PROJECTS.map((project) => (
											<SelectItem key={project.id} value={project.id}>
												{project.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-2">
								<div className="text-xs font-medium text-muted-foreground">Task</div>
								<Select value={selectedTask.id} onValueChange={(taskId) => setTracker((prev) => ({ ...prev, selectedTaskId: taskId }))}>
									<SelectTrigger className="w-full">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{projectTasks.map((task) => (
											<SelectItem key={task.id} value={task.id}>
												{task.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>

						<div className="grid gap-3 md:grid-cols-5">
							<Button
								onClick={() =>
									tracker.activeTaskId === selectedTask.id && (tracker.status === "paused" || tracker.status === "break")
										? handleResume()
										: handleStartTask(selectedTask.id)
								}
								className="md:col-span-2"
							>
								<Icon icon="solar:play-bold-duotone" />
								{tracker.status === "paused" || tracker.status === "break" ? "Resume Task" : "Start Task"}
							</Button>
							<Button variant="outline" onClick={handlePause} disabled={!tracker.activeTaskId || tracker.status === "paused" || tracker.status === "idle"}>
								<Icon icon="solar:pause-bold-duotone" />
								Pause
							</Button>
							<Button variant="secondary" onClick={handleBreak} disabled={!tracker.activeTaskId || tracker.status === "break" || tracker.status === "idle"}>
								<Icon icon="solar:cup-hot-bold-duotone" />
								Break
							</Button>
							<Button variant="destructive" onClick={handleStop} disabled={!tracker.activeTaskId}>
								<Icon icon="solar:stop-bold-duotone" />
								Stop
							</Button>
						</div>

						<div className="grid gap-3 rounded-lg border p-4 lg:grid-cols-4">
							<div className="lg:col-span-2">
								<div className="text-xs text-muted-foreground">Selected Task Running Time</div>
								<div className="text-3xl font-semibold tabular-nums">{formatDuration(getLiveElapsed(selectedTask.id))}</div>
							</div>
							<div>
								<div className="text-xs text-muted-foreground">Break Time</div>
								<div className="text-xl font-semibold tabular-nums">{formatDuration(getLiveBreak(selectedTask.id))}</div>
							</div>
							<div>
								<div className="text-xs text-muted-foreground">Billable</div>
								<div className="text-xl font-semibold">{formatCurrency(Math.round((getLiveElapsed(selectedTask.id) / 3600000) * selectedTask.ratePerHour))}</div>
							</div>
						</div>

						<div className="rounded-lg border p-4">
							<div className="mb-3 flex items-center justify-between">
								<div>
									<div className="text-sm font-semibold">Manual Time Entry</div>
									<div className="text-xs text-muted-foreground">Use when you worked offline or forgot to start the timer.</div>
								</div>
								<Badge variant="outline">No API yet</Badge>
							</div>
							<div className="grid gap-2 sm:grid-cols-4">
								<Input type="number" min={0} value={manualHours} onChange={(e) => setManualHours(e.target.value)} placeholder="Hours" />
								<Input type="number" min={0} max={59} value={manualMinutes} onChange={(e) => setManualMinutes(e.target.value)} placeholder="Minutes" />
								<Button onClick={handleAddManualTime} className="sm:col-span-2">
									<Icon icon="solar:add-circle-bold-duotone" />
									Add Manual Time
								</Button>
							</div>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="pb-0">
						<CardTitle>Task In Focus</CardTitle>
						<CardDescription>Detailed context for the task currently selected.</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="rounded-lg border p-4">
							<div className="flex items-start justify-between gap-3">
								<div>
									<div className="font-semibold">{selectedTask.name}</div>
									<div className="text-xs text-muted-foreground">{selectedTask.description}</div>
								</div>
								<Badge variant={priorityVariant(selectedTask.priority)}>{selectedTask.priority}</Badge>
							</div>
							<div className="mt-3 space-y-2 text-sm">
								<div className="flex items-center justify-between">
									<span className="text-muted-foreground">Due date</span>
									<span>{selectedTask.dueDate}</span>
								</div>
								<div className="flex items-center justify-between">
									<span className="text-muted-foreground">Estimate</span>
									<span>{selectedTask.estimateHours}h</span>
								</div>
								<div className="flex items-center justify-between">
									<span className="text-muted-foreground">Hourly rate</span>
									<span>{formatCurrency(selectedTask.ratePerHour)}</span>
								</div>
								<div className="flex items-center justify-between">
									<span className="text-muted-foreground">Manual entries</span>
									<span>{formatHours(tracker.manualByTask[selectedTask.id] || 0)}</span>
								</div>
							</div>
							<div className="mt-3 flex flex-wrap gap-2">
								{selectedTask.tags.map((tag) => (
									<Badge key={tag} variant="outline">
										{tag}
									</Badge>
								))}
							</div>
						</div>
						<div className="rounded-lg border p-4">
							<div className="mb-2 flex items-center justify-between">
								<div className="text-sm font-semibold">Active Session Stats</div>
								<Badge variant="success">{tracker.activeTaskId ? "Live" : "Idle"}</Badge>
							</div>
							<div className="space-y-2 text-sm">
								<div className="flex items-center justify-between">
									<span className="text-muted-foreground">Tracked</span>
									<span>{formatHours(activeTimerMs)}</span>
								</div>
								<div className="flex items-center justify-between">
									<span className="text-muted-foreground">Break</span>
									<span>{formatHours(activeBreakMs)}</span>
								</div>
								<div className="flex items-center justify-between">
									<span className="text-muted-foreground">Billable value</span>
									<span>{formatCurrency(Math.round(billableThisTask))}</span>
								</div>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>

			<div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
				<Card className="xl:col-span-2">
					<CardHeader className="pb-0">
						<CardTitle>Project Task Board</CardTitle>
						<CardDescription>Start any task below. Starting a new one will stop the currently active task automatically.</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3">
						{projectTasks.map((task) => {
							const taskElapsed = getLiveElapsed(task.id);
							const isActive = tracker.activeTaskId === task.id && tracker.status !== "idle";
							return (
								<div key={task.id} className="rounded-lg border p-4">
									<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
										<div className="space-y-1">
											<div className="flex items-center gap-2">
												<div className="font-semibold">{task.name}</div>
												<Badge variant={priorityVariant(task.priority)}>{task.priority}</Badge>
												{isActive ? <Badge variant="success">Active</Badge> : null}
											</div>
											<div className="text-xs text-muted-foreground">{task.description}</div>
										</div>
										<div className="flex items-center gap-2">
											<Button size="sm" onClick={() => handleStartTask(task.id)}>
												<Icon icon="solar:play-bold-duotone" />
												{isActive ? "Running" : "Start"}
											</Button>
											<div className="rounded-md border px-3 py-1 text-sm tabular-nums">{formatDuration(taskElapsed)}</div>
										</div>
									</div>
									<div className="mt-3 space-y-1">
										<div className="flex items-center justify-between text-xs text-muted-foreground">
											<span>Progress</span>
											<span>{task.progress}%</span>
										</div>
										<Progress value={task.progress} />
									</div>
								</div>
							);
						})}
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="pb-0">
						<CardTitle>Freelancer Overview</CardTitle>
						<CardDescription>Track workload, budget health, and billable utilization.</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3">
						<div className="rounded-lg border p-4">
							<div className="text-xs text-muted-foreground">Current project</div>
							<div className="font-semibold">{selectedProject.name}</div>
							<div className="text-xs text-muted-foreground">{selectedProject.client}</div>
						</div>
						<div className="grid grid-cols-2 gap-2">
							<div className="rounded-lg border p-3">
								<div className="text-xs text-muted-foreground">Tracked</div>
								<div className="font-semibold">{formatHours(projectHours)}</div>
							</div>
							<div className="rounded-lg border p-3">
								<div className="text-xs text-muted-foreground">Billable</div>
								<div className="font-semibold">{formatCurrency(Math.round(projectBillable))}</div>
							</div>
							<div className="rounded-lg border p-3">
								<div className="text-xs text-muted-foreground">Utilization</div>
								<div className="font-semibold">{utilizationRate.toFixed(0)}%</div>
							</div>
							<div className="rounded-lg border p-3">
								<div className="text-xs text-muted-foreground">Budget</div>
								<div className="font-semibold">{formatCurrency(selectedProject.budget)}</div>
							</div>
						</div>
						<div>
							<div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
								<span>Completion</span>
								<span>{projectCompletion.toFixed(0)}%</span>
							</div>
							<Progress value={projectCompletion} />
						</div>
					</CardContent>
				</Card>
			</div>

			<div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
				<Card>
					<CardHeader className="pb-0">
						<CardTitle>Logged Hours By Task</CardTitle>
						<CardDescription>Quick comparison across tasks in the selected project.</CardDescription>
					</CardHeader>
					<CardContent>
						<Chart type="bar" height={280} options={taskChartOptions} series={[{ name: "Hours", data: taskHoursSeries }]} />
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="pb-0">
						<CardTitle>Weekly Focus Trend</CardTitle>
						<CardDescription>Demo trend data until backend tracking is wired.</CardDescription>
					</CardHeader>
					<CardContent>
						<Chart type="area" height={280} options={trendOptions} series={[{ name: "Focus Hours", data: weeklyTrend }]} />
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
