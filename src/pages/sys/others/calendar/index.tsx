import calendarService from "@/api/services/calendarService";
import { down, useMediaQuery } from "@/hooks";
import { useSettings } from "@/store/settingStore";
import { Card, CardContent } from "@/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import type { DateSelectArg, DatesSetArg, EventClickArg, EventInput } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import dayjs from "dayjs";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { toast } from "sonner";
import CalendarEvent from "./calendar-event";
import CalendarEventForm, { type CalendarEventFormFieldType } from "./calendar-event-form";
import CalendarHeader, { type HandleMoveArg, type ViewType } from "./calendar-header";
import { StyledCalendar } from "./styles";

type SourceFilter = "all" | "custom" | "task" | "invoice";

type ApiCalendarEvent = {
	id: string;
	title: string;
	description?: string;
	start_at?: string;
	end_at?: string;
	all_day?: boolean;
	color?: string;
	source_type?: string;
	event_type?: string;
	location?: string;
	timezone?: string;
	status?: string;
};

const DefaultEventInitValue: CalendarEventFormFieldType = {
	id: "",
	title: "",
	description: "",
	allDay: false,
	start: dayjs(),
	end: dayjs(),
	color: "#22c55e",
};

const asRecord = (value: unknown) => (value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, any>) : {});

const normalizeApiEvent = (raw: unknown, fallbackSourceType = "custom"): ApiCalendarEvent => {
	const item = asRecord(raw);
	return {
		id: String(item.id ?? item.event_id ?? ""),
		title: String(item.title ?? item.name ?? "Untitled"),
		description: String(item.description ?? ""),
		start_at: item.start_at || item.start || item.start_date || undefined,
		end_at: item.end_at || item.end || item.end_date || undefined,
		all_day: Boolean(item.all_day ?? item.allDay ?? false),
		color: String(item.color ?? "#22c55e"),
		source_type: String(item.source_type ?? fallbackSourceType),
		event_type: String(item.event_type ?? "event"),
		location: String(item.location ?? ""),
		timezone: String(item.timezone ?? ""),
		status: String(item.status ?? "scheduled"),
	};
};

const toEventInput = (event: ApiCalendarEvent): EventInput => ({
	id: event.id,
	title: event.title,
	start: event.start_at,
	end: event.end_at,
	allDay: Boolean(event.all_day),
	color: event.color || "#22c55e",
	extendedProps: {
		description: event.description,
		sourceType: event.source_type || "custom",
		eventType: event.event_type,
		location: event.location,
		timezone: event.timezone,
		status: event.status,
	},
});

const currentTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

export default function Calendar() {
	const fullCalendarRef = useRef<FullCalendar>(null);
	const [view, setView] = useState<ViewType>("dayGridMonth");
	const [date, setDate] = useState(new Date());
	const [open, setOpen] = useState(false);
	const [eventInitValue, setEventInitValue] = useState<CalendarEventFormFieldType>(DefaultEventInitValue);
	const [eventFormType, setEventFormType] = useState<"add" | "edit">("add");
	const [events, setEvents] = useState<EventInput[]>([]);
	const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
	const [range, setRange] = useState<{ startAt?: string; endAt?: string }>({});
	const [loading, setLoading] = useState(false);

	const { themeMode } = useSettings();
	const xsBreakPoint = useMediaQuery(down("xs"));

	const loadEvents = useCallback(
		async (params?: { startAt?: string; endAt?: string; source?: SourceFilter }) => {
			try {
				setLoading(true);
				const source = params?.source ?? sourceFilter;
				const [customEvents, taskFeed, invoiceFeed] = await Promise.all([
					calendarService.listEvents({
						start_at: params?.startAt ?? range.startAt,
						end_at: params?.endAt ?? range.endAt,
						source_type: source === "all" ? undefined : source,
					}),
					calendarService.listTaskFeed(),
					calendarService.listInvoiceFeed(),
				]);

				const combined = [
					...customEvents.map((item) => normalizeApiEvent(item, "custom")),
					...taskFeed.map((item) => normalizeApiEvent(item, "task")),
					...invoiceFeed.map((item) => normalizeApiEvent(item, "invoice")),
				];

				const filtered = source === "all" ? combined : combined.filter((item) => item.source_type === source);
				const dedupMap = new Map<string, ApiCalendarEvent>();
				filtered.forEach((item) => {
					if (!item.id) return;
					const key = `${item.source_type || "custom"}-${item.id}`;
					dedupMap.set(key, item);
				});
				setEvents(Array.from(dedupMap.values()).map(toEventInput));
			} catch (error: any) {
				const message = error?.response?.data?.message || error?.response?.data?.detail || error?.message || "Failed to load calendar events.";
				toast.error(message);
			} finally {
				setLoading(false);
			}
		},
		[range.endAt, range.startAt, sourceFilter],
	);

	useEffect(() => {
		if (xsBreakPoint) setView("listWeek");
	}, [xsBreakPoint]);

	useEffect(() => {
		if (!range.startAt || !range.endAt) return;
		loadEvents({ startAt: range.startAt, endAt: range.endAt, source: sourceFilter });
	}, [loadEvents, range.endAt, range.startAt, sourceFilter]);

	const handleMove = (action: HandleMoveArg) => {
		const calendarApi = fullCalendarRef.current?.getApi();
		if (!calendarApi) return;
		switch (action) {
			case "prev":
				calendarApi.prev();
				break;
			case "next":
				calendarApi.next();
				break;
			case "today":
				calendarApi.today();
				break;
			default:
				break;
		}
		setDate(calendarApi.getDate());
	};

	const handleViewTypeChange = (nextView: ViewType) => {
		setView(nextView);
	};

	useLayoutEffect(() => {
		const calendarApi = fullCalendarRef.current?.getApi();
		if (!calendarApi) return;
		setTimeout(() => {
			calendarApi.changeView(view);
		});
	}, [view]);

	const handleDatesSet = (arg: DatesSetArg) => {
		setDate(arg.start);
		setRange({ startAt: dayjs(arg.start).toISOString(), endAt: dayjs(arg.end).toISOString() });
	};

	const handleDateSelect = (selectInfo: DateSelectArg) => {
		const calendarApi = selectInfo.view.calendar;
		calendarApi.unselect();
		setOpen(true);
		setEventFormType("add");
		setEventInitValue({
			id: "",
			title: "",
			description: "",
			start: dayjs(selectInfo.startStr),
			end: dayjs(selectInfo.endStr),
			allDay: selectInfo.allDay,
			color: "#22c55e",
		});
	};

	const handleEventClick = async (arg: EventClickArg) => {
		const sourceType = String(arg.event.extendedProps.sourceType || "custom");
		const eventId = String(arg.event.id || "");
		let detail: Record<string, any> = {};
		if (eventId) {
			try {
				detail = asRecord(await calendarService.getEvent(eventId));
			} catch {
				detail = {};
			}
		}
		const title = String(detail.title ?? arg.event.title ?? "");
		const description = String(detail.description ?? arg.event.extendedProps.description ?? "");
		const allDay = Boolean(detail.all_day ?? arg.event.allDay);
		const color = String(detail.color ?? arg.event.backgroundColor ?? "#22c55e");
		const startValue = detail.start_at ?? detail.start ?? arg.event.start?.toISOString();
		const endValue = detail.end_at ?? detail.end ?? arg.event.end?.toISOString();

		setOpen(true);
		setEventFormType("edit");
		setEventInitValue({
			id: eventId,
			title,
			description,
			allDay,
			color,
			start: startValue ? dayjs(startValue) : dayjs(),
			end: endValue ? dayjs(endValue) : dayjs(),
		});

		if (sourceType !== "custom") {
			toast.info("Feed event selected. Edit/delete may be restricted by backend.");
		}
	};

	const handleCancel = () => {
		setEventInitValue(DefaultEventInitValue);
		setOpen(false);
	};

	const handleEdit = async (values: CalendarEventFormFieldType) => {
		const { id, title = "", description, start, end, allDay = false, color } = values;
		if (!id) return;
		try {
			await calendarService.updateEvent(id, {
				title,
				description,
				start_at: start?.toISOString(),
				end_at: end?.toISOString(),
				all_day: allDay,
				color: String(color || "#22c55e"),
				timezone: currentTimezone,
				status: "scheduled",
			});
			toast.success("Event updated.");
			await loadEvents({ startAt: range.startAt, endAt: range.endAt, source: sourceFilter });
		} catch (error: any) {
			const message = error?.response?.data?.message || error?.response?.data?.detail || error?.message || "Failed to update event.";
			toast.error(message);
		}
	};

	const handleCreate = async (values: CalendarEventFormFieldType) => {
		const { title = "", description, start, end, allDay = false, color } = values;
		try {
			await calendarService.createEvent({
				title,
				description,
				event_type: "meeting",
				start_at: start?.toISOString(),
				end_at: end?.toISOString(),
				all_day: allDay,
				timezone: currentTimezone,
				location: "",
				color: String(color || "#22c55e"),
				source_type: "custom",
				source_id: "",
				reminder_minutes_before: 30,
				recurrence_rule: "",
				status: "scheduled",
			});
			toast.success("Event created.");
			await loadEvents({ startAt: range.startAt, endAt: range.endAt, source: sourceFilter });
		} catch (error: any) {
			const message = error?.response?.data?.message || error?.response?.data?.detail || error?.message || "Failed to create event.";
			toast.error(message);
		}
	};

	const handleDelete = async (id: string) => {
		if (!id) return;
		try {
			await calendarService.deleteEvent(id);
			toast.success("Event deleted.");
			await loadEvents({ startAt: range.startAt, endAt: range.endAt, source: sourceFilter });
		} catch (error: any) {
			const message = error?.response?.data?.message || error?.response?.data?.detail || error?.message || "Failed to delete event.";
			toast.error(message);
		}
	};

	return (
		<>
			<Card className="h-full w-full">
				<CardContent className="h-full w-full">
					<StyledCalendar $themeMode={themeMode}>
						<CalendarHeader now={date} view={view} onMove={handleMove} onCreate={() => setOpen(true)} onViewTypeChange={handleViewTypeChange} />
						<div className="mb-3 flex items-center justify-between gap-3">
							<div className="flex items-center gap-2 text-sm text-muted-foreground">
								<span>Source</span>
								<Select value={sourceFilter} onValueChange={(v) => setSourceFilter(v as SourceFilter)}>
									<SelectTrigger className="h-8 w-36">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">All</SelectItem>
										<SelectItem value="custom">Custom</SelectItem>
										<SelectItem value="task">Task</SelectItem>
										<SelectItem value="invoice">Invoice</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div className="text-xs text-muted-foreground">{loading ? "Syncing calendar..." : `${events.length} events`}</div>
						</div>
						<FullCalendar
							ref={fullCalendarRef}
							plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
							initialDate={date}
							initialView={xsBreakPoint ? "listWeek" : view}
							events={events}
							eventContent={CalendarEvent}
							editable
							selectable
							selectMirror
							dayMaxEvents
							headerToolbar={false}
							select={handleDateSelect}
							eventClick={handleEventClick}
							datesSet={handleDatesSet}
						/>
					</StyledCalendar>
				</CardContent>
			</Card>
			<CalendarEventForm
				open={open}
				type={eventFormType}
				initValues={eventInitValue}
				onCancel={handleCancel}
				onDelete={handleDelete}
				onCreate={handleCreate}
				onEdit={handleEdit}
			/>
		</>
	);
}
