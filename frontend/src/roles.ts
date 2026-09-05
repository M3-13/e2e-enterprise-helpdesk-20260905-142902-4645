import type { Role } from "./api/client";

export const ROLES: Role[] = ["melder", "agent", "admin"];

export const ROLE_LABELS: Record<Role, string> = {
  melder: "Melder",
  agent: "Agent",
  admin: "Admin",
};
