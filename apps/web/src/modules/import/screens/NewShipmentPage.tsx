import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Ship } from "lucide-react";
import { Button, Card, CardContent } from "@corely/ui";

export default function NewShipmentPage() {
  const navigate = useNavigate();

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate("/import/shipments")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-3">
          <Ship className="h-8 w-8 text-muted-foreground" />
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Import / Shipments / New
            </p>
            <h1 className="text-h1 text-foreground">Create Shipment</h1>
            <p className="text-sm text-muted-foreground">Start a new import shipment draft</p>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            Shipment creation is not available in this screen yet.
          </p>
          <Button variant="outline" onClick={() => navigate("/import/shipments")}>
            Back to shipments
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
