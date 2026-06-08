# TODO

## Before First Release

- [ ] Replace temporary couple names, date, venue, story, schedule, FAQ, travel,
      and attire.
- [ ] Confirm final meal choices and RSVP deadline.
- [ ] Decide whether RSVPs should support per-guest meal choices instead of one
      meal choice per invitation.
- [ ] Confirm invitation/household matching and duplicate-response behavior.
- [x] Test the public pages at iPhone and desktop sizes.
- [ ] Submit and verify a declined RSVP example.
- [ ] Confirm admin logout and RSVP deletion through a real browser.
- [x] Confirm admin login and CSV export.
- [x] Confirm SQLite persistence through a container restart.
- [x] Confirm SQLite persistence through the branch-aware installer and rebuild.
- [ ] Test a branch-aware fresh install on a clean Ubuntu or Debian VM.
- [x] Confirm Docker and the app recover after a full VM reboot.
- [ ] Test switching a VM from `develop` to `main` after a manual release.
- [ ] Configure VM firewall, Cloudflare, DNS, TLS, and backups.
- [ ] Restrict direct VM traffic before trusting proxy IP headers in production.
- [ ] Manually merge the approved release from `develop` to `main`.

## Later

- [ ] Add editing of mistaken submissions if deletion/re-entry is insufficient.
- [ ] Consider signed invitation codes if duplicate/fabricated RSVPs become a
      concern.
- [ ] Add a database backup helper only if VM-level backups are not adequate.
- [ ] Replace all temporary sample content with confirmed wedding information.
