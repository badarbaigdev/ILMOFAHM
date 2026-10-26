import Link from "next/link";

import { SchoolAdminPreviewShell } from "@/features/schools/ui-preview/admin-shell";
import { assertUiPreviewAllowed } from "@/features/schools/ui-preview/guard";
import {
  previewAttendanceMix,
  previewEvents,
  previewFeeBars,
  previewLeaveRequests,
  previewNotices,
  previewStatCards,
  previewTopStudents,
  previewTopTeachers,
} from "@/features/schools/ui-preview/sms-fixtures";

export const metadata = {
  title: "Dashboard · UI preview",
};

const TONE: Record<string, string> = {
  orange: "bg-orange-100 text-orange-700",
  blue: "bg-sky-100 text-sky-700",
  teal: "bg-teal/15 text-teal",
  green: "bg-emerald-100 text-emerald-700",
  purple: "bg-violet-100 text-violet-700",
  cyan: "bg-cyan-100 text-cyan-800",
};

export default function SchoolDashboardUiPreviewPage() {
  assertUiPreviewAllowed();

  return (
    <SchoolAdminPreviewShell
      pathname="/ui-preview/school"
      title="Dashboard"
      breadcrumbs={["Dashboard"]}
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {previewStatCards.map((card) => (
          <article
            key={card.label}
            className="rounded-xl border border-line bg-paper-elevated p-4"
          >
            <div
              className={`inline-flex rounded-md px-2 py-1 text-xs font-medium ${TONE[card.tone]}`}
            >
              {card.label}
            </div>
            <p className="mt-3 text-2xl font-semibold tracking-tight text-ink">
              {card.value}
            </p>
            <p className="mt-1 text-xs text-muted">{card.delta}</p>
          </article>
        ))}
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        <section className="rounded-xl border border-line bg-paper-elevated p-5 xl:col-span-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-ink">Revenue statistics</h2>
            <p className="text-xs text-muted">
              Total fee vs collected (preview)
            </p>
          </div>
          <div className="mt-6 flex h-48 items-end gap-2">
            {previewFeeBars.map((bar) => (
              <div
                key={bar.month}
                className="flex flex-1 flex-col items-center gap-1"
              >
                <div className="flex h-40 w-full flex-col justify-end gap-0.5">
                  <div
                    className="w-full rounded-t bg-teal/80"
                    style={{ height: `${bar.total}%` }}
                    title={`Total ${bar.total}`}
                  />
                  <div
                    className="w-full rounded-b bg-orange-400"
                    style={{ height: `${bar.collected * 0.45}%` }}
                    title={`Collected ${bar.collected}`}
                  />
                </div>
                <span className="text-[0.65rem] text-muted">{bar.month}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-4 text-xs text-muted">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-teal" /> Total fee
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-orange-400" /> Collected
            </span>
          </div>
        </section>

        <section className="rounded-xl border border-line bg-paper-elevated p-5">
          <h2 className="text-sm font-semibold text-ink">Student attendance</h2>
          <div className="mt-6 space-y-3">
            {previewAttendanceMix.map((row) => (
              <div key={row.label}>
                <div className="flex justify-between text-xs">
                  <span className="text-muted">{row.label}</span>
                  <span className="font-medium text-ink">{row.pct}%</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-line/70">
                  <div
                    className={`h-full rounded-full ${row.color}`}
                    style={{ width: `${row.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <section className="rounded-xl border border-line bg-paper-elevated p-5">
          <h2 className="text-sm font-semibold text-ink">Calendar</h2>
          <p className="mt-1 text-xs text-muted">December 2025 (preview)</p>
          <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[0.65rem] text-muted">
            {["S", "M", "T", "W", "T", "F", "S"].map((d) => (
              <span key={d}>{d}</span>
            ))}
            {Array.from({ length: 31 }, (_, i) => (
              <span
                key={i}
                className={
                  [12, 14, 18].includes(i + 1)
                    ? "rounded bg-teal/15 py-1 font-medium text-teal"
                    : "py-1"
                }
              >
                {i + 1}
              </span>
            ))}
          </div>
          <ul className="mt-4 space-y-3">
            {previewEvents.map((event) => (
              <li key={event.title} className="text-sm">
                <p className="font-medium text-ink">{event.title}</p>
                <p className="text-xs text-muted">
                  Day {event.day} · {event.time}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-line bg-paper-elevated p-5">
          <h2 className="text-sm font-semibold text-ink">Notice board</h2>
          <ul className="mt-4 space-y-4">
            {previewNotices.map((notice) => (
              <li key={notice.author + notice.date} className="text-sm">
                <p className="font-medium text-ink">{notice.author}</p>
                <p className="mt-0.5 text-muted">{notice.body}</p>
                <p className="mt-1 text-xs text-muted">{notice.date}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-line bg-paper-elevated p-5">
          <h2 className="text-sm font-semibold text-ink">Leave requests</h2>
          <ul className="mt-4 space-y-4">
            {previewLeaveRequests.map((req) => (
              <li key={req.name} className="text-sm">
                <p className="font-medium text-ink">{req.name}</p>
                <p className="text-xs text-muted">
                  {req.role} · {req.days}
                </p>
                <p className="mt-0.5 text-xs text-muted">Applied {req.applied}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-line bg-paper-elevated p-5">
          <h2 className="text-sm font-semibold text-ink">User overview</h2>
          <div className="mt-6 flex items-center justify-center">
            <div className="relative flex h-36 w-36 items-center justify-center rounded-full bg-[conic-gradient(#0f766e_0_60%,#38bdf8_60%_90%,#f59e0b_90%_100%)]">
              <div className="flex h-20 w-20 flex-col items-center justify-center rounded-full bg-paper-elevated text-center">
                <span className="text-lg font-semibold text-ink">901</span>
                <span className="text-[0.65rem] text-muted">people</span>
              </div>
            </div>
          </div>
          <ul className="mt-4 space-y-1 text-xs text-muted">
            <li>Students 60% · 750</li>
            <li>Teachers 30% · 86</li>
            <li>Staff 10% · 65</li>
          </ul>
        </section>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-line bg-paper-elevated p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">Top teachers</h2>
            <Link
              href="/ui-preview/school/teachers"
              className="text-xs text-teal no-underline hover:underline"
            >
              View all
            </Link>
          </div>
          <ul className="mt-4 divide-y divide-line/70">
            {previewTopTeachers.map((t) => (
              <li
                key={t.email}
                className="flex items-center justify-between gap-3 py-3 text-sm"
              >
                <div>
                  <p className="font-medium text-ink">{t.name}</p>
                  <p className="text-xs text-muted">{t.email}</p>
                </div>
                <span className="rounded-full bg-teal/10 px-2.5 py-1 text-xs text-teal">
                  {t.subject}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-line bg-paper-elevated p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">Top students</h2>
            <Link
              href="/ui-preview/school/students"
              className="text-xs text-teal no-underline hover:underline"
            >
              View all
            </Link>
          </div>
          <ul className="mt-4 divide-y divide-line/70">
            {previewTopStudents.map((s) => (
              <li
                key={s.name}
                className="flex items-center justify-between gap-3 py-3 text-sm"
              >
                <div>
                  <p className="font-medium text-ink">{s.name}</p>
                  <p className="text-xs text-muted">{s.classLabel}</p>
                </div>
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-teal/30 text-xs font-semibold text-teal">
                  {s.marks}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </SchoolAdminPreviewShell>
  );
}
