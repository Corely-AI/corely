import { PageLoadingSkeleton } from "@corely/web-shared/shared/components/page-loading-skeleton";
import { useUiCopy } from "@corely/web-shared/shared/i18n/ui-copy";
import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Play, Loader2, Check } from "lucide-react";
import {
  Button,
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@corely/ui";
import { crmApi } from "@corely/web-shared/lib/crm-api";
import { toast } from "sonner";

interface SequenceEnrollmentCardProps {
  entityType: "lead" | "party" | "deal";
  entityId: string;
}

export function SequenceEnrollmentCard({ entityType, entityId }: SequenceEnrollmentCardProps) {
  const uiCopy = useUiCopy("ui.crm-sequenceenrollmentcard");
  const [selectedSequenceId, setSelectedSequenceId] = useState<string | null>(null);

  const { data: sequences, isLoading: isLoadingSequences } = useQuery({
    queryKey: ["sequences"],
    queryFn: () => crmApi.listSequences(),
  });

  const enrollMutation = useMutation({
    mutationFn: (sequenceId: string) =>
      crmApi.enrollEntity({
        sequenceId,
        entityType,
        entityId,
      }),
    onSuccess: () => {
      toast.success(uiCopy("enrolled-in-sequence-successfully"));
      setSelectedSequenceId(null);
    },
    onError: (error) => {
      toast.error(uiCopy("failed-to-enroll"));
      console.error(error);
    },
  });

  const handleEnroll = () => {
    if (selectedSequenceId) {
      enrollMutation.mutate(selectedSequenceId);
    }
  };

  const sequenceList = sequences || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Play className="h-4 w-4" />
          {uiCopy("automation")}
        </CardTitle>
        <CardDescription>
          {uiCopy("enroll-this") + " "}
          {entityType}
          {" " + uiCopy("in-a-sequence-to")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoadingSequences ? (
          <PageLoadingSkeleton variant="list" />
        ) : sequenceList.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            {uiCopy("no-sequences-available-create")}
          </div>
        ) : (
          <div className="flex gap-2">
            <Select value={selectedSequenceId || ""} onValueChange={setSelectedSequenceId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={uiCopy("select-a-sequence")} />
              </SelectTrigger>
              <SelectContent>
                {sequenceList.map((seq: any) => (
                  <SelectItem key={seq.id} value={seq.id}>
                    {seq.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleEnroll}
              disabled={!selectedSequenceId || enrollMutation.isPending}
            >
              {enrollMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                uiCopy("enroll")
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
