import Link from "next/link";
import { RsvpForm } from "./rsvp-form";
import { getSiteConfig } from "@/lib/site";

export const metadata = {
  title: "RSVP",
};

export const dynamic = "force-dynamic";

export default function RsvpPage() {
  const site = getSiteConfig();

  return (
    <main className="page-shell">
      <nav className="simple-nav">
        <Link className="wordmark" href="/">
          {site.coupleNames}
        </Link>
        <Link href="/">Back home</Link>
      </nav>

      <section className="form-card">
        <div className="form-intro">
          <p className="eyebrow">{site.shortDate}</p>
          <h1>Will you join us?</h1>
          <p>
            Please submit one response per invitation. We cannot wait to
            celebrate with you.
          </p>
        </div>
        <RsvpForm />
      </section>
    </main>
  );
}
