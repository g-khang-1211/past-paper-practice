import type { ReactNode } from "react";

export type NavItem = {
  href: string;
  label: string;
  key: "dashboard" | "mistakes" | "analytics" | "settings" | "support";
};

export const primaryNavigation: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", key: "dashboard" },
  { href: "/mistakes", label: "Mistakes", key: "mistakes" },
  { href: "/analytics", label: "Analytics", key: "analytics" },
];

export const secondaryNavigation: NavItem[] = [
  { href: "#", label: "Settings", key: "settings" },
  { href: "#", label: "Support", key: "support" },
];

export const dashboardRecommendations = [
  {
    id: "entropy-review",
    title: "Kinematics Recovery",
    focus: "Focus: velocity-time graphs",
    accent: "tertiary" as const,
  },
  {
    id: "wave-review",
    title: "Algebra Under Pressure",
    focus: "Focus: multi-step rearrangement",
    accent: "secondary" as const,
  },
];

export const demoRecentPapers = [
  {
    id: "demo-1",
    title: "Vectors & Mechanics Paper 4",
    subtitle: "Last worked 2h ago",
    score: 88,
    tag: "MATH-04",
  },
  {
    id: "demo-2",
    title: "Quadratics & Functions Set",
    subtitle: "Completed yesterday",
    score: 92,
    tag: "MATH-02",
  },
];
