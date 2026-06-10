import Link from "next/link";
import { HouseholdManager } from "./household-manager";
import { AdminAutoRefresh } from "./auto-refresh";
import { BulkImportFamilies } from "./bulk-import-families";
import { logout, toggleRsvps } from "./actions";
import { requireAdmin } from "@/lib/auth";
import {
  areRsvpsOpen,
  getHouseholds,
  getHouseholdSummary,
} from "@/lib/database";

export const metadata = {
  title: "RSVP Dashboard",
};

export const dynamic = "force-dynamic";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireAdmin();
  const { q = "" } = await searchParams;
  const filter = q.slice(0, 100);
  const [rsvpsOpen, summary, households] = await Promise.all([
    areRsvpsOpen(),
    getHouseholdSummary(),
    getHouseholds(filter),
  ]);

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <p className="eyebrow">Invitations and responses</p>
          <h1>RSVP Dashboard</h1>
        </div>
        <div className="admin-actions">
          <AdminAutoRefresh />
          <Link className="button button-secondary button-small" href="/">
            View site
          </Link>
          <a
            className="button button-secondary button-small"
            href="/admin/export"
          >
            Export CSV
          </a>
          <form action={logout}>
            <button className="button button-small" type="submit">
              Log out
            </button>
          </form>
        </div>
      </header>

      <section className="admin-settings" aria-label="RSVP availability">
        <div>
          <span
            className={`status-dot ${rsvpsOpen ? "status-open" : "status-closed"}`}
          />
          <div>
            <strong>Public RSVPs are {rsvpsOpen ? "open" : "closed"}</strong>
            <p>
              This setting controls whether guests can search and submit
              responses.
            </p>
          </div>
        </div>
        <form action={toggleRsvps}>
          <input
            type="hidden"
            name="open"
            value={rsvpsOpen ? "false" : "true"}
          />
          <button className="button button-primary button-small" type="submit">
            {rsvpsOpen ? "Close RSVPs" : "Open RSVPs"}
          </button>
        </form>
      </section>

      <section className="summary-grid" aria-label="RSVP summary">
        <article className="summary-card">
          <span>Total invited people</span>
          <strong>{summary.totalInvited}</strong>
        </article>
        <article className="summary-card">
          <span>Pending</span>
          <strong>{summary.pending}</strong>
        </article>
        <article className="summary-card">
          <span>Attending</span>
          <strong>{summary.attending}</strong>
        </article>
        <article className="summary-card">
          <span>Declined</span>
          <strong>{summary.declined}</strong>
        </article>
        <article className="summary-card">
          <span>Submitted and Closed</span>
          <strong>{summary.lockedHouseholds}</strong>
        </article>
        <article className="summary-card">
          <span>Total households</span>
          <strong>{summary.totalHouseholds}</strong>
        </article>
      </section>

      <BulkImportFamilies />

      <HouseholdManager initialHouseholds={households} filter={filter} />
    </main>
  );
}
