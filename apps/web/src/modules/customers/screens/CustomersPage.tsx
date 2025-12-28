import React from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Users, Plus, Mail, Phone } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { getCustomers } from "@/shared/mock/mockApi";
import { EmptyState } from "@/shared/components/EmptyState";

export default function CustomersPage() {
  const { t } = useTranslation();
  const { data: customers } = useQuery({ queryKey: ["customers"], queryFn: getCustomers });

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-h1 text-foreground">{t("customers.title")}</h1>
        <Button variant="accent">
          <Plus className="h-4 w-4" />
          {t("customers.addCustomer")}
        </Button>
      </div>

      {customers?.length === 0 ? (
        <EmptyState
          icon={Users}
          title={t("customers.noCustomers")}
          description={t("customers.noCustomersDescription")}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {customers?.map((customer) => (
            <Card key={customer.id} variant="interactive">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center text-accent font-semibold">
                    {(customer.company || customer.name).substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate">
                      {customer.company || customer.name}
                    </h3>
                    <p className="text-sm text-muted-foreground truncate">{customer.name}</p>
                    <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      <span className="truncate">{customer.email}</span>
                    </div>
                    {customer.phone && (
                      <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        <span>{customer.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
