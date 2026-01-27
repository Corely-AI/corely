import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { formatMoney } from "@/shared/lib/formatters";
import { cashManagementApi } from "@/lib/cash-management-api";
import { cashKeys } from "../queries";
import { toast } from "sonner";

export function DailyCloseScreen() {
  const { id } = useParams<{ id: string }>(); // registerId
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [businessDate, setBusinessDate] = useState(new Date().toISOString().split('T')[0]);
  const [countedStr, setCountedStr] = useState("");
  const [notes, setNotes] = useState("");

  if (!id) return null;

  const { data: regData, isLoading: regLoading } = useQuery({
    queryKey: cashKeys.registers.detail(id),
    queryFn: () => cashManagementApi.getRegister(id),
  });

  const register = regData?.register;

  const submitMutation = useMutation({
    mutationFn: (data: { counted: number; notes: string; date: string }) => 
      cashManagementApi.submitDailyClose(id, {
        tenantId: "current", 
        registerId: id,
        countedBalanceCents: data.counted,
        notes: data.notes,
        businessDate: data.date,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cashKeys.registers.detail(id) });
      queryClient.invalidateQueries({ queryKey: cashKeys.dailyCloses.list(id, {}) });
      toast.success("Daily close submitted");
      navigate(`/cash-registers/${id}`);
    },
    onError: (err: any) => {
        toast.error("Failed to close: " + (err.response?.data?.message || err.message));
    }
  });

  if (regLoading) return <div className="p-6">Loading...</div>;
  if (!register) return <div className="p-6">Not found</div>;

  const expectedCents = register.currentBalanceCents;
  const countedCents = countedStr ? Math.round(parseFloat(countedStr) * 100) : 0;
  const difference = countedCents - expectedCents;

  const handleSubmit = () => {
    if (!countedStr) {
      toast.error("Please enter counted amount");
      return;
    }
    submitMutation.mutate({ counted: countedCents, notes, date: businessDate });
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
       <div className="flex items-center gap-4 mb-4">
          <Button variant="ghost" onClick={() => navigate(-1)}>
             <ArrowLeft className="h-4 w-4 mr-2" />
             Back
          </Button>
          <h1 className="text-2xl font-bold">Daily Customer Close</h1>
       </div>
       
       <Card>
          <CardHeader>
             <CardTitle>Reconcile: {register.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
             <div className="grid grid-cols-2 gap-4">
                <div>
                   <Label className="text-muted-foreground">Business Date</Label>
                   <Input 
                     type="date" 
                     value={businessDate} 
                     onChange={(e) => setBusinessDate(e.target.value)}
                   />
                </div>
                <div>
                   <Label className="text-muted-foreground">Expected Balance</Label>
                   <div className="text-2xl font-bold py-1">
                      {formatMoney(expectedCents, register.currency)}
                   </div>
                </div>
             </div>

             <div className="space-y-2">
                <Label>Counted Cash ({register.currency})</Label>
                <Input 
                   type="number" 
                   step="0.01" 
                   className="text-lg"
                   placeholder="0.00"
                   value={countedStr}
                   onChange={(e) => setCountedStr(e.target.value)}
                   autoFocus
                />
             </div>

             {countedStr && (
                <div className={`p-4 rounded-md flex items-center gap-3 ${difference === 0 ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
                    {difference === 0 ? <Check className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                    <div className="flex-1">
                        <div className="font-medium">{difference === 0 ? "Perfect Match" : "Discrepancy Detected"}</div>
                        <div className="text-sm">
                           Difference: {difference > 0 ? "+" : ""}{formatMoney(difference, register.currency)}
                           {difference !== 0 && " (A difference entry will be created automatically)"}
                        </div>
                    </div>
                </div>
             )}

             <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea 
                   placeholder="Any notes about this close..." 
                   value={notes}
                   onChange={(e) => setNotes(e.target.value)}
                />
             </div>
          </CardContent>
          <CardFooter className="flex justify-between">
             <Button variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
             <Button onClick={handleSubmit} disabled={!countedStr || submitMutation.isPending}>
                {submitMutation.isPending ? "Submitting..." : "Submit Close"}
             </Button>
          </CardFooter>
       </Card>
    </div>
  );
}
