import Link from "next/link";
import { getSiteConfig } from "@/lib/site";

export const metadata = {
  title: "Thank You",
};

export const dynamic = "force-dynamic";

export default function RsvpSuccessPage() {
  const site = getSiteConfig();

  return (
    <main className="page-shell">
      <nav className="simple-nav">
        <Link className="wordmark" href="/">
          {site.coupleNames}
        </Link>
        <Link href="/">Back home</Link>
      </nav>
      <section className="success-card">
        <div className="success-mark" aria-hidden="true">
          ✓
        </div>
        <p className="eyebrow">{site.shortDate}</p>
        <h1>Thank you</h1>
        <p>
          Your RSVP has been saved. We appreciate your reply and look forward to
          celebrating together.
        </p>
        <Link className="button button-secondary" href="/">
          Return to the wedding site
        </Link>
      </section>
    </main>
  );
}
