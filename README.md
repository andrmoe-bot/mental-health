# Stillpoint

A private, single-user CBT reflection journal for a LAN or VPN. It has a thought record, a small activity planner, and a journal history. Journal entries are stored in a SQLite database on the host and shared across devices; the browser keeps only an authenticated session cookie.

## Run

Requires Python 3.11 or newer. No third-party packages are needed.

```sh
APP_PASSWORD='use-a-long-private-password' python3 server.py
```

Open `http://<server-address>:8080` from your LAN or VPN. Because journal entries are sensitive, use an HTTPS reverse proxy for network access and set `COOKIE_SECURE=true`; plain HTTP exposes passwords and session cookies to anyone who can observe that network path. Set `DATA_DIR` to a persistent, backed-up directory if you run the app in a container. The SQLite database is `data/journal.sqlite3` by default and is not encrypted by the app, so keep it on a protected host or encrypted disk.

Environment variables:

| Variable | Default | Purpose |
| --- | --- | --- |
| `APP_PASSWORD` | required | Single-user password; must be at least 12 characters |
| `HOST` | `0.0.0.0` | Interface to bind |
| `PORT` | `8080` | HTTP port |
| `DATA_DIR` | `./data` | Directory for the server-side SQLite database |
| `COOKIE_SECURE` | `false` | Set to `true` when TLS terminates in front of the app |

The session cookie is HttpOnly and SameSite=Strict. Sessions expire after 30 days or when the server restarts. Export personal data from **Data & settings** before upgrades or migrations. Keep database backups private.

## Content and licenses

The adapted thought record and activity planner are attributed and released under CC BY-SA 4.0. The application code remains under the repository's MIT license. Details and links are in [CONTENT_LICENSE.md](CONTENT_LICENSE.md).

This is a personal reflection tool, not a substitute for professional care. Pause an exercise if it makes you feel worse, and seek support when you need it.
