import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronDown } from "lucide-react";
import type { PartyRoleType } from "@corely/contracts";
import { Button } from "@corely/ui";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@corely/ui";
import { Popover, PopoverContent, PopoverTrigger } from "@corely/ui";
import { customersApi } from "@/lib/customers-api";
import { cn } from "@/shared/lib/utils";

interface PartyPickerProps {
  value?: string;
  onValueChange: (partyId: string) => void;
  role?: PartyRoleType;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
  pageSize?: number;
  allowClear?: boolean;
  testId?: string;
}

const DEFAULT_PAGE_SIZE = 100;

export function PartyPicker({
  value,
  onValueChange,
  role,
  placeholder = "Select party",
  searchPlaceholder = "Search by name or partyId...",
  emptyText = "No parties found",
  disabled = false,
  className,
  pageSize = DEFAULT_PAGE_SIZE,
  allowClear = true,
  testId,
}: PartyPickerProps) {
  const [open, setOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");
  const trimmedSearchTerm = searchTerm.trim();
  const isSearching = trimmedSearchTerm.length >= 2;

  const listQuery = useQuery({
    queryKey: ["party-picker", "list", { role: role ?? null, pageSize }],
    queryFn: () => customersApi.listCustomers({ pageSize, role }),
    staleTime: 60_000,
  });

  const searchQuery = useQuery({
    queryKey: ["party-picker", "search", { role: role ?? null, q: trimmedSearchTerm, pageSize }],
    queryFn: () => customersApi.searchCustomers({ q: trimmedSearchTerm, pageSize, role }),
    enabled: isSearching,
    staleTime: 30_000,
  });

  const selectedPartyQuery = useQuery({
    queryKey: ["party-picker", "selected", value ?? null],
    queryFn: () => customersApi.getCustomer(value as string),
    enabled: Boolean(value),
    staleTime: 60_000,
  });

  const options = React.useMemo(() => {
    return isSearching ? (searchQuery.data?.customers ?? []) : (listQuery.data?.customers ?? []);
  }, [isSearching, listQuery.data?.customers, searchQuery.data?.customers]);

  const selectedParty = React.useMemo(() => {
    if (!value) {
      return null;
    }
    return options.find((option) => option.id === value) ?? selectedPartyQuery.data ?? null;
  }, [options, selectedPartyQuery.data, value]);

  const isLoading = listQuery.isLoading || (isSearching && searchQuery.isFetching);

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setSearchTerm("");
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          type="button"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          data-testid={testId}
          className={cn("w-full justify-between", className)}
        >
          <span className={cn("truncate text-left", !selectedParty && "text-muted-foreground")}>
            {selectedParty ? selectedParty.displayName : placeholder}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-70" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput
            value={searchTerm}
            onValueChange={setSearchTerm}
            placeholder={searchPlaceholder}
          />
          <CommandList>
            <CommandEmpty>
              {isLoading
                ? "Loading parties..."
                : isSearching
                  ? `No results for "${trimmedSearchTerm}"`
                  : emptyText}
            </CommandEmpty>
            <CommandGroup>
              {allowClear && value ? (
                <CommandItem
                  value="clear-selected-party"
                  onSelect={() => {
                    onValueChange("");
                    setOpen(false);
                    setSearchTerm("");
                  }}
                >
                  Clear selection
                </CommandItem>
              ) : null}
              {options.map((party) => (
                <CommandItem
                  key={party.id}
                  value={`${party.displayName} ${party.id}`}
                  onSelect={() => {
                    onValueChange(party.id);
                    setOpen(false);
                    setSearchTerm("");
                  }}
                >
                  <Check
                    className={cn("mr-2 h-4 w-4", value === party.id ? "opacity-100" : "opacity-0")}
                  />
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate">{party.displayName}</span>
                    <span className="truncate text-xs text-muted-foreground">{party.id}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
