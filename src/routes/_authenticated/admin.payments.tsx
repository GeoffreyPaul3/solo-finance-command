import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  Receipt,
  XCircle,
} from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { adminListPaymentsFn } from "@/server/admin";

export const Route = createFileRoute("/_authenticated/admin/payments")({
  component: AdminPaymentsPage,
});

function AdminPaymentsPage() {
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin_payments", page],
    queryFn: () => adminListPaymentsFn({ data: { page, pageSize } }),
  });

  const totalPages = Math.ceil((data?.total ?? 0) / pageSize);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Payment Reconciliation & Audit Trail
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Server-side audit log verifying expected amounts and currencies against PayChangu
          confirmations.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="size-4 text-primary" />
            <span>Reconciliation Records ({data?.total ?? 0})</span>
          </CardTitle>
          <CardDescription>
            Audit log of every checkout initiated and verified on the server.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="p-6 text-center text-sm text-destructive">
              Failed to load payments: {error instanceof Error ? error.message : "Unknown error"}
            </div>
          ) : (data?.payments.length ?? 0) === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No payment records found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tx Ref</TableHead>
                  <TableHead>Workspace</TableHead>
                  <TableHead>Expected</TableHead>
                  <TableHead>Verified</TableHead>
                  <TableHead>Provider Ref</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.payments.map((p) => {
                  const ws = (p as Record<string, unknown>)["workspaces"] as {
                    name: string;
                  } | null;
                  const expAmount = p.expected_amount_cents / 100;
                  const verAmount =
                    p.verified_amount_cents != null ? p.verified_amount_cents / 100 : null;

                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs font-medium">{p.tx_ref}</TableCell>
                      <TableCell className="text-sm font-medium">{ws?.name ?? "Unknown"}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {p.expected_currency} {expAmount.toLocaleString()}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {verAmount != null ? (
                          <span className="text-emerald-600 font-semibold">
                            {p.verified_currency} {verAmount.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {p.provider_ref ?? "—"}
                      </TableCell>
                      <TableCell>
                        {p.status === "successful" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-600">
                            <CheckCircle2 className="size-3" />
                            Verified
                          </span>
                        ) : p.status === "pending" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-600">
                            <Clock className="size-3" />
                            Pending
                          </span>
                        ) : p.status === "mismatch" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">
                            <AlertTriangle className="size-3" />
                            Mismatch
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">
                            <XCircle className="size-3" />
                            {p.status}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(p.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  );
                })}
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
