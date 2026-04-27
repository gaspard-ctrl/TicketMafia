import { createServiceClient } from "@/lib/supabase/service";
import type { TicketCategory, TicketStatus } from "@/lib/slack/types";

export type TicketRow = {
  id: string;
  // slack_channel_id/slack_ts are null for tickets created inside the app
  slack_channel_id: string | null;
  slack_channel_name: string | null;
  slack_ts: string | null;
  category: TicketCategory;
  title: string;
  body: string;
  slack_author_id: string | null;
  author_name: string | null;
  author_avatar: string | null;
  status: TicketStatus;
  owner: string | null;
  deadline: string | null;
  slack_permalink: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

export type AttachmentRow = {
  id: string;
  ticket_id: string;
  comment_id: string | null;
  slack_file_id: string | null;
  url: string;
  name: string | null;
  mimetype: string | null;
};

export type CommentRow = {
  id: string;
  ticket_id: string;
  source: "slack" | "app";
  slack_ts: string | null;
  slack_user_id: string | null;
  author_name: string | null;
  author_avatar: string | null;
  body: string;
  created_at: string;
};

export async function listTickets(opts: {
  category?: TicketCategory | "all";
  range?: DashboardRange;
  sort?: "desc" | "asc";
  from?: string; // ISO date YYYY-MM-DD
  to?: string;   // ISO date YYYY-MM-DD
} = {}): Promise<TicketRow[]> {
  const supabase = createServiceClient();
  let query = supabase
    .from("tickets")
    .select("*")
    .is("archived_at", null)
    .order("created_at", { ascending: opts.sort === "asc" });

  if (opts.category && opts.category !== "all") {
    query = query.eq("category", opts.category);
  }

  // Custom date range overrides the preset range filter.
  if (opts.from || opts.to) {
    if (opts.from) query = query.gte("created_at", opts.from);
    if (opts.to) query = query.lte("created_at", `${opts.to}T23:59:59.999Z`);
  } else {
    const days = opts.range ? RANGE_DAYS[opts.range] : null;
    if (days !== null) {
      const since = new Date();
      since.setUTCDate(since.getUTCDate() - days);
      query = query.gte("created_at", since.toISOString());
    }
  }

  const t0 = Date.now();
  const { data, error } = await query;
  console.log(`[perf] listTickets supabase=${Date.now() - t0}ms`);
  if (error) {
    console.error("listTickets failed", error);
    return [];
  }
  return (data ?? []) as TicketRow[];
}

export async function listArchivedTickets(): Promise<TicketRow[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("tickets")
    .select("*")
    .not("archived_at", "is", null)
    .order("archived_at", { ascending: false });

  if (error) {
    console.error("listArchivedTickets failed", error);
    return [];
  }
  return (data ?? []) as TicketRow[];
}

export async function getTicket(id: string): Promise<{
  ticket: TicketRow | null;
  attachments: AttachmentRow[];
  comments: CommentRow[];
}> {
  const supabase = createServiceClient();

  const t0 = Date.now();
  const [ticketRes, attRes, commentsRes] = await Promise.all([
    supabase.from("tickets").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("ticket_attachments")
      .select("*")
      .eq("ticket_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("ticket_comments")
      .select("*")
      .eq("ticket_id", id)
      .order("created_at", { ascending: true }),
  ]);
  console.log(`[perf] getTicket supabase=${Date.now() - t0}ms`);

  return {
    ticket: (ticketRes.data ?? null) as TicketRow | null,
    attachments: (attRes.data ?? []) as AttachmentRow[],
    comments: (commentsRes.data ?? []) as CommentRow[],
  };
}

export async function getAttachment(id: string): Promise<AttachmentRow | null> {
  const supabase = createServiceClient();
  const { data } = await supabase.from("ticket_attachments").select("*").eq("id", id).maybeSingle();
  return (data ?? null) as AttachmentRow | null;
}

export type OwnerRow = {
  id: string;
  name: string;
  created_at: string;
};

export async function listOwners(): Promise<OwnerRow[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.from("owners").select("*").order("name");
  if (error) {
    console.error("listOwners failed", error);
    return [];
  }
  return (data ?? []) as OwnerRow[];
}

export type OwnerStats = {
  name: string;
  isUnassigned: boolean;
  total: number;
  byStatus: Record<TicketStatus, number>;
  byCategory: Record<TicketCategory, number>;
  overdue: number;
  completionPct: number;
};

export type DashboardRange = "7d" | "30d" | "90d" | "all";

const RANGE_DAYS: Record<DashboardRange, number | null> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  all: null,
};

export type AdminDashboard = {
  range: DashboardRange;
  global: {
    total: number;
    open: number;
    overdue: number;
    completionPct: number;
    byStatus: Record<TicketStatus, number>;
    byCategory: Record<TicketCategory, number>;
  };
  owners: OwnerStats[];
  weeklyCreated: Array<{ weekStart: string; label: string; count: number }>;
  oldestOpen: Array<{
    id: string;
    title: string;
    status: TicketStatus;
    category: TicketCategory;
    createdAt: string;
    ageDays: number;
    owner: string | null;
  }>;
  overdueList: Array<{
    id: string;
    title: string;
    status: TicketStatus;
    category: TicketCategory;
    deadline: string;
    lateDays: number;
    owner: string | null;
  }>;
};

const UNASSIGNED_LABEL = "Non assigné";
const WEEKS_WINDOW = 8;

function emptyStatus(): Record<TicketStatus, number> {
  return { todo: 0, doing: 0, waiting: 0, done: 0 };
}

function emptyCategory(): Record<TicketCategory, number> {
  return { bugs: 0, features: 0, super_admin: 0 };
}

function startOfWeekUTC(d: Date): Date {
  const copy = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = copy.getUTCDay();
  const diff = (day + 6) % 7;
  copy.setUTCDate(copy.getUTCDate() - diff);
  return copy;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function diffDays(fromIso: string, toIso: string): number {
  const a = Date.parse(fromIso);
  const b = Date.parse(toIso);
  return Math.floor((b - a) / 86_400_000);
}

export async function getAdminDashboard(
  opts: { range?: DashboardRange } = {}
): Promise<AdminDashboard> {
  const supabase = createServiceClient();
  const range: DashboardRange = opts.range ?? "all";
  const days = RANGE_DAYS[range];

  // Compute the lower bound for "in range" tickets. For "all", everything counts.
  let sinceMs: number | null = null;
  if (days !== null) {
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - days);
    sinceMs = since.getTime();
  }

  const [ownersRes, ticketsRes] = await Promise.all([
    supabase.from("owners").select("name").order("name"),
    supabase
      .from("tickets")
      .select("id, title, owner, status, category, deadline, created_at")
      .is("archived_at", null),
  ]);

  if (ownersRes.error) console.error("getAdminDashboard owners failed", ownersRes.error);
  if (ticketsRes.error) console.error("getAdminDashboard tickets failed", ticketsRes.error);

  const ownerNames = (ownersRes.data ?? []).map((o) => o.name as string);
  const allTickets = (ticketsRes.data ?? []) as Array<{
    id: string;
    title: string;
    owner: string | null;
    status: TicketStatus;
    category: TicketCategory;
    deadline: string | null;
    created_at: string;
  }>;

  // Tickets in scope for KPIs / owners / oldest-open / overdue list.
  // The weekly-created chart always uses ALL tickets so the trend stays stable.
  const tickets =
    sinceMs === null
      ? allTickets
      : allTickets.filter((t) => Date.parse(t.created_at) >= sinceMs);

  const buckets = new Map<string, OwnerStats>();
  for (const name of ownerNames) {
    buckets.set(name, {
      name,
      isUnassigned: false,
      total: 0,
      byStatus: emptyStatus(),
      byCategory: emptyCategory(),
      overdue: 0,
      completionPct: 0,
    });
  }
  buckets.set(UNASSIGNED_LABEL, {
    name: UNASSIGNED_LABEL,
    isUnassigned: true,
    total: 0,
    byStatus: emptyStatus(),
    byCategory: emptyCategory(),
    overdue: 0,
    completionPct: 0,
  });

  const now = new Date();
  const today = isoDate(now);
  const thisWeekStart = startOfWeekUTC(now);
  const weekBuckets = new Map<string, number>();
  const weekLabels: Array<{ key: string; label: string }> = [];
  for (let i = WEEKS_WINDOW - 1; i >= 0; i--) {
    const ws = new Date(thisWeekStart);
    ws.setUTCDate(ws.getUTCDate() - i * 7);
    const key = isoDate(ws);
    weekBuckets.set(key, 0);
    const label = ws.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      timeZone: "UTC",
    });
    weekLabels.push({ key, label });
  }
  const windowStart = weekLabels[0].key;

  const global = {
    total: 0,
    open: 0,
    overdue: 0,
    completionPct: 0,
    byStatus: emptyStatus(),
    byCategory: emptyCategory(),
  };

  const overdueList: AdminDashboard["overdueList"] = [];
  const openTickets: typeof tickets = [];

  // Weekly chart uses ALL tickets (range-independent trend).
  for (const t of allTickets) {
    const createdDay = t.created_at.slice(0, 10);
    if (createdDay >= windowStart) {
      const created = new Date(t.created_at);
      const ws = isoDate(startOfWeekUTC(created));
      if (weekBuckets.has(ws)) weekBuckets.set(ws, (weekBuckets.get(ws) ?? 0) + 1);
    }
  }

  for (const t of tickets) {
    const ownerKey = t.owner && buckets.has(t.owner) ? t.owner : UNASSIGNED_LABEL;
    const b = buckets.get(ownerKey)!;
    b.total += 1;
    b.byStatus[t.status] += 1;
    b.byCategory[t.category] += 1;

    global.total += 1;
    global.byStatus[t.status] += 1;
    global.byCategory[t.category] += 1;
    if (t.status !== "done") global.open += 1;

    if (t.deadline && t.deadline < today && t.status !== "done") {
      b.overdue += 1;
      global.overdue += 1;
      overdueList.push({
        id: t.id,
        title: t.title,
        status: t.status,
        category: t.category,
        deadline: t.deadline,
        lateDays: diffDays(t.deadline, today),
        owner: t.owner,
      });
    }

    if (t.status !== "done") openTickets.push(t);
  }

  for (const b of buckets.values()) {
    b.completionPct = b.total === 0 ? 0 : Math.round((b.byStatus.done / b.total) * 100);
  }
  global.completionPct =
    global.total === 0 ? 0 : Math.round((global.byStatus.done / global.total) * 100);

  const owners = ownerNames
    .map((n) => buckets.get(n)!)
    .concat(buckets.get(UNASSIGNED_LABEL)!);

  overdueList.sort((a, b) => a.deadline.localeCompare(b.deadline));

  const oldestOpen: AdminDashboard["oldestOpen"] = openTickets
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .slice(0, 5)
    .map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      category: t.category,
      createdAt: t.created_at,
      ageDays: diffDays(t.created_at.slice(0, 10), today),
      owner: t.owner,
    }));

  const weeklyCreated = weekLabels.map(({ key, label }) => ({
    weekStart: key,
    label,
    count: weekBuckets.get(key) ?? 0,
  }));

  return { range, global, owners, weeklyCreated, oldestOpen, overdueList };
}
