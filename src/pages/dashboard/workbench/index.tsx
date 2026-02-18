import workbenchService, { type WorkbenchActiveTimer, type WorkbenchTimeEntry } from "@/api/services/workbenchService";
import { Chart, useChart } from "@/components/chart";
import { Icon } from "@/components/icon";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Input } from "@/ui/input";
import { Progress } from "@/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import type { Project, Task } from "#/entity";

type TimerStatus = "idle" | "running" | "paused" | "break";
type OverviewData = Record<string, unknown>;
const ACTIVE_TIMER_STORAGE_KEY = "workbench-active-timer-v1";

const formatDuration = (seconds: number) => {
	const safe = Math.max(0, Math.floor(seconds));
	const hours = Math.floor(safe / 3600);
	const minutes = Math.floor((safe % 3600) / 60);
	const secs = Math.floor(safe % 60);
	return [hours, minutes, secs].map((value) => String(value).padStart(2, "0")).join(":");
};

const formatHours = (seconds: number) => `${(seconds / 3600).toFixed(2)}h`;

const formatCurrency = (value: number, currency = "USD") => {
	if (!Number.isFinite(value)) return "-";
	try {
		return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase(), maximumFractionDigits: 2 }).format(value);
	} catch {
		return `$${value.toFixed(2)}`;
	}
};

const dateInput = (date: Date) => date.toISOString().slice(0, 10);

const daysAgo = (days: number) => {
	const now = new Date();
	now.setDate(now.getDate() - days);
	return dateInput(now);
};

const toNumber = (value: unknown, fallback = 0) => {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeId = (value: unknown) => String(value ?? "").trim();

const getProjectId = (project: Project) => {
	const withFallback = project as Project & { project_id?: string | number };
	return normalizeId(withFallback.id || withFallback.project_id);
};

const getProjectName = (project: Project) => {
	const withFallback = project as Project & { project_name?: string };
	return project.name || withFallback.project_name || "Untitled project";
};

const getTaskName = (task: Task) => task.title || (task as unknown as { name?: string }).name || "Untitled task";
const getTaskId = (task: Task) => {
	const withFallback = task as Task & { task_id?: string | number };
	return normalizeId(withFallback.id || withFallback.task_id);
};

const getProjectClientLabel = (project?: Project | null) => {
	if (!project) return "-";
	return project.client_name || project.client || "-";
};

const getActiveProjectId = (timer: WorkbenchActiveTimer | null) => {
	if (!timer) return "";
	const withFallback = timer as WorkbenchActiveTimer & { projectId?: string | number; project_obj?: { id?: string | number } };
	return normalizeId(withFallback.project_id || withFallback.project || withFallback.projectId || withFallback.project_obj?.id);
};

const getActiveTaskId = (timer: WorkbenchActiveTimer | null) => {
	if (!timer) return "";
	const withFallback = timer as WorkbenchActiveTimer & { taskId?: string | number; task_obj?: { id?: string | number } };
	return normalizeId(withFallback.task_id || withFallback.task || withFallback.taskId || withFallback.task_obj?.id);
};

const normalizeTimerStatus = (timer: WorkbenchActiveTimer | null): TimerStatus => {
	if (!timer) return "idle";
	const raw = String(timer.status || "").toLowerCase();
	if (raw.includes("break")) return "break";
	if (raw.includes("pause")) return "paused";
	if (raw.includes("run")) return "running";
	if (timer.break_started_at) return "break";
	if (timer.is_active === true) return "running";
	if (timer.is_active === false) return "idle";
	if (getActiveTaskId(timer)) return "running";
	return "idle";
};

const priorityVariant = (priority?: string) => {
	const value = String(priority || "").toLowerCase();
	if (value === "high") return "error" as const;
	if (value === "medium") return "warning" as const;
	if (value === "low") return "info" as const;
	return "secondary" as const;
};

const loadCachedActiveTimer = (): { timer: WorkbenchActiveTimer | null; fetchedAt: number } | null => {
	if (typeof window === "undefined") return null;
	try {
		const raw = window.localStorage.getItem(ACTIVE_TIMER_STORAGE_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as { timer?: WorkbenchActiveTimer | null; fetchedAt?: number };
		const fetchedAt = Number(parsed?.fetchedAt);
		if (!Number.isFinite(fetchedAt)) return null;
		return { timer: parsed?.timer || null, fetchedAt };
	} catch {
		return null;
	}
};

const getElapsedSecondsBase = (timer: WorkbenchActiveTimer | null, fetchedAt: number) => {
	const explicitElapsed = Number(timer?.elapsed_seconds);
	if (Number.isFinite(explicitElapsed)) return Math.max(0, explicitElapsed);
	const startedAt = timer?.started_at ? new Date(timer.started_at).getTime() : Number.NaN;
	if (!Number.isFinite(startedAt)) return 0;
	return Math.max(0, Math.floor((fetchedAt - startedAt) / 1000));
};

const getBreakSecondsBase = (timer: WorkbenchActiveTimer | null, fetchedAt: number) => {
	const explicitBreak = Number(timer?.break_seconds);
	if (Number.isFinite(explicitBreak)) return Math.max(0, explicitBreak);
	const breakStartedAt = timer?.break_started_at ? new Date(timer.break_started_at).getTime() : Number.NaN;
	if (!Number.isFinite(breakStartedAt)) return 0;
	return Math.max(0, Math.floor((fetchedAt - breakStartedAt) / 1000));
};

export default function Workbench() {
	const [overview, setOverview] = useState<OverviewData>({});
	const [projects, setProjects] = useState<Project[]>([]);
	const [tasksByProject, setTasksByProject] = useState<Record<string, Task[]>>({});
	const [selectedProjectId, setSelectedProjectId] = useState("");
	const [selectedTaskId, setSelectedTaskId] = useState("");
	const [activeTimer, setActiveTimer] = useState<WorkbenchActiveTimer | null>(() => loadCachedActiveTimer()?.timer || null);
	const [activeFetchedAt, setActiveFetchedAt] = useState<number>(() => loadCachedActiveTimer()?.fetchedAt || Date.now());
	const [timeEntries, setTimeEntries] = useState<WorkbenchTimeEntry[]>([]);
	const [entryNoteDrafts, setEntryNoteDrafts] = useState<Record<number, string>>({});
	const [loading, setLoading] = useState(true);
	const [tasksLoading, setTasksLoading] = useState(false);
	const [actionLoading, setActionLoading] = useState(false);
	const [syncLoading, setSyncLoading] = useState(false);
	const [manualHours, setManualHours] = useState("0");
	const [manualMinutes, setManualMinutes] = useState("0");
	const [manualNote, setManualNote] = useState("");
	const [stopNote, setStopNote] = useState("");
	const [breakReason, setBreakReason] = useState("");
	const [now, setNow] = useState(Date.now());
	const tasksByProjectRef = useRef<Record<string, Task[]>>({});

	const selectableProjects = useMemo(() => {
		return projects.filter((project) => Boolean(getProjectId(project)));
	}, [projects]);

	const selectedProject = useMemo(() => selectableProjects.find((project) => getProjectId(project) === selectedProjectId) || null, [selectableProjects, selectedProjectId]);
	const projectTasks = useMemo(() => tasksByProject[selectedProjectId] || [], [tasksByProject, selectedProjectId]);
	const selectedTask = useMemo(() => projectTasks.find((task) => getTaskId(task) === selectedTaskId) || null, [projectTasks, selectedTaskId]);
	const selectedProjectValue = useMemo(
		() => (selectableProjects.some((project) => getProjectId(project) === selectedProjectId) ? selectedProjectId : undefined),
		[selectableProjects, selectedProjectId],
	);
	const selectedTaskValue = useMemo(
		() => (projectTasks.some((task) => getTaskId(task) === selectedTaskId) ? selectedTaskId : undefined),
		[projectTasks, selectedTaskId],
	);
	const taskById = useMemo(() => {
		const map: Record<string, Task> = {};
		Object.values(tasksByProject)
			.flat()
			.forEach((task) => {
				map[getTaskId(task)] = task;
			});
		return map;
	}, [tasksByProject]);
	const timerStatus = useMemo(() => normalizeTimerStatus(activeTimer), [activeTimer]);

	const loadTimeEntries = useCallback(async () => {
		const entries = await workbenchService.listTimeEntries({ date_from: daysAgo(14), date_to: dateInput(new Date()) });
		setTimeEntries(entries);
		setEntryNoteDrafts((prev) => {
			const next = { ...prev };
			entries.forEach((entry) => {
				if (next[entry.id] === undefined) {
					next[entry.id] = entry.note || "";
				}
			});
			return next;
		});
	}, []);

	const loadTasksForProject = useCallback(async (projectId: string, force = false) => {
		if (!projectId) return [] as Task[];
		if (!force && tasksByProjectRef.current[projectId]) return tasksByProjectRef.current[projectId];
		setTasksLoading(true);
		try {
			const tasks = await workbenchService.listProjectTasks(projectId);
			setTasksByProject((prev) => {
				const next = { ...prev, [projectId]: tasks };
				tasksByProjectRef.current = next;
				return next;
			});
			return tasks;
		} finally {
			setTasksLoading(false);
		}
	}, []);

	const refreshOverview = useCallback(async () => {
		const data = await workbenchService.getOverview();
		setOverview(data || {});
	}, []);

	const refreshActiveTimer = useCallback(async () => {
		const active = await workbenchService.getActiveTimer();
		if (active) {
			setActiveTimer(active);
			setActiveFetchedAt(Date.now());
			return active;
		}
		if (normalizeTimerStatus(activeTimer) === "idle") {
			setActiveTimer(null);
		}
		return active || null;
	}, [activeTimer]);

	const reloadAll = useCallback(async () => {
		setLoading(true);
		try {
			const [overviewData, fetchedProjects, active] = await Promise.all([
				workbenchService.getOverview(),
				workbenchService.listProjects(),
				workbenchService.getActiveTimer(),
			]);

			setOverview(overviewData || {});
			setProjects(fetchedProjects || []);
			const effectiveActive = active || (normalizeTimerStatus(activeTimer) !== "idle" ? activeTimer : null);
			setActiveTimer(effectiveActive);
			if (active) {
				setActiveFetchedAt(Date.now());
			}

			let nextProjectId = getActiveProjectId(effectiveActive);
			if (!nextProjectId) {
				nextProjectId = getProjectId((fetchedProjects || [])[0] as Project);
			}

			setSelectedProjectId(nextProjectId);
			if (nextProjectId) {
				const tasks = await loadTasksForProject(nextProjectId, true);
				const activeTaskId = getActiveTaskId(effectiveActive);
				const hasTask = tasks.some((task) => getTaskId(task) === activeTaskId);
				setSelectedTaskId(hasTask ? activeTaskId : getTaskId((tasks || [])[0] as Task));
			}

			await loadTimeEntries();
		} catch {
			setOverview({});
			setProjects([]);
			setTimeEntries([]);
		} finally {
			setLoading(false);
		}
	}, [activeTimer, loadTasksForProject, loadTimeEntries]);

	useEffect(() => {
		reloadAll();
	}, []);

	useEffect(() => {
		if (!selectedProjectId) return;
		if (tasksByProjectRef.current[selectedProjectId]) return;
		loadTasksForProject(selectedProjectId).then((tasks) => {
			if (!selectedTaskId) {
				setSelectedTaskId(getTaskId((tasks || [])[0] as Task));
			}
		});
	}, [loadTasksForProject, selectedProjectId, selectedTaskId]);

	useEffect(() => {
		const activeProjectId = getActiveProjectId(activeTimer);
		const activeTaskId = getActiveTaskId(activeTimer);
		if (activeProjectId && activeProjectId !== selectedProjectId) {
			setSelectedProjectId(activeProjectId);
			loadTasksForProject(activeProjectId);
		}
		if (activeTaskId) setSelectedTaskId(activeTaskId);
	}, [activeTimer, loadTasksForProject, selectedProjectId]);

	useEffect(() => {
		const intervalId = window.setInterval(() => setNow(Date.now()), 1000);
		return () => window.clearInterval(intervalId);
	}, []);

	useEffect(() => {
		if (typeof window === "undefined") return;
		if (!activeTimer || normalizeTimerStatus(activeTimer) === "idle") {
			window.localStorage.removeItem(ACTIVE_TIMER_STORAGE_KEY);
			return;
		}
		window.localStorage.setItem(
			ACTIVE_TIMER_STORAGE_KEY,
			JSON.stringify({
				timer: activeTimer,
				fetchedAt: activeFetchedAt,
			}),
		);
	}, [activeFetchedAt, activeTimer]);

	const runAction = async (action: () => Promise<unknown>, successMessage: string) => {
		try {
			setActionLoading(true);
			await action();
			await Promise.all([refreshOverview(), refreshActiveTimer(), loadTimeEntries()]);
			toast.success(successMessage);
		} catch (error: any) {
			const message = error?.response?.data?.message || error?.response?.data?.detail || error?.message || "Request failed.";
			toast.error(message);
		} finally {
			setActionLoading(false);
		}
	};

	const handleProjectChange = async (projectId: string) => {
		const normalizedProjectId = normalizeId(projectId);
		setSelectedProjectId(normalizedProjectId);
		setSelectedTaskId("");
		const tasks = await loadTasksForProject(normalizedProjectId);
		setSelectedTaskId(getTaskId((tasks || [])[0] as Task));
	};

	const handleStartTask = async (taskId: string) => {
		if (!selectedProjectId || !taskId) return;
		await runAction(
			() =>
				workbenchService.startTimer({
					project_id: selectedProjectId,
					task_id: taskId,
					started_from: "web",
					offline_mode: false,
					local_session_uuid: `web-${Date.now()}`,
				}),
			"Timer started.",
		);
	};

	const handlePause = async () => {
		await runAction(() => workbenchService.pauseTimer(), "Timer paused.");
	};

	const handleBreakStart = async () => {
		await runAction(() => workbenchService.startBreak({ reason: breakReason || undefined }), "Break started.");
	};

	const handleResume = async () => {
		if (timerStatus === "break") {
			await runAction(() => workbenchService.stopBreak(), "Break stopped.");
			return;
		}
		await runAction(() => workbenchService.resumeTimer(), "Timer resumed.");
	};

	const handleStop = async () => {
		await runAction(() => workbenchService.stopTimer({ note: stopNote || undefined }), "Timer stopped.");
		setStopNote("");
	};

	const handleAddManualTime = async () => {
		if (!selectedProjectId || !selectedTaskId) return;
		const hours = Number.parseInt(manualHours, 10) || 0;
		const minutes = Number.parseInt(manualMinutes, 10) || 0;
		const totalMinutes = Math.max(0, hours * 60 + minutes);
		if (totalMinutes <= 0) return;

		const durationSeconds = totalMinutes * 60;
		const endTime = new Date();
		const startTime = new Date(endTime.getTime() - durationSeconds * 1000);

		await runAction(
			() =>
				workbenchService.createManualEntry({
					project: selectedProjectId,
					task: selectedTaskId,
					entry_date: dateInput(endTime),
					start_time: startTime.toISOString(),
					end_time: endTime.toISOString(),
					duration_seconds: durationSeconds,
					is_manual: true,
					source: "manual",
					note: manualNote || "Manual time entry",
					is_billable: true,
					local_entry_uuid: `manual-${Date.now()}`,
					sync_status: "synced",
				}),
			"Manual entry added.",
		);

		setManualHours("0");
		setManualMinutes("0");
		setManualNote("");
	};

	const handleUpdateEntry = async (entry: WorkbenchTimeEntry) => {
		const note = entryNoteDrafts[entry.id] ?? "";
		try {
			setActionLoading(true);
			await workbenchService.updateTimeEntry(entry.id, { note });
			await loadTimeEntries();
			toast.success("Time entry updated.");
		} catch (error: any) {
			const message = error?.response?.data?.message || error?.response?.data?.detail || error?.message || "Update failed.";
			toast.error(message);
		} finally {
			setActionLoading(false);
		}
	};

	const handleDeleteEntry = async (entryId: number) => {
		try {
			setActionLoading(true);
			await workbenchService.deleteTimeEntry(entryId);
			await Promise.all([loadTimeEntries(), refreshOverview()]);
			toast.success("Time entry deleted.");
		} catch (error: any) {
			const message = error?.response?.data?.message || error?.response?.data?.detail || error?.message || "Delete failed.";
			toast.error(message);
		} finally {
			setActionLoading(false);
		}
	};

	const handleSyncEntries = async () => {
		const unsynced = timeEntries.filter((entry) => entry.sync_status !== "synced");
		if (unsynced.length === 0) {
			toast.info("No unsynced entries to sync.");
			return;
		}

		try {
			setSyncLoading(true);
			await workbenchService.syncTimeEntries({
				batch_uuid: `batch-${Date.now()}`,
				entries: unsynced.map((entry) => ({
					project: entry.project,
					task: entry.task,
					entry_date: entry.entry_date,
					start_time: entry.start_time || undefined,
					end_time: entry.end_time || undefined,
					duration_seconds: entry.duration_seconds,
					is_manual: entry.is_manual,
					source: entry.source,
					note: entry.note || undefined,
					is_billable: entry.is_billable,
					hourly_rate_snapshot: entry.hourly_rate_snapshot || undefined,
					amount_snapshot: entry.amount_snapshot || undefined,
					local_entry_uuid: entry.local_entry_uuid || `offline-${entry.id}`,
					sync_status: "synced",
				})),
			});
			await loadTimeEntries();
			toast.success("Entries synced.");
		} catch (error: any) {
			const message = error?.response?.data?.message || error?.response?.data?.detail || error?.message || "Sync failed.";
			toast.error(message);
		} finally {
			setSyncLoading(false);
		}
	};

	const activeTaskId = getActiveTaskId(activeTimer);
	const activeTask = activeTaskId ? taskById[activeTaskId] : null;
	const elapsedBase = getElapsedSecondsBase(activeTimer, activeFetchedAt);
	const breakBase = getBreakSecondsBase(activeTimer, activeFetchedAt);
	const liveDelta = Math.floor((now - activeFetchedAt) / 1000);
	const activeTimerSeconds = timerStatus === "running" ? elapsedBase + Math.max(0, liveDelta) : elapsedBase;
	const activeBreakSeconds = timerStatus === "break" ? breakBase + Math.max(0, liveDelta) : breakBase;

	const entryDurationByTask = useMemo(() => {
		return timeEntries.reduce<Record<string, number>>((acc, entry) => {
			const key = entry.task;
			acc[key] = (acc[key] || 0) + toNumber(entry.duration_seconds, 0);
			return acc;
		}, {});
	}, [timeEntries]);

	const projectHoursSeconds = projectTasks.reduce((sum, task) => {
		const taskId = getTaskId(task);
		const tracked = entryDurationByTask[taskId] || 0;
		const active = activeTaskId === taskId ? activeTimerSeconds : 0;
		return sum + tracked + active;
	}, 0);

	const projectBillable = projectTasks.reduce((sum, task) => {
		const taskId = getTaskId(task);
		const trackedHours = ((entryDurationByTask[taskId] || 0) + (activeTaskId === taskId ? activeTimerSeconds : 0)) / 3600;
		const rate = toNumber(task.hourly_rate, 0);
		return sum + trackedHours * rate;
	}, 0);

	const projectCompletion = projectTasks.length
		? projectTasks.reduce((sum, task) => sum + toNumber(task.progress_percent, 0), 0) / projectTasks.length
		: 0;

	const totalEstimateHours = projectTasks.reduce((sum, task) => sum + toNumber(task.estimated_hours, 0), 0);
	const utilizationRate = totalEstimateHours > 0 ? Math.min(100, (projectHoursSeconds / (totalEstimateHours * 3600)) * 100) : 0;

	const taskHoursSeries = projectTasks.map((task) => {
		const taskId = getTaskId(task);
		const seconds = (entryDurationByTask[taskId] || 0) + (activeTaskId === taskId ? activeTimerSeconds : 0);
		return Number((seconds / 3600).toFixed(2));
	});

	const weekMap = useMemo(() => {
		const map = new Map<string, number>();
		for (let i = 6; i >= 0; i -= 1) {
			const date = new Date();
			date.setDate(date.getDate() - i);
			map.set(dateInput(date), 0);
		}
		timeEntries.forEach((entry) => {
			if (!entry.entry_date || !map.has(entry.entry_date)) return;
			map.set(entry.entry_date, (map.get(entry.entry_date) || 0) + toNumber(entry.duration_seconds, 0) / 3600);
		});
		const today = dateInput(new Date());
		if (map.has(today) && activeTimerSeconds > 0) {
			map.set(today, (map.get(today) || 0) + activeTimerSeconds / 3600);
		}
		return map;
	}, [activeTimerSeconds, timeEntries]);

	const weeklyTrend = Array.from(weekMap.values()).map((value) => Number(value.toFixed(2)));

	const taskChartOptions = useChart({
		chart: { toolbar: { show: false } },
		dataLabels: { enabled: false },
		xaxis: { categories: projectTasks.map((task) => getTaskName(task).split(" ").slice(0, 2).join(" ")) },
		colors: ["#2563eb"],
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

	const statusBadgeVariant = timerStatus === "running" ? "success" : timerStatus === "break" ? "warning" : timerStatus === "paused" ? "info" : "secondary";
	const activeTaskRate = toNumber(activeTask?.hourly_rate, 0);
	const billableThisTask = (activeTimerSeconds / 3600) * activeTaskRate;
	const activeTaskName = activeTask ? getTaskName(activeTask) : activeTimer?.task_name || "No task running";
	const projectBudgetDisplay =
		selectedProject?.billing_type === "fixed"
			? formatCurrency(toNumber(selectedProject?.fixed_price, 0), selectedProject?.currency || "USD")
			: formatCurrency(toNumber(selectedProject?.hourly_rate, 0), selectedProject?.currency || "USD");

	const overviewTracked = toNumber(overview.tracked_seconds, projectHoursSeconds);
	const overviewBillable = toNumber(overview.billable_amount, projectBillable);

	return (
		<div className="w-full space-y-4">
			<Card className="overflow-hidden border-0 shadow-md">
				<CardContent className="relative p-0">
					<div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-blue-900 to-cyan-700 opacity-95" />
					<div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-cyan-400/30 blur-3xl" />
					<div className="absolute -left-16 -bottom-24 h-72 w-72 rounded-full bg-indigo-300/20 blur-3xl" />
					<div className="relative grid gap-4 p-6 text-white lg:grid-cols-3">
						<div className="space-y-3 lg:col-span-2">
							<Badge variant="warning">Workbench API Integrated</Badge>
							<h2 className="text-2xl font-semibold leading-tight">Track one task at a time with backend-controlled timer flow.</h2>
							<p className="text-sm text-white/80">
								Live state now comes from your Workbench APIs: overview, projects, tasks, active timer, and time entries with sync controls.
							</p>
							<div className="flex flex-wrap items-center gap-3 text-sm">
								<div className="flex items-center gap-2 rounded-md bg-white/10 px-3 py-2">
									<Icon icon="solar:clock-circle-bold-duotone" />
									<span>Backend timer controls</span>
								</div>
								<div className="flex items-center gap-2 rounded-md bg-white/10 px-3 py-2">
									<Icon icon="solar:cloud-check-bold-duotone" />
									<span>Online + sync-ready entries</span>
								</div>
							</div>
						</div>
						<div className="rounded-xl bg-black/20 p-4 backdrop-blur-sm">
							<div className="text-xs uppercase tracking-wide text-white/70">Current Active Timer</div>
							<div className="mt-2 text-4xl font-bold tabular-nums">{formatDuration(activeTimerSeconds)}</div>
							<div className="mt-2 flex items-center gap-2">
								<Badge variant={statusBadgeVariant}>{timerStatus.toUpperCase()}</Badge>
								<span className="text-sm text-white/80">{activeTaskName}</span>
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
								<Select value={selectedProjectValue} onValueChange={handleProjectChange}>
									<SelectTrigger className="w-full">
										<SelectValue placeholder={loading ? "Loading projects..." : "Select project"} />
									</SelectTrigger>
									<SelectContent>
										{selectableProjects.map((project) => {
											const projectId = getProjectId(project);
											return (
												<SelectItem key={projectId} value={projectId}>
													{getProjectName(project)}
												</SelectItem>
											);
										})}
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-2">
								<div className="text-xs font-medium text-muted-foreground">Task</div>
								<Select value={selectedTaskValue} onValueChange={setSelectedTaskId}>
									<SelectTrigger className="w-full">
										<SelectValue placeholder={tasksLoading ? "Loading tasks..." : "Select task"} />
									</SelectTrigger>
									<SelectContent>
										{projectTasks.map((task) => {
											const taskId = getTaskId(task);
											return (
												<SelectItem key={taskId} value={taskId}>
													{getTaskName(task)}
												</SelectItem>
											);
										})}
									</SelectContent>
								</Select>
							</div>
						</div>

						<div className="grid gap-3 md:grid-cols-5">
							<Button
								onClick={() => {
									if ((timerStatus === "paused" || timerStatus === "break") && activeTaskId === selectedTaskId) {
										handleResume();
										return;
									}
									handleStartTask(selectedTaskId);
								}}
								disabled={!selectedProjectId || !selectedTaskId || actionLoading}
								className="md:col-span-2"
							>
								<Icon icon="solar:play-bold-duotone" />
								{(timerStatus === "paused" || timerStatus === "break") && activeTaskId === selectedTaskId ? "Resume Task" : "Start Task"}
							</Button>
							<Button
								variant="outline"
								onClick={handlePause}
								disabled={timerStatus !== "running" || actionLoading}
							>
								<Icon icon="solar:pause-bold-duotone" />
								Pause
							</Button>
							<Button
								variant="secondary"
								onClick={timerStatus === "break" ? handleResume : handleBreakStart}
								disabled={(timerStatus !== "running" && timerStatus !== "break") || actionLoading}
							>
								<Icon icon="solar:cup-hot-bold-duotone" />
								{timerStatus === "break" ? "Stop Break" : "Break"}
							</Button>
							<Button variant="destructive" onClick={handleStop} disabled={timerStatus === "idle" || actionLoading}>
								<Icon icon="solar:stop-bold-duotone" />
								Stop
							</Button>
						</div>

						<div className="grid gap-3 md:grid-cols-2">
							<Input value={breakReason} onChange={(e) => setBreakReason(e.target.value)} placeholder="Break reason (optional)" />
							<Input value={stopNote} onChange={(e) => setStopNote(e.target.value)} placeholder="Stop note (optional)" />
						</div>

						<div className="grid gap-3 rounded-lg border p-4 lg:grid-cols-4">
							<div className="lg:col-span-2">
								<div className="text-xs text-muted-foreground">Selected Task Running Time</div>
								<div className="text-3xl font-semibold tabular-nums">{formatDuration(activeTaskId === selectedTaskId ? activeTimerSeconds : entryDurationByTask[selectedTaskId] || 0)}</div>
							</div>
							<div>
								<div className="text-xs text-muted-foreground">Break Time</div>
								<div className="text-xl font-semibold tabular-nums">{formatDuration(activeBreakSeconds)}</div>
							</div>
							<div>
								<div className="text-xs text-muted-foreground">Billable</div>
								<div className="text-xl font-semibold">{formatCurrency(billableThisTask, selectedProject?.currency || "USD")}</div>
							</div>
						</div>

						<div className="rounded-lg border p-4">
							<div className="mb-3 flex items-center justify-between">
								<div>
									<div className="text-sm font-semibold">Manual Time Entry</div>
									<div className="text-xs text-muted-foreground">Uses `POST /workbench/time-entries/manual/` with selected project/task.</div>
								</div>
								<Badge variant="outline">API Live</Badge>
							</div>
							<div className="grid gap-2 sm:grid-cols-6">
								<Input type="number" min={0} value={manualHours} onChange={(e) => setManualHours(e.target.value)} placeholder="Hours" />
								<Input type="number" min={0} max={59} value={manualMinutes} onChange={(e) => setManualMinutes(e.target.value)} placeholder="Minutes" />
								<Input className="sm:col-span-2" value={manualNote} onChange={(e) => setManualNote(e.target.value)} placeholder="Note (optional)" />
								<Button onClick={handleAddManualTime} disabled={!selectedProjectId || !selectedTaskId || actionLoading} className="sm:col-span-2">
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
									<div className="font-semibold">{selectedTask ? getTaskName(selectedTask) : "No task selected"}</div>
									<div className="text-xs text-muted-foreground">{selectedTask?.description || "Select a task to see details."}</div>
								</div>
								<Badge variant={priorityVariant(selectedTask?.priority)}>{selectedTask?.priority || "-"}</Badge>
							</div>
							<div className="mt-3 space-y-2 text-sm">
								<div className="flex items-center justify-between">
									<span className="text-muted-foreground">Due date</span>
									<span>{selectedTask?.due_date || "-"}</span>
								</div>
								<div className="flex items-center justify-between">
									<span className="text-muted-foreground">Estimate</span>
									<span>{selectedTask?.estimated_hours ?? "-"}h</span>
								</div>
								<div className="flex items-center justify-between">
									<span className="text-muted-foreground">Hourly rate</span>
									<span>{formatCurrency(toNumber(selectedTask?.hourly_rate, 0), selectedProject?.currency || "USD")}</span>
								</div>
							</div>
						</div>
						<div className="rounded-lg border p-4">
							<div className="mb-2 flex items-center justify-between">
								<div className="text-sm font-semibold">Active Session Stats</div>
								<Badge variant="success">{timerStatus === "idle" ? "Idle" : "Live"}</Badge>
							</div>
							<div className="space-y-2 text-sm">
								<div className="flex items-center justify-between">
									<span className="text-muted-foreground">Tracked</span>
									<span>{formatHours(activeTimerSeconds)}</span>
								</div>
								<div className="flex items-center justify-between">
									<span className="text-muted-foreground">Break</span>
									<span>{formatHours(activeBreakSeconds)}</span>
								</div>
								<div className="flex items-center justify-between">
									<span className="text-muted-foreground">Billable value</span>
									<span>{formatCurrency(billableThisTask, selectedProject?.currency || "USD")}</span>
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
						<CardDescription>Task list is loaded from `GET /workbench/projects/&lt;project_id&gt;/tasks/`.</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3">
						{projectTasks.map((task) => {
							const taskId = getTaskId(task);
							const taskSeconds = (entryDurationByTask[taskId] || 0) + (activeTaskId === taskId ? activeTimerSeconds : 0);
							const isActive = activeTaskId === taskId && timerStatus !== "idle";
							return (
								<div key={taskId} className="rounded-lg border p-4">
									<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
										<div className="space-y-1">
											<div className="flex items-center gap-2">
												<div className="font-semibold">{getTaskName(task)}</div>
												<Badge variant={priorityVariant(task.priority)}>{task.priority || "-"}</Badge>
												{isActive ? <Badge variant="success">Active</Badge> : null}
											</div>
											<div className="text-xs text-muted-foreground">{task.description || "No description"}</div>
										</div>
										<div className="flex items-center gap-2">
											<Button size="sm" onClick={() => handleStartTask(taskId)} disabled={actionLoading}>
												<Icon icon="solar:play-bold-duotone" />
												{isActive ? "Running" : "Start"}
											</Button>
											<div className="rounded-md border px-3 py-1 text-sm tabular-nums">{formatDuration(taskSeconds)}</div>
										</div>
									</div>
									<div className="mt-3 space-y-1">
										<div className="flex items-center justify-between text-xs text-muted-foreground">
											<span>Progress</span>
											<span>{toNumber(task.progress_percent, 0)}%</span>
										</div>
										<Progress value={toNumber(task.progress_percent, 0)} />
									</div>
								</div>
							);
						})}
						{!projectTasks.length && !tasksLoading ? <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">No tasks found for this project.</div> : null}
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
							<div className="font-semibold">{selectedProject?.name || "-"}</div>
							<div className="text-xs text-muted-foreground">{getProjectClientLabel(selectedProject)}</div>
						</div>
						<div className="grid grid-cols-2 gap-2">
							<div className="rounded-lg border p-3">
								<div className="text-xs text-muted-foreground">Tracked</div>
								<div className="font-semibold">{formatHours(overviewTracked)}</div>
							</div>
							<div className="rounded-lg border p-3">
								<div className="text-xs text-muted-foreground">Billable</div>
								<div className="font-semibold">{formatCurrency(overviewBillable, selectedProject?.currency || "USD")}</div>
							</div>
							<div className="rounded-lg border p-3">
								<div className="text-xs text-muted-foreground">Utilization</div>
								<div className="font-semibold">{utilizationRate.toFixed(0)}%</div>
							</div>
								<div className="rounded-lg border p-3">
									<div className="text-xs text-muted-foreground">Budget</div>
									<div className="font-semibold">{projectBudgetDisplay}</div>
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
						<CardDescription>Built from recent `GET /workbench/time-entries/` response.</CardDescription>
					</CardHeader>
					<CardContent>
						<Chart type="area" height={280} options={trendOptions} series={[{ name: "Focus Hours", data: weeklyTrend }]} />
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader className="pb-0">
					<div className="flex items-center justify-between gap-2">
						<div>
							<CardTitle>Recent Time Entries</CardTitle>
							<CardDescription>List, edit, delete, and sync entries via Workbench time-entries APIs.</CardDescription>
						</div>
						<Button variant="outline" onClick={handleSyncEntries} disabled={syncLoading}>
							<Icon icon="solar:cloud-upload-bold-duotone" />
							Sync Unsynced
						</Button>
					</div>
				</CardHeader>
				<CardContent className="space-y-3">
					{timeEntries.slice(0, 8).map((entry) => {
						const task = taskById[entry.task];
						const taskName = task ? getTaskName(task) : entry.task_name || entry.task;
						return (
							<div key={entry.id} className="rounded-lg border p-4">
								<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
									<div className="space-y-1">
										<div className="font-medium">{taskName}</div>
										<div className="text-xs text-muted-foreground">
											{entry.entry_date} • {formatHours(toNumber(entry.duration_seconds, 0))} • {entry.source || "timer"}
										</div>
									</div>
									<div className="flex items-center gap-2">
										<Badge variant={entry.sync_status === "synced" ? "success" : "warning"}>{entry.sync_status || "unknown"}</Badge>
										<Button size="sm" variant="outline" onClick={() => handleDeleteEntry(entry.id)} disabled={actionLoading}>
											Delete
										</Button>
									</div>
								</div>
								<div className="mt-3 flex gap-2">
									<Input
										value={entryNoteDrafts[entry.id] ?? ""}
										onChange={(e) => setEntryNoteDrafts((prev) => ({ ...prev, [entry.id]: e.target.value }))}
										placeholder="Update note"
									/>
									<Button size="sm" onClick={() => handleUpdateEntry(entry)} disabled={actionLoading}>
										Save
									</Button>
								</div>
							</div>
						);
					})}
					{!timeEntries.length ? <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">No time entries found.</div> : null}
				</CardContent>
			</Card>
		</div>
	);
}
