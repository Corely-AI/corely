# List View Implementation Standard

This guide defines the standard pattern for implementing List Pages (CRUD Lists) in the Corely frontend. It ensures consistency in UI, behavior, persistence, and code structure.

## Core Components (List Kit)

We use a set of shared components located in `@/shared/list-kit` and `@/shared/crud`.

- **`CrudListPageLayout`**: The main layout wrapper.
- **`ListToolbar`**: handles search, sort, and filter toggle.
- **`FilterPanel`**: A Drawer sidebar for configuring filters.
- **`ActiveFilterChips`**: Display of currently applied filters.
- **`useListUrlState`**: Hook for calculating state and syncing with URL/LocalStorage.
- **`ConfirmDeleteDialog`**: Standard dialog for destructive actions.
- **`Checkbox`**: For bulk selection.

## State Management

List state is managed via `useListUrlState` which handles:

- **Keys**: `q` (search), `page`, `pageSize`, `sort`, `filters`.
- **Persistence**: Provide a `storageKey` (e.g., `invoices-list-v1`) to auto-save/restore state from LocalStorage.

```tsx
const [state, setUrlState] = useListUrlState(
  { pageSize: 20, sort: "createdAt:desc" },
  { storageKey: "resource-list-v1" } // Required
);
```

## Standard Pattern Rules

### 1. Conditional Filter Rendering

To avoid visual glitches (empty containers), the `ActiveFilterChips` must be conditionally passed to the `filters` prop of `CrudListPageLayout` ONLY when filters exist.

**Do NOT** place `ActiveFilterChips` inside `ListToolbar` children.

### 2. Bulk Actions

Implement bulk selection using local React state (`Set<string>`) and a Checkbox column.
Display a "Bulk Action Bar" above the table when items are selected. This bar usually contains a `ConfirmDeleteDialog`.

### 3. Filters

Use `FilterPanel` for all filtering logic (except Search/Sort which live in Toolbar).
Define `filterFields` using `useMemo`.

## Implementation Template

```tsx
import React, { useMemo, useState } from "react";
import { Checkbox } from "@/shared/ui/checkbox";
import {
  CrudListPageLayout,
  ConfirmDeleteDialog
} from "@/shared/crud";
import {
  ListToolbar,
  ActiveFilterChips,
  useListUrlState,
  FilterPanel
} from "@/shared/list-kit";

export default function ResourceListPage() {
  // 1. Local State
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // 2. Data State (Persistent)
  const [state, setUrlState] = useListUrlState(
    { pageSize: 20, sort: "date:desc" },
    { storageKey: "resource-list-v1" }
  );

  // 3. Filter Definitions
  const filterFields = useMemo(() => [ /* ... */ ], []);

  // 4. Queries & Mutations
  const { data } = useQuery(...);
  const bulkDeleteMutation = useMutation(...);

  // 5. Helpers
  const toggleSelection = (id: string) => { /* ... */ };
  const allSelected = ...;

  return (
    <>
    <CrudListPageLayout
      title="Resources"
      primaryAction={ <Button>Add</Button> }
      // 6. Toolbar (Self-closing)
      toolbar={
        <ListToolbar
          search={state.q}
          onSearchChange={...}
          onFilterClick={() => setIsFilterOpen(true)}
          filterCount={state.filters?.length}
          // ... sort props
        />
      }
      // 7. Conditional Chips
      filters={
        (state.filters?.length ?? 0) > 0 ? (
          <ActiveFilterChips
            filters={state.filters ?? []}
            onRemove={...}
            onClearAll={...}
          />
        ) : undefined
      }
    >
      {/* 8. Bulk Action Bar */}
      {selectedIds.size > 0 ? (
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/40 rounded-t-md">
           <div className="text-sm text-muted-foreground">{selectedIds.size} selected</div>
           <ConfirmDeleteDialog
             trigger={<Button variant="destructive">Delete</Button>}
             ...
           />
        </div>
      ) : null}

      {/* 9. Table with Checkboxes */}
      <div className="rounded-md border border-border">
         <Table>
            <TableHeader>
               <TableRow>
                   <TableHead className="w-12 px-4">
                       <Checkbox checked={allSelected} ... />
                   </TableHead>
                   {/* ... headers */}
               </TableRow>
            </TableHeader>
            <TableBody>
               {data.map(item => (
                   <TableRow key={item.id}>
                       <TableCell className="px-4">
                           <Checkbox checked={selectedIds.has(item.id)} ... />
                       </TableCell>
                       {/* ... cells */}
                   </TableRow>
               ))}
            </TableBody>
         </Table>
      </div>
    </CrudListPageLayout>

    {/* 10. Filter Drawer */}
    <FilterPanel
      open={isFilterOpen}
      onOpenChange={setIsFilterOpen}
      filters={state.filters}
      fields={filterFields}
      onApply={...}
    />
    </>
  );
}
```
