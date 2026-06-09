# TODO

## Before First Release

- [x] Remove all unapproved template content and placeholder personal data.
- [x] Add confirmed names, hosts, wedding date, RSVP deadline, ceremony time,
      and ceremony name.
- [x] Add a live wedding countdown with wedding-day and post-event states.
- [x] Add the supplied hero and portrait photography.
- [x] Replace free-form RSVPs with household and individual invited-person
      responses.
- [x] Add admin RSVP open/closed control stored in SQLite.
- [x] Prevent public changes after household confirmation.
- [x] Allow admin response editing and household unlocking.
- [x] Add household/guest CSV export and dashboard counts.
- [x] Require at least one invited person during household creation.
- [x] Add inline admin validation and household-name/surname defaults.
- [x] Autosave admin household, person, status, and notes fields on blur.
- [x] Show explicit admin saving, saved, and failure states.
- [x] Prevent deletion of the final invited person from a household.
- [x] Standardize admin submission status and action labels.
- [x] Add populated-database migration and admin autosave regression tests.
- [x] Test the public pages at 390px and desktop widths.
- [x] Submit and verify a mixed attending/declined household RSVP.
- [x] Confirm admin login, household creation, public locking, admin unlocking,
      and admin response editing through a real browser.
- [ ] Add the confirmed ceremony address.
- [x] Add confirmed reception time and location.
- [x] Remove registry section, nav link, and all registry wording.
- [x] Add favicon and Apple touch icon from couple photo.
- [ ] Import the real invitation household and guest list.
- [ ] Test household and invited-person deletion through a real browser.
- [ ] Confirm admin logout through a real browser.
- [x] Deploy this feature to the Debian 13 VM and confirm health, admin login,
      the RSVP availability control, and legacy data preservation through
      container rebuilds.
- [ ] Confirm household and invited-person data persists through a VM reboot.
- [ ] Test a branch-aware fresh install on a clean Ubuntu or Debian VM.
- [ ] Test switching a VM from `develop` to `main` after a manual release.
- [ ] Configure VM firewall, Cloudflare, DNS, TLS, and backups.
- [ ] Restrict direct VM traffic before trusting proxy IP headers in production.
- [ ] Manually merge the approved release from `develop` to `main`.

## Later

- [ ] Consider signed invitation codes if surname search is not private enough.
- [ ] Add a database backup helper only if VM-level backups are not adequate.
