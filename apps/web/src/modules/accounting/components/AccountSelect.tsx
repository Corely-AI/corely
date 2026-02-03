import React, { type FC, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/shared/lib/utils";
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
import { useAccounts } from "../queries";
import type { AccountType } from "@corely/contracts";

interface AccountSelectProps {
  value?: string;
  onValueChange: (accountId: string) => void;
  placeholder?: string;
  filterType?: AccountType;
  disabled?: boolean;
  className?: string;
}

/**
 * Searchable account selector with account code and name display
 */
export const AccountSelect: FC<AccountSelectProps> = ({
  value,
  onValueChange,
  placeholder,
  filterType,
  disabled = false,
  className,
}) => {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const { data, isLoading } = useAccounts({ limit: 1000, type: filterType, isActive: true });

  const accounts = useMemo(() => data?.accounts || [], [data]);
  const resolvedPlaceholder = placeholder ?? t("accounting.accountSelect.placeholder");

  const selectedAccount = useMemo(
    () => accounts.find((acc) => acc.id === value),
    [accounts, value]
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || isLoading}
          className={cn("w-full justify-between", className)}
        >
          {selectedAccount ? (
            <span className="flex items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">
                {selectedAccount.code}
              </span>
              <span>{selectedAccount.name}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">{resolvedPlaceholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0">
        <Command>
          <CommandInput placeholder={t("accounting.accountSelect.searchPlaceholder")} />
          <CommandList>
            <CommandEmpty>{t("accounting.accountSelect.empty")}</CommandEmpty>
            <CommandGroup>
              {accounts.map((account) => (
                <CommandItem
                  key={account.id}
                  value={`${account.code} ${account.name}`}
                  onSelect={() => {
                    onValueChange(account.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === account.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground min-w-[60px]">
                      {account.code}
                    </span>
                    <span>{account.name}</span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {t(`accounting.accountTypes.${account.type.toLowerCase()}`)}
                    </span>
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
