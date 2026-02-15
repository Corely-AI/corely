import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react"; // Import ArrowLeft
import { crmApi } from "@/lib/crm-api";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  Input,
  Label,
  Textarea,
} from "@corely/ui";
import { toast } from "sonner"; // Use sonner consistently

export default function NewLeadPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    companyName: "",
    email: "",
    phone: "",
    source: "MANUAL",
    notes: "",
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => crmApi.createLead(data),
    onSuccess: () => {
      toast.success("Lead created successfully");
      void queryClient.invalidateQueries({ queryKey: ["leads"] });
      navigate("/crm/leads");
    },
    onError: (error) => {
      toast.error("Failed to create lead");
      console.error(error);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/crm/leads")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-h2" data-testid="crm-lead-form-header">
          New Lead
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lead Details</CardTitle>
          <CardDescription>Enter the information for the new potential customer.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" data-testid="crm-lead-form">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  data-testid="crm-lead-first-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  data-testid="crm-lead-last-name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name (Optional)</Label>
              <Input
                id="companyName"
                name="companyName"
                value={formData.companyName}
                onChange={handleChange}
                data-testid="crm-lead-company-name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  data-testid="crm-lead-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  data-testid="crm-lead-phone"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={4}
                data-testid="crm-lead-notes"
              />
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={createMutation.isPending} data-testid="crm-lead-save">
                {createMutation.isPending ? "Creating..." : "Create Lead"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
