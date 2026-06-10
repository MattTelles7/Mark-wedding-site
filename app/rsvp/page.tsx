import Link from "next/link";
import { RsvpLookup } from "./rsvp-form";
import { areRsvpsOpen } from "@/lib/database";
import { getSiteConfig } from "@/lib/site";

export const metadata = {
  title: "RSVP",
};

export const dynamic = "force-dynamic";

export default async function RsvpPage() {
  const site = getSiteConfig();
  const rsvpsOpen = await areRsvpsOpen();

  return (
    <main className="page-shell">
      <nav className="simple-nav">
        <Link className="wordmark" href="/">
          {site.monogram}
        </Link>
        <Link href="/">Back home</Link>
      </nav>

      <section className="form-card rsvp-card">
        <div className="form-intro">
          <p className="eyebrow">{site.shortDate}</p>
          <h1>Will you join us?</h1>
          {rsvpsOpen ? (
            <p>
              Search for the last name on your invitation and respond for each
              invited person by {site.rsvpDeadline}.
            </p>
          ) : (
            <p>
              RSVPs are not open yet. Please check back when invitations are
              ready for responses.
            </p>
          )}
        </div>

        {rsvpsOpen ? (
          <RsvpLookup />
        ) : (
          <div className="closed-rsvp">
            <span aria-hidden="true">M&G</span>
            <strong>Responses are currently closed</strong>
          </div>
        )}
      </section>
    </main>
  );
}
