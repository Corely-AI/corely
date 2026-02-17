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
import { crmApi } from "@/lib/crm-api";
import { toast } from "sonner";

interface SequenceEnrollmentCardProps {
  entityType: "lead" | "party";
  entityId: string;
}

export function SequenceEnrollmentCard({ entityType, entityId }: SequenceEnrollmentCardProps) {
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
      toast.success("Enrolled in sequence successfully");
      setSelectedSequenceId(null);
    },
    onError: (error) => {
      toast.error("Failed to enroll");
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
          Automation
        </CardTitle>
        <CardDescription>
          Enroll this {entityType} in a sequence to automate follow-ups.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoadingSequences ? (
          <div className="flex justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : sequenceList.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            No sequences available. Create one first.
          </div>
        ) : (
          <div className="flex gap-2">
            <Select value={selectedSequenceId || ""} onValueChange={setSelectedSequenceId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a sequence..." />
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
              {enrollMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enroll"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
