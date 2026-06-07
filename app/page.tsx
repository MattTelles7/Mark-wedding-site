import Link from "next/link";
import { getSiteConfig } from "@/lib/site";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const site = getSiteConfig();
  const [firstName, secondName] = site.coupleNames.split(/\s*&\s*/, 2);
  const events: Array<{
    time: string;
    title: string;
    venue: string;
    address: string;
    note?: string;
  }> = [site.ceremony, site.reception];

  return (
    <main>
      <section className="hero">
        <div className="hero-content">
          <h1>
            {secondName ? (
              <>
                <span>{firstName}</span>
                <span className="ampersand">&</span>
                <span>{secondName}</span>
              </>
            ) : (
              site.coupleNames
            )}
          </h1>
          <p className="hero-date">
            <time dateTime={site.weddingDateIso}>{site.weddingDate}</time>
            <span> • {site.location}</span>
          </p>
          {site.countdown ? (
            <p className="countdown">{site.countdown}</p>
          ) : null}
        </div>

        <nav className="site-nav" aria-label="Main navigation">
          <Link className="wordmark" href="/">
            Home
          </Link>
          <div className="nav-links">
            <a href="#story">Our Story</a>
            <a href="#party">Wedding Party</a>
            <a href="#schedule">Schedule</a>
            <a href="#travel">Travel</a>
            <a href="#faq">Q + A</a>
          </div>
        </nav>

        <div className="hero-photo" aria-hidden="true">
          <span>{site.monogram}</span>
        </div>

        <div className="hero-card">
          <p className="monogram">{site.monogram}</p>
          <p>
            <time dateTime={site.weddingDateIso}>{site.weddingDate}</time>
          </p>
          <p>{site.location}</p>
          <Link className="button button-primary" href="/rsvp">
            RSVP
          </Link>
        </div>
      </section>

      <section className="section intro-section" aria-label="Wedding overview">
        <div className="section-heading">
          <p className="eyebrow">{site.monogram}</p>
          <h2>{site.weddingDate}</h2>
          <p>{site.location}</p>
        </div>
        <div className="detail-grid">
          <article className="detail-card">
            <span className="detail-number">01</span>
            <h3>When</h3>
            <p>{site.weddingDate}</p>
            <p className="muted">Ceremony begins at 2:00 PM</p>
          </article>
          <article className="detail-card">
            <span className="detail-number">02</span>
            <h3>Where</h3>
            <p>{site.venue}</p>
            <p className="muted">{site.location}</p>
          </article>
          <article className="detail-card">
            <span className="detail-number">03</span>
            <h3>Reply</h3>
            <p>Let us know if you can celebrate with us.</p>
            <p className="muted">One response per invitation</p>
          </article>
        </div>
      </section>

      <section className="section story-section" id="story">
        <div className="split-section">
          <div className="section-heading align-left">
            <p className="eyebrow">Our Story</p>
            <h2>High school sweethearts</h2>
          </div>
          <div className="story-copy">
            {site.story.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </div>
      </section>

      <section className="section party-section" id="party">
        <div className="section-heading">
          <p className="eyebrow">With love and support</p>
          <h2>Wedding Party</h2>
        </div>
        <div className="honor-grid">
          {site.weddingParty.honorAttendants.map((person) => (
            <article className="honor-card" key={person.name}>
              <p>{person.role}</p>
              <h3>{person.name}</h3>
            </article>
          ))}
        </div>
        <div className="party-grid">
          <article>
            <h3>Bridesmaids</h3>
            <ul>
              {site.weddingParty.bridesmaids.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          </article>
          <article>
            <h3>Groomsmen</h3>
            <ul>
              {site.weddingParty.groomsmen.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          </article>
        </div>
        <div className="junior-party">
          {site.weddingParty.juniorParty.map((person) => (
            <p key={person.name}>
              <strong>{person.name}</strong>
              <span>{person.role}</span>
            </p>
          ))}
        </div>
      </section>

      <section className="section schedule-section" id="schedule">
        <div className="section-heading">
          <p className="eyebrow">Wedding Day</p>
          <h2>Schedule</h2>
        </div>
        <div className="timeline">
          {events.map((event) => (
            <div className="timeline-item" key={event.title}>
              <time>{event.time}</time>
              <div>
                <h3>{event.title}</h3>
                <p>{event.venue}</p>
                <p className="muted">{event.address}</p>
                {event.note ? <p>{event.note}</p> : null}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="section travel-section" id="travel">
        <div className="section-heading">
          <p className="eyebrow">Travel</p>
          <h2>Hotel Block</h2>
        </div>
        <div className="travel-card">
          <h3>{site.travel.hotel}</h3>
          <p>{site.travel.address}</p>
          <p>
            <strong>Phone:</strong> {site.travel.phone}
          </p>
          <p>
            <strong>Rate:</strong> {site.travel.rate}
          </p>
          <p className="muted">{site.travel.note}</p>
        </div>
      </section>

      <section className="section faq-section" id="faq">
        <div className="section-heading">
          <p className="eyebrow">Q + A</p>
          <h2>Good to Know</h2>
        </div>
        <div className="faq-list">
          <details>
            <summary>How did you meet?</summary>
            <p>
              Lilly and Christopher met through their high-school co-op, ASSG,
              and became close friends before they started dating.
            </p>
          </details>
          <details>
            <summary>Can I bring a plus-one?</summary>
            <p>
              Please contact the couple directly to confirm whether a plus-one
              is included with your invitation.
            </p>
          </details>
          <details>
            <summary>When is the RSVP deadline?</summary>
            <p>Please reply by August 10, 2026.</p>
          </details>
          <details>
            <summary>Is there a hotel block?</summary>
            <p>
              Yes. {site.travel.hotel} has a block available at{" "}
              {site.travel.rate}. Call {site.travel.phone} to reserve.
            </p>
          </details>
          <details>
            <summary>Is parking available?</summary>
            <p>Yes. Parking is included at the venue.</p>
          </details>
          <details>
            <summary>What if I have a food allergy?</summary>
            <p>
              Please contact the couple with allergy details so the meal can be
              planned safely.
            </p>
          </details>
        </div>
        <div className="centered-action">
          <Link className="button button-secondary" href="/rsvp">
            Reply to our invitation
          </Link>
        </div>
      </section>

      <footer className="site-footer">
        <p>{site.monogram}</p>
        <span>{site.shortDate}</span>
        <Link href="/admin">Admin</Link>
      </footer>
    </main>
  );
}
