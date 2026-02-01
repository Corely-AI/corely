import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Plus, Download, CreditCard, FileText } from "lucide-react";

export const ShortcutsCard = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Shortcuts</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          className="h-auto py-3 flex flex-col items-center gap-2 justify-center"
          asChild
        >
          <Link to="/tax/filings/new">
            <Plus className="h-5 w-5" />
            <span className="text-xs">Create Filing</span>
          </Link>
        </Button>
        <Button
          variant="outline"
          className="h-auto py-3 flex flex-col items-center gap-2 justify-center"
          asChild
        >
          <Link to="/tax/documents">
            <Download className="h-5 w-5" />
            <span className="text-xs">Export Report</span>
          </Link>
        </Button>
        <Button
          variant="outline"
          className="h-auto py-3 flex flex-col items-center gap-2 justify-center"
          asChild
        >
          <Link to="/tax/settings#submission">
            <CreditCard className="h-5 w-5" />
            <span className="text-xs">Pay Taxes</span>
          </Link>
        </Button>
        <Button
          variant="outline"
          className="h-auto py-3 flex flex-col items-center gap-2 justify-center"
          asChild
        >
          <Link to="/tax/documents">
            <FileText className="h-5 w-5" />
            <span className="text-xs">Documents</span>
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
};
