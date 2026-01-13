import React, { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Skeleton } from "@/shared/components/Skeleton";
import { DealHeader } from "../components/DealHeader";
import { DealDetailsCard } from "../components/DealDetailsCard";
import { DealQuickActions } from "../components/DealQuickActions";
import { DealMetaSidebar } from "../components/DealMetaSidebar";
import { ActivityComposer } from "../components/ActivityComposer";
import { TimelineView } from "../components/TimelineView";
import {
  type TimelineFilter,
  useAddDealActivity,
  useChangeDealStage,
  useDeal,
  useDealTimeline,
  useMarkDealLost,
  useMarkDealWon,
  usePipelineStages,
  useUpdateDeal,
} from "../hooks/useDeal";
import { toast } from "sonner";

const DealSkeleton = () => (
  <div className="space-y-4">
    <div className="flex justify-between items-center">
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-8 w-24" />
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Skeleton className="h-64 lg:col-span-2" />
      <Skeleton className="h-64" />
    </div>
  </div>
);

export default function DealDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [detailsEditing, setDetailsEditing] = useState(false);
  const [timelineFilter, setTimelineFilter] = useState<TimelineFilter>("ALL");
  const [lostReason, setLostReason] = useState("");
  const [lostDialogOpen, setLostDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const stages = usePipelineStages();
  const { data: deal, isLoading, isError, refetch } = useDeal(id);
  const { data: timelineData, isLoading: timelineLoading } = useDealTimeline(id, timelineFilter);

  const updateDeal = useUpdateDeal();
  const changeStage = useChangeDealStage();
  const markWon = useMarkDealWon();
  const markLost = useMarkDealLost();
  const addActivity = useAddDealActivity();
  const isOpen = deal?.status === "OPEN";

  const handleUpdateDetails = (patch: {
    notes?: string;
    probability?: number;
    expectedCloseDate?: string;
  }) => {
    if (!deal?.id) {return;}
    updateDeal.mutate({ dealId: deal.id, patch });
  };

  const handleQuickNote = (subject: string, body?: string) => {
    if (!deal?.id) {return;}
    addActivity.mutate({
      dealId: deal.id,
      payload: {
        type: "NOTE",
        subject,
        body,
        partyId: deal.partyId ?? undefined,
      },
    });
  };

  const handleDelete = () => {
    if (!deal?.id) {return;}
    markLost.mutate(
      { dealId: deal.id, reason: lostReason || "Deleted" },
      {
        onSuccess: () => {
          navigate("/crm/deals");
        },
      }
    );
  };

  const handleMarkWon = () => {
    if (!deal || !isOpen) {
      toast.error("Deal is already closed");
      return;
    }
    markWon.mutate(deal.id);
  };

  const handleMarkLost = () => {
    if (!deal || !isOpen) {
      toast.error("Deal is already closed");
      return;
    }
    setLostDialogOpen(true);
  };

  const handleChangeStage = (stageId: string) => {
    if (!deal) {return;}
    if (!isOpen) {
      toast.error("Deal is already closed");
      return;
    }
    changeStage.mutate({ dealId: deal.id, stageId });
  };

  const timelineItems = useMemo(() => timelineData?.items ?? [], [timelineData]);

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 animate-fade-in">
        <DealSkeleton />
      </div>
    );
  }

  if (isError || !deal) {
    return (
      <div className="p-6 lg:p-8 space-y-4">
        <Card>
          <CardContent className="p-6 space-y-4">
            <p className="text-lg font-semibold">Failed to load deal</p>
            <p className="text-muted-foreground">
              Check your connection or permissions and try again.
            </p>
            <div className="flex gap-3">
              <Button variant="accent" onClick={() => refetch()}>
                Retry
              </Button>
              <Button variant="outline" onClick={() => navigate("/crm/deals")}>
                Back to deals
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <DealHeader
        deal={deal}
        stages={stages}
        onEdit={() => setDetailsEditing(true)}
        onChangeStage={handleChangeStage}
        onMarkWon={handleMarkWon}
        onMarkLost={handleMarkLost}
        onDelete={() => setDeleteDialogOpen(true)}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <DealDetailsCard
            deal={deal}
            onSave={handleUpdateDetails}
            isSaving={updateDeal.isPending}
            editing={detailsEditing}
            onEditingChange={setDetailsEditing}
          />

          <Card>
            <CardContent className="p-0">
              <Tabs
                value={timelineFilter}
                onValueChange={(val) => setTimelineFilter(val as TimelineFilter)}
              >
                <div className="flex items-center justify-between px-6 pt-6">
                  <div>
                    <p className="text-lg font-semibold">Timeline</p>
                    <p className="text-sm text-muted-foreground">Activities and stage changes.</p>
                  </div>
                  <TabsList>
                    <TabsTrigger value="ALL">All</TabsTrigger>
                    <TabsTrigger value="NOTE">Notes</TabsTrigger>
                    <TabsTrigger value="CALL">Calls</TabsTrigger>
                    <TabsTrigger value="MEETING">Meetings</TabsTrigger>
                    <TabsTrigger value="TASK">Tasks</TabsTrigger>
                    <TabsTrigger value="STAGE">Stage</TabsTrigger>
                  </TabsList>
                </div>
                <TabsContent value={timelineFilter}>
                  <div className="p-6">
                    {timelineLoading ? (
                      <Skeleton className="h-24" />
                    ) : (
                      <TimelineView items={timelineItems} />
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <ActivityComposer dealId={deal.id} partyId={deal.partyId} />
        </div>

        <div className="space-y-6">
          <DealQuickActions
            deal={deal}
            stages={stages}
            onChangeStage={handleChangeStage}
            onMarkWon={handleMarkWon}
            onMarkLost={handleMarkLost}
            onQuickNote={handleQuickNote}
            onDelete={() => setDeleteDialogOpen(true)}
            disabled={changeStage.isPending || markWon.isPending || markLost.isPending || !isOpen}
          />
          <DealMetaSidebar deal={deal} />
        </div>
      </div>

      <Dialog open={lostDialogOpen} onOpenChange={setLostDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark deal as lost</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Provide an optional reason to track why this deal was lost.
            </p>
            <Input
              placeholder="Reason (optional)"
              value={lostReason}
              onChange={(e) => setLostReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLostDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                markLost.mutate({ dealId: deal.id, reason: lostReason });
                setLostDialogOpen(false);
                setLostReason("");
              }}
            >
              Mark lost
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (open) {
            setLostReason("Deleted");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete deal</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the deal as lost with reason "Deleted". You can still find it in
              records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                handleDelete();
                setDeleteDialogOpen(false);
              }}
            >
              Delete deal
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
