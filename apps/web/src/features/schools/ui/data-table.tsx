"use client";

import {
  type ReactNode,
  useId,
  useMemo,
  useState,
} from "react";

export const STATUS_BADGE_CLASS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-800",
  enrolled: "bg-emerald-100 text-emerald-800",
  paid: "bg-emerald-100 text-emerald-800",
  inactive: "bg-orange-100 text-orange-800",
  suspended: "bg-orange-100 text-orange-800",
  withdrawn: "bg-orange-100 text-orange-800",
  due: "bg-amber-100 text-amber-900",
  partial: "bg-sky-100 text-sky-900",
  cancelled: "bg-stone-200 text-stone-700",
  archived: "bg-stone-200 text-stone-700",
  pending: "bg-amber-100 text-amber-900",
  under_review: "bg-sky-100 text-sky-900",
  information_requested: "bg-amber-100 text-amber-900",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-800",
  trial: "bg-sky-100 text-sky-900",
  past_due: "bg-orange-100 text-orange-800",
  grace: "bg-amber-100 text-amber-900",
  expired: "bg-stone-200 text-stone-700",
  pending_setup: "bg-amber-100 text-amber-900",
  revoked: "bg-red-100 text-red-800",
};

export function StatusBadge({ status }: { status: string }) {
  const label = status.replace(/_/g, " ");
  return (
    <span
      className={`inline-flex rounded-md px-2.5 py-1 text-xs font-medium capitalize ${STATUS_BADGE_CLASS[status] ?? "bg-stone-100 text-stone-700"}`}
    >
      {label}
    </span>
  );
}

export function PersonAvatar({ name }: { name: string }) {
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?";

  return (
    <span
      aria-hidden
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#dce8e6] text-xs font-semibold text-teal"
    >
      {initials}
    </span>
  );
}

export function PersonCell({
  name,
  secondary,
}: {
  name: string;
  secondary?: string | null;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <PersonAvatar name={name} />
      <div className="min-w-0">
        <p className="truncate font-medium text-ink">{name}</p>
        {secondary ? (
          <p className="truncate text-xs text-muted">{secondary}</p>
        ) : null}
      </div>
    </div>
  );
}

export function formatListDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatSerial(index: number): string {
  return String(index + 1).padStart(2, "0");
}

export type SchoolDataColumn<T> = {
  id: string;
  header: string;
  sortable?: boolean;
  className?: string;
  headerClassName?: string;
  cell: (row: T, index: number) => ReactNode;
};

type SchoolDataTableProps<T> = {
  rows: T[];
  columns: SchoolDataColumn<T>[];
  rowKey: (row: T) => string;
  searchPlaceholder?: string;
  searchText?: (row: T) => string;
  filterOptions?: { value: string; label: string }[];
  filterValue?: (row: T) => string;
  emptyMessage?: string;
  exportFileName?: string;
  selectable?: boolean;
  toolbarEnd?: ReactNode;
};

export function SchoolDataTable<T>({
  rows,
  columns,
  rowKey,
  searchPlaceholder = "Search",
  searchText,
  filterOptions,
  filterValue,
  emptyMessage = "No records yet.",
  exportFileName = "export",
  selectable = true,
  toolbarEnd,
}: SchoolDataTableProps<T>) {
  const searchId = useId();
  const filterId = useId();
  const rowsId = useId();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (filter && filterValue && filterValue(row) !== filter) return false;
      if (!q || !searchText) return true;
      return searchText(row).toLowerCase().includes(q);
    });
  }, [rows, query, filter, filterValue, searchText]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const start = safePage * pageSize;
  const pageRows = filtered.slice(start, start + pageSize);
  const end = filtered.length === 0 ? 0 : Math.min(start + pageSize, filtered.length);

  const allPageSelected =
    pageRows.length > 0 && pageRows.every((row) => selected.has(rowKey(row)));

  function toggleAllPage() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        for (const row of pageRows) next.delete(rowKey(row));
      } else {
        for (const row of pageRows) next.add(rowKey(row));
      }
      return next;
    });
  }

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function exportCsv() {
    const headers = columns.map((c) => c.header);
    const lines = [
      headers.join(","),
      ...filtered.map((row, index) =>
        columns
          .map((col) => {
            const raw = col.cell(row, start + index);
            const text =
              typeof raw === "string" || typeof raw === "number"
                ? String(raw)
                : extractText(raw);
            return csvEscape(text);
          })
          .join(","),
      ),
    ];
    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${exportFileName}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="rounded-xl border border-line bg-paper-elevated shadow-sm">
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
        <button
          type="button"
          onClick={exportCsv}
          disabled={filtered.length === 0}
          className="inline-flex items-center gap-1.5 rounded-md border border-line bg-paper px-3 py-1.5 text-sm text-ink disabled:opacity-50"
        >
          <ExportIcon />
          Export
        </button>
        <div className="min-w-[12rem] flex-1">
          <label htmlFor={searchId} className="sr-only">
            {searchPlaceholder}
          </label>
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
            placeholder={searchPlaceholder}
            className="w-full rounded-md border border-line bg-paper px-3 py-1.5 text-sm text-ink outline-none focus-visible:border-teal"
          />
        </div>
        {filterOptions && filterOptions.length > 0 ? (
          <div>
            <label htmlFor={filterId} className="sr-only">
              Filter
            </label>
            <select
              id={filterId}
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
                setPage(0);
              }}
              className="rounded-md border border-line bg-paper px-3 py-1.5 text-sm text-ink"
            >
              <option value="">Filter</option>
              {filterOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        {toolbarEnd}
        <div className="ml-auto flex flex-wrap items-center gap-2 text-xs text-muted">
          <label htmlFor={rowsId} className="inline-flex items-center gap-1.5">
            Rows per page:
            <select
              id={rowsId}
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(0);
              }}
              className="rounded border border-line bg-paper px-1.5 py-1 text-ink"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
            </select>
          </label>
          <span>
            {filtered.length === 0 ? "0–0 of 0" : `${start + 1}–${end} of ${filtered.length}`}
          </span>
          <div className="flex items-center">
            <button
              type="button"
              aria-label="Previous page"
              disabled={safePage <= 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="rounded p-1 hover:bg-paper disabled:opacity-40"
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="Next page"
              disabled={safePage >= pageCount - 1}
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              className="rounded p-1 hover:bg-paper disabled:opacity-40"
            >
              ›
            </button>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-muted">{emptyMessage}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-paper text-xs tracking-wide text-muted uppercase">
              <tr>
                {selectable ? (
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={allPageSelected}
                      onChange={toggleAllPage}
                      aria-label="Select all on this page"
                      className="rounded border-line"
                    />
                  </th>
                ) : null}
                <th className="px-3 py-3 font-medium">SL</th>
                {columns.map((col) => (
                  <th
                    key={col.id}
                    className={`px-4 py-3 font-medium ${col.headerClassName ?? ""}`}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line/70">
              {pageRows.map((row, index) => {
                const id = rowKey(row);
                return (
                  <tr key={id} className="hover:bg-paper/70">
                    {selectable ? (
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selected.has(id)}
                          onChange={() => toggleRow(id)}
                          aria-label={`Select row ${formatSerial(start + index)}`}
                          className="rounded border-line"
                        />
                      </td>
                    ) : null}
                    <td className="px-3 py-3 text-muted">
                      {formatSerial(start + index)}
                    </td>
                    {columns.map((col) => (
                      <td
                        key={col.id}
                        className={`px-4 py-3 align-middle ${col.className ?? ""}`}
                      >
                        {col.cell(row, start + index)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ExportIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M12 18v-6" />
      <path d="M9 15l3 3 3-3" />
    </svg>
  );
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function extractText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join(" ");
  if (typeof node === "object" && "props" in node) {
    const props = node.props as { children?: ReactNode };
    return extractText(props.children);
  }
  return "";
}

export function RowActionsMenu({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();

  return (
    <div className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        className="rounded p-1.5 text-muted hover:bg-paper hover:text-ink"
      >
        <span className="sr-only">Actions</span>
        <span aria-hidden className="text-lg leading-none">
          ⋮
        </span>
      </button>
      {open ? (
        <>
          <button
            type="button"
            aria-label="Close actions"
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div
            id={menuId}
            role="menu"
            className="absolute right-0 z-20 mt-1 min-w-[8rem] rounded-md border border-line bg-paper-elevated py-1 shadow-md"
          >
            <div onClick={() => setOpen(false)}>{children}</div>
          </div>
        </>
      ) : null}
    </div>
  );
}
