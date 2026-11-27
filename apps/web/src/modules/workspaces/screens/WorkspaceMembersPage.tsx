import { useUiCopy } from "@corely/web-shared/shared/i18n/ui-copy";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { UserPlus, Shield, Mail, Loader2 } from "lucide-react";
import { Button } from "@corely/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@corely/ui";
import { Input } from "@corely/ui";
import { Label } from "@corely/ui";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableLoadingSkeleton,
  TableRow,
} from "@corely/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@corely/ui";
import { useWorkspace } from "@/shared/workspaces/workspace-provider";
import { getActiveWorkspaceId } from "@/shared/workspaces/workspace-store";
import { workspacesApi } from "@/shared/workspaces/workspaces-api";
import { useToast } from "@corely/ui";
import type { WorkspaceMemberDto } from "@corely/contracts";

export const WorkspaceMembersPage: React.FC = () => {
  const uiCopy = useUiCopy("ui.workspaces-workspacememberspage");
  const { t } = useTranslation();
  const { activeWorkspaceId } = useWorkspace();
  const { toast } = useToast();
  const [memberList, setMemberList] = useState<{
    workspaceId: string;
    members: WorkspaceMemberDto[];
    failed?: true;
  }>();
  const currentList = memberList?.workspaceId === activeWorkspaceId ? memberList : undefined;
  const isMembersLoading = Boolean(activeWorkspaceId && !currentList);
  const [isInviting, setIsInviting] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: "", role: "MEMBER" });

  useEffect(() => {
    if (!activeWorkspaceId) {
      return;
    }
    let current = true;
    const load = async () => {
      try {
        const result = await workspacesApi.listMembers(activeWorkspaceId);
        if (current) {
          setMemberList({ workspaceId: activeWorkspaceId, members: result.members ?? [] });
        }
      } catch (error) {
        if (!current) {
          return;
        }
        setMemberList({ workspaceId: activeWorkspaceId, members: [], failed: true });
        toast({
          title: "Unable to load members",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
      }
    };
    void load();
    return () => {
      current = false;
    };
  }, [activeWorkspaceId, toast]);

  const sendInvite = async () => {
    if (!activeWorkspaceId || !inviteForm.email) {
      return;
    }
    setIsInviting(true);
    try {
      await workspacesApi.inviteMember(activeWorkspaceId, {
        email: inviteForm.email,
        role: inviteForm.role as any,
      });
      toast({ title: "Invite sent", description: inviteForm.email });
      setInviteForm({ email: "", role: "MEMBER" });
      const result = await workspacesApi.listMembers(activeWorkspaceId);
      if (getActiveWorkspaceId() === activeWorkspaceId) {
        setMemberList({ workspaceId: activeWorkspaceId, members: result.members ?? [] });
      }
    } catch (error) {
      toast({
        title: "Invite failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h1">{uiCopy("members-access")}</h1>
          <p className="text-muted-foreground">{uiCopy("invite-teammates-and-manage")}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {" " + uiCopy("invite-member")}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2 md:col-span-2">
            <Label>{uiCopy("email")}</Label>
            <Input
              placeholder="teammate@company.com"
              value={inviteForm.email}
              onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>{uiCopy("role")}</Label>
            <Select
              value={inviteForm.role}
              onValueChange={(v) => setInviteForm((f) => ({ ...f, role: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="OWNER">{uiCopy("owner")}</SelectItem>
                <SelectItem value="ADMIN">{uiCopy("admin")}</SelectItem>
                <SelectItem value="MEMBER">{uiCopy("member")}</SelectItem>
                <SelectItem value="ACCOUNTANT">{uiCopy("accountant")}</SelectItem>
                <SelectItem value="VIEWER">{uiCopy("viewer")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={sendInvite}
            disabled={isMembersLoading || isInviting || !inviteForm.email}
            className="md:col-span-3"
          >
            {isInviting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Mail className="h-4 w-4 mr-2" />
            )}
            {uiCopy("send-invite")}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{uiCopy("members")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{uiCopy("name")}</TableHead>
                <TableHead>{uiCopy("email")}</TableHead>
                <TableHead>{uiCopy("role")}</TableHead>
                <TableHead>{uiCopy("status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentList?.members.map((member) => (
                <TableRow key={member.membershipId}>
                  <TableCell>{member.name ?? uiCopy("pending-invite")}</TableCell>
                  <TableCell>{member.email ?? "—"}</TableCell>
                  <TableCell className="uppercase text-xs font-semibold">{member.role}</TableCell>
                  <TableCell className="capitalize text-sm">
                    {member.status.toLowerCase()}
                  </TableCell>
                </TableRow>
              ))}
              {isMembersLoading ? (
                <TableLoadingSkeleton columns={4} label={uiCopy("loading-members")} />
              ) : currentList?.failed ? (
                <TableRow>
                  <TableCell colSpan={4}>
                    <p role="alert">{t("common.error")}</p>
                  </TableCell>
                </TableRow>
              ) : !currentList?.members.length ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground text-center">
                    {uiCopy("no-members-yet")}
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
