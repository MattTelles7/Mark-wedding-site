import Link from "next/link";
import { getRsvps, getRsvpSummary } from "@/lib/database";
import { requireAdmin } from "@/lib/auth";
import { logout, removeRsvp } from "./actions";

export const metadata = {
  title: "RSVP Dashboard",
};

export const dynamic = "force-dynamic";

function formatMeal(value: string) {
  const labels: Record<string, string> = {
    chicken: "Chicken",
    beef: "Beef",
    vegetarian: "Vegetarian",
    vegan: "Vegan",
    kids: "Kids meal",
    not_applicable: "—",
  };

  return labels[value] ?? value;
}

function formatDate(value: string) {
  const normalized = value.includes("T")
    ? value
    : `${value.replace(" ", "T")}Z`;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}

export default async function AdminPage() {
  await requireAdmin();
  const [summary, rsvps] = [getRsvpSummary(), getRsvps()];

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <p className="eyebrow">Wedding responses</p>
          <h1>RSVP Dashboard</h1>
        </div>
        <div className="admin-actions">
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

      <section className="summary-grid" aria-label="RSVP summary">
        <article className="summary-card">
          <span>Total responses</span>
          <strong>{summary.totalResponses}</strong>
        </article>
        <article className="summary-card">
          <span>Attending</span>
          <strong>{summary.attending}</strong>
        </article>
        <article className="summary-card">
          <span>Not attending</span>
          <strong>{summary.notAttending}</strong>
        </article>
        <article className="summary-card">
          <span>Total guests</span>
          <strong>{summary.totalGuests}</strong>
        </article>
      </section>

      <section className="table-card">
        {rsvps.length === 0 ? (
          <div className="empty-state">
            <h2>No responses yet</h2>
            <p>New RSVP submissions will appear here.</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Attending</th>
                  <th>Guests</th>
                  <th>Meal</th>
                  <th>Song</th>
                  <th>Message</th>
                  <th>Submitted</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {rsvps.map((rsvp) => (
                  <tr key={rsvp.id}>
                    <td>
                      <strong>{rsvp.fullName}</strong>
                    </td>
                    <td>{rsvp.attending ? "Yes" : "No"}</td>
                    <td>{rsvp.guestCount}</td>
                    <td>{formatMeal(rsvp.mealChoice)}</td>
                    <td>{rsvp.songRequest || "—"}</td>
                    <td className="message-cell">{rsvp.message || "—"}</td>
                    <td>{formatDate(rsvp.createdAt)}</td>
                    <td>
                      <form action={removeRsvp}>
                        <input type="hidden" name="id" value={rsvp.id} />
                        <button
                          className="button button-danger button-small"
                          type="submit"
                        >
                          Delete
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
