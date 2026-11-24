# OneHive Hiring Hive

A hiring system with one gamified challenge per role and an admin area that scores and ranks candidates. Built with Next.js, it runs on Vercel and uses a Google Sheet as its database.

- `/c/<role-link>` is the public challenge for one role. Post this link on LinkedIn. Each email can complete each role once.
- `/` lists the roles that are currently open.
- `/admin` is the admin area, protected by one password. Pick a role at the top, then use the tabs:
  - **Candidates:** ranking, the top three, scores, integrity flags, hiring stage, notes, Claude scoring, a copy-ready interview invite with your booking link, CSV export, and a compare report that prints to PDF.
  - **Questions:** add, edit, reorder, duplicate, switch on and off, and preview questions. **Add from library** adds ready-made questions in one click, including five content-creation cells (Fix the post, Plan the week, Read the numbers, Write the caption, and Make it in 15 minutes, where candidates paste a Canva link that you score yourself).
  - **Role settings:** name, link, Draft/Open/Closed status, closing date, booking link and invite message, welcome text, culture areas and weights, fit bands.
  - **All roles:** every role with its numbers. Create a new role by drafting it with Claude from a job description, copying an existing role, or starting blank. New roles start as drafts, so nobody can take them until you set them to Open.
- `/admin/report` is the printable comparison of the candidates you tick (or the top three).

Answer keys stay on the server. Candidates never receive the correct answers, the points or the rubrics.

## Storage (pick one)

The app needs somewhere to save answers. The admin side shows everything, so you never need to open the storage itself.

**Option A: Neon database (recommended, about 2 minutes)**
1. In Vercel, open the project, then go to **Storage**, choose **Create Database**, then **Neon**, and pick the free plan.
2. Connect it to this project. Vercel adds `DATABASE_URL` for you.
3. Go to **Deployments**, then the three dots on the latest deployment, then **Redeploy**.

The app creates its own table the first time it runs.

**Option B: Google Sheet**
Set `SHEET_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL` and `GOOGLE_PRIVATE_KEY`, and share the Sheet with the service account email as Editor. To get these, create a Google Cloud service account with the Sheets API enabled and download its JSON key. The app adds Answers, Questions, Reviews and Roles tabs.

If both are set, the Neon database is used.

## Deploy on Vercel

1. Push this folder to a GitHub repository.
2. In Vercel, choose Add New, then Project, then import the repository. The framework preset is Next.js.
3. Add these environment variables (Settings, then Environment Variables):

| Name | Value |
| --- | --- |
| `ADMIN_PASSWORD` | The password for `/admin` |
| `SESSION_SECRET` | Any long random string |
| `ANTHROPIC_API_KEY` | A key from console.anthropic.com, for scoring written answers |
| `ANTHROPIC_MODEL` | Optional. Defaults to `claude-sonnet-5-5` |

4. Deploy. Open `/admin`, sign in, and check the status line says **Storage: Neon database** (or Google Sheet).
5. Do a test run on `/` yourself, then press Refresh in the admin.

Claude drafting a new challenge can take up to a minute. That fits Vercel's limits on current plans. If you ever see a timeout, raise the function duration in Vercel (Settings, then Functions).

To use your own domain, such as `hive.onehive.ai`, go to the project in Vercel, then Settings, then Domains.

## Run it on your own computer

```
npm install
npm run dev
```

Open http://localhost:3000. With no storage variables set, answers save to `.data/db.json` on your computer. This only works locally. On Vercel the admin side tells you to connect storage. The default admin password locally is `onehive-local`.

## How scoring works

Every question scores 0 to 100%:

| Type | How it scores |
| --- | --- |
| Rank in order | 60% for how close their order is to the ideal, 40% for picking the right first task |
| Tap to flag | Correct flags minus wrong flags, divided by the number that should be flagged |
| Two-way sort, Matrix, Pattern puzzles | The share they got right |
| Multiple choice | Points earned out of the best possible. An optional slider can take a share of the score |
| Written answer | Claude's 1 to 5 score against your rubric, or your own score, which overrides Claude's |
| Make it (paste a link) | Your own 1 to 5 score in the candidate view. Leaving the page is not recorded for this cell, so they can work in Canva |

Questions roll up into culture areas, using each question's weight within its area. The areas then average into the overall fit score, using the area weights in Settings. Bands: Strong fit, Promising, Mixed and Not a fit (thresholds are set in Settings).

The integrity flags are times the candidate left the page, paste and copy attempts, written text that was not typed, very fast answers, cells that timed out, unfinished runs, and Claude's judgement of whether the written answer was AI-written. Flags never change the score.

If you edit a question's answer key, existing candidates are re-scored against the new key the next time you load the admin.
