import type { ConsoleNavGroup } from "@/components/shell/ConsoleShell";

export const SCHOOL_CONSOLE_NAV: ConsoleNavGroup[] = [
  {
    label: "Overview",
    items: [
      {
        href: "/school",
        label: "Dashboard",
        exact: true,
      },
    ],
  },
  {
    label: "People",
    items: [
      { href: "/school/students", label: "Students" },
      { href: "/school/teachers", label: "Teachers" },
      { href: "/school/guardians", label: "Guardians" },
      { href: "/school/members", label: "Staff & roles" },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/school/academic", label: "Classes" },
      { href: "/school/timetable", label: "Timetable" },
      { href: "/school/attendance", label: "Attendance" },
      { href: "/school/exams", label: "Exams" },
      { href: "/school/fees", label: "Fees" },
    ],
  },
  {
    label: "School",
    items: [
      { href: "/school/settings", label: "School profile" },
      { href: "/school/account", label: "My account" },
      { href: "/school/setup", label: "Setup" },
    ],
  },
];

export const PLATFORM_CONSOLE_NAV: ConsoleNavGroup[] = [
  {
    label: "Overview",
    items: [
      {
        href: "/platform",
        label: "Dashboard",
        exact: true,
      },
    ],
  },
  {
    label: "Schools",
    items: [
      { href: "/platform/requests", label: "Registration requests" },
      { href: "/platform/schools", label: "Schools" },
    ],
  },
  {
    label: "Billing",
    items: [
      { href: "/platform/plans", label: "Plans" },
      { href: "/platform/subscriptions", label: "Subscriptions" },
    ],
  },
  {
    label: "Access",
    items: [
      { href: "/platform/password-recovery", label: "Password recovery" },
      { href: "/platform/operators", label: "Operators" },
    ],
  },
];
