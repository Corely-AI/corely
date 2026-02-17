import React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { List, Play, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle, Button } from "@corely/ui";
import { crmApi } from "@/lib/crm-api";
import { EmptyState } from "@/shared/components/EmptyState";

export default function SequencesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { data: sequences } = useQuery({
    queryKey: ["sequences"],
    queryFn: () => crmApi.listSequences(),
  });

  const sequenceList = sequences || [];

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in" data-testid="crm-sequences-page">
      <div className="flex items-center justify-between">
        <h1 className="text-h1 text-foreground" data-testid="crm-sequences-header">
          Sequences
        </h1>
        <Button
          variant="accent"
          onClick={() => navigate("/crm/sequences/new")}
          data-testid="crm-sequences-create"
        >
          <Plus className="h-4 w-4" />
          New Sequence
        </Button>
      </div>

      {sequenceList.length === 0 ? (
        <Card data-testid="crm-sequences-empty">
          <CardContent className="p-0">
            <EmptyState
              icon={List}
              title="No sequences found"
              description="Sequences allow you to automate follow-ups."
            />
          </CardContent>
        </Card>
      ) : (
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          data-testid="crm-sequences-list"
        >
          {sequenceList.map((seq) => (
            <Card
              key={seq.id}
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => {}}
              data-testid={`crm-sequence-row-${seq.id}`}
            >
              <CardHeader className="flex flex-row items-center space-x-4 p-4">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Play className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">{seq.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{seq.steps?.length || 0} Steps</p>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {seq.description || "No description provided."}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
