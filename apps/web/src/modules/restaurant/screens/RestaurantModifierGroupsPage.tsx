import React, { useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Checkbox,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@corely/ui";
import { sonnerToast } from "@corely/ui";
import type { ModifierSelectionMode, UpsertRestaurantModifierGroupInput } from "@corely/contracts";
import {
  useRestaurantModifierGroups,
  useUpsertRestaurantModifierGroup,
} from "../hooks/use-restaurant-admin";

function parseOptions(optionsText: string): UpsertRestaurantModifierGroupInput["options"] {
  return optionsText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [name, priceText] = line.split("|").map((part) => part.trim());
      return {
        name,
        priceDeltaCents: priceText ? Number(priceText) || 0 : 0,
        sortOrder: index,
      };
    });
}

export default function RestaurantModifierGroupsPage() {
  const groupsQuery = useRestaurantModifierGroups();
  const saveGroup = useUpsertRestaurantModifierGroup();

  const [name, setName] = useState("");
  const [selectionMode, setSelectionMode] = useState<ModifierSelectionMode>("MULTI");
  const [isRequired, setIsRequired] = useState(false);
  const [linkedItemIds, setLinkedItemIds] = useState("");
  const [optionsText, setOptionsText] = useState("");

  const previewOptions = useMemo(() => parseOptions(optionsText), [optionsText]);

  const submit = async () => {
    if (!name.trim()) {
      return;
    }
    try {
      await saveGroup.mutateAsync({
        name: name.trim(),
        selectionMode,
        isRequired,
        sortOrder: 0,
        linkedCatalogItemIds: linkedItemIds
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
        options: previewOptions,
      });
      setName("");
      setSelectionMode("MULTI");
      setIsRequired(false);
      setLinkedItemIds("");
      setOptionsText("");
      sonnerToast.success("Modifier group saved");
    } catch (error) {
      sonnerToast.error(error instanceof Error ? error.message : "Failed to save modifier group");
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-foreground">Modifier groups</h1>
        <p className="text-sm text-muted-foreground">
          Reuse shared catalog items and attach restaurant-specific modifiers.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px,1fr]">
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="modifier-name">Name</Label>
              <Input
                id="modifier-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Burger add-ons"
              />
            </div>
            <div className="space-y-2">
              <Label>Selection mode</Label>
              <Select
                value={selectionMode}
                onValueChange={(value) => setSelectionMode(value as ModifierSelectionMode)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MULTI">MULTI</SelectItem>
                  <SelectItem value="SINGLE">SINGLE</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-3 text-sm text-foreground">
              <Checkbox
                checked={isRequired}
                onCheckedChange={(checked) => setIsRequired(Boolean(checked))}
              />
              Required selection
            </label>
            <div className="space-y-2">
              <Label htmlFor="modifier-linked-items">Linked catalog item ids</Label>
              <Input
                id="modifier-linked-items"
                value={linkedItemIds}
                onChange={(event) => setLinkedItemIds(event.target.value)}
                placeholder="item_1,item_2"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="modifier-options">Options</Label>
              <Textarea
                id="modifier-options"
                rows={8}
                value={optionsText}
                onChange={(event) => setOptionsText(event.target.value)}
                placeholder={"Cheese|100\nBacon|250\nNo onion|0"}
              />
              <p className="text-xs text-muted-foreground">
                One line per option as `name|priceDeltaCents`.
              </p>
            </div>
            <Button onClick={() => void submit()} disabled={saveGroup.isPending}>
              Save modifier group
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {groupsQuery.data?.items.map((group) => (
            <Card key={group.id}>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">{group.name}</h2>
                    <p className="text-sm text-muted-foreground">
                      {group.selectionMode} · {group.isRequired ? "required" : "optional"}
                    </p>
                  </div>
                  <Badge variant="secondary">
                    {group.linkedCatalogItemIds.length} linked items
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  {group.options.map((option) => (
                    <Badge key={option.id} variant="outline">
                      {option.name} · {option.priceDeltaCents}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
          {!groupsQuery.isLoading && (groupsQuery.data?.items.length ?? 0) === 0 ? (
            <Card>
              <CardContent className="p-6 text-sm text-muted-foreground">
                No modifier groups configured yet.
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
