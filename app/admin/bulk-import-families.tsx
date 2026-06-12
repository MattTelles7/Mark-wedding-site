"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  importValidGuestRowsAction,
  previewGuestImportAction,
} from "./import/actions";
import type {
  GuestImportActionResult,
  GuestImportIssue,
  GuestImportPreview,
  GuestImportWarning,
} from "@/lib/import-types";

function issueLabel(issue: GuestImportIssue | GuestImportWarning): string {
  return issue.rowNumber > 0
    ? `Row ${issue.rowNumber}: ${issue.message}`
    : issue.message;
}

function SummaryGrid({
  result,
  mode,
}: {
  result: GuestImportPreview;
  mode: "preview" | "final";
}) {
  const summary = result.summary;
  return (
    <div className="import-summary-grid" aria-label="Import summary">
      <article>
        <span>
          {mode === "preview" ? "Families to create" : "Families created"}
        </span>
        <strong>
          {mode === "preview"
            ? summary.householdsToCreate
            : summary.householdsCreated}
        </strong>
      </article>
      <article>
        <span>Existing families matched</span>
        <strong>{summary.existingHouseholdsMatched}</strong>
      </article>
      <article>
        <span>
          {mode === "preview" ? "Guests to create" : "Guests created"}
        </span>
        <strong>
          {mode === "preview" ? summary.guestsToCreate : summary.guestsCreated}
        </strong>
      </article>
      <article>
        <span>Duplicate guests skipped</span>
        <strong>{summary.duplicateGuestsSkipped}</strong>
      </article>
      <article>
        <span>Rows rejected</span>
        <strong>{summary.rowsRejected}</strong>
      </article>
      <article>
        <span>Warnings</span>
        <strong>{summary.warnings}</strong>
      </article>
    </div>
  );
}

function IssueList({
  title,
  items,
  variant = "warning",
}: {
  title: string;
  items: Array<GuestImportIssue | GuestImportWarning>;
  variant?: "warning" | "error";
}) {
  if (items.length === 0) {
    return null;
  }
  return (
    <details
      className={`import-issue-list import-issue-${variant}`}
      open={variant === "error"}
    >
      <summary>
        {title} ({items.length})
      </summary>
      <ul>
        {items.slice(0, 25).map((item, index) => (
          <li key={`${item.rowNumber}-${item.message}-${index}`}>
            {issueLabel(item)}
          </li>
        ))}
      </ul>
      {items.length > 25 ? (
        <p>
          Showing first 25. Fix or import the file to review remaining rows.
        </p>
      ) : null}
    </details>
  );
}

function PreviewDetails({ result }: { result: GuestImportPreview }) {
  function guestsForHousehold(household: { householdKey: string }) {
    return result.guestsToCreate.filter(
      (guest) => guest.householdKey === household.householdKey,
    );
  }

  function householdList(
    households: GuestImportPreview["householdsToCreate"],
    emptyLabel: string,
  ) {
    return (
      <ul className="import-household-list">
        {households.slice(0, 20).map((household) => {
          const guests = guestsForHousehold(household);
          return (
            <li key={`${household.householdName}-${household.searchLastName}`}>
              <strong>{household.householdName}</strong>
              {guests.length > 0 ? (
                <ul className="import-guest-list">
                  {guests.map((guest) => (
                    <li key={`${guest.rowNumber}-${guest.firstName}`}>
                      {guest.firstName} {guest.lastName}
                    </li>
                  ))}
                </ul>
              ) : (
                <span>{emptyLabel}</span>
              )}
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <div className="import-preview-details">
      {result.householdsToCreate.length > 0 ? (
        <details>
          <summary>
            Families to create ({result.householdsToCreate.length})
          </summary>
          {householdList(result.householdsToCreate, "No new guests")}
        </details>
      ) : null}

      {result.existingHouseholdsMatched.length > 0 ? (
        <details>
          <summary>
            Existing families matched ({result.existingHouseholdsMatched.length}
            )
          </summary>
          {householdList(
            result.existingHouseholdsMatched,
            "All listed guests are duplicates",
          )}
        </details>
      ) : null}
    </div>
  );
}

export function BulkImportFamilies() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<GuestImportActionResult | null>(null);
  const [finalResult, setFinalResult] =
    useState<GuestImportActionResult | null>(null);
  const [message, setMessage] = useState("");
  const [pendingLabel, setPendingLabel] = useState("");
  const [isPending, startTransition] = useTransition();

  const activeResult = finalResult ?? preview;
  const previewSucceeded = preview?.success === true;
  const hasRowsToImport =
    preview?.success === true && preview.summary.guestsToCreate > 0;

  function formDataForFile(): FormData | undefined {
    if (!file) {
      setMessage("Choose a completed .xlsx template first.");
      return undefined;
    }
    const formData = new FormData();
    formData.set("file", file);
    return formData;
  }

  function chooseFile(nextFile: File | null) {
    setFile(nextFile);
    setPreview(null);
    setFinalResult(null);
    setMessage("");
    setPendingLabel("");
  }

  function previewImport() {
    const formData = formDataForFile();
    if (!formData) return;

    setPendingLabel("Previewing import...");
    setMessage("");
    setFinalResult(null);
    startTransition(() => {
      void (async () => {
        const result = await previewGuestImportAction(formData);
        setPreview(result);
        setPendingLabel("");
        setMessage(
          result.success
            ? "Preview ready. Review the summary before importing."
            : result.message,
        );
      })();
    });
  }

  function importRows() {
    const formData = formDataForFile();
    if (!formData || !previewSucceeded) return;

    setPendingLabel("Importing valid rows...");
    setMessage("");
    startTransition(() => {
      void (async () => {
        const result = await importValidGuestRowsAction(formData);
        setFinalResult(result);
        setPendingLabel("");
        setMessage(
          result.success
            ? "Import finished. No existing households or guests were updated or deleted."
            : result.message,
        );
        if (result.success) {
          router.refresh();
        }
      })();
    });
  }

  return (
    <section
      className="admin-panel import-panel"
      aria-label="Bulk import families"
    >
      <div className="admin-panel-heading">
        <div>
          <p className="eyebrow">Spreadsheet import</p>
          <h2>Bulk Import Families</h2>
        </div>
        <p>
          Download the template, add one invited person per row, preview the
          family grouping, then import valid rows. Guests with the same last
          name are grouped into The [Last Name] Family.
        </p>
      </div>

      <div className="import-actions">
        <a
          className="button button-secondary"
          href="/admin/import/template"
          download
        >
          Download Template
        </a>
        <label className="import-file-control">
          Upload Completed Template
          <input
            ref={fileInputRef}
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            type="file"
            onChange={(event) => chooseFile(event.target.files?.[0] ?? null)}
          />
        </label>
        <button
          className="button button-primary"
          type="button"
          disabled={!file || isPending}
          onClick={previewImport}
        >
          {pendingLabel === "Previewing import..."
            ? "Previewing..."
            : "Preview Import"}
        </button>
        <button
          className="button button-secondary"
          type="button"
          disabled={!hasRowsToImport || isPending}
          onClick={importRows}
        >
          {pendingLabel === "Importing valid rows..."
            ? "Importing..."
            : "Import Valid Rows"}
        </button>
      </div>

      {file ? (
        <p className="import-file-name">
          Selected file: <strong>{file.name}</strong>
        </p>
      ) : null}

      {pendingLabel ? (
        <p className="admin-form-message" role="status">
          {pendingLabel}
        </p>
      ) : null}
      {message ? (
        <p
          className={
            activeResult?.success === false
              ? "admin-form-error"
              : "admin-form-message"
          }
          role="status"
        >
          {message}
        </p>
      ) : null}

      {activeResult?.success ? (
        <>
          <SummaryGrid
            result={activeResult}
            mode={finalResult?.success ? "final" : "preview"}
          />
          <PreviewDetails result={activeResult} />
          <IssueList
            title="Duplicate guests skipped"
            items={activeResult.duplicatesSkipped}
          />
          <IssueList title="Warnings" items={activeResult.warnings} />
          <IssueList
            title="Invalid rows"
            items={activeResult.errors}
            variant="error"
          />
        </>
      ) : activeResult?.success === false && activeResult.errors?.length ? (
        <IssueList
          title="Import errors"
          items={activeResult.errors}
          variant="error"
        />
      ) : null}

      <p className="import-help-text">
        Limits: .xlsx files only, 10 MB maximum, 5,000 data rows maximum.
      </p>
    </section>
  );
}
