import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import type { DealDto } from "@corely/contracts";
import { Link } from "react-router-dom";

interface DealMetaSidebarProps {
  deal: DealDto;
}

export const DealMetaSidebar: React.FC<DealMetaSidebarProps> = ({ deal }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Relationships</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground">Party</p>
            <p className="font-medium">{deal.partyId || "—"}</p>
          </div>
          {deal.partyId && (
            <Button variant="outline" size="sm" asChild>
              <Link to={`/customers/${deal.partyId}`}>Open</Link>
            </Button>
          )}
        </div>
        <div>
          <p className="text-muted-foreground">Owner</p>
          <p className="font-medium">{deal.ownerUserId || "Unassigned"}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Status</p>
          <p className="font-medium">{deal.status}</p>
        </div>
        <div className="space-y-1">
          <p className="text-muted-foreground">Tags</p>
          {deal.tags?.length ? (
            <div className="flex flex-wrap gap-2">
              {deal.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No tags</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
