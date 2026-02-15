import { LeadDto } from "@corely/contracts";
import { Card, CardContent } from "@corely/ui";
import { User, RefreshCcw, CheckCircle, XCircle } from "lucide-react";

interface LeadCardProps {
  lead: LeadDto;
  onClick: () => void;
}

const statusColors: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-700",
  QUALIFIED: "bg-yellow-100 text-yellow-700",
  DISQUALIFIED: "bg-red-100 text-red-700",
  CONVERTED: "bg-green-100 text-green-700",
};

export function LeadCard({ lead, onClick }: LeadCardProps) {
  const statusColor = statusColors[lead.status] || "bg-gray-100 text-gray-700";

  return (
    <Card
      onClick={onClick}
      className="cursor-pointer hover:shadow-md transition-shadow"
      data-testid={`crm-leads-row-${lead.id}`}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-semibold text-lg text-foreground">
              {lead.companyName || `${lead.firstName || ""} ${lead.lastName || ""}` || "Unnamed Lead"}
            </h3>
            {lead.companyName && (lead.firstName || lead.lastName) && (
              <p className="text-sm text-muted-foreground">
                {lead.firstName} {lead.lastName}
              </p>
            )}
          </div>
          <span className={`px-2 py-1 rounded-full text-xs font-medium uppercase ${statusColor}`}>
            {lead.status}
          </span>
        </div>

        <div className="flex gap-4 text-sm text-muted-foreground">
          {lead.email && (
            <div className="flex items-center gap-1">
              <span>{lead.email}</span>
            </div>
          )}
          {lead.phone && (
             <div className="flex items-center gap-1">
              <span>{lead.phone}</span>
            </div>
          )}
        </div>
        
        <div className="text-xs text-muted-foreground pt-2 border-t">
            Source: {lead.source} • Created {new Date(lead.createdAt).toLocaleDateString()}
        </div>
      </CardContent>
    </Card>
  );
}
