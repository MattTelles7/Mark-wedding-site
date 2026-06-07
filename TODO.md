# TODO

## Before First Release

- [ ] Replace temporary couple names, date, venue, story, schedule, FAQ, travel,
      and attire.
- [ ] Confirm final meal choices and RSVP deadline.
- [x] Test the public pages at iPhone and desktop sizes.
- [ ] Submit attending and declined RSVP examples.
- [ ] Confirm admin login, logout, deletion, and CSV export.
- [ ] Confirm the SQLite database persists through a container rebuild.
- [ ] Test `install.sh` on a clean Ubuntu or Debian VM.
- [ ] Configure VM firewall, Cloudflare, DNS, TLS, and backups.
- [ ] Restrict direct VM traffic before trusting proxy IP headers in production.
- [ ] Merge through `develop` and then release to `main`.

## Later

- [ ] Add editing of mistaken submissions if deletion/re-entry is insufficient.
- [ ] Consider signed invitation codes if duplicate/fabricated RSVPs become a
      concern.
- [ ] Add a database backup helper only if VM-level backups are not adequate.
