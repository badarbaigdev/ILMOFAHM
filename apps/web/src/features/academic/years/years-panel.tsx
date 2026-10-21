"use client";

import { useActionState } from "react";

import {
  type AcademicActionState,
  createAcademicTermAction,
  createAcademicYearAction,
  updateAcademicYearAction,
} from "@/features/academic/years/actions";
import type {
  AcademicTermRow,
  AcademicYearRow,
} from "@/features/academic/years/queries";

const initialState: AcademicActionState = { error: null, success: null };

type YearsPanelProps = {
  organizationId: string;
  years: AcademicYearRow[];
  terms: AcademicTermRow[];
  canManage: boolean;
};

function CreateYearForm({ organizationId }: { organizationId: string }) {
  const [state, formAction, pending] = useActionState(
    createAcademicYearAction,
    initialState,
  );

  return (
    <section aria-labelledby="create-year-heading" className="mt-8">
      <h3
        id="create-year-heading"
        className="text-sm font-semibold tracking-wide text-ink uppercase"
      >
        Add academic year
      </h3>
      <form action={formAction} className="mt-4 max-w-md space-y-3" noValidate>
        <input type="hidden" name="organization_id" value={organizationId} />
        <div className="space-y-1.5">
          <label
            htmlFor="new-year-name"
            className="block text-sm font-medium text-ink"
          >
            Name
          </label>
          <input
            id="new-year-name"
            name="name"
            type="text"
            required
            placeholder="2026-27"
            className="w-full rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink outline-none focus-visible:border-teal"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label
              htmlFor="new-year-starts"
              className="block text-sm font-medium text-ink"
            >
              Starts
            </label>
            <input
              id="new-year-starts"
              name="starts_on"
              type="date"
              required
              className="w-full rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink outline-none focus-visible:border-teal"
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="new-year-ends"
              className="block text-sm font-medium text-ink"
            >
              Ends
            </label>
            <input
              id="new-year-ends"
              name="ends_on"
              type="date"
              required
              className="w-full rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink outline-none focus-visible:border-teal"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor="new-year-status"
            className="block text-sm font-medium text-ink"
          >
            Status
          </label>
          <select
            id="new-year-status"
            name="status"
            defaultValue="planned"
            className="w-full rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink outline-none focus-visible:border-teal"
          >
            <option value="planned">Planned</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            name="make_current"
            className="rounded border-line"
          />
          Set as current year
        </label>
        {state.error ? (
          <p role="alert" className="text-sm text-red-700">
            {state.error}
          </p>
        ) : null}
        {state.success ? (
          <p role="status" className="text-sm text-teal">
            {state.success}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-teal px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending ? "Creating…" : "Create year"}
        </button>
      </form>
    </section>
  );
}

function YearCard({
  year,
  terms,
  organizationId,
  canManage,
}: {
  year: AcademicYearRow;
  terms: AcademicTermRow[];
  organizationId: string;
  canManage: boolean;
}) {
  const [updateState, updateAction, updatePending] = useActionState(
    updateAcademicYearAction,
    initialState,
  );
  const [termState, termAction, termPending] = useActionState(
    createAcademicTermAction,
    initialState,
  );

  return (
    <li className="border-t border-line/60 py-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display text-xl text-ink">
          {year.name}
          {year.isCurrent ? (
            <span className="ml-2 text-xs font-sans font-semibold tracking-wide text-teal uppercase">
              Current
            </span>
          ) : null}
        </h3>
        <p className="text-sm text-muted">
          {year.startsOn} → {year.endsOn} · {year.status}
        </p>
      </div>

      {canManage ? (
        <form
          action={updateAction}
          className="mt-4 grid max-w-2xl gap-3 sm:grid-cols-2"
          noValidate
        >
          <input type="hidden" name="academic_year_id" value={year.id} />
          <input type="hidden" name="organization_id" value={organizationId} />
          <div className="space-y-1.5 sm:col-span-2">
            <label
              htmlFor={`year-name-${year.id}`}
              className="block text-sm font-medium text-ink"
            >
              Name
            </label>
            <input
              id={`year-name-${year.id}`}
              name="name"
              type="text"
              required
              defaultValue={year.name}
              className="w-full rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink outline-none focus-visible:border-teal"
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor={`year-starts-${year.id}`}
              className="block text-sm font-medium text-ink"
            >
              Starts
            </label>
            <input
              id={`year-starts-${year.id}`}
              name="starts_on"
              type="date"
              required
              defaultValue={year.startsOn}
              className="w-full rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink outline-none focus-visible:border-teal"
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor={`year-ends-${year.id}`}
              className="block text-sm font-medium text-ink"
            >
              Ends
            </label>
            <input
              id={`year-ends-${year.id}`}
              name="ends_on"
              type="date"
              required
              defaultValue={year.endsOn}
              className="w-full rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink outline-none focus-visible:border-teal"
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor={`year-status-${year.id}`}
              className="block text-sm font-medium text-ink"
            >
              Status
            </label>
            <select
              id={`year-status-${year.id}`}
              name="status"
              defaultValue={year.status}
              className="w-full rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink outline-none focus-visible:border-teal"
            >
              <option value="planned">Planned</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <label className="flex items-end gap-2 pb-2 text-sm text-ink">
            <input
              type="checkbox"
              name="make_current"
              defaultChecked={year.isCurrent}
              className="rounded border-line"
            />
            Current year
          </label>
          {updateState.error ? (
            <p role="alert" className="text-sm text-red-700 sm:col-span-2">
              {updateState.error}
            </p>
          ) : null}
          {updateState.success ? (
            <p role="status" className="text-sm text-teal sm:col-span-2">
              {updateState.success}
            </p>
          ) : null}
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={updatePending}
              className="rounded-md border border-line px-4 py-2 text-sm font-medium text-ink disabled:opacity-60"
            >
              {updatePending ? "Saving…" : "Save year"}
            </button>
          </div>
        </form>
      ) : null}

      <div className="mt-6">
        <h4 className="text-sm font-semibold tracking-wide text-ink uppercase">
          Terms
        </h4>
        {terms.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No terms yet.</p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm text-ink">
            {terms.map((term) => (
              <li key={term.id}>
                {term.sortOrder}. {term.name} ({term.startsOn} → {term.endsOn})
              </li>
            ))}
          </ul>
        )}

        {canManage ? (
          <form
            action={termAction}
            className="mt-4 grid max-w-2xl gap-3 sm:grid-cols-2"
            noValidate
          >
            <input type="hidden" name="academic_year_id" value={year.id} />
            <input
              type="hidden"
              name="organization_id"
              value={organizationId}
            />
            <div className="space-y-1.5 sm:col-span-2">
              <label
                htmlFor={`term-name-${year.id}`}
                className="block text-sm font-medium text-ink"
              >
                Term name
              </label>
              <input
                id={`term-name-${year.id}`}
                name="name"
                type="text"
                required
                placeholder="Term 1"
                className="w-full rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink outline-none focus-visible:border-teal"
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor={`term-starts-${year.id}`}
                className="block text-sm font-medium text-ink"
              >
                Starts
              </label>
              <input
                id={`term-starts-${year.id}`}
                name="starts_on"
                type="date"
                required
                className="w-full rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink outline-none focus-visible:border-teal"
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor={`term-ends-${year.id}`}
                className="block text-sm font-medium text-ink"
              >
                Ends
              </label>
              <input
                id={`term-ends-${year.id}`}
                name="ends_on"
                type="date"
                required
                className="w-full rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink outline-none focus-visible:border-teal"
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor={`term-sort-${year.id}`}
                className="block text-sm font-medium text-ink"
              >
                Sort order
              </label>
              <input
                id={`term-sort-${year.id}`}
                name="sort_order"
                type="number"
                min={1}
                defaultValue={terms.length + 1}
                required
                className="w-full rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink outline-none focus-visible:border-teal"
              />
            </div>
            {termState.error ? (
              <p role="alert" className="text-sm text-red-700 sm:col-span-2">
                {termState.error}
              </p>
            ) : null}
            {termState.success ? (
              <p role="status" className="text-sm text-teal sm:col-span-2">
                {termState.success}
              </p>
            ) : null}
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={termPending}
                className="rounded-md border border-line px-4 py-2 text-sm font-medium text-ink disabled:opacity-60"
              >
                {termPending ? "Adding…" : "Add term"}
              </button>
            </div>
          </form>
        ) : null}
      </div>
    </li>
  );
}

export function YearsPanel({
  organizationId,
  years,
  terms,
  canManage,
}: YearsPanelProps) {
  const termsByYear = new Map<string, AcademicTermRow[]>();
  for (const term of terms) {
    const list = termsByYear.get(term.academicYearId) ?? [];
    list.push(term);
    termsByYear.set(term.academicYearId, list);
  }

  return (
    <section aria-labelledby="academic-years-heading" className="mt-12">
      <h2
        id="academic-years-heading"
        className="font-display text-2xl tracking-tight text-ink"
      >
        Academic years
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Define sessions and optional terms used by school and academy workflows.
      </p>

      {years.length === 0 ? (
        <p className="mt-6 text-sm text-muted">No academic years yet.</p>
      ) : (
        <ul className="mt-2">
          {years.map((year) => (
            <YearCard
              key={year.id}
              year={year}
              terms={termsByYear.get(year.id) ?? []}
              organizationId={organizationId}
              canManage={canManage}
            />
          ))}
        </ul>
      )}

      {canManage ? <CreateYearForm organizationId={organizationId} /> : null}
    </section>
  );
}
