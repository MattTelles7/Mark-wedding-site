import Link from "next/link";
import { ConfirmButton } from "./confirm-button";
import {
  addHousehold,
  addInvitedGuest,
  changeHouseholdLock,
  editHousehold,
  editInvitedGuest,
  logout,
  removeHousehold,
  removeInvitedGuest,
  toggleRsvps,
} from "./actions";
import { requireAdmin } from "@/lib/auth";
import {
  areRsvpsOpen,
  getHouseholds,
  getHouseholdSummary,
  getRsvps,
} from "@/lib/database";

export const metadata = {
  title: "RSVP Dashboard",
};

export const dynamic = "force-dynamic";

function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }

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

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireAdmin();
  const { q = "" } = await searchParams;
  const filter = q.slice(0, 100);
  const [rsvpsOpen, summary, households, legacyRsvps] = [
    areRsvpsOpen(),
    getHouseholdSummary(),
    getHouseholds(filter),
    getRsvps(),
  ];

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <p className="eyebrow">Invitations and responses</p>
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
          <span>Locked households</span>
          <strong>{summary.lockedHouseholds}</strong>
        </article>
        <article className="summary-card">
          <span>Total households</span>
          <strong>{summary.totalHouseholds}</strong>
        </article>
      </section>

      <section className="admin-panel">
        <div className="admin-panel-heading">
          <div>
            <p className="eyebrow">Invitation list</p>
            <h2>Add a household</h2>
          </div>
          <p>
            The search last name is the exact name guests will use on the public
            RSVP page.
          </p>
        </div>
        <form className="admin-form-grid" action={addHousehold}>
          <label>
            Household display name
            <input
              name="householdName"
              placeholder="The Wolfe Family"
              maxLength={120}
              required
            />
          </label>
          <label>
            Search last name
            <input
              name="searchLastName"
              placeholder="Wolfe"
              maxLength={80}
              required
            />
          </label>
          <label>
            Contact email
            <input name="contactEmail" type="email" maxLength={180} />
          </label>
          <label>
            Contact phone
            <input name="contactPhone" type="tel" maxLength={40} />
          </label>
          <button className="button button-primary" type="submit">
            Add household
          </button>
        </form>
      </section>

      <section className="household-directory">
        <div className="directory-heading">
          <div>
            <p className="eyebrow">Households</p>
            <h2>Manage invitations</h2>
          </div>
          <form className="admin-search" method="get">
            <label htmlFor="household-filter">Search households</label>
            <div>
              <input
                id="household-filter"
                name="q"
                type="search"
                defaultValue={filter}
                maxLength={100}
                placeholder="Name or guest"
              />
              <button className="button button-small" type="submit">
                Filter
              </button>
            </div>
          </form>
        </div>

        {households.length === 0 ? (
          <div className="empty-state admin-panel">
            <h2>No households found</h2>
            <p>
              {filter
                ? "Try a different search."
                : "Add the first household above."}
            </p>
          </div>
        ) : (
          <div className="household-admin-list">
            {households.map((household) => (
              <details className="household-admin-card" key={household.id}>
                <summary>
                  <span>
                    <strong>{household.householdName}</strong>
                    <small>
                      {household.guests.length} invited · Search:{" "}
                      {household.searchLastName}
                    </small>
                  </span>
                  <b
                    className={
                      household.isLocked ? "badge-locked" : "badge-open"
                    }
                  >
                    {household.isLocked ? "Locked" : "Editable"}
                  </b>
                </summary>

                <div className="household-admin-body">
                  <form
                    className="admin-form-grid compact-admin-form"
                    action={editHousehold}
                  >
                    <input
                      type="hidden"
                      name="householdId"
                      value={household.id}
                    />
                    <label>
                      Household name
                      <input
                        name="householdName"
                        defaultValue={household.householdName}
                        maxLength={120}
                        required
                      />
                    </label>
                    <label>
                      Search last name
                      <input
                        name="searchLastName"
                        defaultValue={household.searchLastName}
                        maxLength={80}
                        required
                      />
                    </label>
                    <label>
                      Contact email
                      <input
                        name="contactEmail"
                        type="email"
                        defaultValue={household.contactEmail}
                        maxLength={180}
                      />
                    </label>
                    <label>
                      Contact phone
                      <input
                        name="contactPhone"
                        type="tel"
                        defaultValue={household.contactPhone}
                        maxLength={40}
                      />
                    </label>
                    <button
                      className="button button-secondary button-small"
                      type="submit"
                    >
                      Save household
                    </button>
                  </form>

                  <div className="admin-subheading">
                    <div>
                      <h3>Invited people</h3>
                      <p>Submitted: {formatDate(household.submittedAt)}</p>
                    </div>
                  </div>

                  {household.guests.length === 0 ? (
                    <p className="inline-empty">
                      No invited people have been added yet.
                    </p>
                  ) : (
                    <div className="guest-admin-list">
                      {household.guests.map((guest) => (
                        <div className="guest-admin-row" key={guest.id}>
                          <form
                            className="guest-edit-form"
                            action={editInvitedGuest}
                          >
                            <input
                              type="hidden"
                              name="guestId"
                              value={guest.id}
                            />
                            <label>
                              First name
                              <input
                                name="firstName"
                                defaultValue={guest.firstName}
                                maxLength={80}
                                required
                              />
                            </label>
                            <label>
                              Last name
                              <input
                                name="lastName"
                                defaultValue={guest.lastName}
                                maxLength={80}
                                required
                              />
                            </label>
                            <label>
                              RSVP status
                              <select name="status" defaultValue={guest.status}>
                                <option value="pending">Pending</option>
                                <option value="attending">Attending</option>
                                <option value="declined">Declined</option>
                              </select>
                            </label>
                            <label>
                              Admin notes
                              <input
                                name="notes"
                                defaultValue={guest.notes}
                                maxLength={500}
                              />
                            </label>
                            <button
                              className="button button-secondary button-small"
                              type="submit"
                            >
                              Save
                            </button>
                          </form>
                          <form action={removeInvitedGuest}>
                            <input
                              type="hidden"
                              name="guestId"
                              value={guest.id}
                            />
                            <ConfirmButton
                              message={`Delete ${guest.firstName} ${guest.lastName} from this invitation?`}
                              className="button button-danger button-small"
                            >
                              Delete
                            </ConfirmButton>
                          </form>
                        </div>
                      ))}
                    </div>
                  )}

                  <form
                    className="admin-form-grid add-guest-form"
                    action={addInvitedGuest}
                  >
                    <input
                      type="hidden"
                      name="householdId"
                      value={household.id}
                    />
                    <label>
                      First name
                      <input name="firstName" maxLength={80} required />
                    </label>
                    <label>
                      Last name
                      <input name="lastName" maxLength={80} required />
                    </label>
                    <label>
                      Admin notes
                      <input name="notes" maxLength={500} />
                    </label>
                    <button className="button button-primary button-small">
                      Add invited person
                    </button>
                  </form>

                  <div className="household-admin-actions">
                    <form action={changeHouseholdLock}>
                      <input
                        type="hidden"
                        name="householdId"
                        value={household.id}
                      />
                      <input
                        type="hidden"
                        name="locked"
                        value={household.isLocked ? "false" : "true"}
                      />
                      <button
                        className="button button-secondary button-small"
                        type="submit"
                      >
                        {household.isLocked
                          ? "Unlock household"
                          : "Lock household"}
                      </button>
                    </form>
                    <form action={removeHousehold}>
                      <input
                        type="hidden"
                        name="householdId"
                        value={household.id}
                      />
                      <ConfirmButton
                        message={`Delete ${household.householdName} and every invited person in it? This cannot be undone.`}
                      >
                        Delete household
                      </ConfirmButton>
                    </form>
                  </div>
                </div>
              </details>
            ))}
          </div>
        )}
      </section>

      {legacyRsvps.length > 0 ? (
        <details className="legacy-responses admin-panel">
          <summary>Legacy responses preserved ({legacyRsvps.length})</summary>
          <p>
            These came from the previous free-form RSVP system and remain
            read-only.
          </p>
          <div className="table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Response</th>
                  <th>Guests</th>
                  <th>Submitted</th>
                </tr>
              </thead>
              <tbody>
                {legacyRsvps.map((rsvp) => (
                  <tr key={rsvp.id}>
                    <td>{rsvp.fullName}</td>
                    <td>{rsvp.attending ? "Attending" : "Declined"}</td>
                    <td>{rsvp.guestCount}</td>
                    <td>{formatDate(rsvp.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      ) : null}
    </main>
  );
}
