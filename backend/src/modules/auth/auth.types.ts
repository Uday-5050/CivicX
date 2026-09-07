export const roles = ["citizen", "university", "industry", "admin"] as const;
export type Role = (typeof roles)[number];
export type AccountStatus = "pending" | "active" | "suspended";
export type ClientType = "web" | "mobile";
