"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "../../../_components/PageHeader";
import { Badge, EmptyState } from "../../../_components/Badge";
import { StatGrid, StatCard } from "../../../_components/StatCard";
import { BANK_TRANSACTIONS, DOCUMENTS } from "../../../_lib/mock-data";
import { useT } from "../../../_lib/i18n";

export default function ReconciliationPage() {
  const { t } = useT();
  const [txns, setTxns] = useState(BANK_TRANSACTIONS);
  const [onlyUnmatched, setOnlyUnmatched] = useState(true);

  const rows = useMemo(() => (onlyUnmatched ? txns.filter((tx) => !tx.matched) : txns), [txns, onlyUnmatched]);
  const matchedCount = txns.filter((tx) => tx.matched).length;

  return (
    <>
      <PageHeader
        title={t("page.recon.title")}
        description={t("page.recon.desc")}
      />

      <StatGrid>
        <StatCard label="Transactions" value={String(txns.length)} />
        <StatCard label="Auto-matched" value={String(matchedCount)} subTone="positive" sub={`${Math.round((matchedCount / txns.length) * 100)}% matched`} />
        <StatCard label="Needs attention" value={String(txns.length - matchedCount)} subTone="negative" />
      </StatGrid>

      <div className="preview-filter-bar">
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.85rem", color: "var(--text-muted)" }}>
          <input type="checkbox" checked={onlyUnmatched} onChange={(e) => setOnlyUnmatched(e.target.checked)} />
          {t("page.recon.onlyUnmatched")}
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
              {rows.map((tx) => (
                <tr key={tx.id}>
                  <td className="cell-num">{tx.date}</td>
                  <td className="cell-truncate">{tx.clientName}</td>
                  <td className="cell-truncate">{tx.description}</td>
                  <td className="cell-num" style={{ color: tx.direction === "in" ? "var(--success)" : "var(--text)" }}>
                    {tx.direction === "in" ? "+" : "-"}£{tx.amount.toFixed(2)}
                  </td>
                  <td>
                    {tx.matched ? (
                      <Badge tone="success">Matched — {tx.matchedDocument}</Badge>
                    ) : (
                      <Badge tone="warning">Unmatched</Badge>
                    )}
                  </td>
                  <td className="cell-num">
                    {!tx.matched && (
                      <select
                        className="preview-select"
                        defaultValue=""
                        onChange={(e) => {
                          if (!e.target.value) return;
                          setTxns((prev) => prev.map((x) => (x.id === tx.id ? { ...x, matched: true, matchedDocument: e.target.value } : x)));
                        }}
                      >
                        <option value="" disabled>Match to document…</option>
                        {DOCUMENTS.filter((d) => d.clientName === tx.clientName).map((d) => (
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
