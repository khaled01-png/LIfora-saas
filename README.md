# LIFORA — Give Blood. Save Lives.

React + Vite frontend (Vercel) and FastAPI + SQLAlchemy backend (Render/Railway/Fly + Postgres).

## How it runs
The website always talks to the FastAPI server. There is no browser-only "demo" mode and no sample data: every donor,
request and account is a real record. If the server cannot be reached, a red notice says so and nothing is saved.

* **Public website**: `/`  (donors, receivers, shared request links `/?request=<id>`)
* **Administrator area**: `/admin`  (separate page; the public site has no admin menu or link)

## Local development
```bash
# 1) backend
python -m venv .venv && source .venv/bin/activate
pip install -r backend/requirements.txt
python -m backend.run                      # http://127.0.0.1:8000  (docs at /docs in development)

# 2) frontend (the dev server proxies /api to the local backend, so no variable is needed)
npm install
npm run dev                                # http://localhost:3000   (admin: http://localhost:3000/admin)
```
No demo users are created. Make your own administrator with the CLI below and register normal accounts on the site.
An older `lifora.db` that contains made-up demo people from earlier versions can simply be deleted (stop the server,
delete `lifora.db`, start again). Missing new columns are added to an existing database automatically on start-up.

## Production deployment
1. **Backend + database**: create a Render account, "New → Blueprint", pick this repo (`render.yaml`).
   Or any host that runs the `backend/Dockerfile`. Set the variables in `backend/.env.example`
   (`SECRET_KEY`, `ALLOWED_ORIGINS`, `DATABASE_URL`, `FRONTEND_URL`). `FRONTEND_URL` is also the address put in e-mailed links (request links, password reset), so it must be your real site address.
   The server **refuses to start** in production without a strong `SECRET_KEY` and an explicit CORS origin.
2. **First administrator** (never from the website):
   `ADMIN_EMAIL=you@org.org ADMIN_PASSWORD='long-random-password' python -m backend.app.create_admin`
   then log in at `https://<your-site>/admin`.
3. **Frontend (Vercel)**: set `VITE_API_BASE_URL=https://<your-api-host>/api`, redeploy.
4. Check `https://<your-api-host>/api/health`.

## Email (required in production)
Sign-up sends a 6-digit code by email, so the backend needs an SMTP account. Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`,
`SMTP_PASSWORD`, `SMTP_FROM` (Brevo, Resend, Mailgun or a Gmail app password all work). Without SMTP, production refuses
sign-ups (HTTP 503). In development the code is shown on screen instead.

## Launch checklist
1. Backend + Postgres deployed, `VITE_API_BASE_URL` set on Vercel (without it the site shows a red "server not reachable" notice), SMTP variables set.
2. `ADMIN_EMAIL=... ADMIN_PASSWORD=... python -m backend.app.create_admin`
3. Import blood centers: `python -m backend.app.import_centers backend/centers.json` (call each number first, see `docs/CENTERS_SOURCES.md`).
4. Fill in `[your name]`, `[contact email]`, `[date]` in `public/privacy.html` and `public/terms.html`; have them reviewed.
5. Ads (optional): after AdSense approves the site, set `VITE_ADSENSE_CLIENT` and `VITE_ADSENSE_SLOT` and put your publisher line in `public/ads.txt`.
6. Turn on database backups at your host; use a paid plan (free tiers sleep, and a free Render Postgres database expires after 30 days).
7. Set `VITE_CONTACT_EMAIL`, `VITE_CONTACT_PHONE`, `VITE_CONTACT_ADDRESS` on Vercel. They appear in the footer and on the About page; nothing is shown when they are empty.

## Tests
```bash
python -m pytest backend/tests -q        # security & business-logic tests (synthetic data)
npm run lint && npm run build            # type-check + production build
```

## Security model (summary)
* Passwords: bcrypt, minimum 8 characters; per-IP and per-account login throttling.
* Public sign-up can only create `donor` / `requester`. Admins are created with the CLI above.
* Donor phone/email and request contact numbers are masked for the public; real values only for signed-in users
  (rate-limited), the donor themselves and admins. Donor responses are visible only to the request owner/admin.
* Every write endpoint requires login; request changes need ownership or admin; inventory writes need admin.
* Notifications are private to their owner. Requests expire automatically (from the "deadline" text, default 24 h).
* Account deletion (`DELETE /api/auth/me`) anonymises personal data. Password reset by email link (needs SMTP).
* Production: API docs off, wildcard CORS refused, security headers, generic 500 errors.

## Medical note
Blood-group matching is a convenience filter. It is **not** medical clearance. A hospital laboratory and a physician
must confirm compatibility. This notice is shown on the site.

## How blood requests and donations work
* A request is shown only to donors whose blood group can give to the patient's group (O- gives to all, AB+ receives from all).
* New requests e-mail the matching available donors in the same city (in the background; needs SMTP). The e-mail has only
  the basics and a link. Anyone who opens the link sees the basics; a donor with a matching group can accept; others see
  "Mismatch" and can still copy the link to share.
* The donor presses **I donated**; the requester confirms. If the requester does not answer within `AUTO_CONFIRM_HOURS`
  (24) it counts automatically (checked every 10 minutes and whenever requests are listed). Two units still count as one
  donation. An administrator can cancel a wrong donation.
* A donor can be **verified** by an administrator only with at least `MIN_DONATIONS_TO_VERIFY` (5) confirmed donations.
  The home page lists verified donors by first name and initial; every registered donor is on Find Blood (paged).
* People stay logged in for 30 days (`ACCESS_TOKEN_EXPIRE_MINUTES`), and the session is renewed while they keep using the
  site. A password reset ends all older sessions.
