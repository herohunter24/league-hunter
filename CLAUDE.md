# League Hunter — Project Rules

## CRITICAL — Do not break these
- This is a multi-tenant sports league SaaS using React + Firebase/Firestore + Vercel
- Admin dashboard (Website X) writes to Firestore sub-collections
- Public league pages MUST use direct `onSnapshot` listeners on each sub-collection
- DO NOT use `_updatedAt` timestamp shortcuts, `reloadInProgress` locks, or localStorage fallbacks for data loading
- Game status (upcoming/past) must always be RECOMPUTED from actual date+time on every render — never trust a stored `played` flag

## Working style
- Make small, focused changes — not mega-refactors
- Touch only the files needed for the current task
- Ask before changing data flow, Firestore schema, or shared infrastructure
- Preserve existing styling: dark theme with `card`, `inp`, `btn`, `T1`, `T2`, `ACC` constants

## Collaboration
- Two non-technical owners work on this repo via Claude Code
- Always pull from main before starting, push after finishing
- Never modify another person's recent commits without checking first

## Tech stack
- React, Firebase/Firestore, Vercel deployment
- Sport-specific stats in `SPORT_STATS` mapping
- Player cards use video-game-style ranking (Bronze → Legend)

---

# NLS public site — rules
- Project: public website for NLS, a basketball league in Quebec. Public page: nls-public.html. Admin panel: index.html. Data from Firebase.
- Never touch the admin panel, the database structure, or Firebase settings unless the task explicitly says so.
- Do only the task asked. No extra redesigns, refactors or "improvements".
- Use search/grep to find the relevant code. Don't read entire large files when not needed.
- Before editing, make a git commit (or backup copy) so every step can be undone.
- French is the main language, use "tu". English is the secondary language via the FR/EN toggle.
- Photos and video are handled later. Don't add stock images or generated images.
- At the end of every task: list what you changed in short bullet points, say what you couldn't do and why, then tell me it's done and ask me to test it myself on desktop and phone. Don't run the final test for me.
