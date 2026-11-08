import { Link, useSearchParams } from "react-router-dom";
import {
  Button,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Badge,
} from "@corely/ui";
import { CrudListPageLayout, CrudRowActions } from "@corely/web-shared/shared/crud";
import { staffJourneyCopy } from "./staff-journey-copy";
import { peopleApi } from "./people-api";
import { usePeopleAccess, usePeopleLoad } from "./use-people";
export function PeopleDirectoryPage() {
  const { scope, copy: t, can, loading, locale } = usePeopleAccess();
  const [params, setParams] = useSearchParams();
  const query = new URLSearchParams({
    q: params.get("q") ?? "",
    archived: params.get("archived") ?? "active",
    page: params.get("page") ?? "1",
    pageSize: "25",
  }).toString();
  const result = usePeopleLoad(
    (signal) => peopleApi.list(query, signal),
    `${scope}:${query}`,
    !loading && can("directory.read")
  );
  const update = (key: string, value: string) =>
    setParams(
      (old) => {
        const next = new URLSearchParams(old);
        next.set(key, value);
        if (key !== "page") {
          next.set("page", "1");
        }
        return next;
      },
      { replace: true }
    );
  if (loading) {
    return <p role="status">{t.loading}</p>;
  }
  if (!can("directory.read")) {
    return <p role="alert">{t.denied}</p>;
  }
  return (
    <CrudListPageLayout
      title={t.title}
      subtitle={t.intro}
      primaryAction={
        can("profile.manage") && (
          <Button asChild>
            <Link to="/people/staff/new">{t.add}</Link>
          </Button>
        )
      }
      toolbar={
        <>
          {can("self.read") && (
            <Link className="underline" to="/people/me">
              {staffJourneyCopy[locale === "de" || locale === "vi" ? locale : "en"].title}
            </Link>
          )}
          <Input
            className="max-w-md"
            aria-label={t.search}
            placeholder={t.search}
            value={params.get("q") ?? ""}
            onChange={(e) => update("q", e.target.value)}
          />
          <select
            className="h-10 rounded-md border bg-background px-3"
            aria-label={t.status}
            value={params.get("archived") ?? "active"}
            onChange={(e) => update("archived", e.target.value)}
          >
            <option value="active">{t.active}</option>
            <option value="archived">{t.archived}</option>
            <option value="all">{t.all}</option>
          </select>
        </>
      }
    >
      {result.loading ? (
        <p className="p-6" role="status">
          {t.loading}
        </p>
      ) : result.error ? (
        <div className="p-6" role="alert">
          {t.error}
          <Button variant="outline" onClick={result.reload}>
            {t.retry}
          </Button>
        </div>
      ) : (
        result.data && (
          <>
            {result.data.items.length === 0 ? (
              <div className="p-8 text-center">
                <h2 className="font-semibold">{t.empty}</h2>
                <p className="text-muted-foreground">{t.emptyHint}</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    {[t.name, t.job, t.team, t.location, t.status, ""].map((label, index) => (
                      <TableHead key={index}>{label}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.data.items.map((staff) => (
                    <TableRow key={staff.id}>
                      <TableCell className="font-medium">
                        <Link
                          className="underline-offset-4 hover:underline"
                          to={`/people/staff/${staff.id}`}
                        >
                          {staff.displayName}
                        </Link>
                      </TableCell>
                      <TableCell>{staff.jobTitle ?? "—"}</TableCell>
                      <TableCell>{staff.team ?? "—"}</TableCell>
                      <TableCell>{staff.location ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant={staff.archivedAt ? "secondary" : "outline"}>
                          {staff.archivedAt ? t.archived : t.active}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <CrudRowActions
                          primaryAction={{ label: t.open, href: `/people/staff/${staff.id}` }}
                          secondaryActions={
                            can("profile.manage") && !staff.archivedAt
                              ? [{ label: t.edit, href: `/people/staff/${staff.id}/edit` }]
                              : []
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t p-4 text-sm">
              <span>
                {result.data.total} {t.total} · {t.page} {result.data.page}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={result.data.page <= 1}
                  onClick={() => update("page", String((result.data?.page ?? 1) - 1))}
                >
                  {t.previous}
                </Button>
                <Button
                  variant="outline"
                  disabled={result.data.page * result.data.pageSize >= result.data.total}
                  onClick={() => update("page", String((result.data?.page ?? 1) + 1))}
                >
                  {t.next}
                </Button>
              </div>
            </div>
          </>
        )
      )}
    </CrudListPageLayout>
  );
}
