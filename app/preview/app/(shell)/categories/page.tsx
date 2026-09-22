"use client";

import { useState } from "react";
import { PageHeader } from "../../../_components/PageHeader";
import { Badge } from "../../../_components/Badge";
import { FIRM_CATEGORIES } from "../../../_lib/mock-data";

export default function FirmCategoriesPage() {
  const [categories, setCategories] = useState(FIRM_CATEGORIES);
  const [draft, setDraft] = useState("");

  return (
    <>
      <PageHeader
        title="Categories"
        description="Your firm's category list, seeded from the standard UK chart-of-accounts and mapped to VAT codes. Every correction your team makes sharpens this over time — corrections are never thrown away."
      />

      <div className="preview-card">
        <form
          className="category-add-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (draft.trim() && !categories.includes(draft.trim())) {
              setCategories((c) => [...c, draft.trim()]);
              setDraft("");
            }
          }}
        >
          <input placeholder="Add a category…" value={draft} onChange={(e) => setDraft(e.target.value)} />
          <button type="submit" className="btn btn-primary">Add</button>
        </form>

        <ul className="category-chip-list" style={{ marginTop: 16 }}>
          {categories.map((cat) => (
            <li key={cat} className="category-chip">
              {cat}
              <button
                type="button"
                className="chip-remove"
                aria-label={`Remove ${cat}`}
                onClick={() => setCategories((c) => c.filter((x) => x !== cat))}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="preview-card">
        <h2 className="preview-card-title">Where these come from</h2>
        <p className="preview-page-desc">
          <Badge tone="teal">System default</Badge> categories are managed centrally by Accorix
          (see the Admin panel's Category management) and mapped to standard UK VAT codes. Your
          firm can add its own on top, or remove ones it never uses — those changes stay scoped to
          Whitfield & Co only.
        </p>
      </div>
    </>
  );
}
