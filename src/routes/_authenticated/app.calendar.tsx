import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Eye,
  Filter,
  Info,
  Layers,
  List,
  Receipt,
  ShieldAlert,
} from "lucide-react";
import { useMemo, useState } from "react";

import { EntitlementGate } from "@/components/app/entitlement-gate";
import { useWorkspace } from "@/components/app/workspace-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MoneyValue } from "@/components/ui/money-value";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { buildCalendarEvents, type CalendarEvent, type CalendarEventType } from "@/domain/calendar";
import { invoicesQueryOptions } from "@/domain/invoices";
import { obligationsListQueryOptions } from "@/domain/obligations";
import { recurringExpensesListQueryOptions } from "@/domain/recurring-expenses";
import { taxSummaryQueryOptions } from "@/domain/tax-reserve";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/calendar")({
  head: () => ({
    meta: [
      { title: "Financial Planning Calendar | SoloOS" },
      {
        name: "description",
        content:
          "Authoritative timeline of expected cash inflows, scheduled obligations, recurring expenses, and tax planning checkpoints.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CalendarPage,
});

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function CalendarPage() {
  const { entitlements } = useWorkspace();

  if (!entitlements.canAccessAnalytics) {
    return (
      <EntitlementGate
        title="Financial Planning Calendar"
        description="Visualize all invoice due dates, scheduled commitments, recurring outflows, and quarterly tax checkpoints in a unified financial timeline."
        requiredPlan="solo"
        features={[
          "Timeline view of scheduled collections",
          "Obligations and recurring outflows",
          "Quarterly tax checkpoints",
        ]}
      />
    );
  }

  return <CalendarContent />;
}

function CalendarContent() {
  const { workspace } = useWorkspace();
  const wid = workspace.id;
  const currency = workspace.currency ?? "USD";

  // Month navigation state
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [viewMode, setViewMode] = useState<"month" | "agenda">("month");
  const [filterType, setFilterType] = useState<"all" | CalendarEventType>("all");
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Compute month start and end ISO strings (inclusive of whole month)
  const { startDate, endDate, daysInMonth, startDayOfWeek } = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startStr = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const endStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay.getDate()).padStart(2, "0")}`;
    return {
      startDate: startStr,
      endDate: endStr,
      daysInMonth: lastDay.getDate(),
      startDayOfWeek: firstDay.getDay(),
    };
  }, [year, month]);

  // Queries
  const invoicesQuery = useQuery(invoicesQueryOptions(wid));
  const obligationsQuery = useQuery(obligationsListQueryOptions(wid, { status: "all_active" }));
  const recurringQuery = useQuery(recurringExpensesListQueryOptions(wid));
  const taxQuery = useQuery(taxSummaryQueryOptions(wid));

  const isLoading =
    invoicesQuery.isLoading ||
    obligationsQuery.isLoading ||
    recurringQuery.isLoading ||
    taxQuery.isLoading;

  const primaryTax = (taxQuery.data ?? []).find((t) => t.currency === currency);
  const taxReserveRate = primaryTax?.taxReserveRate ?? 0.25;

  // Build raw inputs for pure calendar domain logic
  const calendarEvents = useMemo(() => {
    const invoices = (invoicesQuery.data ?? []).map((i) => ({
      id: i.id,
      invoiceNumber: i.invoice_number,
      clientName: i.client?.name ?? null,
      currency: i.currency,
      amountDue: Number(i.amount_due),
      dueDate: i.due_date,
      status: i.status,
    }));

    const obligations = (obligationsQuery.data ?? []).map((o) => ({
      id: o.id,
      name: o.title,
      currency: o.currency,
      amount: Number(o.amount),
      dueDate: o.due_date,
      status: o.status,
      vendor: o.vendor,
    }));

    const recurringExpenses = (recurringQuery.data ?? [])
      .filter((r) => r.status === "active")
      .map((r) => ({
        id: r.id,
        name: r.title,
        currency: r.currency,
        amount: Number(r.amount),
        frequency: r.frequency,
        nextOccurrence: r.next_due_date,
        endDate: r.end_date,
      }));

    return buildCalendarEvents({
      invoices,
      obligations,
      recurringExpenses,
      taxReserveRate,
      primaryCurrency: currency,
      startDate,
      endDate,
    });
  }, [
    invoicesQuery.data,
    obligationsQuery.data,
    recurringQuery.data,
    taxReserveRate,
    currency,
    startDate,
    endDate,
  ]);

  // Filter events
  const filteredEvents = useMemo(() => {
    if (filterType === "all") return calendarEvents;
    return calendarEvents.filter((e) => e.type === filterType);
  }, [calendarEvents, filterType]);

  // Group events by day string (YYYY-MM-DD)
  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of filteredEvents) {
      const existing = map.get(event.date) ?? [];
      existing.push(event);
      map.set(event.date, existing);
    }
    return map;
  }, [filteredEvents]);

  // Summary rollups for the month (matching primary currency)
  const monthStats = useMemo(() => {
    let totalInflows = 0;
    let totalOutflows = 0;
    let checkpointCount = 0;

    for (const e of calendarEvents) {
      if (e.currency === currency) {
        if (e.isExpectedInflow) totalInflows += e.amount;
        if (e.isPlannedOutflow) totalOutflows += e.amount;
      }
      if (e.isPlanningCheckpoint) checkpointCount++;
    }

    return {
      totalInflows,
      totalOutflows,
      netCash: totalInflows - totalOutflows,
      checkpointCount,
    };
  }, [calendarEvents, currency]);

  // Navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto max-w-[1280px] space-y-8 pb-20">
      {/* Header & Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-widest text-muted-foreground/70 mb-1">
            <CalendarIcon className="size-3.5" />
            <span>Planning & Timing</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Financial Calendar
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Authoritative timeline of scheduled collections, obligations, and tax checkpoints.
          </p>
        </div>

        {/* View mode & Date Navigation */}
        <div className="flex flex-wrap items-center gap-2">
          <Tabs
            value={viewMode}
            onValueChange={(v) => setViewMode(v as "month" | "agenda")}
            className="w-auto"
          >
            <TabsList className="grid grid-cols-2 h-9">
              <TabsTrigger value="month" className="text-xs gap-1.5">
                <CalendarIcon className="size-3.5" />
                Month
              </TabsTrigger>
              <TabsTrigger value="agenda" className="text-xs gap-1.5">
                <List className="size-3.5" />
                Agenda
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-1 border border-border rounded-lg bg-card/50 p-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrevMonth}
              className="h-7 w-7 p-0"
              aria-label="Previous month"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToday}
              className="h-7 px-2.5 text-xs font-semibold"
            >
              Today
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNextMonth}
              className="h-7 w-7 p-0"
              aria-label="Next month"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Month Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/60 bg-card/40">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs flex items-center justify-between">
              <span>Expected Collections</span>
              <ArrowDownLeft className="size-3.5 text-emerald-500" />
            </CardDescription>
            <CardTitle className="text-xl font-bold font-mono">
              <MoneyValue
                value={monthStats.totalInflows}
                currency={currency}
                size="lg"
                className="text-emerald-500"
              />
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-[11px] text-muted-foreground">
            Invoices due in {MONTH_NAMES[month]}
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/40">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs flex items-center justify-between">
              <span>Scheduled Outflows</span>
              <ArrowUpRight className="size-3.5 text-rose-500" />
            </CardDescription>
            <CardTitle className="text-xl font-bold font-mono">
              <MoneyValue
                value={monthStats.totalOutflows}
                currency={currency}
                size="lg"
                className="text-rose-500"
              />
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-[11px] text-muted-foreground">
            Obligations & recurring expenses
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/40">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs flex items-center justify-between">
              <span>Net Scheduled Timing</span>
              <Clock className="size-3.5 text-sky-500" />
            </CardDescription>
            <CardTitle className="text-xl font-bold font-mono">
              <MoneyValue
                value={monthStats.netCash}
                currency={currency}
                size="lg"
                prefix={monthStats.netCash > 0 ? "+" : ""}
                className={monthStats.netCash >= 0 ? "text-emerald-500" : "text-amber-500"}
              />
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-[11px] text-muted-foreground">
            Difference between scheduled in/out
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/40">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs flex items-center justify-between">
              <span>Planning Checkpoints</span>
              <ShieldAlert className="size-3.5 text-purple-400" />
            </CardDescription>
            <CardTitle className="text-xl font-bold font-mono">
              {monthStats.checkpointCount}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-[11px] text-muted-foreground">
            Quarterly tax checkpoints this month
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            {MONTH_NAMES[month]} {year}
          </h2>
          <Badge variant="outline" className="text-xs font-mono">
            {calendarEvents.length} events
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground mr-1 flex items-center gap-1">
            <Filter className="size-3" /> Filter:
          </span>
          <Button
            variant={filterType === "all" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setFilterType("all")}
            className="h-7 text-xs"
          >
            All
          </Button>
          <Button
            variant={filterType === "invoice_due" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setFilterType("invoice_due")}
            className="h-7 text-xs text-emerald-400"
          >
            Collections
          </Button>
          <Button
            variant={filterType === "obligation" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setFilterType("obligation")}
            className="h-7 text-xs text-rose-400"
          >
            Obligations
          </Button>
          <Button
            variant={filterType === "recurring_expense" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setFilterType("recurring_expense")}
            className="h-7 text-xs text-sky-400"
          >
            Recurring
          </Button>
          <Button
            variant={filterType === "tax_checkpoint" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setFilterType("tax_checkpoint")}
            className="h-7 text-xs text-purple-400"
          >
            Tax
          </Button>
        </div>
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
          <Clock className="size-8 animate-spin text-primary" />
          <p className="text-xs">Loading scheduled calendar events...</p>
        </div>
      ) : viewMode === "month" ? (
        /* Calendar Grid View */
        <div className="border border-border/80 rounded-xl overflow-hidden bg-card/20 shadow-sm">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b border-border/80 bg-muted/40 text-center text-xs font-semibold py-2.5 text-muted-foreground">
            {WEEKDAY_NAMES.map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-border/60">
            {/* Blank filler cells for days preceding start of month */}
            {Array.from({ length: startDayOfWeek }).map((_, idx) => (
              <div
                key={`blank-${idx}`}
                className="min-h-[100px] sm:min-h-[120px] bg-muted/10 p-2"
              />
            ))}

            {/* Month days */}
            {Array.from({ length: daysInMonth }).map((_, dayIdx) => {
              const dayNum = dayIdx + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
              const dayEvents = eventsByDay.get(dateStr) ?? [];
              const isToday = dateStr === todayStr;

              return (
                <div
                  key={dateStr}
                  className={cn(
                    "min-h-[100px] sm:min-h-[120px] p-2 flex flex-col justify-between transition-colors hover:bg-muted/20",
                    isToday && "bg-primary/5 ring-1 ring-inset ring-primary/40",
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={cn(
                        "text-xs font-medium inline-flex items-center justify-center size-6 rounded-full",
                        isToday
                          ? "bg-primary text-primary-foreground font-bold"
                          : "text-foreground/80",
                      )}
                    >
                      {dayNum}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {dayEvents.length}
                      </span>
                    )}
                  </div>

                  {/* Day Events Stack */}
                  <div className="space-y-1 overflow-y-auto max-h-[85px] scrollbar-none">
                    {dayEvents.slice(0, 3).map((event) => (
                      <button
                        key={event.id}
                        type="button"
                        onClick={() => setSelectedEvent(event)}
                        className={cn(
                          "w-full text-left truncate text-[11px] px-1.5 py-0.5 rounded flex items-center justify-between gap-1 border transition-all hover:scale-[1.02]",
                          event.type === "invoice_due" &&
                            "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20",
                          event.type === "obligation" &&
                            "bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20",
                          event.type === "recurring_expense" &&
                            "bg-sky-500/10 border-sky-500/30 text-sky-400 hover:bg-sky-500/20",
                          event.type === "tax_checkpoint" &&
                            "bg-purple-500/10 border-purple-500/30 text-purple-400 hover:bg-purple-500/20",
                        )}
                      >
                        <span className="truncate">{event.title}</span>
                        {event.amount > 0 && (
                          <span className="shrink-0 font-mono text-[10px] font-semibold tabular-nums">
                            {formatMoney(event.amount, event.currency)}
                          </span>
                        )}
                      </button>
                    ))}
                    {dayEvents.length > 3 && (
                      <button
                        type="button"
                        onClick={() => {
                          if (dayEvents[3]) setSelectedEvent(dayEvents[3]);
                        }}
                        className="text-[10px] text-muted-foreground hover:underline px-1"
                      >
                        +{dayEvents.length - 3} more
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Agenda / Chronological List View */
        <div className="space-y-4">
          {calendarEvents.length === 0 ? (
            <div className="py-16 text-center border border-border/80 rounded-xl bg-card/20">
              <CalendarIcon className="size-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm font-semibold text-foreground">No events found this month</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                No invoices are due, no obligations scheduled, and no recurring expenses are set for{" "}
                {MONTH_NAMES[month]} {year}.
              </p>
            </div>
          ) : (
            filteredEvents.map((event) => (
              <Card
                key={event.id}
                className="border-border/60 bg-card/40 hover:bg-card/60 transition-colors"
              >
                <div className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "p-2.5 rounded-lg shrink-0",
                        event.type === "invoice_due" && "bg-emerald-500/10 text-emerald-400",
                        event.type === "obligation" && "bg-rose-500/10 text-rose-400",
                        event.type === "recurring_expense" && "bg-sky-500/10 text-sky-400",
                        event.type === "tax_checkpoint" && "bg-purple-500/10 text-purple-400",
                      )}
                    >
                      {event.type === "invoice_due" && <ArrowDownLeft className="size-4" />}
                      {event.type === "obligation" && <ArrowUpRight className="size-4" />}
                      {event.type === "recurring_expense" && <Receipt className="size-4" />}
                      {event.type === "tax_checkpoint" && <ShieldAlert className="size-4" />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-foreground">{event.title}</h3>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] capitalize font-medium",
                            event.isExpectedInflow && "border-emerald-500/30 text-emerald-400",
                            event.isPlannedOutflow && "border-rose-500/30 text-rose-400",
                            event.isPlanningCheckpoint && "border-purple-500/30 text-purple-400",
                          )}
                        >
                          {event.type.replace("_", " ")}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-1">
                        <span className="flex items-center gap-1 font-mono">
                          <CalendarIcon className="size-3 text-muted-foreground/60" /> {event.date}
                        </span>
                        {event.relatedEntityName && <span>Entity: {event.relatedEntityName}</span>}
                        <span className="capitalize">Status: {event.status}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-border/40">
                    {event.amount > 0 && (
                      <div className="text-right">
                        <span
                          className={cn(
                            "text-sm font-mono font-bold tabular-nums block",
                            event.isExpectedInflow && "text-emerald-400",
                            event.isPlannedOutflow && "text-rose-400",
                          )}
                        >
                          {event.isExpectedInflow ? "+" : "-"}
                          {formatMoney(event.amount, event.currency)}
                        </span>
                      </div>
                    )}

                    {event.actionRoute && (
                      <Button variant="outline" size="sm" asChild className="h-8 text-xs gap-1">
                        <Link to={event.actionRoute}>
                          <ExternalLink className="size-3" />
                          View
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Planning Notice Disclaimer */}
      <div className="flex items-start gap-2.5 rounded-lg border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
        <Info className="size-4 shrink-0 text-muted-foreground mt-0.5" />
        <p>
          <strong className="text-foreground">Authoritative Planning Schedule:</strong> Calendar
          events are derived strictly from active invoices, scheduled obligations, and recurring
          commitments. Interacting with or reviewing events does not generate ledger transactions.
        </p>
      </div>

      {/* Event Details Dialog */}
      <Dialog
        open={Boolean(selectedEvent)}
        onOpenChange={(open) => !open && setSelectedEvent(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              {selectedEvent?.isExpectedInflow && (
                <ArrowDownLeft className="size-4 text-emerald-400" />
              )}
              {selectedEvent?.isPlannedOutflow && <ArrowUpRight className="size-4 text-rose-400" />}
              {selectedEvent?.isPlanningCheckpoint && (
                <ShieldAlert className="size-4 text-purple-400" />
              )}
              <span>Event Details</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Scheduled date: {selectedEvent?.date}
            </DialogDescription>
          </DialogHeader>

          {selectedEvent && (
            <div className="space-y-4 pt-2">
              <div className="rounded-lg border border-border/60 bg-card/60 p-3.5 space-y-2">
                <div className="text-sm font-semibold text-foreground">{selectedEvent.title}</div>
                <div className="flex items-center justify-between text-xs pt-1 border-t border-border/40">
                  <span className="text-muted-foreground">Type:</span>
                  <span className="font-medium capitalize">
                    {selectedEvent.type.replace("_", " ")}
                  </span>
                </div>
                {selectedEvent.amount > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Amount:</span>
                    <span className="font-mono font-bold text-foreground">
                      {formatMoney(selectedEvent.amount, selectedEvent.currency)}
                    </span>
                  </div>
                )}
                {selectedEvent.relatedEntityName && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Counterparty:</span>
                    <span className="font-medium text-foreground">
                      {selectedEvent.relatedEntityName}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Status:</span>
                  <span className="capitalize font-mono text-[11px]">{selectedEvent.status}</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedEvent(null)}>
                  Close
                </Button>
                {selectedEvent.actionRoute && (
                  <Button size="sm" asChild className="gap-1">
                    <Link to={selectedEvent.actionRoute} onClick={() => setSelectedEvent(null)}>
                      <ExternalLink className="size-3" />
                      View Record
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
