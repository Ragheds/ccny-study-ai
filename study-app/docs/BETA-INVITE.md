# Closed beta invitation (owner sends this)

Hi! I’m building CCNY Study AI, an independent study app for CCNY commuters. I’m inviting 20–50 students to try free beta Pro for 90 days. It can make private study packs from class text and PDFs, then save notes, flashcards and quizzes for the train. AI can be wrong—check answers with your professor.

If you’d like to help, sign up at [YOUR TESTED BETA URL], choose your courses, and redeem [YOUR PRIVATE INVITE CODE] on Plans. Download a pack before your commute and tell me what worked or broke using the feedback button. Activity counts are optional and off by default. Read Privacy and Terms before uploading material. No real billing is enabled.

Could I interview you for 10 minutes after your first week? Your feedback will guide the app. Thanks!

## Owner checklist

- Finalize privacy/terms contact, retention and eligibility; review provider data handling. Drafts are not a claim of legal compliance. FTC background: https://www.ftc.gov/business-guidance/resources/protecting-personal-information-guide-business.
- Run the development migrations and phone tests first. Do not distribute an untested production release.
- Set ADMIN_USER_IDS server-side to your own UUID; /beta must return 404 for another account.
- Generate one high-entropy invite with 20–50 uses using MIGRATIONS-TO-RUN.md. Send individually; never commit or publicly post it.
- Interview 10 commuters. Record opt-in weekly active users, sessions, downloaded-pack hours and returning users from /beta. These counts exclude students who decline analytics and are not exact download totals.
- No invites were sent by Codex. No real weekly-use numbers exist yet.
