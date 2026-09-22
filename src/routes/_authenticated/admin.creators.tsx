import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertCircle,
  Banknote,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Filter,
  Loader2,
  PauseCircle,
  PlayCircle,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Sparkles,
  Users,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  adminListCommissionsServerFn,
  adminListCreatorsServerFn,
  adminListPayoutsServerFn,
  adminRecordManualPayoutServerFn,
  adminReviewCommissionServerFn,
  adminReviewCreatorApplicationServerFn,
  adminUpdateCreatorStatusServerFn,
} from "@/server/creator";

export const Route = createFileRoute("/_authenticated/admin/creators")({
  component: AdminCreatorsPage,
});

function AdminCreatorsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("creators");

  // Filter & pagination states
  const [creatorsPage, setCreatorsPage] = useState(1);
  const [creatorSearch, setCreatorSearch] = useState("");
  const [appStatusFilter, setAppStatusFilter] = useState<string>("all");
  const [creatorStatusFilter, setCreatorStatusFilter] = useState<string>("all");

  const [commissionsPage, setCommissionsPage] = useState(1);
  const [commissionStatusFilter, setCommissionStatusFilter] = useState<string>("all");

  const [payoutsPage, setPayoutsPage] = useState(1);
  const [payoutStatusFilter, setPayoutStatusFilter] = useState<string>("all");

  // Modal dialog states
  const [reviewAppModal, setReviewAppModal] = useState<{
    open: boolean;
    creator: { id: string; displayName: string; handle: string; note?: string | null } | null;
    decision: "approved" | "rejected";
    adminNote: string;
  }>({
    open: false,
    creator: null,
    decision: "approved",
    adminNote: "",
  });

  const [statusModal, setStatusModal] = useState<{
    open: boolean;
    creator: { id: string; displayName: string; currentStatus: string | null } | null;
    targetStatus: "active" | "suspended" | "closed";
    reason: string;
  }>({
    open: false,
    creator: null,
    targetStatus: "active",
    reason: "",
  });

  const [reviewCommModal, setReviewCommModal] = useState<{
    open: boolean;
    commissionId: string | null;
    decision: "approved" | "reversed";
    reason: string;
  }>({
    open: false,
    commissionId: null,
    decision: "approved",
    reason: "",
  });

  const [payoutModal, setPayoutModal] = useState<{
    open: boolean;
    creatorId: string;
    currency: string;
    amountCents: number;
    payoutReference: string;
  }>({
    open: false,
    creatorId: "",
    currency: "USD",
    amountCents: 0,
    payoutReference: "",
  });

  // Queries
  const {
    data: creatorsData,
    isLoading: creatorsLoading,
    refetch: refetchCreators,
  } = useQuery({
    queryKey: ["admin_creators", creatorsPage, creatorSearch, appStatusFilter, creatorStatusFilter],
    queryFn: () =>
      adminListCreatorsServerFn({
        data: {
          page: creatorsPage,
          pageSize: 20,
          search: creatorSearch.trim() || undefined,
          applicationStatus:
            appStatusFilter !== "all"
              ? (appStatusFilter as "pending" | "approved" | "rejected")
              : undefined,
          creatorStatus:
            creatorStatusFilter !== "all"
              ? (creatorStatusFilter as "active" | "suspended" | "closed")
              : undefined,
        },
      }),
  });

  const {
    data: commissionsData,
    isLoading: commissionsLoading,
    refetch: refetchCommissions,
  } = useQuery({
    queryKey: ["admin_creator_commissions", commissionsPage, commissionStatusFilter],
    queryFn: () =>
      adminListCommissionsServerFn({
        data: {
          page: commissionsPage,
          pageSize: 20,
          status:
            commissionStatusFilter !== "all"
              ? (commissionStatusFilter as
                  "pending" | "approved" | "paid" | "reversed" | "ineligible")
              : undefined,
        },
      }),
  });

  const {
    data: payoutsData,
    isLoading: payoutsLoading,
    refetch: refetchPayouts,
  } = useQuery({
    queryKey: ["admin_creator_payouts", payoutsPage, payoutStatusFilter],
    queryFn: () =>
      adminListPayoutsServerFn({
        data: {
          page: payoutsPage,
          pageSize: 20,
          status:
            payoutStatusFilter !== "all"
              ? (payoutStatusFilter as
                  "pending" | "approved" | "processing" | "paid" | "failed" | "cancelled")
              : undefined,
        },
      }),
  });

  // Mutations
  const reviewAppMutation = useMutation({
    mutationFn: (vars: {
      creatorId: string;
      decision: "approved" | "rejected";
      adminNote?: string;
    }) =>
      adminReviewCreatorApplicationServerFn({
        data: vars,
      }),
    onSuccess: () => {
      toast.success(
        reviewAppModal.decision === "approved"
          ? "Creator application approved! Default campaign created."
          : "Creator application rejected.",
      );
      setReviewAppModal({ open: false, creator: null, decision: "approved", adminNote: "" });
      void queryClient.invalidateQueries({ queryKey: ["admin_creators"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to review application.");
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: (vars: {
      creatorId: string;
      status: "active" | "suspended" | "closed";
      reason?: string;
    }) =>
      adminUpdateCreatorStatusServerFn({
        data: vars,
      }),
    onSuccess: () => {
      toast.success("Creator status updated successfully.");
      setStatusModal({ open: false, creator: null, targetStatus: "active", reason: "" });
      void queryClient.invalidateQueries({ queryKey: ["admin_creators"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update creator status.");
    },
  });

  const reviewCommMutation = useMutation({
    mutationFn: (vars: {
      commissionId: string;
      decision: "approved" | "reversed";
      reason?: string;
    }) =>
      adminReviewCommissionServerFn({
        data: vars,
      }),
    onSuccess: () => {
      toast.success("Commission status updated.");
      setReviewCommModal({ open: false, commissionId: null, decision: "approved", reason: "" });
      void queryClient.invalidateQueries({ queryKey: ["admin_creator_commissions"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update commission.");
    },
  });

  const recordPayoutMutation = useMutation({
    mutationFn: (vars: {
      creatorId: string;
      currency: string;
      amountCents: number;
      payoutReference: string;
      commissionIds: string[];
    }) =>
      adminRecordManualPayoutServerFn({
        data: vars,
      }),
    onSuccess: () => {
      toast.success("Manual payout recorded and commissions marked as paid.");
      setPayoutModal({
        open: false,
        creatorId: "",
        currency: "USD",
        amountCents: 0,
        payoutReference: "",
      });
      void queryClient.invalidateQueries({ queryKey: ["admin_creator_payouts"] });
      void queryClient.invalidateQueries({ queryKey: ["admin_creator_commissions"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to record manual payout.");
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="size-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Creator Distribution
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            SoloOS Phase 12 Creator Partner Program: applications, performance, commissions, and
            payouts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void refetchCreators();
              void refetchCommissions();
              void refetchPayouts();
            }}
          >
            <RefreshCw className="mr-2 size-4" />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() =>
              setPayoutModal({
                open: true,
                creatorId: "",
                currency: "USD",
                amountCents: 0,
                payoutReference: `PAY-${Date.now().toString(36).toUpperCase()}`,
              })
            }
          >
            <Banknote className="mr-2 size-4" />
            Record Manual Payout
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 sm:w-auto">
          <TabsTrigger value="creators" className="flex items-center gap-2">
            <Users className="size-4" />
            <span>Creators ({creatorsData?.total ?? 0})</span>
          </TabsTrigger>
          <TabsTrigger value="commissions" className="flex items-center gap-2">
            <Banknote className="size-4" />
            <span>Commissions ({commissionsData?.total ?? 0})</span>
          </TabsTrigger>
          <TabsTrigger value="payouts" className="flex items-center gap-2">
            <CheckCircle2 className="size-4" />
            <span>Payouts ({payoutsData?.total ?? 0})</span>
          </TabsTrigger>
        </TabsList>

        {/* ─── TAB 1: CREATORS ──────────────────────────────────────── */}
        <TabsContent value="creators" className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Search handle, name, email..."
                value={creatorSearch}
                onChange={(e) => {
                  setCreatorSearch(e.target.value);
                  setCreatorsPage(1);
                }}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={appStatusFilter}
                onValueChange={(val) => {
                  setAppStatusFilter(val);
                  setCreatorsPage(1);
                }}
              >
                <SelectTrigger className="w-[150px] text-xs">
                  <SelectValue placeholder="Application" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Applications</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={creatorStatusFilter}
                onValueChange={(val) => {
                  setCreatorStatusFilter(val);
                  setCreatorsPage(1);
                }}
              >
                <SelectTrigger className="w-[140px] text-xs">
                  <SelectValue placeholder="Creator Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              {creatorsLoading ? (
                <div className="flex h-48 items-center justify-center">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
              ) : (creatorsData?.creators.length ?? 0) === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No creators found matching current filters.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Creator</TableHead>
                      <TableHead>Platform & Audience</TableHead>
                      <TableHead>Application</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Referral Link</TableHead>
                      <TableHead>Applied Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {creatorsData?.creators.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell>
                          <div className="font-medium text-foreground">{c.display_name}</div>
                          <div className="text-xs font-mono text-muted-foreground">
                            @{c.public_handle} • {c.email}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm capitalize text-foreground">
                            {c.primary_platform}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {c.estimated_audience
                              ? `${c.estimated_audience.toLocaleString()} reach`
                              : "Audience unstated"}
                          </div>
                        </TableCell>
                        <TableCell>
                          {c.application_status === "pending" ? (
                            <Badge
                              variant="outline"
                              className="border-amber-500/30 text-amber-500 bg-amber-500/10"
                            >
                              Pending Review
                            </Badge>
                          ) : c.application_status === "approved" ? (
                            <Badge
                              variant="outline"
                              className="border-emerald-500/30 text-emerald-500 bg-emerald-500/10"
                            >
                              Approved
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="border-destructive/30 text-destructive bg-destructive/10"
                            >
                              Rejected
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {c.creator_status === "active" ? (
                            <Badge variant="default" className="bg-emerald-600">
                              Active
                            </Badge>
                          ) : c.creator_status === "suspended" ? (
                            <Badge variant="outline" className="border-rose-500/30 text-rose-500">
                              Suspended
                            </Badge>
                          ) : c.creator_status === "closed" ? (
                            <Badge
                              variant="outline"
                              className="border-muted-foreground text-muted-foreground"
                            >
                              Closed
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <a
                            href={`/c/${c.referral_code}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-mono text-xs text-primary hover:underline"
                          >
                            /c/{c.referral_code}
                            <ExternalLink className="size-3" />
                          </a>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(c.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {c.application_status === "pending" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/10"
                                onClick={() =>
                                  setReviewAppModal({
                                    open: true,
                                    creator: {
                                      id: c.id,
                                      displayName: c.display_name,
                                      handle: c.public_handle,
                                      note: c.application_note,
                                    },
                                    decision: "approved",
                                    adminNote: "",
                                  })
                                }
                              >
                                Review
                              </Button>
                            )}
                            {c.creator_status === "active" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 text-xs text-amber-500 hover:text-amber-600"
                                onClick={() =>
                                  setStatusModal({
                                    open: true,
                                    creator: {
                                      id: c.id,
                                      displayName: c.display_name,
                                      currentStatus: c.creator_status,
                                    },
                                    targetStatus: "suspended",
                                    reason: "",
                                  })
                                }
                              >
                                Suspend
                              </Button>
                            )}
                            {c.creator_status === "suspended" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 text-xs text-emerald-500 hover:text-emerald-600"
                                onClick={() =>
                                  setStatusModal({
                                    open: true,
                                    creator: {
                                      id: c.id,
                                      displayName: c.display_name,
                                      currentStatus: c.creator_status,
                                    },
                                    targetStatus: "active",
                                    reason: "",
                                  })
                                }
                              >
                                Reactivate
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── TAB 2: COMMISSIONS ───────────────────────────────────── */}
        <TabsContent value="commissions" className="space-y-4">
          <div className="flex items-center justify-between">
            <Select
              value={commissionStatusFilter}
              onValueChange={(val) => {
                setCommissionStatusFilter(val);
                setCommissionsPage(1);
              }}
            >
              <SelectTrigger className="w-[180px] text-xs">
                <SelectValue placeholder="Commission Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Commissions</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="reversed">Reversed</SelectItem>
                <SelectItem value="ineligible">Ineligible</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="p-0">
              {commissionsLoading ? (
                <div className="flex h-48 items-center justify-center">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
              ) : (commissionsData?.commissions.length ?? 0) === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No commission records found.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Creator</TableHead>
                      <TableHead>Workspace</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Gross</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Commission</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {commissionsData?.commissions.map((comm) => (
                      <TableRow key={comm.id}>
                        <TableCell>
                          <div className="font-medium text-foreground">
                            {comm.creator_profiles?.display_name ?? "Unknown"}
                          </div>
                          <div className="text-xs font-mono text-muted-foreground">
                            @{comm.creator_profiles?.public_handle ?? "unknown"}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {comm.workspaces?.name ?? "Referred Workspace"}
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {comm.billing_period_label}
                        </TableCell>
                        <TableCell className="text-sm font-mono">
                          {(comm.gross_amount_cents / 100).toFixed(2)} {comm.currency}
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {(comm.commission_rate_bps / 100).toFixed(1)}%
                        </TableCell>
                        <TableCell className="text-sm font-mono font-bold text-emerald-500">
                          {(comm.commission_amount_cents / 100).toFixed(2)} {comm.currency}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              comm.status === "paid"
                                ? "default"
                                : comm.status === "approved"
                                  ? "secondary"
                                  : comm.status === "reversed"
                                    ? "destructive"
                                    : "outline"
                            }
                            className="capitalize text-xs"
                          >
                            {comm.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(comm.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {comm.status === "pending" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs text-emerald-500 border-emerald-500/30"
                                onClick={() =>
                                  setReviewCommModal({
                                    open: true,
                                    commissionId: comm.id,
                                    decision: "approved",
                                    reason: "",
                                  })
                                }
                              >
                                Approve
                              </Button>
                            )}
                            {["pending", "approved"].includes(comm.status) && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs text-destructive hover:text-destructive"
                                onClick={() =>
                                  setReviewCommModal({
                                    open: true,
                                    commissionId: comm.id,
                                    decision: "reversed",
                                    reason: "",
                                  })
                                }
                              >
                                Reverse
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── TAB 3: PAYOUTS ───────────────────────────────────────── */}
        <TabsContent value="payouts" className="space-y-4">
          <div className="flex items-center justify-between">
            <Select
              value={payoutStatusFilter}
              onValueChange={(val) => {
                setPayoutStatusFilter(val);
                setPayoutsPage(1);
              }}
            >
              <SelectTrigger className="w-[160px] text-xs">
                <SelectValue placeholder="Payout Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payouts</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="p-0">
              {payoutsLoading ? (
                <div className="flex h-48 items-center justify-center">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
              ) : (payoutsData?.payouts.length ?? 0) === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No recorded payouts found.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Creator</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Commissions Settled</TableHead>
                      <TableHead>Paid Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payoutsData?.payouts.map((p) => {
                      const commIds = Array.isArray(p.commission_ids) ? p.commission_ids : [];
                      return (
                        <TableRow key={p.id}>
                          <TableCell>
                            <div className="font-medium text-foreground">
                              {p.creator_profiles?.display_name ?? "Unknown"}
                            </div>
                            <div className="text-xs font-mono text-muted-foreground">
                              @{p.creator_profiles?.public_handle ?? "unknown"}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono font-semibold text-foreground">
                            {(p.amount_cents / 100).toFixed(2)} {p.currency}
                          </TableCell>
                          <TableCell className="text-xs font-mono text-muted-foreground">
                            {p.payout_reference}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={p.status === "paid" ? "default" : "secondary"}
                              className="capitalize text-xs"
                            >
                              {p.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {commIds.length} item{commIds.length === 1 ? "" : "s"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {p.paid_at ? new Date(p.paid_at).toLocaleDateString() : "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ─── MODAL: Review Creator Application ──────────────────────── */}
      <Dialog
        open={reviewAppModal.open}
        onOpenChange={(open) => !open && setReviewAppModal((s) => ({ ...s, open: false }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Creator Application</DialogTitle>
            <DialogDescription>
              Evaluate the application submitted by{" "}
              <strong>{reviewAppModal.creator?.displayName}</strong> (@
              {reviewAppModal.creator?.handle}).
            </DialogDescription>
          </DialogHeader>

          {reviewAppModal.creator?.note && (
            <div className="rounded-lg border border-border/40 bg-muted/30 p-3 text-sm">
              <span className="font-semibold text-foreground">Applicant Pitch:</span>
              <p className="mt-1 text-muted-foreground whitespace-pre-wrap">
                {reviewAppModal.creator.note}
              </p>
            </div>
          )}

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Decision</Label>
              <Select
                value={reviewAppModal.decision}
                onValueChange={(val) =>
                  setReviewAppModal((s) => ({ ...s, decision: val as "approved" | "rejected" }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved">Approve Application (Activate Creator)</SelectItem>
                  <SelectItem value="rejected">Reject Application</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Admin Feedback Note (sent to applicant via email)</Label>
              <Textarea
                placeholder="Optional notes or rejection rationale..."
                value={reviewAppModal.adminNote}
                onChange={(e) => setReviewAppModal((s) => ({ ...s, adminNote: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReviewAppModal((s) => ({ ...s, open: false }))}
            >
              Cancel
            </Button>
            <Button
              variant={reviewAppModal.decision === "approved" ? "default" : "destructive"}
              disabled={reviewAppMutation.isPending}
              onClick={() => {
                if (!reviewAppModal.creator) return;
                reviewAppMutation.mutate({
                  creatorId: reviewAppModal.creator.id,
                  decision: reviewAppModal.decision,
                  ...(reviewAppModal.adminNote.trim()
                    ? { adminNote: reviewAppModal.adminNote.trim() }
                    : {}),
                });
              }}
            >
              {reviewAppMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Submit {reviewAppModal.decision === "approved" ? "Approval" : "Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL: Change Creator Status ────────────────────────────── */}
      <Dialog
        open={statusModal.open}
        onOpenChange={(open) => !open && setStatusModal((s) => ({ ...s, open: false }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Creator Status</DialogTitle>
            <DialogDescription>
              Change active status for <strong>{statusModal.creator?.displayName}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Target Status</Label>
              <Select
                value={statusModal.targetStatus}
                onValueChange={(val) =>
                  setStatusModal((s) => ({
                    ...s,
                    targetStatus: val as "active" | "suspended" | "closed",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active (Links resolve & track)</SelectItem>
                  <SelectItem value="suspended">
                    Suspended (Paused commissions & referral)
                  </SelectItem>
                  <SelectItem value="closed">Closed (Permanently retired)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Input
                placeholder="Audit reason for status modification..."
                value={statusModal.reason}
                onChange={(e) => setStatusModal((s) => ({ ...s, reason: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setStatusModal((s) => ({ ...s, open: false }))}
            >
              Cancel
            </Button>
            <Button
              disabled={updateStatusMutation.isPending}
              onClick={() => {
                if (!statusModal.creator) return;
                updateStatusMutation.mutate({
                  creatorId: statusModal.creator.id,
                  status: statusModal.targetStatus,
                  ...(statusModal.reason.trim() ? { reason: statusModal.reason.trim() } : {}),
                });
              }}
            >
              {updateStatusMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Update Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL: Review Commission ────────────────────────────────── */}
      <Dialog
        open={reviewCommModal.open}
        onOpenChange={(open) => !open && setReviewCommModal((s) => ({ ...s, open: false }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewCommModal.decision === "approved"
                ? "Approve Commission"
                : "Reverse Commission"}
            </DialogTitle>
            <DialogDescription>
              {reviewCommModal.decision === "approved"
                ? "Authorize this commission payment for upcoming creator payout."
                : "Mark this commission as reversed due to refund or chargeback."}
            </DialogDescription>
          </DialogHeader>

          {reviewCommModal.decision === "reversed" && (
            <div className="space-y-1.5 py-2">
              <Label>Reversal Reason</Label>
              <Input
                placeholder="e.g. Customer requested refund, payment dispute..."
                value={reviewCommModal.reason}
                onChange={(e) => setReviewCommModal((s) => ({ ...s, reason: e.target.value }))}
              />
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReviewCommModal((s) => ({ ...s, open: false }))}
            >
              Cancel
            </Button>
            <Button
              variant={reviewCommModal.decision === "approved" ? "default" : "destructive"}
              disabled={reviewCommMutation.isPending}
              onClick={() => {
                if (!reviewCommModal.commissionId) return;
                reviewCommMutation.mutate({
                  commissionId: reviewCommModal.commissionId,
                  decision: reviewCommModal.decision,
                  ...(reviewCommModal.reason.trim()
                    ? { reason: reviewCommModal.reason.trim() }
                    : {}),
                });
              }}
            >
              {reviewCommMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Confirm {reviewCommModal.decision === "approved" ? "Approval" : "Reversal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL: Record Manual Payout ─────────────────────────────── */}
      <Dialog
        open={payoutModal.open}
        onOpenChange={(open) => !open && setPayoutModal((s) => ({ ...s, open: false }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Manual Payout</DialogTitle>
            <DialogDescription>
              Log an external wire, PayPal, or crypto transfer made to an active creator partner.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Creator</Label>
              <Select
                value={payoutModal.creatorId}
                onValueChange={(val) => setPayoutModal((s) => ({ ...s, creatorId: val }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select creator..." />
                </SelectTrigger>
                <SelectContent>
                  {creatorsData?.creators
                    .filter((c) => c.creator_status === "active")
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.display_name} (@{c.public_handle})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Currency</Label>
                <Select
                  value={payoutModal.currency}
                  onValueChange={(val) => setPayoutModal((s) => ({ ...s, currency: val }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                    <SelectItem value="MWK">MWK (MK)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Amount (Units, e.g. 150.00)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="1"
                  placeholder="150.00"
                  onChange={(e) =>
                    setPayoutModal((s) => ({
                      ...s,
                      amountCents: Math.round(parseFloat(e.target.value || "0") * 100),
                    }))
                  }
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Payout Reference / Transaction ID</Label>
              <Input
                placeholder="e.g. WIRE-8374829 or PAYPAL-992182"
                value={payoutModal.payoutReference}
                onChange={(e) => setPayoutModal((s) => ({ ...s, payoutReference: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPayoutModal((s) => ({ ...s, open: false }))}
            >
              Cancel
            </Button>
            <Button
              disabled={
                recordPayoutMutation.isPending ||
                !payoutModal.creatorId ||
                payoutModal.amountCents <= 0 ||
                !payoutModal.payoutReference.trim()
              }
              onClick={() => {
                recordPayoutMutation.mutate({
                  creatorId: payoutModal.creatorId,
                  currency: payoutModal.currency,
                  amountCents: payoutModal.amountCents,
                  payoutReference: payoutModal.payoutReference.trim(),
                  commissionIds: [],
                });
              }}
            >
              {recordPayoutMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Record Payout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
