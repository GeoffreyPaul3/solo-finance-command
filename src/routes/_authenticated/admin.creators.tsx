/**
 * Admin Creator Distribution — Enhanced
 *
 * Features:
 * - Tab 1: Creators — 3-dot dropdown actions (View, Suspend, Reactivate), pagination
 * - Tab 2: Commissions — Approve/Reverse with pagination
 * - Tab 3: Payouts — Record Manual Payout with real creator payout details prefilled
 * - Tab 4: Brand & Media Kit — Upload, manage, delete assets
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertCircle,
  Banknote,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Filter,
  ImageIcon,
  Link2,
  Loader2,
  MoreHorizontal,
  PauseCircle,
  Pencil,
  Phone,
  PlayCircle,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Sparkles,
  Trash2,
  Upload,
  Users,
  XCircle,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
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
  adminAddBrandAssetServerFn,
  adminDeleteBrandAssetServerFn,
  adminGetCreatorPayoutDetailsServerFn,
  adminListCommissionsServerFn,
  adminListCreatorsServerFn,
  adminListPayoutsServerFn,
  adminRecordManualPayoutServerFn,
  adminReviewCommissionServerFn,
  adminReviewCreatorApplicationServerFn,
  adminUpdateBrandAssetServerFn,
  adminUpdateCreatorStatusServerFn,
  getBrandAssetsServerFn,
} from "@/server/creator";

export const Route = createFileRoute("/_authenticated/admin/creators")({
  component: AdminCreatorsPage,
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (p: number) => void;
}) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-border/50">
      <span className="text-xs text-muted-foreground">
        {Math.min((page - 1) * pageSize + 1, total)}–{Math.min(page * pageSize, total)} of{" "}
        {total}
      </span>
      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          className="h-7 w-7 p-0"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="size-3.5" />
        </Button>
        <span className="text-xs text-muted-foreground tabular-nums">
          {page} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          className="h-7 w-7 p-0"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

function assetTypeColor(t: string) {
  const map: Record<string, string> = {
    logo: "bg-violet-500/10 text-violet-400 border-violet-500/20",
    banner: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    guide: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    template: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    media: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    other: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  };
  return map[t] ?? "bg-slate-500/10 text-slate-400 border-slate-500/20";
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function AdminCreatorsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("creators");

  const getToken = async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token;
  };

  // ─── Filter & pagination states ───────────────────────────────────────────

  const [creatorsPage, setCreatorsPage] = useState(1);
  const [creatorSearch, setCreatorSearch] = useState("");
  const [appStatusFilter, setAppStatusFilter] = useState<string>("all");
  const [creatorStatusFilter, setCreatorStatusFilter] = useState<string>("all");

  const [commissionsPage, setCommissionsPage] = useState(1);
  const [commissionStatusFilter, setCommissionStatusFilter] = useState<string>("all");

  const [payoutsPage, setPayoutsPage] = useState(1);
  const [payoutStatusFilter, setPayoutStatusFilter] = useState<string>("all");

  // ─── Modal states ─────────────────────────────────────────────────────────

  const [viewCreatorModal, setViewCreatorModal] = useState<{
    open: boolean;
    creator: {
      id: string;
      display_name: string;
      public_handle: string;
      email: string;
      primary_platform: string | null;
      bio: string | null;
      website_url: string | null;
      referral_code: string;
      creator_status: string | null;
      application_status: string;
      created_at: string;
      approved_at: string | null;
    } | null;
  }>({ open: false, creator: null });

  const [reviewAppModal, setReviewAppModal] = useState<{
    open: boolean;
    creator: { id: string; displayName: string; handle: string; note?: string | null } | null;
    decision: "approved" | "rejected";
    adminNote: string;
  }>({ open: false, creator: null, decision: "approved", adminNote: "" });

  const [statusModal, setStatusModal] = useState<{
    open: boolean;
    creator: { id: string; displayName: string; currentStatus: string | null } | null;
    targetStatus: "active" | "suspended" | "closed";
    reason: string;
  }>({ open: false, creator: null, targetStatus: "active", reason: "" });

  const [reviewCommModal, setReviewCommModal] = useState<{
    open: boolean;
    commissionId: string | null;
    decision: "approved" | "reversed";
    reason: string;
  }>({ open: false, commissionId: null, decision: "approved", reason: "" });

  const [payoutModal, setPayoutModal] = useState<{
    open: boolean;
    creatorId: string;
    currency: string;
    amountCents: number;
    payoutReference: string;
    payoutDetails: {
      payout_method: string | null;
      mobile_money_provider: string | null;
      mobile_money_number: string | null;
      mobile_money_account_name: string | null;
      bank_name: string | null;
      bank_account_number: string | null;
      bank_account_name: string | null;
      bank_branch: string | null;
    } | null;
    loadingDetails: boolean;
  }>({
    open: false,
    creatorId: "",
    currency: "MWK",
    amountCents: 0,
    payoutReference: "",
    payoutDetails: null,
    loadingDetails: false,
  });

  const [addAssetModal, setAddAssetModal] = useState<{
    open: boolean;
    assetType: "logo" | "banner" | "guide" | "template" | "media" | "other";
    title: string;
    description: string;
    file: File | null;
    isPublic: boolean;
    uploading: boolean;
  }>({
    open: false,
    assetType: "media",
    title: "",
    description: "",
    file: null,
    isPublic: true,
    uploading: false,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [deleteAsset, setDeleteAsset] = useState<{ id: string; title: string } | null>(null);

  const [viewAssetModal, setViewAssetModal] = useState<{
    open: boolean;
    asset: {
      id: string;
      title: string;
      description: string | null;
      url: string;
      asset_type: string;
      status: string;
      created_at?: string;
    } | null;
  }>({ open: false, asset: null });

  const [editAssetModal, setEditAssetModal] = useState<{
    open: boolean;
    assetId: string;
    title: string;
    description: string;
    assetType:
      | "logo"
      | "screenshot"
      | "social_graphic"
      | "video"
      | "copy_template"
      | "content_idea"
      | "product_description"
      | "campaign_asset";
    status: "active" | "archived";
  }>({
    open: false,
    assetId: "",
    title: "",
    description: "",
    assetType: "logo",
    status: "active",
  });

  // ─── Queries ──────────────────────────────────────────────────────────────

  const {
    data: creatorsData,
    isLoading: creatorsLoading,
    isError: creatorsIsError,
    error: creatorsError,
    refetch: refetchCreators,
  } = useQuery({
    queryKey: ["admin_creators", creatorsPage, creatorSearch, appStatusFilter, creatorStatusFilter],
    queryFn: async () => {
      const token = await getToken();
      return adminListCreatorsServerFn({
        data: {
          authToken: token,
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
      });
    },
  });

  const {
    data: commissionsData,
    isLoading: commissionsLoading,
    refetch: refetchCommissions,
  } = useQuery({
    queryKey: ["admin_creator_commissions", commissionsPage, commissionStatusFilter],
    queryFn: async () => {
      const token = await getToken();
      return adminListCommissionsServerFn({
        data: {
          authToken: token,
          page: commissionsPage,
          pageSize: 20,
          status:
            commissionStatusFilter !== "all"
              ? (commissionStatusFilter as
                  | "pending"
                  | "approved"
                  | "paid"
                  | "reversed"
                  | "ineligible")
              : undefined,
        },
      });
    },
  });

  const {
    data: payoutsData,
    isLoading: payoutsLoading,
    refetch: refetchPayouts,
  } = useQuery({
    queryKey: ["admin_creator_payouts", payoutsPage, payoutStatusFilter],
    queryFn: async () => {
      const token = await getToken();
      return adminListPayoutsServerFn({
        data: {
          authToken: token,
          page: payoutsPage,
          pageSize: 20,
          status:
            payoutStatusFilter !== "all"
              ? (payoutStatusFilter as
                  | "pending"
                  | "approved"
                  | "processing"
                  | "paid"
                  | "failed"
                  | "cancelled")
              : undefined,
        },
      });
    },
  });

  const { data: brandKitData, isLoading: brandKitLoading, refetch: refetchBrandKit } = useQuery({
    queryKey: ["admin_brand_assets"],
    queryFn: () => getBrandAssetsServerFn(),
    enabled: activeTab === "brand-kit",
  });

  // ─── Mutations ────────────────────────────────────────────────────────────

  const reviewAppMutation = useMutation({
    mutationFn: async (vars: {
      creatorId: string;
      decision: "approved" | "rejected";
      adminNote?: string;
    }) => {
      const token = await getToken();
      return adminReviewCreatorApplicationServerFn({
        data: { ...vars, authToken: token },
      });
    },
    onSuccess: () => {
      toast.success(
        reviewAppModal.decision === "approved"
          ? "Creator application approved!"
          : "Creator application rejected.",
      );
      setReviewAppModal({ open: false, creator: null, decision: "approved", adminNote: "" });
      void queryClient.invalidateQueries({ queryKey: ["admin_creators"] });
    },
    onError: (err: Error) => toast.error(err.message || "Failed to review application."),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (vars: {
      creatorId: string;
      status: "active" | "suspended" | "closed";
      reason?: string;
    }) => {
      const token = await getToken();
      return adminUpdateCreatorStatusServerFn({
        data: { ...vars, authToken: token },
      });
    },
    onSuccess: () => {
      toast.success("Creator status updated.");
      setStatusModal({ open: false, creator: null, targetStatus: "active", reason: "" });
      void queryClient.invalidateQueries({ queryKey: ["admin_creators"] });
    },
    onError: (err: Error) => toast.error(err.message || "Failed to update status."),
  });

  const reviewCommMutation = useMutation({
    mutationFn: async (vars: {
      commissionId: string;
      decision: "approved" | "reversed";
      reason?: string;
    }) => {
      const token = await getToken();
      return adminReviewCommissionServerFn({
        data: { ...vars, authToken: token },
      });
    },
    onSuccess: () => {
      toast.success("Commission status updated.");
      setReviewCommModal({ open: false, commissionId: null, decision: "approved", reason: "" });
      void queryClient.invalidateQueries({ queryKey: ["admin_creator_commissions"] });
    },
    onError: (err: Error) => toast.error(err.message || "Failed to update commission."),
  });

  const recordPayoutMutation = useMutation({
    mutationFn: async (vars: {
      creatorId: string;
      currency: string;
      amountCents: number;
      payoutReference: string;
      commissionIds: string[];
    }) => {
      const token = await getToken();
      return adminRecordManualPayoutServerFn({
        data: { ...vars, authToken: token },
      });
    },
    onSuccess: () => {
      toast.success("Manual payout recorded.");
      setPayoutModal({
        open: false,
        creatorId: "",
        currency: "MWK",
        amountCents: 0,
        payoutReference: "",
        payoutDetails: null,
        loadingDetails: false,
      });
      void queryClient.invalidateQueries({ queryKey: ["admin_creator_payouts"] });
      void queryClient.invalidateQueries({ queryKey: ["admin_creator_commissions"] });
    },
    onError: (err: Error) => toast.error(err.message || "Failed to record payout."),
  });

  const addAssetMutation = useMutation({
    mutationFn: async () => {
      if (!addAssetModal.file) throw new Error("No file selected.");
      setAddAssetModal((s) => ({ ...s, uploading: true }));

      // 1. Upload to Supabase Storage
      const ext = addAssetModal.file.name.split(".").pop() ?? "bin";
      const storageKey = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("creator-assets")
        .upload(storageKey, addAssetModal.file, {
          cacheControl: "31536000",
          upsert: false,
          contentType: addAssetModal.file.type || "application/octet-stream",
        });
      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

      // 2. Get public URL
      const { data: pubData } = supabase.storage
        .from("creator-assets")
        .getPublicUrl(storageKey);
      const publicUrl = pubData.publicUrl;

      // 3. Save record
      const token = await getToken();
      const mappedType =
        addAssetModal.assetType === "banner"
          ? "social_graphic"
          : addAssetModal.assetType === "guide" || addAssetModal.assetType === "template"
            ? "copy_template"
            : addAssetModal.assetType === "media"
              ? "social_graphic"
              : addAssetModal.assetType === "other"
                ? "campaign_asset"
                : addAssetModal.assetType;
      return adminAddBrandAssetServerFn({
        data: {
          authToken: token,
          assetType: mappedType as
            | "logo"
            | "screenshot"
            | "social_graphic"
            | "video"
            | "copy_template"
            | "content_idea"
            | "product_description"
            | "campaign_asset",
          title: addAssetModal.title,
          description: addAssetModal.description || undefined,
          url: publicUrl,
          status: addAssetModal.isPublic ? "active" : "archived",
        },
      });
    },
    onSuccess: () => {
      toast.success("Asset uploaded and added to Brand Kit.");
      setAddAssetModal({
        open: false,
        assetType: "media",
        title: "",
        description: "",
        file: null,
        isPublic: true,
        uploading: false,
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
      void refetchBrandKit();
    },
    onError: (err: Error) => {
      toast.error(err.message);
      setAddAssetModal((s) => ({ ...s, uploading: false }));
    },
  });

  const deleteAssetMutation = useMutation({
    mutationFn: async (assetId: string) => {
      const token = await getToken();
      return adminDeleteBrandAssetServerFn({ data: { authToken: token, assetId } });
    },
    onSuccess: () => {
      toast.success("Asset removed.");
      setDeleteAsset(null);
      void refetchBrandKit();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateAssetMutation = useMutation({
    mutationFn: async (vars: {
      assetId: string;
      title?: string;
      description?: string;
      assetType?:
        | "logo"
        | "screenshot"
        | "social_graphic"
        | "video"
        | "copy_template"
        | "content_idea"
        | "product_description"
        | "campaign_asset";
      status?: "active" | "archived";
    }) => {
      const token = await getToken();
      return adminUpdateBrandAssetServerFn({
        data: {
          authToken: token,
          assetId: vars.assetId,
          ...(vars.title !== undefined ? { title: vars.title } : {}),
          ...(vars.description !== undefined ? { description: vars.description } : {}),
          ...(vars.assetType !== undefined ? { assetType: vars.assetType } : {}),
          ...(vars.status !== undefined ? { status: vars.status } : {}),
        },
      });
    },
    onSuccess: () => {
      toast.success("Brand asset updated.");
      setEditAssetModal((s) => ({ ...s, open: false }));
      void refetchBrandKit();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Load creator payout details when creator is selected in payout modal
  const loadCreatorPayoutDetails = async (creatorId: string) => {
    if (!creatorId) return;
    setPayoutModal((s) => ({ ...s, loadingDetails: true, payoutDetails: null }));
    try {
      const token = await getToken();
      const res = await adminGetCreatorPayoutDetailsServerFn({
        data: { authToken: token, creatorId },
      });
      setPayoutModal((s) => ({
        ...s,
        loadingDetails: false,
        payoutDetails: res.profile as unknown as typeof s.payoutDetails,
      }));
    } catch {
      setPayoutModal((s) => ({ ...s, loadingDetails: false }));
    }
  };

  // ─── JSX ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="size-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Creator Distribution
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Malawi Creator Partner Program — applications, performance, commissions, and payouts.
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
                currency: "MWK",
                amountCents: 0,
                payoutReference: `PAY-${Date.now().toString(36).toUpperCase()}`,
                payoutDetails: null,
                loadingDetails: false,
              })
            }
          >
            <Banknote className="mr-2 size-4" />
            Record Payout
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 sm:w-auto sm:inline-flex">
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
          <TabsTrigger value="brand-kit" className="flex items-center gap-2">
            <ImageIcon className="size-4" />
            <span>Brand Kit</span>
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
              ) : creatorsIsError ? (
                <div className="p-8 text-center text-sm text-destructive space-y-2">
                  <p>Failed to load creators: {(creatorsError as Error)?.message}</p>
                  <Button size="sm" variant="outline" onClick={() => void refetchCreators()}>
                    Retry
                  </Button>
                </div>
              ) : (creatorsData?.creators.length ?? 0) === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No creators found matching current filters.
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Creator</TableHead>
                        <TableHead>Platform</TableHead>
                        <TableHead>Application</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Payout Method</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead className="text-right w-12">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {creatorsData?.creators.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell>
                            <div className="font-medium text-foreground">{c.display_name}</div>
                            <div className="text-xs font-mono text-muted-foreground">
                              @{c.public_handle} · {c.email}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm capitalize text-foreground">
                              {c.primary_platform ?? "—"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                c.application_status === "pending"
                                  ? "border-amber-500/30 text-amber-500 bg-amber-500/10"
                                  : c.application_status === "approved"
                                    ? "border-emerald-500/30 text-emerald-500 bg-emerald-500/10"
                                    : "border-destructive/30 text-destructive bg-destructive/10"
                              }
                            >
                              {c.application_status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {c.creator_status === "active" ? (
                              <Badge className="bg-emerald-600 text-white">Active</Badge>
                            ) : c.creator_status === "suspended" ? (
                              <Badge
                                variant="outline"
                                className="border-rose-500/30 text-rose-500"
                              >
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
                            {(c as { payout_method?: string | null }).payout_method ? (
                              <Badge
                                variant="outline"
                                className={
                                  (c as { payout_method?: string | null }).payout_method ===
                                  "mobile_money"
                                    ? "text-violet-400 border-violet-500/30 text-[10px]"
                                    : "text-blue-400 border-blue-500/30 text-[10px]"
                                }
                              >
                                {(c as { payout_method?: string | null }).payout_method ===
                                "mobile_money"
                                  ? "Mobile Money"
                                  : "Bank"}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">Not set</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(c.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  id={`creator-actions-${c.id}`}
                                >
                                  <MoreHorizontal className="size-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel className="text-xs">Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() =>
                                    setViewCreatorModal({
                                      open: true,
                                      creator: c as typeof viewCreatorModal.creator,
                                    })
                                  }
                                >
                                  <Eye className="mr-2 size-4" />
                                  View Profile
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <a
                                    href={`/c/${c.referral_code}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <ExternalLink className="mr-2 size-4" />
                                    Preview Referral Link
                                  </a>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {c.application_status === "pending" && (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      setReviewAppModal({
                                        open: true,
                                        creator: {
                                          id: c.id,
                                          displayName: c.display_name,
                                          handle: c.public_handle,
                                          note: c.application_note ?? null,
                                        },
                                        decision: "approved",
                                        adminNote: "",
                                      })
                                    }
                                  >
                                    <CheckCircle2 className="mr-2 size-4 text-emerald-500" />
                                    Review Application
                                  </DropdownMenuItem>
                                )}
                                {c.creator_status === "active" && (
                                  <DropdownMenuItem
                                    className="text-amber-500 focus:text-amber-500"
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
                                    <PauseCircle className="mr-2 size-4" />
                                    Suspend Creator
                                  </DropdownMenuItem>
                                )}
                                {c.creator_status === "suspended" && (
                                  <DropdownMenuItem
                                    className="text-emerald-500 focus:text-emerald-500"
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
                                    <PlayCircle className="mr-2 size-4" />
                                    Reactivate Creator
                                  </DropdownMenuItem>
                                )}
                                {c.creator_status === "active" && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setPayoutModal({
                                          open: true,
                                          creatorId: c.id,
                                          currency: "MWK",
                                          amountCents: 0,
                                          payoutReference: `PAY-${Date.now().toString(36).toUpperCase()}`,
                                          payoutDetails: null,
                                          loadingDetails: false,
                                        });
                                        void loadCreatorPayoutDetails(c.id);
                                      }}
                                    >
                                      <Banknote className="mr-2 size-4 text-primary" />
                                      Record Payout
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <Pagination
                    page={creatorsPage}
                    pageSize={20}
                    total={creatorsData?.total ?? 0}
                    onPageChange={setCreatorsPage}
                  />
                </>
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
                <>
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
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                >
                                  <MoreHorizontal className="size-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {comm.status === "pending" && (
                                  <DropdownMenuItem
                                    className="text-emerald-500"
                                    onClick={() =>
                                      setReviewCommModal({
                                        open: true,
                                        commissionId: comm.id,
                                        decision: "approved",
                                        reason: "",
                                      })
                                    }
                                  >
                                    <CheckCircle2 className="mr-2 size-4" />
                                    Approve
                                  </DropdownMenuItem>
                                )}
                                {["pending", "approved"].includes(comm.status) && (
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() =>
                                      setReviewCommModal({
                                        open: true,
                                        commissionId: comm.id,
                                        decision: "reversed",
                                        reason: "",
                                      })
                                    }
                                  >
                                    <XCircle className="mr-2 size-4" />
                                    Reverse
                                  </DropdownMenuItem>
                                )}
                                {!["pending", "approved"].includes(comm.status) && (
                                  <DropdownMenuItem disabled>
                                    <span className="text-muted-foreground text-xs">
                                      No actions available
                                    </span>
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <Pagination
                    page={commissionsPage}
                    pageSize={20}
                    total={commissionsData?.total ?? 0}
                    onPageChange={setCommissionsPage}
                  />
                </>
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
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Creator</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Commissions</TableHead>
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
                  <Pagination
                    page={payoutsPage}
                    pageSize={20}
                    total={payoutsData?.total ?? 0}
                    onPageChange={setPayoutsPage}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── TAB 4: BRAND KIT ─────────────────────────────────────── */}
        <TabsContent value="brand-kit" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground">Brand & Media Kit</h2>
              <p className="text-sm text-muted-foreground">
                Manage assets available to all creators in the program.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setAddAssetModal((s) => ({ ...s, open: true }))}
            >
              <Upload className="mr-2 size-4" />
              Add Asset
            </Button>
          </div>

          {brandKitLoading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : (brandKitData?.assets.length ?? 0) === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
                <ImageIcon className="size-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No brand assets yet. Upload the first one.</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {brandKitData?.assets.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {a.asset_type === "logo" || a.asset_type === "social_graphic" ? (
                            <div className="size-8 rounded border border-border bg-muted/30 overflow-hidden flex-shrink-0">
                              <img
                                src={a.url}
                                alt={a.title}
                                className="size-full object-contain p-0.5"
                              />
                            </div>
                          ) : (
                            <div className="size-8 rounded border border-border bg-muted/30 flex items-center justify-center flex-shrink-0">
                              <FileText className="size-4 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <div className="text-sm font-medium text-foreground">{a.title}</div>
                            {a.description && (
                              <div className="text-[11px] text-muted-foreground line-clamp-1 max-w-xs">
                                {a.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[10px] capitalize ${assetTypeColor(a.asset_type)}`}
                        >
                          {a.asset_type.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {a.status === "active" ? (
                          <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                            Visible
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground border-border">
                            Hidden
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {a.created_at
                          ? new Date(a.created_at).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8">
                              <MoreHorizontal className="size-4" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem onClick={() => setViewAssetModal({ open: true, asset: a })}>
                              <Eye className="mr-2 size-4 text-muted-foreground" />
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                setEditAssetModal({
                                  open: true,
                                  assetId: a.id,
                                  title: a.title,
                                  description: a.description || "",
                                  assetType: (a.asset_type as any) || "logo",
                                  status: (a.status as "active" | "archived") || "active",
                                })
                              }
                            >
                              <Pencil className="mr-2 size-4 text-muted-foreground" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <a href={a.url} target="_blank" rel="noopener noreferrer" download={a.title}>
                                <Download className="mr-2 size-4 text-muted-foreground" />
                                Download
                              </a>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setDeleteAsset({ id: a.id, title: a.title })}
                              className="text-destructive focus:text-destructive focus:bg-destructive/10"
                            >
                              <Trash2 className="mr-2 size-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* ─── MODAL: View Creator Profile ─────────────────────────────── */}
      <Dialog
        open={viewCreatorModal.open}
        onOpenChange={(open) => !open && setViewCreatorModal((s) => ({ ...s, open: false }))}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Creator Profile</DialogTitle>
          </DialogHeader>
          {viewCreatorModal.creator && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-lg">
                  {viewCreatorModal.creator.display_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-bold text-foreground">
                    {viewCreatorModal.creator.display_name}
                  </div>
                  <div className="text-sm text-muted-foreground font-mono">
                    @{viewCreatorModal.creator.public_handle}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">Email</div>
                  <div className="font-medium">{viewCreatorModal.creator.email}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Platform</div>
                  <div className="font-medium capitalize">
                    {viewCreatorModal.creator.primary_platform ?? "—"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Joined</div>
                  <div className="font-medium">
                    {new Date(viewCreatorModal.creator.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Status</div>
                  <div className="font-medium capitalize">
                    {viewCreatorModal.creator.creator_status ?? "Not active"}
                  </div>
                </div>
              </div>
              {viewCreatorModal.creator.bio && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Bio</div>
                  <div className="text-sm bg-muted/30 rounded-lg p-3">
                    {viewCreatorModal.creator.bio}
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2">
                <span className="font-mono text-xs text-muted-foreground truncate flex-1">
                  /c/{viewCreatorModal.creator.referral_code}
                </span>
                <a
                  href={`/c/${viewCreatorModal.creator.referral_code}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary/80"
                >
                  <ExternalLink className="size-4" />
                </a>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
                  <SelectItem value="approved">Approve Application</SelectItem>
                  <SelectItem value="rejected">Reject Application</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Admin Feedback (sent via email)</Label>
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
              Change status for <strong>{statusModal.creator?.displayName}</strong>.
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
              <Label>Reason (audit log)</Label>
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
                ? "Authorize this commission for the next creator payout."
                : "Mark this commission as reversed due to refund or dispute."}
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Record Manual Payout</DialogTitle>
            <DialogDescription>
              Log a mobile money or bank transfer made to an active Malawi creator.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Creator selector */}
            <div className="space-y-1.5">
              <Label>Creator</Label>
              <Select
                value={payoutModal.creatorId}
                onValueChange={(val) => {
                  setPayoutModal((s) => ({ ...s, creatorId: val }));
                  void loadCreatorPayoutDetails(val);
                }}
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

            {/* Creator payout method panel */}
            {payoutModal.loadingDetails && (
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 p-3">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Loading payout details...</span>
              </div>
            )}

            {!payoutModal.loadingDetails && payoutModal.payoutDetails && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Shield className="size-4 text-primary" />
                  <span className="text-xs font-semibold text-primary">
                    Creator Payout Method on File
                  </span>
                </div>

                {payoutModal.payoutDetails.payout_method === "mobile_money" ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Phone className="size-3.5 text-muted-foreground" />
                      <span className="text-xs font-medium text-foreground">
                        {payoutModal.payoutDetails.mobile_money_provider === "airtel"
                          ? "Airtel Money"
                          : "TNM Mpamba"}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Number: </span>
                        <span className="font-mono font-medium text-foreground">
                          {payoutModal.payoutDetails.mobile_money_number}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Name: </span>
                        <span className="font-medium text-foreground">
                          {payoutModal.payoutDetails.mobile_money_account_name}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : payoutModal.payoutDetails.payout_method === "bank" ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Building2 className="size-3.5 text-muted-foreground" />
                      <span className="text-xs font-medium text-foreground">
                        {payoutModal.payoutDetails.bank_name}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Account No: </span>
                        <span className="font-mono font-medium text-foreground">
                          {payoutModal.payoutDetails.bank_account_number}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Account Name: </span>
                        <span className="font-medium text-foreground">
                          {payoutModal.payoutDetails.bank_account_name}
                        </span>
                      </div>
                      {payoutModal.payoutDetails.bank_branch && (
                        <div>
                          <span className="text-muted-foreground">Branch: </span>
                          <span className="font-medium text-foreground">
                            {payoutModal.payoutDetails.bank_branch}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-amber-400">
                    ⚠️ This creator has not set up payout details yet.
                  </p>
                )}
              </div>
            )}

            {!payoutModal.loadingDetails &&
              payoutModal.creatorId &&
              !payoutModal.payoutDetails && (
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                  <p className="text-xs text-amber-400">
                    ⚠️ Could not load payout details for this creator. Ensure they have set up
                    their payout method before proceeding.
                  </p>
                </div>
              )}

            <Separator />

            {/* Amount */}
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
                    <SelectItem value="MWK">MWK (Malawian Kwacha)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Amount (e.g. 15000.00)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="1"
                  placeholder="15000.00"
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
                placeholder="e.g. AM-8374829 or TNM-992182"
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

      {/* ─── MODAL: Add Brand Asset ───────────────────────────────────── */}
      <Dialog
        open={addAssetModal.open}
        onOpenChange={(open) => !open && setAddAssetModal((s) => ({ ...s, open: false }))}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Brand Asset</DialogTitle>
            <DialogDescription>
              Upload a new asset to the Brand & Media Kit available to all creators.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Asset Type</Label>
                <Select
                  value={addAssetModal.assetType}
                  onValueChange={(val) =>
                    setAddAssetModal((s) => ({
                      ...s,
                      assetType: val as typeof addAssetModal.assetType,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="logo">Logo</SelectItem>
                    <SelectItem value="banner">Banner</SelectItem>
                    <SelectItem value="guide">Guide / PDF</SelectItem>
                    <SelectItem value="template">Template</SelectItem>
                    <SelectItem value="media">Media / Photo</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Visibility</Label>
                <Select
                  value={addAssetModal.isPublic ? "public" : "hidden"}
                  onValueChange={(val) =>
                    setAddAssetModal((s) => ({ ...s, isPublic: val === "public" }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public (visible to creators)</SelectItem>
                    <SelectItem value="hidden">Hidden (admin only)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input
                placeholder="e.g. SoloOS Primary Logo — Dark"
                value={addAssetModal.title}
                onChange={(e) => setAddAssetModal((s) => ({ ...s, title: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Description (optional)</Label>
              <Textarea
                placeholder="Brief description of the asset and intended use..."
                rows={2}
                value={addAssetModal.description}
                onChange={(e) => setAddAssetModal((s) => ({ ...s, description: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>File</Label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/20 px-4 py-6 text-center cursor-pointer hover:bg-muted/40 transition-colors"
              >
                <Upload className="size-6 text-muted-foreground" />
                {addAssetModal.file ? (
                  <div className="text-sm">
                    <span className="font-medium text-foreground">{addAssetModal.file.name}</span>
                    <span className="text-muted-foreground ml-2">
                      ({(addAssetModal.file.size / 1024).toFixed(0)} KB)
                    </span>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-foreground font-medium">Click to choose a file</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Images, PDFs, ZIPs, videos — max 50 MB
                    </p>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/*,application/pdf,application/zip,text/plain,video/mp4,video/quicktime"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setAddAssetModal((s) => ({ ...s, file: f }));
                }}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddAssetModal((s) => ({ ...s, open: false }))}
            >
              Cancel
            </Button>
            <Button
              disabled={
                addAssetMutation.isPending ||
                addAssetModal.uploading ||
                !addAssetModal.title.trim() ||
                !addAssetModal.file
              }
              onClick={() => addAssetMutation.mutate()}
            >
              {(addAssetMutation.isPending || addAssetModal.uploading) && (
                <Loader2 className="mr-2 size-4 animate-spin" />
              )}
              {addAssetModal.uploading ? "Uploading…" : "Upload & Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL: View Brand Asset ─────────────────────────────── */}
      <Dialog
        open={viewAssetModal.open}
        onOpenChange={(open) => !open && setViewAssetModal({ open: false, asset: null })}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="size-5 text-primary" />
              Brand Asset Details
            </DialogTitle>
            <DialogDescription>
              Preview and specifications for creators in the program.
            </DialogDescription>
          </DialogHeader>

          {viewAssetModal.asset && (
            <div className="space-y-4 py-2">
              {viewAssetModal.asset.asset_type === "logo" ||
              viewAssetModal.asset.asset_type === "social_graphic" ||
              viewAssetModal.asset.asset_type === "screenshot" ? (
                <div className="rounded-lg border border-border bg-muted/20 p-4 flex items-center justify-center max-h-64 overflow-hidden">
                  <img
                    src={viewAssetModal.asset.url}
                    alt={viewAssetModal.asset.title}
                    className="max-h-56 max-w-full object-contain rounded"
                  />
                </div>
              ) : (
                <div className="rounded-lg border border-border bg-muted/20 p-8 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                  <FileText className="size-12" />
                  <span className="text-xs uppercase font-medium">{viewAssetModal.asset.asset_type.replace(/_/g, " ")}</span>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground text-base">
                    {viewAssetModal.asset.title}
                  </h3>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`text-[10px] capitalize ${assetTypeColor(viewAssetModal.asset.asset_type)}`}>
                      {viewAssetModal.asset.asset_type.replace(/_/g, " ")}
                    </Badge>
                    {viewAssetModal.asset.status === "active" ? (
                      <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                        Visible
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-muted-foreground border-border">
                        Hidden
                      </Badge>
                    )}
                  </div>
                </div>

                {viewAssetModal.asset.description ? (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {viewAssetModal.asset.description}
                  </p>
                ) : (
                  <p className="text-xs italic text-muted-foreground/70">No description provided.</p>
                )}
              </div>

              <div className="rounded-md border border-border/80 bg-muted/40 p-2.5 space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Direct URL:</span>
                  <button
                    onClick={() => {
                      if (viewAssetModal.asset?.url) {
                        navigator.clipboard.writeText(viewAssetModal.asset.url);
                        toast.success("Asset URL copied to clipboard");
                      }
                    }}
                    className="flex items-center gap-1 text-primary hover:underline"
                  >
                    <Copy className="size-3" />
                    Copy Link
                  </button>
                </div>
                <div className="font-mono text-[11px] text-foreground truncate select-all">
                  {viewAssetModal.asset.url}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setViewAssetModal({ open: false, asset: null })}
            >
              Close
            </Button>
            {viewAssetModal.asset && (
              <Button asChild>
                <a
                  href={viewAssetModal.asset.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={viewAssetModal.asset.title}
                >
                  <Download className="mr-2 size-4" />
                  Download
                </a>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL: Edit Brand Asset ─────────────────────────────── */}
      <Dialog
        open={editAssetModal.open}
        onOpenChange={(open) => !open && setEditAssetModal((s) => ({ ...s, open: false }))}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="size-5 text-primary" />
              Edit Brand Asset
            </DialogTitle>
            <DialogDescription>
              Update asset metadata, display title, or visibility.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!editAssetModal.title.trim()) {
                toast.error("Asset title is required.");
                return;
              }
              updateAssetMutation.mutate({
                assetId: editAssetModal.assetId,
                title: editAssetModal.title.trim(),
                ...(editAssetModal.description.trim()
                  ? { description: editAssetModal.description.trim() }
                  : {}),
                assetType: editAssetModal.assetType,
                status: editAssetModal.status,
              });
            }}
            className="space-y-4 py-2"
          >
            <div className="space-y-1.5">
              <Label htmlFor="edit-asset-title">Title</Label>
              <Input
                id="edit-asset-title"
                value={editAssetModal.title}
                onChange={(e) => setEditAssetModal((s) => ({ ...s, title: e.target.value }))}
                placeholder="e.g. SoloOS Primary Dark Logo"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-asset-type">Asset Type</Label>
              <Select
                value={editAssetModal.assetType}
                onValueChange={(val: any) => setEditAssetModal((s) => ({ ...s, assetType: val }))}
              >
                <SelectTrigger id="edit-asset-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="logo">Logo & Marks</SelectItem>
                  <SelectItem value="social_graphic">Social Media Graphic</SelectItem>
                  <SelectItem value="screenshot">Product Screenshot</SelectItem>
                  <SelectItem value="video">Promotional Video</SelectItem>
                  <SelectItem value="copy_template">Copy / Caption Template</SelectItem>
                  <SelectItem value="content_idea">Content Idea / Talking Point</SelectItem>
                  <SelectItem value="product_description">Product Description</SelectItem>
                  <SelectItem value="campaign_asset">Campaign Asset</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-asset-status">Visibility to Creators</Label>
              <Select
                value={editAssetModal.status}
                onValueChange={(val: "active" | "archived") =>
                  setEditAssetModal((s) => ({ ...s, status: val }))
                }
              >
                <SelectTrigger id="edit-asset-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Visible (Available in Creator Studio)</SelectItem>
                  <SelectItem value="archived">Hidden (Archived / Admin only)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-asset-desc">Description & Instructions</Label>
              <Textarea
                id="edit-asset-desc"
                value={editAssetModal.description}
                onChange={(e) => setEditAssetModal((s) => ({ ...s, description: e.target.value }))}
                placeholder="Guidelines on where and how to use this asset..."
                rows={3}
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditAssetModal((s) => ({ ...s, open: false }))}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateAssetMutation.isPending}>
                {updateAssetMutation.isPending && (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                )}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── CONFIRM: Delete Brand Asset (AlertDialog) ─────────────────────────────── */}
      <AlertDialog open={!!deleteAsset} onOpenChange={(open) => !open && setDeleteAsset(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Brand Asset</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-semibold text-foreground">{deleteAsset?.title}</span>? Creators will no longer be able to access it. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteAsset(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteAssetMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (deleteAsset) {
                  deleteAssetMutation.mutate(deleteAsset.id);
                }
              }}
            >
              {deleteAssetMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Delete Asset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
