import Image from "next/image";
import Link from "next/link";
import { Countdown } from "@/app/countdown";
import { getSiteConfig } from "@/lib/site";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const site = getSiteConfig();

  return (
    <main className="invitation-site">
      <section className="invitation-hero">
        <nav className="site-nav" aria-label="Main navigation">
          <Link className="wordmark" href="/">
            {site.monogram}
          </Link>
          <div className="nav-links">
            <a href="#details">Details</a>
            <a href="#registry">Registry</a>
            <Link href="/rsvp">RSVP</Link>
          </div>
        </nav>

        <div className="hero-layout">
          <div className="hero-copy">
            <p className="eyebrow">The wedding celebration of</p>
            <h1>{site.coupleNames}</h1>
            <p className="hero-date">
              <time dateTime={site.weddingDateIso}>{site.weddingDate}</time>
            </p>
            <Countdown
              weddingDateIso={site.weddingDateIso}
              ceremonyTime={site.ceremony.time}
              initialMessage={site.countdown}
            />
            <Link className="button button-light" href="/rsvp">
              Respond to the invitation
            </Link>
          </div>

          <div className="hero-photo-wrap">
            <Image
              className="hero-photo"
              src="/images/mark-guerdithe-hero.jpg"
              alt="Mark and Guerdithe sharing a quiet moment"
              fill
              priority
              sizes="(max-width: 679px) 100vw, (max-width: 1199px) 52vw, 680px"
            />
          </div>
        </div>

        <div className="scroll-cue" aria-hidden="true">
          <span />
          Invitation
          <span />
        </div>
      </section>

      <section className="invitation-card-section" aria-label="Invitation">
        <div className="invitation-layout">
          <article className="formal-invitation">
            <p className="invitation-hosts">{site.hostNames}</p>
            <p>request the honor of your presence</p>
            <p>at the nuptial Mass uniting</p>
            <h2>
              <span>{site.fullNames.first}</span>
              <small>and</small>
              <span>{site.fullNames.second}</span>
            </h2>
            <div className="invitation-rule" aria-hidden="true">
              <span />
              <b>{site.monogram}</b>
              <span />
            </div>
            <p className="invitation-date">{site.weddingDate}</p>
            <p>
              at {site.ceremony.time}
              <br />
              {site.ceremony.venue}
            </p>
          </article>

          <div className="portrait-pair" aria-label="Mark and Guerdithe">
            <figure className="portrait-card portrait-card-left">
              <Image
                src="/images/mark-guerdithe-silhouette.jpg"
                alt="Mark and Guerdithe silhouetted beneath a tree"
                fill
                sizes="(max-width: 679px) 88vw, (max-width: 999px) 42vw, 260px"
              />
            </figure>
            <figure className="portrait-card portrait-card-right">
              <Image
                src="/images/mark-guerdithe-portrait.jpg"
                alt="Mark kissing Guerdithe on the forehead"
                fill
                sizes="(max-width: 679px) 88vw, (max-width: 999px) 42vw, 260px"
              />
            </figure>
          </div>
        </div>
      </section>

      <section className="section details-section" id="details">
        <div className="section-heading">
          <p className="eyebrow">Saturday, July eighteenth</p>
          <h2>Wedding Day</h2>
          <p>We look forward to celebrating with you.</p>
        </div>

        <div className="event-list">
          <article className="event-card">
            <p className="event-time">{site.ceremony.time}</p>
            <div>
              <h3>{site.ceremony.title}</h3>
              <p>{site.ceremony.venue}</p>
              {site.ceremony.address ? (
                <p className="muted">{site.ceremony.address}</p>
              ) : null}
            </div>
          </article>
          <article className="event-card">
            <p className="event-time">Following</p>
            <div>
              <h3>Reception</h3>
              <p className="muted">{site.reception.message}</p>
            </div>
          </article>
        </div>
      </section>

      <section className="section registry-section" id="registry">
        <div className="registry-card">
          <p className="eyebrow">With gratitude</p>
          <h2>Registry</h2>
          <p>{site.registryMessage}</p>
        </div>
      </section>

      <section className="section reply-section">
        <div className="reply-card">
          <p className="eyebrow">Kindly reply</p>
          <h2>Will you join us?</h2>
          <p>
            Please respond by{" "}
            <time dateTime={site.rsvpDeadlineIso}>{site.rsvpDeadline}</time>.
          </p>
          <Link className="button button-primary" href="/rsvp">
            RSVP
          </Link>
        </div>
      </section>

      <footer className="site-footer">
        <p>{site.monogram}</p>
        <span>{site.shortDate}</span>
      </footer>
    </main>
  );
}
