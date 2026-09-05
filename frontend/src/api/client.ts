export type Role = "melder" | "agent" | "admin";
export type Category = "hardware" | "software" | "network" | "access" | "other";
export type TicketStatus = "open" | "in_progress" | "resolved" | "closed";
export type Priority = "low" | "medium" | "high" | "critical";

export interface UserOut {
  id: number;
  email: string;
  display_name: string;
  role: Role;
  is_active: boolean;
}

export interface TicketOut {
  id: number;
  title: string;
  description: string;
  category: Category;
  priority: Priority;
  status: TicketStatus;
  assignee_id: number | null;
  assignee_name: string | null;
  created_at: string;
  updated_at: string;
  due_at: string;
  is_overdue: boolean;
}

export interface CommentOut {
  id: number;
  body: string;
  author_name: string;
  created_at: string;
}

export interface AuditOut {
  id: number;
  field: string;
  old_value: string | null;
  new_value: string | null;
  actor_name: string;
  created_at: string;
}

export interface TicketDetail {
  ticket: TicketOut;
  comments: CommentOut[];
  audit: AuditOut[];
}

export interface TicketList {
  items: TicketOut[];
  total: number;
  page: number;
  page_size: number;
}

export interface DashboardStats {
  open: number;
  overdue: number;
  closed_today: number;
  priority_distribution: Record<Priority, number>;
}

export interface AuthToken {
  access_token: string;
  token_type: string;
}

export interface RegisterPayload {
  email: string;
  display_name: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface CreateTicketPayload {
  title: string;
  description: string;
  category: Category;
  priority: Priority;
}

export interface UpdateTicketPayload {
  title?: string;
  description?: string;
  category?: Category;
  priority?: Priority;
}

export interface CreateUserPayload {
  email: string;
  display_name: string;
  password: string;
  role: Role;
}

export interface UpdateUserPayload {
  role?: Role;
  is_active?: boolean;
}

export interface TicketFilters {
  search?: string;
  status?: TicketStatus;
  priority?: Priority;
  assignee?: string;
  sort?: string;
  order?: "asc" | "desc";
  page?: number;
  page_size?: number;
}

export const TOKEN_KEY = "helpdesk_token";

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  detail: string;
  constructor(status: number, detail: string) {
    super(detail);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  auth?: boolean;
}

async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = "GET", body, auth = true } = options;

  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (auth) {
    const token = getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    throw new ApiError(0, "Netzwerkfehler: Backend nicht erreichbar");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  let data: unknown = null;
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    if (typeof data === "object" && data !== null && "detail" in data) {
      throw new ApiError(response.status, String((data as { detail: unknown }).detail));
    }
    throw new ApiError(response.status, `Fehler ${response.status}`);
  }

  return data as T;
}

export const api = {
  register(payload: RegisterPayload): Promise<UserOut> {
    return request<UserOut>("/api/auth/register", {
      method: "POST",
      body: payload,
      auth: false,
    });
  },

  login(payload: LoginPayload): Promise<AuthToken> {
    return request<AuthToken>("/api/auth/login", {
      method: "POST",
      body: payload,
      auth: false,
    });
  },

  logout(): Promise<void> {
    return request<void>("/api/auth/logout", { method: "POST" });
  },

  me(): Promise<UserOut> {
    return request<UserOut>("/api/auth/me");
  },

  listUsers(): Promise<UserOut[]> {
    return request<UserOut[]>("/api/users");
  },

  createUser(payload: CreateUserPayload): Promise<UserOut> {
    return request<UserOut>("/api/users", { method: "POST", body: payload });
  },

  updateUser(id: number, payload: UpdateUserPayload): Promise<UserOut> {
    return request<UserOut>(`/api/users/${id}`, { method: "PATCH", body: payload });
  },

  deleteUser(id: number): Promise<void> {
    return request<void>(`/api/users/${id}`, { method: "DELETE" });
  },

  deleteMe(): Promise<void> {
    return request<void>("/api/users/me", { method: "DELETE" });
  },

  createTicket(payload: CreateTicketPayload): Promise<TicketOut> {
    return request<TicketOut>("/api/tickets", { method: "POST", body: payload });
  },

  listTickets(filters: TicketFilters = {}): Promise<TicketList> {
    const params = new URLSearchParams();
    if (filters.search !== undefined && filters.search !== "") params.set("search", filters.search);
    if (filters.status !== undefined) params.set("status", filters.status);
    if (filters.priority !== undefined) params.set("priority", filters.priority);
    if (filters.assignee !== undefined) params.set("assignee", filters.assignee);
    if (filters.sort !== undefined) params.set("sort", filters.sort);
    if (filters.order !== undefined) params.set("order", filters.order);
    if (filters.page !== undefined) params.set("page", String(filters.page));
    if (filters.page_size !== undefined) params.set("page_size", String(filters.page_size));
    const qs = params.toString();
    return request<TicketList>(`/api/tickets${qs ? `?${qs}` : ""}`);
  },

  getTicket(id: number): Promise<TicketDetail> {
    return request<TicketDetail>(`/api/tickets/${id}`);
  },

  updateTicket(id: number, payload: UpdateTicketPayload): Promise<TicketOut> {
    return request<TicketOut>(`/api/tickets/${id}`, { method: "PATCH", body: payload });
  },

  closeTicket(id: number): Promise<TicketOut> {
    return request<TicketOut>(`/api/tickets/${id}/close`, { method: "POST" });
  },

  reopenTicket(id: number): Promise<TicketOut> {
    return request<TicketOut>(`/api/tickets/${id}/reopen`, { method: "POST" });
  },

  assignTicket(id: number, agentId: number): Promise<TicketOut> {
    return request<TicketOut>(`/api/tickets/${id}/assign`, {
      method: "POST",
      body: { agent_id: agentId },
    });
  },

  addComment(id: number, body: string): Promise<CommentOut> {
    return request<CommentOut>(`/api/tickets/${id}/comments`, {
      method: "POST",
      body: { body },
    });
  },

  dashboard(): Promise<DashboardStats> {
    return request<DashboardStats>("/api/dashboard");
  },

  exportTickets(filters: TicketFilters = {}): Promise<string> {
    const params = new URLSearchParams();
    if (filters.search !== undefined && filters.search !== "") params.set("search", filters.search);
    if (filters.status !== undefined) params.set("status", filters.status);
    if (filters.priority !== undefined) params.set("priority", filters.priority);
    if (filters.assignee !== undefined) params.set("assignee", filters.assignee);
    if (filters.sort !== undefined) params.set("sort", filters.sort);
    if (filters.order !== undefined) params.set("order", filters.order);
    const qs = params.toString();
    return request<string>(`/api/export/tickets${qs ? `?${qs}` : ""}`);
  },

  health(): Promise<{ status: string }> {
    return request<{ status: string }>("/api/health", { auth: false });
  },
};
