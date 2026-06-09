# Customization

Wedding content is configured in `.env`:

```dotenv
COUPLE_NAMES=Mark & Guerdithe
FIRST_FULL_NAME=Mark Jerome Wolfe
SECOND_FULL_NAME=Guerdithe Mielda Nelson
HOST_NAMES=Amy and Jeremy Wolfe
WEDDING_MONOGRAM=M&G
WEDDING_DATE=Saturday, July 18, 2026
WEDDING_DATE_ISO=2026-07-18
WEDDING_SHORT_DATE=07.18.2026
CEREMONY_TIME=2:30 PM
CEREMONY_VENUE=St. Joseph's Catholic Church
CEREMONY_ADDRESS=
RSVP_DEADLINE=June 26, 2026
RSVP_DEADLINE_ISO=2026-06-26
```

Leave `CEREMONY_ADDRESS` empty until the address is confirmed. The homepage
will omit it rather than inventing a value.

After changing `.env`, restart the app:

```bash
docker compose up -d
```

## Missing Wedding Content

The following items intentionally remain placeholders:

- Reception: “Reception details to follow”
- Registry: “Registry details coming soon.”

Update the reception and registry copy in `lib/site.ts` after details are
confirmed. The current photos are stored in `public/images`, referenced from
`app/page.tsx`, and presented by `app/globals.css`.

## Invitation List

Households and invited people are managed through `/admin`, not `.env`.

1. Add a household with a display name and exact public search last name.
2. Add every invited person in that household.
3. Leave public RSVPs closed until the invitation list is ready.
4. Open RSVPs using the dashboard switch.

Submitted households lock automatically. Admins can edit individual statuses
or unlock a household when a guest needs to submit a correction.
