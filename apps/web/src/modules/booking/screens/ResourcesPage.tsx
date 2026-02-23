import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { buildListQuery } from "@/lib/api-query-utils";
import { bookingResourceKeys } from "../queries";
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
import type { ResourceDto } from "@corely/contracts";

export const ResourcesPage = () => {
  const [params] = useCrudUrlState();

  const { data, isLoading } = useQuery({
    queryKey: bookingResourceKeys.list(params),
    queryFn: async () => {
      const qs = buildListQuery(params).toString();
      const endpoint = qs ? `/api/booking/resources?${qs}` : "/api/booking/resources";
      const res = await apiClient.get<{ items: ResourceDto[]; pageInfo: any }>(endpoint);
      return res;
    },
  });

  return (
    <CrudListPageLayout
      title="Booking Resources"
      subtitle="Manage physical assets, staff, and rooms available for booking."
      primaryAction={
        <Button asChild>
          <Link to="/booking/resources/new">
            <PlusIcon className="w-4 h-4 mr-2" />
            Add Resource
          </Link>
        </Button>
      }
    >
      <div className="border rounded-md bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Capacity</TableHead>
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
                  No resources found.
                </TableCell>
              </TableRow>
            ) : (
              data?.items.map((resource) => (
                <TableRow key={resource.id}>
                  <TableCell className="font-medium">
                    {resource.name}
                    <div className="text-xs text-muted-foreground font-normal mt-1 flex items-center gap-1">
                      {resource.id}{" "}
                      <CopyIcon
                        className="w-3 h-3 cursor-pointer"
                        onClick={() => navigator.clipboard.writeText(resource.id)}
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{resource.type}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={resource.isActive ? "default" : "secondary"}>
                      {resource.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>{resource.capacity ?? "—"}</TableCell>
                  <TableCell>
                    <CrudRowActions
                      primaryAction={{ label: "View", href: `/booking/resources/${resource.id}` }}
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
