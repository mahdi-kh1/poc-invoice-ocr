"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "../../../_components/PageHeader";
import { Badge, EmptyState } from "../../../_components/Badge";
import { StatGrid, StatCard } from "../../../_components/StatCard";
import { BANK_TRANSACTIONS, DOCUMENTS } from "../../../_lib/mock-data";

export default function ReconciliationPage() {
  const [txns, setTxns] = useState(BANK_TRANSACTIONS);
  const [onlyUnmatched, setOnlyUnmatched] = useState(true);

  const rows = useMemo(() => (onlyUnmatched ? txns.filter((t) => !t.matched) : txns), [txns, onlyUnmatched]);
  const matchedCount = txns.filter((t) => t.matched).length;

  return (
    <>
      <PageHeader
        title="Bank reconciliation"
        description="Connected bank feeds are matched against uploaded documents automatically — what's left over here is what actually needs a human look."
      />

      <StatGrid>
        <StatCard label="Transactions" value={String(txns.length)} />
        <StatCard label="Auto-matched" value={String(matchedCount)} subTone="positive" sub={`${Math.round((matchedCount / txns.length) * 100)}% matched`} />
        <StatCard label="Needs attention" value={String(txns.length - matchedCount)} subTone="negative" />
      </StatGrid>

      <div className="preview-filter-bar">
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.85rem", color: "var(--text-muted)" }}>
          <input type="checkbox" checked={onlyUnmatched} onChange={(e) => setOnlyUnmatched(e.target.checked)} />
          Only show unmatched
        </label>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon="✓" title="All caught up" body="Every transaction has a matching document." />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Date</th><th>Client</th><th>Description</th><th>Amount</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id}>
                  <td className="cell-num">{t.date}</td>
                  <td className="cell-truncate">{t.clientName}</td>
                  <td className="cell-truncate">{t.description}</td>
                  <td className="cell-num" style={{ color: t.direction === "in" ? "var(--success)" : "var(--text)" }}>
                    {t.direction === "in" ? "+" : "-"}£{t.amount.toFixed(2)}
                  </td>
                  <td>
                    {t.matched ? (
                      <Badge tone="success">Matched — {t.matchedDocument}</Badge>
                    ) : (
                      <Badge tone="warning">Unmatched</Badge>
                    )}
                  </td>
                  <td className="cell-num">
                    {!t.matched && (
                      <select
                        className="preview-select"
                        defaultValue=""
                        onChange={(e) => {
                          if (!e.target.value) return;
                          setTxns((prev) => prev.map((x) => (x.id === t.id ? { ...x, matched: true, matchedDocument: e.target.value } : x)));
                        }}
                      >
                        <option value="" disabled>Match to document…</option>
                        {DOCUMENTS.filter((d) => d.clientName === t.clientName).map((d) => (
                          <option key={d.id} value={d.fileName}>{d.fileName}</option>
                        ))}
                      </select>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
