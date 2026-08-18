# StatsPack Tech Sales Agent Portal — v1.1

A two-role portal for managing tech sales agents across the SADC region.
StatsPack admins manage agents, clients, payments and commission; agents log
their own pipeline and see exactly what they have earned and what is still owed.

Built in the StatsPack VMS visual language — teal `#4EC3C1`, slate `#3E5F71`,
amber `#E3A93E`, coral `#DB6B4E`, Trebuchet MS, light sidebar with the teal
profile header — so it sits beside EduTrack 360 and Analytics Lab without
looking like a different product.

---

## The commission rules it implements

| Payment stage | Agent | StatsPack | Duration | Trigger |
|---|---|---|---|---|
| First client payment | 60% | 40% | Once only | On receipt of the client's first payment |
| Monthly payments — year 1 | 10% | 90% | 12 months after the first payment | On receipt of each monthly payment |
| After month 12 | — | 100% | Indefinite | Commission ceases |

The twelve-month window is measured **from each client's own first payment**,
so a client signed in November still gets a full twelve months. All three
figures are editable in Settings if the agent agreement ever changes.

**Commission is triggered by money actually received, not by a signature.**
Only an admin can record a payment. Agents can create and update their own
clients, but they cannot mark a payment as received — that separation is the
main financial control in the system.

---

## Live exchange rates (v1.1)

Rates refresh automatically from **ExchangeRate-API**, which covers every SADC
currency in the table.

1. Get a free key at <https://www.exchangerate-api.com/> (registration required).
2. In Render, add the environment variable `EXCHANGERATE_API_KEY` and redeploy.
3. Settings shows a **Sync now** button and a change report; the background
   worker then refreshes on the interval you set (12 hours by default).

Each currency row is tagged **live** or **manual**, so you can always see which
figures came from the provider and which you typed.

**One currency needs manual attention: ZWG.** The provider publishes Zimbabwe as
`ZWL`, not `ZWG`. Anything the provider does not recognise is reported after
each sync and left on your manual rate rather than guessed at. Set ZWG by hand,
or switch the row to ZWL if that matches your invoices. Note the provider also
flags Zimbabwe as a currency where published rates often diverge from rates
actually available.

**Syncing cannot move commission you have already recorded.** Every payment
stores the rate that applied the moment it was recorded, so a sync affects
future payments only. This is tested, not assumed.

---

## Permanently deleting an agent (v1.1)

Reserved for **super users**. The first admin account is super; admins created
afterwards are not, so a colleague can run the portal day to day without being
able to erase financial history.

The flow deliberately has friction:

1. Open the agent, scroll to the red **Permanently delete** panel.
2. A footprint is shown first — exactly how many clients, payments, payouts and
   notes will be destroyed, and how much collected revenue that represents.
3. **Download their records** takes a full JSON snapshot before anything is
   removed. Do this. Commission history is a financial record, and several SADC
   jurisdictions require you to retain it for years after an agent leaves.
4. You must type the agent's full name to arm the delete button.
5. Deletion cascades through payments, clients, payouts, reviews and sessions.

A line survives in the activity log recording who deleted whom, and what was
destroyed. Nothing else remains.

Blocked by design: deleting yourself, deleting another super user, and deleting
the last remaining administrator. **If you only want to stop someone signing in,
use Suspend instead** — it revokes their sessions immediately and keeps every
record intact.

---

## Filtering the activity log (v1.1)

Filter by who, action, date range and free text across the detail column.
Action supports a `prefix*` wildcard, so `payment*` catches recorded, voided and
restored in one go. The row count always reports the true number of matches even
when the display is capped, and **Export CSV** exports what you are looking at.

---

## Who can do what

Verified by test, not by intention.

| Action | Agent | Admin |
|---|:--:|:--:|
| Create a client | own only | any |
| Move a client Prospect → Qualified → Demo → Proposal | yes | yes |
| Mark a client Won or Lost | yes | yes |
| Edit contact details, monthly value, notes | own only | any |
| See another agent's clients or payments | **no** | yes |
| Record a payment received | **no** | yes |
| Void or restore a payment | **no** | yes |
| Reassign a client to another agent | **no** | yes |
| Delete a client | **no** | only if it has no payments |
| Create or approve a payout | **no** | yes |
| Change commission rules or FX rates | **no** | yes |
| Add a progress note about an agent | **no** | yes |
| Read progress notes written about them | yes | yes |

Agents run their own pipeline end to end without needing approval. An agent
marking a client **Won is a pipeline claim, not a financial event** — no
commission exists until an admin records money actually received. That
separation is the point: it keeps the forecast honest without giving the agent
a lever on money.

---

## Deploying it free, on your own subdomain

Render's free web service wipes its filesystem on every restart and redeploy,
so a SQLite file on Render would lose your commission history without warning.
The database therefore lives on Neon, whose free tier is permanent.

### 1. Create the database (Neon — free)

1. Sign up at <https://neon.tech> and create a project.
2. Copy the connection string. It looks like
   `postgresql://user:password@ep-xxx.eu-central-1.aws.neon.tech/neondb`.

### 2. Push this folder to GitHub

```bash
git init
git add .
git commit -m "StatsPack Tech Sales Agent Portal"
git remote add origin https://github.com/statspackbw/statspack-agent-portal.git
git push -u origin main
```

### 3. Create the web service (Render — free)

New → Web Service → connect the repo. Render reads `render.yaml`, but confirm:

- **Build command:** `pip install -r requirements.txt`
- **Start command:** `python server.py`
- **Instance type:** Free

Then add three environment variables:

| Key | Value |
|---|---|
| `DATABASE_URL` | your Neon connection string |
| `ADMIN_EMAIL` | e.g. `admin@statspack.co.ls` |
| `ADMIN_PASSWORD` | a strong password you choose |

Set `ADMIN_PASSWORD` **before the first deploy**. If you leave it blank the
portal generates one and prints it to the Render logs once — recoverable, but
awkward. A password you set yourself is not forced to change at first sign-in;
a generated one is.

### 4. Point your subdomain at it

Render → your service → Settings → Custom Domains → add e.g.
`agents.statspack.co.ls`. Render gives you a CNAME target; add that record at
your DNS provider. HTTPS is issued automatically. Custom domains work on the
free plan.

### 5. Add your brand images

Drop `logo.png` and `login.png` into the repository **root** (not `static/`) and
push. The server serves them exactly as EduTrack 360 does. Until then the login
page falls back to a slate gradient and the mokorotlo triangle mark — no broken
images.

---

## Two things about the free tier you should know

**It sleeps.** A free Render service spins down after about 15 minutes of
inactivity, and the next request takes roughly 50 seconds to wake it. An agent
clicking your link at 8am will think it is broken. Free fix: create a job at
<https://cron-job.org> that requests `https://your-domain/api/health` every
10 minutes. That stays inside the free 750 hours/month for a single service.

**Keep your own backups.** Settings → Backup downloads every agent, client,
payment and payout as JSON (never passwords). Do this before each payout run
and keep the file off the server. Neon's free tier has no long retention, and a
commission ledger is not something to hold in one place only.

---

## Running it locally

```bash
python3 server.py
```

With no `DATABASE_URL` it uses a local SQLite file (`portal.db`) and prints the
admin credentials on first boot. Visit <http://localhost:8470>.

To run locally against Postgres:

```bash
DATABASE_URL='postgresql://user:pass@host/db' python3 server.py
```

### Tests

```bash
ADMIN_PASSWORD='TestAdmin!2026' python3 server.py &
python3 test_portal.py http://localhost:8470
```

```bash
python3 test_fx.py                       # no server needed
python3 test_v11.py http://localhost:8470
```

153 checks across the three files, covering authentication, role separation, the
commission engine and its edge cases, FX rate locking and syncing, payouts,
suspension, audit filtering and permanent deletion. They pass identically on
SQLite and Postgres. Run them against a **throwaway** database — they create and
destroy agents and payments.

Upgrading from v1.0 needs no manual step: missing columns are added on boot, and
an existing admin is granted super rights automatically. Tested against a v1.0
database with live data.

---

## How it is put together

| File | What it does |
|---|---|
| `server.py` | Routing, API endpoints, static serving, HTTP plumbing |
| `core.py` | Auth, sessions, settings, FX, and the commission engine |
| `db.py` | One SQL surface over both SQLite and Postgres |
| `static/app.js` | The whole frontend — router and every screen |
| `static/styles.css` | The StatsPack theme |
| `test_portal.py` | End-to-end tests — auth, permissions, commission engine |
| `test_v11.py` | End-to-end tests — audit filters, deletion, super users |
| `test_fx.py` | Unit tests — rate sync merge logic, with the provider stubbed |

No web framework. `psycopg2` is the only dependency, and only when you use
Postgres.

### Decisions worth knowing about

**Exchange rates are locked into each payment when it is recorded.** Editing a
rate later changes future payments only. Without this, a currency move would
silently rewrite commission you had already agreed and paid.

**Voiding is reversible, deleting is not offered.** Voiding a payment leaves it
on the record earning nothing, and correctly promotes the next live payment to
be the 60% "first payment". A client with payments against it cannot be
deleted at all — set the stage to Churned instead.

**Changing a commission rule recalculates history.** Rates are applied at read
time rather than frozen per payment, so correcting a mistyped rate fixes every
affected figure. The trade-off is that changing a rule mid-year restates past
statements, so change rules only when the agreement itself changes.

**Failed sign-ins are logged on a separate transaction**, so the record
survives the rollback that follows the rejected request. Activity log →
`login.failed`.

---

## Things this deliberately does not do

- **No email.** New agents get a one-time password shown on screen for you to
  pass on. Adding SMTP or a service like Resend is the natural next step.
- **No invoicing.** It records that a payment arrived; it does not raise the
  invoice.
- **No 2FA yet.** EduTrack 360 has TOTP; the same approach ports across if you
  want it here.
- **No payment-gateway integration.** Payouts are recorded, not executed.
- **No dated engagement trail per client.** `notes` is a single field that is
  overwritten on every edit, so "met the CFO on 12 Aug, demo booked for the
  20th" does not survive the next save. You can see *where* a client sits, but
  not *what the agent has been doing* to move it. This is the most useful thing
  to add next if you are judging agent effort rather than agent results.
- **Stage is not locked once a client is paying.** An agent can roll a client
  that has paid three months running back to Prospect. It cannot leak money —
  commission comes from recorded payments, not from stage — but it will
  misreport your pipeline.
- **Super rights cannot be granted through the interface.** The first admin
  holds them. To move them, update `users.is_super` in the database directly.

## Before you give agents access

Employment law differs across SADC, and in several member states a
commission-only agent can be reclassified as an employee — the degree of
control you exercise is one of the factors. A portal that sets quotas, records
performance reviews and schedules payouts is evidence of control. Worth a local
legal opinion on how your agent contracts are worded. I am not a lawyer and
this is not legal advice.
