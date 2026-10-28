"use client";

import { useActionState, useMemo, useState } from "react";

import { DialogField, DialogSelect, FormDialog } from "@/components/ui/dialog";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import {
  type SchoolInventoryActionState,
  archiveSchoolInventoryItemAction,
  createSchoolInventoryItemAction,
  recordSchoolInventoryMovementAction,
  updateSchoolInventoryItemAction,
} from "@/features/schools/inventory/actions";
import type {
  SchoolInventoryItemRow,
  SchoolInventoryMovementRow,
} from "@/features/schools/inventory/queries";
import {
  INVENTORY_CATEGORIES,
  INVENTORY_CONDITIONS,
} from "@/features/schools/inventory/validate";
import { SchoolLogo } from "@/features/schools/ui/school-logo";

const initial: SchoolInventoryActionState = { error: null, success: null };

type Props = {
  schoolId: string;
  schoolName: string;
  schoolLogoUrl?: string | null;
  items: SchoolInventoryItemRow[];
  movements: SchoolInventoryMovementRow[];
  canManage: boolean;
};

function categoryLabel(value: string): string {
  return INVENTORY_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

function conditionLabel(value: string): string {
  return INVENTORY_CONDITIONS.find((c) => c.value === value)?.label ?? value;
}

export function SchoolInventoryPanel({
  schoolId,
  schoolName,
  schoolLogoUrl = null,
  items,
  movements,
  canManage,
}: Props) {
  const [createState, createAction, createPending] = useActionState(
    createSchoolInventoryItemAction,
    initial,
  );
  const [updateState, updateAction, updatePending] = useActionState(
    updateSchoolInventoryItemAction,
    initial,
  );
  const [archiveState, archiveAction, archivePending] = useActionState(
    archiveSchoolInventoryItemAction,
    initial,
  );
  const [moveState, moveAction, movePending] = useActionState(
    recordSchoolInventoryMovementAction,
    initial,
  );

  const createDialog = useActionDialog(createState);
  const editDialog = useActionDialog(updateState);
  const archiveDialog = useActionDialog(archiveState);
  const moveDialog = useActionDialog(moveState);

  const [editing, setEditing] = useState<SchoolInventoryItemRow | null>(null);
  const [archiving, setArchiving] = useState<SchoolInventoryItemRow | null>(
    null,
  );
  const [moving, setMoving] = useState<{
    item: SchoolInventoryItemRow;
    type: "stock_in" | "issue";
  } | null>(null);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [conditionFilter, setConditionFilter] = useState("");
  const [stockFilter, setStockFilter] = useState<"all" | "low" | "in">("all");

  const itemNameById = useMemo(
    () => new Map(items.map((i) => [i.id, i.name])),
    [items],
  );

  const lowStockCount = items.filter((i) => i.lowStock).length;
  const totalUnits = items.reduce((sum, i) => sum + i.quantity, 0);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (categoryFilter && item.category !== categoryFilter) return false;
      if (conditionFilter && item.condition !== conditionFilter) return false;
      if (stockFilter === "low" && !item.lowStock) return false;
      if (stockFilter === "in" && item.lowStock) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        (item.sku?.toLowerCase().includes(q) ?? false) ||
        (item.location?.toLowerCase().includes(q) ?? false) ||
        categoryLabel(item.category).toLowerCase().includes(q)
      );
    });
  }, [items, search, categoryFilter, conditionFilter, stockFilter]);

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-3">
          <SchoolLogo
            schoolName={schoolName}
            logoUrl={schoolLogoUrl}
            size="sm"
          />
          <div>
            <p className="text-[0.65rem] font-semibold tracking-[0.2em] text-teal uppercase">
              {schoolName}
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">
              Inventory
            </h1>
            <p className="mt-1 text-sm text-muted">
              Track school stock, issues, and low-stock items.
            </p>
          </div>
        </div>
        {canManage ? (
          <button
            type="button"
            onClick={createDialog.openDialog}
            className="rounded-md bg-teal px-3 py-2 text-sm font-medium text-white"
          >
            Add item
          </button>
        ) : null}
      </header>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-line bg-paper-elevated p-4">
          <p className="text-xs font-semibold tracking-wide text-muted uppercase">
            Active items
          </p>
          <p className="mt-1 text-2xl font-semibold text-ink">{items.length}</p>
        </div>
        <div className="rounded-2xl border border-line bg-paper-elevated p-4">
          <p className="text-xs font-semibold tracking-wide text-muted uppercase">
            Units on hand
          </p>
          <p className="mt-1 text-2xl font-semibold text-ink">{totalUnits}</p>
        </div>
        <div className="rounded-2xl border border-line bg-paper-elevated p-4">
          <p className="text-xs font-semibold tracking-wide text-muted uppercase">
            Low stock
          </p>
          <p
            className={`mt-1 text-2xl font-semibold ${
              lowStockCount > 0 ? "text-amber-800" : "text-ink"
            }`}
          >
            {lowStockCount}
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-end gap-3">
        <label className="block text-sm">
          <span className="text-muted">Search</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, SKU, location"
            className="mt-1 block min-w-[14rem] rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink"
          />
        </label>
        <label className="block text-sm">
          <span className="text-muted">Category</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="mt-1 block min-w-[10rem] rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink"
          >
            <option value="">All</option>
            {INVENTORY_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-muted">Condition</span>
          <select
            value={conditionFilter}
            onChange={(e) => setConditionFilter(e.target.value)}
            className="mt-1 block min-w-[8rem] rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink"
          >
            <option value="">All</option>
            {INVENTORY_CONDITIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-muted">Stock</span>
          <select
            value={stockFilter}
            onChange={(e) =>
              setStockFilter(e.target.value as "all" | "low" | "in")
            }
            className="mt-1 block min-w-[8rem] rounded-md border border-line bg-paper-elevated px-3 py-2 text-ink"
          >
            <option value="all">All</option>
            <option value="low">Low stock</option>
            <option value="in">In stock</option>
          </select>
        </label>
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-line bg-paper-elevated">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-line bg-paper text-xs tracking-wide text-muted uppercase">
            <tr>
              <th className="px-3 py-3 font-medium">Item</th>
              <th className="px-3 py-3 font-medium">Category</th>
              <th className="px-3 py-3 font-medium">Qty</th>
              <th className="px-3 py-3 font-medium">Condition</th>
              <th className="px-3 py-3 font-medium">Location</th>
              <th className="px-3 py-3 font-medium">Status</th>
              {canManage ? (
                <th className="px-3 py-3 font-medium">Actions</th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={canManage ? 7 : 6}
                  className="px-3 py-10 text-center text-muted"
                >
                  {items.length === 0
                    ? "No inventory items yet."
                    : "No items match these filters."}
                </td>
              </tr>
            ) : (
              filtered.map((item) => (
                <tr key={item.id} className="border-b border-line/70 align-top">
                  <td className="px-3 py-3">
                    <p className="font-medium text-ink">{item.name}</p>
                    <p className="text-xs text-muted">
                      {item.sku ? `SKU ${item.sku} · ` : ""}
                      {item.unit}
                      {item.reorderLevel > 0
                        ? ` · reorder at ${item.reorderLevel}`
                        : ""}
                    </p>
                  </td>
                  <td className="px-3 py-3">
                    {categoryLabel(item.category)}
                  </td>
                  <td className="px-3 py-3 font-medium">{item.quantity}</td>
                  <td className="px-3 py-3">
                    {conditionLabel(item.condition)}
                  </td>
                  <td className="px-3 py-3 text-muted">
                    {item.location ?? "—"}
                  </td>
                  <td className="px-3 py-3">
                    {item.lowStock ? (
                      <span className="rounded bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-900">
                        Low stock
                      </span>
                    ) : (
                      <span className="text-xs text-muted">OK</span>
                    )}
                  </td>
                  {canManage ? (
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="text-xs font-medium text-teal hover:underline"
                          onClick={() => {
                            setMoving({ item, type: "stock_in" });
                            moveDialog.openDialog();
                          }}
                        >
                          Stock in
                        </button>
                        <button
                          type="button"
                          className="text-xs font-medium text-teal hover:underline"
                          onClick={() => {
                            setMoving({ item, type: "issue" });
                            moveDialog.openDialog();
                          }}
                        >
                          Issue
                        </button>
                        <button
                          type="button"
                          className="text-xs font-medium text-teal hover:underline"
                          onClick={() => {
                            setEditing(item);
                            editDialog.openDialog();
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="text-xs text-muted hover:underline"
                          onClick={() => {
                            setArchiving(item);
                            archiveDialog.openDialog();
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <section className="mt-8">
        <h2 className="text-sm font-semibold tracking-wide text-ink uppercase">
          Recent stock records
        </h2>
        <p className="mt-1 text-sm text-muted">
          Latest stock-in and issue entries.
        </p>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-line bg-paper-elevated">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-line bg-paper text-xs tracking-wide text-muted uppercase">
              <tr>
                <th className="px-3 py-3 font-medium">Date</th>
                <th className="px-3 py-3 font-medium">Item</th>
                <th className="px-3 py-3 font-medium">Type</th>
                <th className="px-3 py-3 font-medium">Qty</th>
                <th className="px-3 py-3 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {movements.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-8 text-center text-muted"
                  >
                    No stock movements recorded yet.
                  </td>
                </tr>
              ) : (
                movements.map((m) => (
                  <tr key={m.id} className="border-b border-line/70">
                    <td className="px-3 py-2 text-muted">{m.occurredOn}</td>
                    <td className="px-3 py-2 font-medium">
                      {itemNameById.get(m.itemId) ?? "Item"}
                    </td>
                    <td className="px-3 py-2 capitalize">
                      {m.movementType === "stock_in" ? "Stock in" : "Issue"}
                    </td>
                    <td className="px-3 py-2">{m.quantity}</td>
                    <td className="px-3 py-2 text-muted">{m.notes ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <FormDialog
        open={createDialog.open}
        onClose={createDialog.closeDialog}
        title="Add inventory item"
        description="Create a catalogue item with opening stock and reorder level."
        submitLabel="Add item"
        formAction={createAction}
        busy={createPending}
        dirty={createDialog.dirty}
        onDirtyChange={createDialog.setDirty}
        error={createState.error}
        size="lg"
      >
        <input type="hidden" name="school_id" value={schoolId} />
        <DialogField id="inv-name" name="name" label="Item name" required />
        <div className="grid grid-cols-2 gap-3">
          <DialogSelect
            id="inv-category"
            name="category"
            label="Category"
            required
            options={INVENTORY_CATEGORIES.map((c) => ({
              value: c.value,
              label: c.label,
            }))}
          />
          <DialogSelect
            id="inv-condition"
            name="condition"
            label="Condition"
            required
            defaultValue="good"
            options={INVENTORY_CONDITIONS.map((c) => ({
              value: c.value,
              label: c.label,
            }))}
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <DialogField
            id="inv-qty"
            name="quantity"
            label="Opening qty"
            required
            defaultValue="0"
            inputMode="numeric"
          />
          <DialogField
            id="inv-reorder"
            name="reorder_level"
            label="Reorder level"
            required
            defaultValue="5"
            inputMode="numeric"
          />
          <DialogField
            id="inv-unit"
            name="unit"
            label="Unit"
            defaultValue="pcs"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <DialogField id="inv-sku" name="sku" label="SKU (optional)" />
          <DialogField
            id="inv-location"
            name="location"
            label="Location (optional)"
          />
        </div>
        <DialogField id="inv-notes" name="notes" label="Notes (optional)" />
      </FormDialog>

      <FormDialog
        open={editDialog.open && editing !== null}
        onClose={() => {
          editDialog.closeDialog();
          setEditing(null);
        }}
        title="Edit inventory item"
        description="Update item details. Change stock with Stock in / Issue."
        submitLabel="Save item"
        formAction={updateAction}
        busy={updatePending}
        dirty={editDialog.dirty}
        onDirtyChange={editDialog.setDirty}
        error={updateState.error}
        size="lg"
      >
        <input type="hidden" name="school_id" value={schoolId} />
        <input type="hidden" name="item_id" value={editing?.id ?? ""} />
        <DialogField
          id="inv-edit-name"
          name="name"
          label="Item name"
          required
          defaultValue={editing?.name}
        />
        <div className="grid grid-cols-2 gap-3">
          <DialogSelect
            id="inv-edit-category"
            name="category"
            label="Category"
            required
            defaultValue={editing?.category}
            options={INVENTORY_CATEGORIES.map((c) => ({
              value: c.value,
              label: c.label,
            }))}
          />
          <DialogSelect
            id="inv-edit-condition"
            name="condition"
            label="Condition"
            required
            defaultValue={editing?.condition}
            options={INVENTORY_CONDITIONS.map((c) => ({
              value: c.value,
              label: c.label,
            }))}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <DialogField
            id="inv-edit-reorder"
            name="reorder_level"
            label="Reorder level"
            required
            defaultValue={String(editing?.reorderLevel ?? 0)}
            inputMode="numeric"
          />
          <DialogField
            id="inv-edit-unit"
            name="unit"
            label="Unit"
            defaultValue={editing?.unit ?? "pcs"}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <DialogField
            id="inv-edit-sku"
            name="sku"
            label="SKU (optional)"
            defaultValue={editing?.sku ?? ""}
          />
          <DialogField
            id="inv-edit-location"
            name="location"
            label="Location (optional)"
            defaultValue={editing?.location ?? ""}
          />
        </div>
        <DialogField
          id="inv-edit-notes"
          name="notes"
          label="Notes (optional)"
          defaultValue={editing?.notes ?? ""}
        />
      </FormDialog>

      <FormDialog
        open={archiveDialog.open && archiving !== null}
        onClose={() => {
          archiveDialog.closeDialog();
          setArchiving(null);
        }}
        title="Remove inventory item"
        description={`Archive “${archiving?.name ?? "item"}”? Stock history is kept.`}
        submitLabel="Remove item"
        formAction={archiveAction}
        busy={archivePending}
        error={archiveState.error}
        tone="danger"
      >
        <input type="hidden" name="school_id" value={schoolId} />
        <input type="hidden" name="item_id" value={archiving?.id ?? ""} />
      </FormDialog>

      <FormDialog
        open={moveDialog.open && moving !== null}
        onClose={() => {
          moveDialog.closeDialog();
          setMoving(null);
        }}
        title={
          moving?.type === "issue" ? "Issue stock" : "Record new stock"
        }
        description={
          moving
            ? `${moving.item.name} · on hand ${moving.item.quantity} ${moving.item.unit}`
            : undefined
        }
        submitLabel={moving?.type === "issue" ? "Issue" : "Add stock"}
        formAction={moveAction}
        busy={movePending}
        dirty={moveDialog.dirty}
        onDirtyChange={moveDialog.setDirty}
        error={moveState.error}
      >
        <input type="hidden" name="school_id" value={schoolId} />
        <input type="hidden" name="item_id" value={moving?.item.id ?? ""} />
        <input
          type="hidden"
          name="movement_type"
          value={moving?.type ?? "stock_in"}
        />
        <DialogField
          id="inv-move-qty"
          name="quantity"
          label="Quantity"
          required
          inputMode="numeric"
        />
        <DialogField
          id="inv-move-date"
          name="occurred_on"
          label="Date"
          type="date"
        />
        <DialogField
          id="inv-move-notes"
          name="notes"
          label="Notes (optional)"
          placeholder={
            moving?.type === "issue"
              ? "Issued to…"
              : "Purchase / donation / return"
          }
        />
      </FormDialog>
    </div>
  );
}
