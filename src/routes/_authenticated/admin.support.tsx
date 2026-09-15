import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Loader2,
  MessageSquare,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { adminListSupportRequestsFn, adminUpdateSupportRequestFn } from "@/server/admin";

export const Route = createFileRoute("/_authenticated/admin/support")({
  component: AdminSupportPage,
});

function AdminSupportPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<
    "open" | "in_progress" | "resolved" | "closed" | undefined
  >(undefined);
  const pageSize = 20;

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin_support_requests", page, statusFilter],
    queryFn: () => adminListSupportRequestsFn({ data: { page, pageSize, status: statusFilter } }),
  });

  const updateMutation = useMutation({
    mutationFn: (variables: {
      id: string;
      status: "open" | "in_progress" | "resolved" | "closed";
    }) => adminUpdateSupportRequestFn({ data: variables }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_support_requests"] });
      queryClient.invalidateQueries({ queryKey: ["admin_dashboard_stats"] });
      toast.success("Support ticket status updated");
    },
    onError: (err: unknown) => {
      toast.error("Failed to update status", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    },
  });

  const totalPages = Math.ceil((data?.total ?? 0) / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Support Queue
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Customer inquiries, technical tickets, and billing issues.
          </p>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Button
            variant={statusFilter === undefined ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setStatusFilter(undefined);
              setPage(1);
            }}
          >
            All
          </Button>
          <Button
            variant={statusFilter === "open" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setStatusFilter("open");
              setPage(1);
            }}
          >
            Open
          </Button>
          <Button
            variant={statusFilter === "in_progress" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setStatusFilter("in_progress");
              setPage(1);
            }}
          >
            In Progress
          </Button>
          <Button
            variant={statusFilter === "resolved" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setStatusFilter("resolved");
              setPage(1);
            }}
          >
            Resolved
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <HelpCircle className="size-4 text-amber-500" />
            <span>Support Inquiries ({data?.total ?? 0})</span>
          </CardTitle>
          <CardDescription>
            All inquiries received through the public and in-app support forms.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="p-6 text-center text-sm text-destructive">
              Failed to load support tickets:{" "}
              {error instanceof Error ? error.message : "Unknown error"}
            </div>
          ) : (data?.requests.length ?? 0) === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No support tickets found for this filter.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contact</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.requests.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="text-sm font-semibold">{r.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">{r.email}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize text-xs">
                        {r.category.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium text-sm max-w-[180px] truncate">
                      {r.subject}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[260px] truncate">
                      {r.message}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          r.status === "resolved"
                            ? "default"
                            : r.status === "open"
                              ? "destructive"
                              : "secondary"
                        }
                        className="capitalize text-xs"
                      >
                        {r.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(r.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 px-2 text-xs">
                            Change Status
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => updateMutation.mutate({ id: r.id, status: "open" })}
                          >
                            Mark as Open
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              updateMutation.mutate({ id: r.id, status: "in_progress" })
                            }
                          >
                            Mark In Progress
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => updateMutation.mutate({ id: r.id, status: "resolved" })}
                          >
                            Mark Resolved
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => updateMutation.mutate({ id: r.id, status: "closed" })}
                          >
                            Mark Closed
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border/60 p-4">
              <span className="text-xs text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="size-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                  <ChevronRight className="size-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
