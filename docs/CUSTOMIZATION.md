# Customization

Wedding content is configured in `.env`:

```dotenv
COUPLE_NAMES=Lilly & Christopher
WEDDING_DATE=Saturday, September 26, 2026
WEDDING_DATE_ISO=2026-09-26
WEDDING_VENUE=The Hall
WEDDING_LOCATION=St Leon, IN
```

After changing `.env`, restart the app:

```bash
docker compose up -d
```

Schedule times, FAQ answers, attire, and RSVP meal options currently live in
the page source. Update them before the final release:

- `app/page.tsx`
- `app/rsvp/rsvp-form.tsx`
- `lib/validation.ts`

Meal option values in the form and validation file must stay aligned.

The current homepage text is temporarily based on the public The Knot site for
Lilly and Christopher. Replace those details when final information is ready.
