import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { buildListQuery } from "@/lib/api-query-utils";
import { bookingServiceKeys } from "../queries";
import { useCrudUrlState, CrudListPageLayout, CrudRowActions } from "@/shared/crud";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Badge,
  Button,
} from "@corely/ui";
import { Link } from "react-router-dom";
import { PlusIcon, CopyIcon } from "lucide-react";
import type { ServiceOfferingDto } from "@corely/contracts";

export const ServicesPage = () => {
  const [params] = useCrudUrlState();

  const { data, isLoading } = useQuery({
    queryKey: bookingServiceKeys.list(params),
    queryFn: async () => {
      const qs = buildListQuery(params).toString();
      const endpoint = qs ? `/api/booking/services?${qs}` : "/api/booking/services";
      const res = await apiClient.get<{ items: ServiceOfferingDto[]; pageInfo: any }>(endpoint);
      return res;
    },
  });

  return (
    <CrudListPageLayout
      title="Services & Offerings"
      subtitle="Define bookable services, their duration, prices, and required resource types."
      primaryAction={
        <Button asChild>
          <Link to="/booking/services/new">
            <PlusIcon className="w-4 h-4 mr-2" />
            Add Service
          </Link>
        </Button>
      }
    >
      <div className="border rounded-md bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Required Resources</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : data?.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No services found.
                </TableCell>
              </TableRow>
            ) : (
              data?.items.map((srv) => (
                <TableRow key={srv.id}>
                  <TableCell className="font-medium">
                    {srv.name}
                    <div className="text-xs text-muted-foreground font-normal mt-1 flex items-center gap-1">
                      {srv.id}{" "}
                      <CopyIcon
                        className="w-3 h-3 cursor-pointer"
                        onClick={() => navigator.clipboard.writeText(srv.id)}
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    {srv.durationMinutes}m
                    {(srv.bufferBeforeMinutes ?? 0) > 0 || (srv.bufferAfterMinutes ?? 0) > 0 ? (
                      <span className="text-muted-foreground text-xs ml-1">
                        (+{srv.bufferBeforeMinutes}m/{srv.bufferAfterMinutes}m)
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    {srv.priceCents != null
                      ? `${(srv.priceCents / 100).toFixed(2)} ${srv.currency || "USD"}`
                      : "Free"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {srv.requiredResourceTypes?.map((r) => (
                        <Badge key={r} variant="outline" className="text-xs">
                          {r}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <CrudRowActions
                      primaryAction={{ label: "View", href: `/booking/services/${srv.id}` }}
                      secondaryActions={[{ label: "Delete", onClick: () => {}, destructive: true }]}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </CrudListPageLayout>
  );
};
