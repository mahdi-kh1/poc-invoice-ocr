"use client";

import { PageHeader } from "../../../_components/PageHeader";
import { Badge } from "../../../_components/Badge";
import { INVOICE_STATUS_META } from "../../../_components/statusMeta";
import { BILLING_PLANS, INVOICES } from "../../../_lib/mock-data";

export default function BillingPage() {
  return (
    <>
      <PageHeader
        title="Billing & subscriptions"
        description="Define plans and caps without a redeploy. Invoices, payment status, dunning, discount codes."
        actions={<button className="btn btn-primary">+ New discount code</button>}
      />

      <div className="preview-card">
        <h2 className="preview-card-title">Plans</h2>
        <div className="preview-tile-grid">
          {BILLING_PLANS.map((p) => (
            <div key={p.id} className="preview-tile">
              <div className="preview-tile-top">
                <span className="preview-tile-name">{p.name}</span>
                <Badge tone="teal">{p.firmsOnPlan} firms</Badge>
              </div>
              <span className="preview-tile-meta">£{p.priceMonthly}/month</span>
              <span className="preview-tile-meta">{p.clientCap === 999 ? "Unlimited" : p.clientCap} clients · {p.userCap === 999 ? "Unlimited" : p.userCap} users</span>
              <button className="btn btn-small" style={{ marginTop: 8, alignSelf: "flex-start" }}>Edit plan</button>
            </div>
          ))}
        </div>
      </div>

      <div className="preview-card">
        <h2 className="preview-card-title">Recent invoices</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Firm</th><th>Amount</th><th>Status</th><th>Issued</th><th></th></tr></thead>
            <tbody>
              {INVOICES.map((inv) => (
                <tr key={inv.id}>
                  <td className="cell-truncate">{inv.firmName}</td>
                  <td className="cell-num">£{inv.amount.toFixed(2)}</td>
                  <td><Badge tone={INVOICE_STATUS_META[inv.status].tone}>{INVOICE_STATUS_META[inv.status].label}</Badge></td>
                  <td className="cell-sublabel">{inv.issuedAt}</td>
                  <td className="cell-num">
                    {inv.status === "failed" && <button className="btn btn-small">Retry payment</button>}
                    {inv.status === "paid" && <button className="btn btn-small">Refund</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
