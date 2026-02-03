import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@corely/ui";
import { Badge } from "@corely/ui";

type StageOption = {
  id: string;
  name: string;
  isClosed?: boolean;
};

interface DealStageSelectProps {
  value: string;
  stages: StageOption[];
  onChange: (stageId: string) => void;
  disabled?: boolean;
  showBadge?: boolean;
}

export const DealStageSelect: React.FC<DealStageSelectProps> = ({
  value,
  stages,
  onChange,
  disabled,
  showBadge = false,
}) => {
  const current = stages.find((stage) => stage.id === value);

  return (
    <Select onValueChange={onChange} value={value} disabled={disabled}>
      <SelectTrigger className="min-w-[180px]">
        {showBadge ? (
          <Badge variant={current?.isClosed ? "outline" : "secondary"}>
            {current?.name ?? value}
          </Badge>
        ) : (
          <SelectValue placeholder="Select stage" />
        )}
      </SelectTrigger>
      <SelectContent>
        {stages.map((stage) => (
          <SelectItem key={stage.id} value={stage.id}>
            {stage.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
