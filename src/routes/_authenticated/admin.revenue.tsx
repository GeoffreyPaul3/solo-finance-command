import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { DollarSign, Loader2, ShieldCheck, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { adminRevenueQueryOptions } from "@/domain/admin";

export const Route = createFileRoute("/_authenticated/admin/revenue")({
  component: AdminRevenuePage,
});

function AdminRevenuePage() {
  const { data, isLoading, error } = useQuery(adminRevenueQueryOptions());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Platform Revenue
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Strictly segregated MWK and USD revenue streams. No FX conversion is performed.
        </p>
      </div>

      {/* Currency Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base text-foreground font-bold">
                🇲🇼 Malawi Kwacha (MWK)
              </CardTitle>
              <Badge
                variant="outline"
                className="border-emerald-500/40 text-emerald-600 bg-emerald-500/10"
              >
                MWK Ledger
              </Badge>
            </div>
            <CardDescription>Domestic Malawian subscriber payments</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            ) : (
              <div>
                <div className="text-3xl font-bold tracking-tight text-foreground">
                  MWK{" "}
                  {(data?.totalMwkMajor ?? 0).toLocaleString(undefined, {
                    minimumFractionDigits: 0,
                  })}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {data?.mwkTransactionCount ?? 0} verified successful transactions
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-blue-500/30 bg-blue-500/5">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base text-foreground font-bold">
                🌐 US Dollar (USD)
              </CardTitle>
              <Badge variant="outline" className="border-blue-500/40 text-blue-600 bg-blue-500/10">
                USD Ledger
              </Badge>
            </div>
            <CardDescription>International subscriber payments</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            ) : (
              <div>
                <div className="text-3xl font-bold tracking-tight text-foreground">
                  $
                  {(data?.totalUsdMajor ?? 0).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {data?.usdTransactionCount ?? 0} verified successful transactions
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Accounting Notice */}
      <div className="rounded-lg border border-border/80 bg-muted/40 p-4 text-xs text-muted-foreground flex items-start gap-3">
        <ShieldCheck className="size-5 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-foreground">Independent Multi-Currency Architecture</p>
          <p className="mt-0.5 leading-relaxed">
            SoloOS treats each currency as an autonomous accounting ledger. Under no circumstances
            are MWK 14,000 and $8 merged into a synthetic aggregate. Revenue reports preserve the
            exact nominal currency paid by the subscriber.
          </p>
        </div>
      </div>

      {/* Revenue Transactions Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="size-4 text-primary" />
            <span>Successful Revenue Transactions ({data?.payments.length ?? 0})</span>
          </CardTitle>
          <CardDescription>
            All verified payments that have activated workspace entitlements.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="p-6 text-center text-sm text-destructive">
              Failed to load revenue transactions:{" "}
              {error instanceof Error ? error.message : "Unknown error"}
            </div>
          ) : (data?.payments.length ?? 0) === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No revenue transactions recorded yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Tx Ref</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.payments.map((p) => {
                  const cur = (p.verified_currency || p.expected_currency).toUpperCase();
                  const amount = Number(p.verified_amount_cents || p.expected_amount_cents) / 100;

                  return (
                    <TableRow key={p.id}>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(p.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {p.tx_ref}
                      </TableCell>
                      <TableCell className="font-semibold text-sm">
                        {cur === "MWK"
                          ? `MWK ${amount.toLocaleString(undefined, { minimumFractionDigits: 0 })}`
                          : `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">
                          {cur}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-emerald-600 text-xs capitalize">{p.status}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
