import React from "react";
import { Link } from "@tanstack/react-router";
import { CheckCircle2, Clock, Building2, Mail, Phone, MapPin, AlertCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { MoneyValue } from "@/components/ui/money-value";
import type { InvoiceWithRelations } from "@/domain/invoices";
import type { Workspace } from "@/domain/workspace";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export type InvoiceTemplateId = "modern" | "minimal" | "professional" | "premium";

export interface InvoiceTemplateProps {
  invoice: InvoiceWithRelations;
  workspace: Workspace;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. MODERN TEMPLATE (Contemporary SaaS / High-growth Tech)
// ─────────────────────────────────────────────────────────────────────────────
export function ModernInvoiceTemplate({ invoice, workspace }: InvoiceTemplateProps) {
  const isPaid = invoice.status === "paid";
  const isOverdue = invoice.status === "overdue";

  return (
    <div className="bg-card text-card-foreground border border-border/80 rounded-xl p-6 sm:p-10 shadow-sm print:p-0 print:border-none print:shadow-none space-y-8 font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-border">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm tracking-tight shadow-sm">
              {workspace.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">{workspace.name}</h1>
              <p className="text-xs text-muted-foreground">Digital Business Command</p>
            </div>
          </div>
        </div>

        <div className="sm:text-right space-y-1">
          <div className="inline-flex items-center gap-2">
            <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Invoice
            </span>
            <span className="font-mono font-bold text-lg text-primary">
              {invoice.invoice_number}
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            Issued: <span className="text-foreground font-medium">{invoice.issue_date}</span>
          </div>
          <div className="text-xs text-muted-foreground">
            Due: <span className="text-foreground font-medium">{invoice.due_date}</span>
          </div>
        </div>
      </div>

      {/* Bill To & Metadata Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
        <div className="rounded-lg bg-muted/30 border border-border/50 p-4 space-y-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
            Billed To
          </span>
          <div className="font-bold text-base text-foreground">
            {invoice.client?.name ?? "Client Organization"}
          </div>
          {invoice.client?.company_name && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Building2 className="size-3" /> {invoice.client.company_name}
            </p>
          )}
          {invoice.client?.email && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Mail className="size-3" /> {invoice.client.email}
            </p>
          )}
          {invoice.client?.address && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 whitespace-pre-line">
              <MapPin className="size-3 shrink-0 mt-0.5" /> {invoice.client.address}
            </p>
          )}
          {invoice.project && (
            <div className="pt-2 border-t border-border/40 text-xs">
              <span className="text-muted-foreground font-medium">Project: </span>
              <span className="font-semibold text-foreground">{invoice.project.name}</span>
            </div>
          )}
        </div>

        <div className="rounded-lg bg-muted/30 border border-border/50 p-4 flex flex-col justify-between space-y-3">
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
              Payment Status
            </span>
            <div className="flex items-center gap-2">
              <Badge
                variant={isPaid ? "default" : isOverdue ? "destructive" : "secondary"}
                className="capitalize text-xs font-semibold px-2.5 py-0.5"
              >
                {invoice.status}
              </Badge>
              {isPaid && (
                <span className="text-xs text-emerald-600 flex items-center gap-1 font-medium">
                  <CheckCircle2 className="size-3.5" /> Paid in full
                </span>
              )}
            </div>
          </div>

          <div className="border-t border-border/40 pt-2 space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Currency:</span>
              <span className="font-mono font-semibold">{invoice.currency}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Balance Due:</span>
              <span className="font-mono font-bold text-sm text-foreground">
                {formatMoney(invoice.amount_due, invoice.currency)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Line Items Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="bg-muted/50 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <th className="py-3 px-4">Description</th>
              <th className="py-3 px-4 text-center w-24">Qty</th>
              <th className="py-3 px-4 text-right w-32">Unit Price</th>
              <th className="py-3 px-4 text-right w-36">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {(invoice.line_items ?? []).map((item, idx) => (
              <tr key={idx} className="hover:bg-muted/20 transition-colors">
                <td className="py-3.5 px-4 font-medium text-foreground">{item.description}</td>
                <td className="py-3.5 px-4 text-center font-mono text-muted-foreground">
                  {item.quantity}
                </td>
                <td className="py-3.5 px-4 text-right font-mono text-muted-foreground">
                  {formatMoney(item.unit_price, invoice.currency)}
                </td>
                <td className="py-3.5 px-4 text-right font-mono font-semibold text-foreground">
                  {formatMoney(item.line_total, invoice.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals & Financial Summary */}
      <div className="flex flex-col sm:flex-row justify-between gap-6 pt-2">
        <div className="max-w-md space-y-3 text-xs">
          {invoice.notes && (
            <div className="p-3.5 rounded-lg bg-muted/30 border border-border/60">
              <span className="font-semibold text-foreground uppercase tracking-wider block mb-1 text-[10px]">
                Notes &amp; Terms
              </span>
              <p className="text-muted-foreground whitespace-pre-line leading-relaxed">
                {invoice.notes}
              </p>
            </div>
          )}
        </div>

        <div className="w-full sm:w-72 space-y-2 text-xs font-mono">
          <div className="flex justify-between py-1 text-muted-foreground">
            <span>Subtotal:</span>
            <span>{formatMoney(invoice.subtotal, invoice.currency)}</span>
          </div>
          {invoice.discount_amount > 0 && (
            <div className="flex justify-between py-1 text-emerald-600 dark:text-emerald-400">
              <span>Discount:</span>
              <span>-{formatMoney(invoice.discount_amount, invoice.currency)}</span>
            </div>
          )}
          {invoice.tax_amount > 0 && (
            <div className="flex justify-between py-1 text-muted-foreground">
              <span>Tax / VAT:</span>
              <span>+{formatMoney(invoice.tax_amount, invoice.currency)}</span>
            </div>
          )}
          <div className="border-t border-border pt-2 flex justify-between font-sans font-bold text-base text-foreground">
            <span>Total:</span>
            <span className="font-mono text-primary font-bold">
              {formatMoney(invoice.total, invoice.currency)}
            </span>
          </div>
          {invoice.amount_paid > 0 && (
            <div className="flex justify-between py-1 text-muted-foreground border-t border-border/40">
              <span>Amount Paid:</span>
              <span className="text-emerald-600">
                -{formatMoney(invoice.amount_paid, invoice.currency)}
              </span>
            </div>
          )}
          <div className="flex justify-between py-2 border-t-2 border-border font-bold text-sm bg-muted/40 px-2 rounded">
            <span>Balance Due:</span>
            <span className={invoice.amount_due > 0 ? "text-amber-500" : "text-emerald-600"}>
              {formatMoney(invoice.amount_due, invoice.currency)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. MINIMAL TEMPLATE (Swiss Style / Clean Monospace Typography)
// ─────────────────────────────────────────────────────────────────────────────
export function MinimalInvoiceTemplate({ invoice, workspace }: InvoiceTemplateProps) {
  return (
    <div className="bg-background text-foreground border border-border/40 p-8 sm:p-14 space-y-10 font-mono text-xs shadow-none print:p-0 print:border-none">
      {/* Minimal Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-8 border-b border-foreground/20 pb-8">
        <div>
          <div className="text-xl font-bold uppercase tracking-widest text-foreground">
            {workspace.name}
          </div>
          <div className="text-muted-foreground mt-1 tracking-tight">commercial statement</div>
        </div>

        <div className="sm:text-right space-y-1">
          <div className="text-base font-bold text-foreground tracking-wider">
            INV #{invoice.invoice_number}
          </div>
          <div className="text-muted-foreground">DATE: {invoice.issue_date}</div>
          <div className="text-muted-foreground">DUE: {invoice.due_date}</div>
          <div className="text-muted-foreground uppercase">STATUS: {invoice.status}</div>
        </div>
      </div>

      {/* Recipient */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
        <div>
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest block mb-2">
            // CLIENT
          </span>
          <div className="font-bold text-sm text-foreground">{invoice.client?.name ?? "N/A"}</div>
          {invoice.client?.company_name && <div>{invoice.client.company_name}</div>}
          {invoice.client?.email && (
            <div className="text-muted-foreground">{invoice.client.email}</div>
          )}
          {invoice.client?.address && (
            <div className="text-muted-foreground mt-1 whitespace-pre-line">
              {invoice.client.address}
            </div>
          )}
        </div>

        {invoice.project && (
          <div>
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest block mb-2">
              // PROJECT REFERENCE
            </span>
            <div className="font-bold text-foreground">{invoice.project.name}</div>
          </div>
        )}
      </div>

      {/* Minimal Table */}
      <div className="space-y-2">
        <div className="grid grid-cols-12 border-b border-foreground/20 pb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          <div className="col-span-6">Item</div>
          <div className="col-span-2 text-center">Qty</div>
          <div className="col-span-2 text-right">Price</div>
          <div className="col-span-2 text-right">Total</div>
        </div>

        <div className="divide-y divide-border/40">
          {(invoice.line_items ?? []).map((item, idx) => (
            <div key={idx} className="grid grid-cols-12 py-3">
              <div className="col-span-6 font-medium text-foreground">{item.description}</div>
              <div className="col-span-2 text-center text-muted-foreground">{item.quantity}</div>
              <div className="col-span-2 text-right text-muted-foreground">
                {formatMoney(item.unit_price, invoice.currency)}
              </div>
              <div className="col-span-2 text-right font-bold text-foreground">
                {formatMoney(item.line_total, invoice.currency)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Minimal Footer & Totals */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-8 pt-6 border-t border-foreground/20">
        <div className="max-w-sm text-muted-foreground">
          {invoice.notes && (
            <div>
              <span className="text-[10px] uppercase tracking-widest block mb-1">// REMARKS</span>
              <p className="whitespace-pre-line leading-relaxed">{invoice.notes}</p>
            </div>
          )}
        </div>

        <div className="w-full sm:w-64 space-y-2">
          <div className="flex justify-between text-muted-foreground">
            <span>SUBTOTAL:</span>
            <span>{formatMoney(invoice.subtotal, invoice.currency)}</span>
          </div>
          {invoice.discount_amount > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>DISCOUNT:</span>
              <span>-{formatMoney(invoice.discount_amount, invoice.currency)}</span>
            </div>
          )}
          {invoice.tax_amount > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>TAX:</span>
              <span>+{formatMoney(invoice.tax_amount, invoice.currency)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-foreground/40 pt-2 font-bold text-sm text-foreground">
            <span>TOTAL:</span>
            <span>{formatMoney(invoice.total, invoice.currency)}</span>
          </div>
          <div className="flex justify-between font-bold text-sm border-t border-dashed border-border pt-1">
            <span>BALANCE DUE:</span>
            <span>{formatMoney(invoice.amount_due, invoice.currency)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. PROFESSIONAL TEMPLATE (Corporate Consulting / Formal Ledger)
// ─────────────────────────────────────────────────────────────────────────────
export function ProfessionalInvoiceTemplate({ invoice, workspace }: InvoiceTemplateProps) {
  return (
    <div className="bg-card text-card-foreground border-2 border-slate-300 dark:border-slate-800 rounded-md p-8 sm:p-10 space-y-8 font-sans shadow-sm print:p-0 print:border-none">
      {/* Corporate Letterhead */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b-2 border-slate-900 dark:border-slate-100 pb-6">
        <div>
          <h1 className="text-2xl font-serif font-black tracking-tight text-foreground">
            {workspace.name}
          </h1>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-mono mt-1">
            Official Commercial Invoice
          </p>
        </div>

        <div className="bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded px-4 py-3 text-right">
          <div className="text-xs text-muted-foreground font-mono uppercase">Invoice Ref</div>
          <div className="text-lg font-bold font-mono tracking-tight text-foreground">
            {invoice.invoice_number}
          </div>
        </div>
      </div>

      {/* Formal 4-Column Metadata Block */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-3.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded text-xs font-mono">
        <div>
          <span className="text-muted-foreground block text-[10px] uppercase font-sans">
            Date Issued
          </span>
          <span className="font-bold">{invoice.issue_date}</span>
        </div>
        <div>
          <span className="text-muted-foreground block text-[10px] uppercase font-sans">
            Payment Due
          </span>
          <span className="font-bold text-amber-600 dark:text-amber-400">{invoice.due_date}</span>
        </div>
        <div>
          <span className="text-muted-foreground block text-[10px] uppercase font-sans">
            Currency
          </span>
          <span className="font-bold">{invoice.currency}</span>
        </div>
        <div>
          <span className="text-muted-foreground block text-[10px] uppercase font-sans">
            Status
          </span>
          <span className="font-bold uppercase text-foreground">{invoice.status}</span>
        </div>
      </div>

      {/* Bill To Block */}
      <div className="border border-slate-200 dark:border-slate-800 rounded p-4 text-xs space-y-1">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-1">
          Client Entity
        </span>
        <div className="text-base font-bold text-foreground">
          {invoice.client?.name ?? "Direct Account"}
        </div>
        {invoice.client?.company_name && (
          <div className="font-medium text-muted-foreground">{invoice.client.company_name}</div>
        )}
        {invoice.client?.email && (
          <div className="text-muted-foreground">{invoice.client.email}</div>
        )}
        {invoice.client?.address && (
          <div className="text-muted-foreground whitespace-pre-line">{invoice.client.address}</div>
        )}
      </div>

      {/* Formal Items Table */}
      <table className="w-full text-left text-xs border border-slate-300 dark:border-slate-800">
        <thead>
          <tr className="bg-slate-200/70 dark:bg-slate-800/80 border-b border-slate-300 dark:border-slate-800 font-bold uppercase">
            <th className="py-2.5 px-3">Itemized Description</th>
            <th className="py-2.5 px-3 text-center w-20">Quantity</th>
            <th className="py-2.5 px-3 text-right w-28">Rate ({invoice.currency})</th>
            <th className="py-2.5 px-3 text-right w-32">Total ({invoice.currency})</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
          {(invoice.line_items ?? []).map((item, idx) => (
            <tr key={idx} className={idx % 2 === 1 ? "bg-slate-50/50 dark:bg-slate-900/40" : ""}>
              <td className="py-3 px-3 font-medium">{item.description}</td>
              <td className="py-3 px-3 text-center font-mono">{item.quantity}</td>
              <td className="py-3 px-3 text-right font-mono">
                {formatMoney(item.unit_price, invoice.currency)}
              </td>
              <td className="py-3 px-3 text-right font-mono font-bold">
                {formatMoney(item.line_total, invoice.currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals Breakdown */}
      <div className="flex flex-col sm:flex-row justify-between gap-6 pt-2">
        <div className="max-w-md text-xs space-y-2">
          {invoice.notes && (
            <div className="border border-slate-200 dark:border-slate-800 p-3 rounded">
              <span className="font-bold text-[10px] uppercase block mb-1">
                Contract Stipulations
              </span>
              <p className="text-muted-foreground whitespace-pre-line leading-relaxed">
                {invoice.notes}
              </p>
            </div>
          )}
        </div>

        <div className="w-full sm:w-72 border border-slate-300 dark:border-slate-800 rounded p-3 space-y-2 text-xs font-mono">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal:</span>
            <span>{formatMoney(invoice.subtotal, invoice.currency)}</span>
          </div>
          {invoice.discount_amount > 0 && (
            <div className="flex justify-between text-emerald-600">
              <span>Applied Discount:</span>
              <span>-{formatMoney(invoice.discount_amount, invoice.currency)}</span>
            </div>
          )}
          {invoice.tax_amount > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>Tax / Statutory:</span>
              <span>+{formatMoney(invoice.tax_amount, invoice.currency)}</span>
            </div>
          )}
          <div className="border-t border-slate-300 dark:border-slate-700 pt-2 flex justify-between font-bold text-sm text-foreground font-sans">
            <span>Invoice Total:</span>
            <span className="font-mono">{formatMoney(invoice.total, invoice.currency)}</span>
          </div>
          <div className="border-t border-dashed border-slate-300 dark:border-slate-700 pt-1.5 flex justify-between font-bold text-xs bg-slate-100 dark:bg-slate-800 p-1.5 rounded">
            <span>Net Balance Due:</span>
            <span className={invoice.amount_due > 0 ? "text-amber-600 dark:text-amber-400" : ""}>
              {formatMoney(invoice.amount_due, invoice.currency)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. PREMIUM TEMPLATE (Executive / High-Net-Worth / Editorial Accent)
// ─────────────────────────────────────────────────────────────────────────────
export function PremiumInvoiceTemplate({ invoice, workspace }: InvoiceTemplateProps) {
  return (
    <div className="bg-card text-card-foreground border border-amber-500/30 rounded-xl p-8 sm:p-12 shadow-md space-y-10 font-sans relative overflow-hidden print:p-0 print:border-none print:shadow-none">
      {/* Top Gold & Emerald Gradient Accent Line */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-primary to-emerald-500" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-border/80 pb-8">
        <div>
          <span className="text-[10px] font-mono tracking-widest text-amber-500 uppercase font-semibold block mb-1">
            Executive Financial Instrument
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            {workspace.name}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Authoritative Ledger Record</p>
        </div>

        <div className="sm:text-right space-y-1 font-mono">
          <div className="text-2xl font-bold tracking-tight text-foreground">
            #{invoice.invoice_number}
          </div>
          <div className="text-xs text-muted-foreground">
            ISSUE DATE: <span className="font-semibold text-foreground">{invoice.issue_date}</span>
          </div>
          <div className="text-xs text-muted-foreground">
            DUE DATE: <span className="font-semibold text-amber-500">{invoice.due_date}</span>
          </div>
        </div>
      </div>

      {/* Client Entity & Terms */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-sm">
        <div className="border-l-2 border-primary pl-4 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">
            Prepared Exclusively For
          </span>
          <div className="text-lg font-bold text-foreground">
            {invoice.client?.name ?? "Client Partner"}
          </div>
          {invoice.client?.company_name && (
            <p className="text-xs text-muted-foreground font-medium">
              {invoice.client.company_name}
            </p>
          )}
          {invoice.client?.email && (
            <p className="text-xs text-muted-foreground">{invoice.client.email}</p>
          )}
          {invoice.client?.address && (
            <p className="text-xs text-muted-foreground whitespace-pre-line mt-1">
              {invoice.client.address}
            </p>
          )}
        </div>

        <div className="rounded-lg bg-gradient-to-br from-amber-500/10 via-primary/5 to-transparent border border-amber-500/20 p-5 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-amber-500 block mb-1">
              Remittance Status
            </span>
            <div className="text-lg font-bold capitalize text-foreground flex items-center gap-2">
              {invoice.status}
              {invoice.status === "paid" && (
                <CheckCircle2 className="size-4 text-emerald-500 inline" />
              )}
            </div>
          </div>
          <div className="text-xs text-muted-foreground pt-3 border-t border-border/50 flex justify-between">
            <span>Outstanding Balance:</span>
            <span className="font-mono font-bold text-sm text-foreground">
              {formatMoney(invoice.amount_due, invoice.currency)}
            </span>
          </div>
        </div>
      </div>

      {/* Premium Line Items */}
      <div className="rounded-lg border border-border/80 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-muted/60 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border">
              <th className="py-3.5 px-5">Deliverable / Service</th>
              <th className="py-3.5 px-4 text-center w-24">Units</th>
              <th className="py-3.5 px-4 text-right w-36">Rate</th>
              <th className="py-3.5 px-5 text-right w-40">Amount ({invoice.currency})</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {(invoice.line_items ?? []).map((item, idx) => (
              <tr key={idx} className="hover:bg-muted/20">
                <td className="py-4 px-5 font-medium text-foreground">{item.description}</td>
                <td className="py-4 px-4 text-center font-mono text-muted-foreground">
                  {item.quantity}
                </td>
                <td className="py-4 px-4 text-right font-mono text-muted-foreground">
                  {formatMoney(item.unit_price, invoice.currency)}
                </td>
                <td className="py-4 px-5 text-right font-mono font-bold text-foreground">
                  {formatMoney(item.line_total, invoice.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals & Authoritative Signature Block */}
      <div className="flex flex-col sm:flex-row justify-between gap-8 pt-4">
        <div className="max-w-md space-y-4">
          {invoice.notes && (
            <div className="text-xs text-muted-foreground space-y-1">
              <span className="font-bold uppercase tracking-wider text-foreground text-[10px] block">
                Official Terms &amp; Conditions
              </span>
              <p className="whitespace-pre-line leading-relaxed">{invoice.notes}</p>
            </div>
          )}
          <div className="pt-6 border-t border-border/60">
            <div className="w-48 border-b border-foreground/30 pb-1 mb-1">
              <span className="font-serif italic text-muted-foreground text-xs">
                Authorized Signature
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
              {workspace.name} Financial Controller
            </span>
          </div>
        </div>

        <div className="w-full sm:w-80 space-y-2 text-xs font-mono bg-muted/20 p-5 rounded-lg border border-border/80">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal:</span>
            <span>{formatMoney(invoice.subtotal, invoice.currency)}</span>
          </div>
          {invoice.discount_amount > 0 && (
            <div className="flex justify-between text-emerald-500">
              <span>Preferred Client Discount:</span>
              <span>-{formatMoney(invoice.discount_amount, invoice.currency)}</span>
            </div>
          )}
          {invoice.tax_amount > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>Tax / Duties:</span>
              <span>+{formatMoney(invoice.tax_amount, invoice.currency)}</span>
            </div>
          )}
          <div className="border-t border-border/80 pt-3 flex justify-between text-base font-bold font-sans text-foreground">
            <span>Grand Total:</span>
            <span className="font-mono text-primary font-bold">
              {formatMoney(invoice.total, invoice.currency)}
            </span>
          </div>
          {invoice.amount_paid > 0 && (
            <div className="flex justify-between py-1 text-muted-foreground border-t border-border/50">
              <span>Remitted:</span>
              <span className="text-emerald-500">
                -{formatMoney(invoice.amount_paid, invoice.currency)}
              </span>
            </div>
          )}
          <div className="flex justify-between font-bold text-sm bg-primary/10 text-primary p-2 rounded mt-2 border border-primary/20">
            <span>Amount Due:</span>
            <span>{formatMoney(invoice.amount_due, invoice.currency)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Master Template Switcher Component
// ─────────────────────────────────────────────────────────────────────────────
export function InvoiceTemplateRenderer({
  templateId,
  invoice,
  workspace,
}: {
  templateId: InvoiceTemplateId;
  invoice: InvoiceWithRelations;
  workspace: Workspace;
}) {
  switch (templateId) {
    case "minimal":
      return <MinimalInvoiceTemplate invoice={invoice} workspace={workspace} />;
    case "professional":
      return <ProfessionalInvoiceTemplate invoice={invoice} workspace={workspace} />;
    case "premium":
      return <PremiumInvoiceTemplate invoice={invoice} workspace={workspace} />;
    case "modern":
    default:
      return <ModernInvoiceTemplate invoice={invoice} workspace={workspace} />;
  }
}
