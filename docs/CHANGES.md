# Launch-day changes (latest)

* **Requests**: donors only see requests their blood group can give to; shareable request links (`/?request=`) show only
  the basics and open without a long login; mismatched viewers see "Mismatch" and can still copy the link.
* **Donations**: donor presses "I donated" -> requester confirms -> automatic after 24 hours; one donation = one count;
  admin can cancel a wrong donation.
* **Verified donors**: admin-only, at least 5 donations; home page shows verified donors, Find Blood lists everyone with page numbers.
* **E-mail**: matching donors are e-mailed when a request is posted (background task).
* **Accounts**: 30-day sessions that renew while in use; password reset ends older sessions; unverified sign-ups can no
  longer have their password taken over (the new password only applies after the e-mailed code is entered).
* **Admin**: separate `/admin` page (no admin menu on the public site): accounts, requests, donors (+Verify), donations
  (+Cancel), contact messages, activity log, blood stock, "send reset e-mail". Passwords are never shown.
* **Website**: no demo/sample data or browser-only mode, "Lifora Advantage" section and the simulated app mock-up removed,
  home page no longer repeats menu pages, Back button, everything translated to Bangla, About page contact details come from settings.

# What was fixed (audit → fixes)

## Critical / High — fixed and covered by tests (`backend/tests/test_security.py`)
| Problem | Fix |
|---|---|
| Anyone could register as `admin` | Public roles limited to donor/requester; admin only via `create_admin` CLI |
| Demo passwords (incl. admin) worked everywhere | Removed from login; opt-in in development only; never in production |
| Hard-coded / default JWT secret | `SECRET_KEY` required (≥32 chars) in production; random per-process in dev |
| Inventory, notifications, request status/book/confirm had no/weak auth | Login required; ownership or admin checks; inventory = admin |
| Notification IDOR (`?user_id=`) | Users only see their own; admin may inspect |
| Donor phone/email & request phone public | Masked publicly; real data for signed-in users (rate-limited) |
| Unauthenticated donor creation / mass assignment | Login required; email/user taken from the token; `verified=false` |
| Donor responses (with contact data) public | Owner/admin only |
| CORS `*` with credentials; `/docs` open | Explicit origin allow-list (refuses wildcard in production); docs off in production |
| 500 errors leaked internals | Generic message; details logged server-side |
| Fake "verified"/"SMS dispatched" claims | New donors unverified (admin verifies); contact modal sends a real in-app message and says so |
| Frontend silently faked success when the server failed | Fallback only in Demo mode; real mode shows real errors; demo banner added |
| Live site had no backend (`/api` → 405 / HTML) | Honest Demo banner now; set `VITE_API_BASE_URL` to go real |

## Also fixed
Collision-safe IDs (uuid), duplicate-request guard, request expiry + cancellation, own-request response blocked,
guest feed no longer pretends to be a B+ donor, notifications no longer sent to a fake demo user, public donation
list shows first name + initial, login timing/enumeration guard, per-account brute-force limit, rate-limiter cleanup.

## Added (professional extras)
Password reset by email, account deletion, `/api/health` with DB check, `create_admin` CLI, security headers on
Vercel and the API, `robots.txt`, Dockerfile, `render.yaml`, env examples, medical-safety notice, 19 automated tests.

## Fake content removed / made honest (for launch with real data)
| Was | Now |
|---|---|
| 3 invented testimonials (incl. a named hospital official) | Section deleted |
| "Transfusion Record #8492" story | Section deleted |
| "Average match within 35 minutes", "<35 minutes processing" | Removed |
| "Real-Time Network Telemetry", "Trusted by Patients, Donors & Hospitals" | "Network Statistics", "Our Community at a Glance" (+ "sample data" label in demo) |
| Success rate showed 100% with zero requests; "Successful Donations" counted requests | Shows "—" until there are requests; renamed "Fulfilled Requests" |
| "Thousands of donors", "certified centers", "verified, physician-confirmed requests", FAQ "multi-factor phone validation / accredited database cross-check" | Reworded to what the product really does |
| 10 sample hospitals shown as "Certified" with fake ratings | Real mode starts with zero centers (section hidden until you add real ones); admin API + `import_centers` CLI |
| "Open Now" badge (always on) | "24/7 emergency" / "See hours" from real data |
| Contact form said "Message received" without sending | Saved in the database (admin can read); success only after the server confirms |
| 8 red "Critical" inventory cards with no data | Hidden until an administrator enters real stock |

**After launch** every number on the site comes from your database: donors, active requests, fulfilled requests,
fulfilment rate, inventory, centers. Nothing is hard-coded in real mode. Empty sections hide themselves.

### Before you launch (checklist)
1. Deploy backend + Postgres, set `VITE_API_BASE_URL` on Vercel, redeploy.
2. `python -m backend.app.create_admin` (your own admin account).
3. Add real centers: edit `backend/centers.example.json`, then `python -m backend.app.import_centers file.json`
   (only numbers you have called and verified).
4. Log in as admin and enter the real blood stock (inventory).
5. Check the footer phone number/address and About page text yourself — I cannot verify them.
6. Read your contact messages with `GET /api/contact/messages` (admin token) until an admin screen exists.

## Demo / preview mode now follows the same rules as the real server
Visitors start **signed out** (no more automatic sample login). Register needs a valid email, a full name, a valid phone
(if given) and a password of 8+ characters; duplicate emails and wrong passwords are rejected; posting a request or
responding needs login (donor role for responding). Build with `VITE_SAMPLE_DATA=false` to see the site as it will look
at launch (no sample donors/requests/centers; sections hide until real data exists). Default demo build still shows
sample data, clearly labelled.

## Forms: garbage in is rejected (browser AND server)
Shared rules in `src/utils/validation.ts` and `backend/app/schemas/common.py`: real-looking name (letters, no digits/`@<>/`),
valid email, phone with 8-15 digits (not 00000000), password >= 8, blood group from the list, units 1-10.
The donor enrollment page now has a password field, requires date of birth (18-65), weight >= 50 kg and the four
health confirmations (no longer pre-ticked); "success" and modal-close happen only after the account really exists.
The fake default phone numbers (+880 1700-000000) and the pre-filled hospital name were removed.
Tested: 24 backend tests + a headless-Chrome run of the built preview.

## Guest gate (members-only app)
Signed-out visitors see a light preview only (hero, how it works, compatibility guide, FAQ and a "Log in or sign up to
explore more" card). Find Blood, Blood Requests, Blood Centers, dashboards, Post Request, search and contacting a donor
all open a **right-side login / sign-up panel** instead. Public pages: Home preview, About, and the donor sign-up page.
Server side: every read endpoint for donors, requests, centers and inventory now returns 401 without a token
(only `/api/stats` and `/api/health` are public), so the data cannot be scraped around the UI.
Verified with 25 backend tests and a headless-Chrome run (guest -> panel -> sign up -> members pages -> session
cleared -> gated again). Hero badge "Verified Humanitarian Network / Live 24/7" reworded to claims we can support.

## New 3-step sign-up (email verification + onboarding)
1. **Register:** name, email, password only. A 6-digit code is emailed (hashed in the database, 15-minute expiry,
   5 wrong attempts lock it, 60-second resend cool-down). No session exists until the code is entered.
2. **Verify:** correct code -> account is verified and signed in. Unverified accounts cannot log in or use the API.
3. **Choose Donor or Requester**, then blood group, age (donors 18-65), city, area, distance in km (1-200) and phone.
   Name/email/password are not asked again.
The same profile is shown and editable in **both dashboards** (Donor dashboard, new Requester dashboard).
Server side: `get_member` blocks accounts that are unverified or have no profile yet from every members-only endpoint.
Donor alerts for a new request now go only to donors in the same city (the saved km is stored for future real distance
matching, which needs map coordinates). New endpoints: `POST /auth/verify-email`, `/auth/resend-code`,
`/auth/onboarding`, `PUT /auth/profile`.
**Production needs an SMTP server** (see `backend/.env.example`: Brevo, Resend or a Gmail app password all work);
without it the API answers 503 on sign-up instead of creating accounts nobody can verify. Without SMTP in development
the code is shown on screen ("test mode"); this is never done when `ENVIRONMENT=production`.
Tested by 32 backend tests and a headless-Chrome run of the whole journey.

## Phone check + hero claims
Whole journey re-tested at phone size (390 px, touch): guest card, login/register panel (full width), code step, role
choice, profile form, requester dashboard, members pages. No sideways scrolling, no JS errors.
Hero claims reworded: removed "WHO-Compliant", "certified donors", "eliminates the delay", "Verified Donors On-Call 0+"
(the live counters are hidden from guests, who have no data to show).

## Small-phone header fix
On phones narrower than 400 px the header was wider than the screen: the "Log In" button was cut off and the mobile menu
button was off-screen. The header now fits 320, 360, 390 and 412 px for guests and signed-in members (guests' empty
notification bell is hidden on phones; chevrons and padding are tighter; "Log In" never wraps).

## Landing page with always-visible login, and separate donor / requester features
* **Guests (desktop):** light preview on the left, the login / register card permanently on the right (like the design
  screenshot). Anything else they click keeps them here and shows "Please log in or sign up to continue".
  On phones the same card slides in from the right when they tap anything.
* **After login:** donors land on the Donor Dashboard, requesters on the Requester Dashboard.
* **Donor** menu: Home, Blood Requests (feed of compatible open requests), Blood Centers, About. Can respond to requests.
  Cannot search donors, post requests or contact other donors. Never sees other people's donor details.
* **Requester** menu: Home, Find Blood (donor search), Blood Centers, About, Post Request. Sees only their OWN requests
  and, on the dashboard, the donors who responded (Book this donor, Confirm donation received).
* Enforced on the server too (`require_roles`), not just hidden in the menu: wrong-role calls get HTTP 403.
* Tested: 33 backend tests, desktop role flow, phone flow, and 8 header-fit checks (320-412 px).

## Login card on every screen + role-based features
Guests see the login / sign-up form without tapping anything: right-hand column on desktop, directly under the hero
on phones (320-412 px tested). After sign-up, donors and requesters get different menus, home pages and server-side
permissions (donor feed / respond vs donor search / post request / responses feed with Book and Confirm).

## One account, two dashboards (switch role) + acceptance updates
`POST /auth/switch-role` switches between Donor and Requester in one click and keeps the saved profile (nothing is asked
again). Buttons: user menu, a card on the Donor dashboard and the banner of the Requester dashboard, "Donate Blood" for
requesters. The requester dashboard has a "Latest updates" panel (a donor accepted / was booked) plus the bell, and
a per-request list of responding donors with Book -> Confirm donation. Button states now follow the server's states
(accepted -> booked -> completed). The donor profile is no longer switched off when someone uses the requester side.
Rule kept on purpose: on the live backend nobody can answer their OWN request (use a second account). The browser-only
preview allows it so one person can try the whole cycle, and says so in the message.
Preview mode now stores requests, responses and notifications in the browser, so the cycle survives a refresh.

## Speed (the "lag"), measured on a 390 px phone with the CPU slowed 4x
Before -> after: average frame 43 ms -> ~21 ms, slow frames (>50 ms) 21 -> 1 to 8, blurred glow circles 12 -> 0,
videos playing at once 2 -> 0, first load 1.4 s -> 0.9 s, images 1.45 MB -> 0.2 MB, main script 757 KB -> 420 KB.
What changed: big `blur(150px)` glows replaced by cheap radial masks; videos play only while on screen (desktop only,
never with Data Saver or reduced motion); a full-page backdrop blur removed; pages, modals and lower sections load on
demand (code-splitting); hero/footer images re-compressed and two unused images deleted; no endless animations when the
visitor asks for reduced motion. The fake "Live Healthcare Feed" label was removed.

## Welcome sheet
First visit of a signed-out visitor: ~0.8 s after the site opens a log in / sign up sheet slides down from the top
(spring motion; fade only with reduced motion). "Just look around first", X, Esc or the dark area closes it; it shows once
per browser session and disappears by itself after login.

## Fake-looking data is refused (browser and server)
Names: keyboard mash such as "hsjsj", "asdfgh", "aaaa" is refused (Bangla names are fine). Phones: real Bangladesh mobile
numbers only (01[3-9]XXXXXXXX, +880...), stored as `+880 1711-000111`. Hospital names get the same check. "Needed by" is
a dropdown (Within 2 hours ... 7 days) instead of free text and the request expires on its own. At most 3 open requests
per person. Limits: this stops obvious junk, it cannot prove that a name or number belongs to a real person (that needs
SMS verification or admin review).

## Request status in plain language
Waiting for a donor -> Donor accepted -> Donor booked -> Donated (donor's response: accepted -> booked -> completed).
Donors get "You were booked" and "Donation confirmed"; both dashboards have a Latest updates panel.

## One place for "log in / sign up", not five
Counted on the home page before: header (Post Request, Become a Donor, Log In), hero (3 buttons + 2 sign-up cards), the
login card, an info card with Log in / Sign up, a closing section (Register / Find Blood) and a footer banner (3 more buttons).
Now a signed-out visitor sees: the login/register card at the start (right column on desktop, under the headline on
phones), the one small Log In button in the header, and the welcome sheet once. Phone bottom bar: Home + Profile.
Signed-in users see only what their role needs (donor: one hero button; requester: Post Request in the header and one
Find Blood Donors button); the closing banner and the "Register as Donor or Receiver" prompts are gone for everyone.
Page length for guests: 6540 px -> 5252 px (desktop), 9759 px -> 7838 px (phone).

## Footer: no invented claims
Removed: the "24/7 Regional Transfusion Desk" phone/email/address (unverified), dead social-media icons, "WHO Guidelines /
Verified Clinical Hub" badges, the email "subscribe to emergency alerts" form (it sent nothing), the pulsing "All systems
operational" light and the Privacy / Terms links (those pages do not exist yet). Footer links follow the visitor's role.
Real contact details appear only when you set `VITE_CONTACT_PHONE`, `VITE_CONTACT_EMAIL`, `VITE_CONTACT_ADDRESS` in Vercel.
STILL NEEDED before launch: write real Privacy Policy and Terms pages and link them.

## No "24/7 / always open" claims from the site itself
Removed the hero badge "Always open" (and its endless ping animation), the footer "24/7 Regional Transfusion Desk" and the
"Emergency collection standby 24/7" line. Blood centers now show their own opening hours exactly as the administrator entered
them, or "Call to confirm". Nothing on the site promises round-the-clock service, because nobody staffs LIFORA round the clock;
requests are answered by volunteer donors whenever they are online. (The word "24" still appears in the sample centers that
only show in demo mode, and in the "Within 24 hours" deadline choice.)

## Removed
Express backend (`server/`, `api/`, `server.ts`), committed databases (`lifora.db*`, `.data/`), unused deps
(`express`, `dotenv`, `tsx`, `@google/genai`). FastAPI is the single backend.

## Still open (needs you or more work — NOT claimed as done)
1. **Deploy the backend** and set `VITE_API_BASE_URL` — until then the live site is a demo.
2. Distance / "match %" are still placeholder values (need real geolocation); the UI should stop showing them as facts.
3. Privacy Policy & Terms pages (needs a lawyer-reviewed text), consent checkbox at sign-up.
4. Alembic migrations (the app uses `create_all`; adding columns later needs migrations). Backups: use the host's Postgres backups.
5. Rate limiting is per-process; use Redis if you run more than one instance.
6. JWT is kept in `localStorage` (XSS-exposed); httpOnly cookies would be stronger. Add a CSP header after testing.
7. Real SMS/push alerts do not exist; only in-app notifications. Real-time updates are refresh-based.
8. Accessibility (WCAG 2.2 AA), Lighthouse, mobile review and bundle size (≈765 KB JS, ~3 MB images) were NOT audited.
9. `lifora.db` that was in your zip was deleted from the project; if it held real user data, handle it per your privacy duties.


## Launch hardening (2026-10-20) - no change to features, design or architecture
**Security**
- Rate-limit IP now taken from the proxy-added `X-Forwarded-For` entry (`TRUSTED_PROXY_COUNT`), not the client-written first value; Docker no longer trusts forwarded headers from every address.
- Tokens of deleted (anonymised) accounts are rejected.
- Router mounted once under `/api` (it was also mounted at the root).
**Correctness / load**
- One response per donor per request is enforced by a database unique constraint (duplicate click returns 409); donation confirmation locks the request row.
- Donor cool-down (`DONATION_COOLDOWN_DAYS`, default 120): "Recently Donated" ends by itself; nobody can mark themselves Available early; a recent self-reported donation at sign-up starts the cool-down.
- `limit` / `offset` on `/requests` and `/donors` (default 200, max 500); donor lookups batched; expiry is one bulk UPDATE.
- Database pool settings for PostgreSQL; dependency upper bounds.
**Honest data**
- No invented defaults: centers have no fake rating, reviews, stock, distance or shared coordinates; donors no fake 2.5 km / 95 % match. The UI hides distance and match when they are 0.
- Removed hardcoded "Licensed by DGHS", "8 Blood Types Ready", "Routing initiated" toast.
- Sample centers replaced by 5 with sourced numbers (`docs/CENTERS_SOURCES.md`, `backend/centers.json`).
**New**
- Map: OpenStreetMap embed when a center has a pin, Google Maps directions link always (no API key).
- Ads: optional AdSense slots for signed-out visitors only (`VITE_ADSENSE_*`).
- Privacy Policy and Terms drafts (`public/privacy.html`, `public/terms.html`) and a consent checkbox at sign-up.
- `render.yaml` now lists the SMTP variables.
**Not changed on purpose** (would alter the design): token still in `localStorage`; email is sent inside the request; per-process rate limiter; `create_all` instead of Alembic; sign-up still sets the password before the email code.

## Registered-accounts follow-up (2026-10-20)
- Admin dashboard shows registered accounts, accounts that have not finished their profile, and accounts still waiting for the email code (numbers only, from `/api/stats`); the "Verified Donors" card counts real verified donors.
- Removed false admin claims ("Dispatched push notifications to 48 donors", "100% telemetry online"); the hardcoded demo "Book Donor" button is demo-mode only.
- Signed-in people get fresh lists when they return to the tab (max every 30 s).

- Ads for members: set `VITE_ADS_FOR_MEMBERS=true` to show ads to signed-in users too. Spots: member home (2) and centers page (1). No ads on requests, donor contact, dashboards.
