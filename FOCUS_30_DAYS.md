# Make Big — 30-day focus plan

One goal: **5 real college teams finish Week 1 on Make Big** (not 5 signups — 5 teams that actually work).

Everything else is secondary until this number moves.

---

## North-star metric

| Metric | Target (Day 30) | How to measure |
|--------|-------------------|----------------|
| **Active teams** | **5** | Project with ≥2 members OR owner + 1 join approved |
| **Week-1 completion** | **4 of 5 teams** | Each team hit all 4 steps below |
| **Week-3 retention** | **3 of 5 teams** | Same team still has activity in week 3 |

### Week-1 completion (per team)

A team “finished Week 1” when they did **all four**:

1. **Project live** — created or joined, status published  
2. **3+ tasks** on the board (any status)  
3. **1 team post** — update in Posts tab  
4. **1 standup** — submitted in team chat (Messages tab)

Track manually in a sheet, or ask each team lead on WhatsApp every Sunday.

---

## Weekly targets

### Week 1 (Days 1–7) — Deploy + first 2 teams

| Day | You do | Success signal |
|-----|--------|----------------|
| 1 | Push code, redeploy Vercel + Render | Homepage shows “Find your co-founder first” |
| 2 | Recruit **Team A** (3–4 friends from one college) | They sign up + create 1 project |
| 3 | Sit with Team A for 30 min — add 3 tasks together | Tasks visible on board |
| 4 | Recruit **Team B** (different college if possible) | 2nd project created |
| 5 | Both teams post 1 update | 2 posts on platform |
| 6 | Remind both teams: standup in chat | 2 standups submitted |
| 7 | Count: teams, tasks, posts, standups | Write numbers in tracker below |

**Week 1 minimum:** 2 teams, each with 3 tasks + 1 post.

### Week 2 (Days 8–14) — Teams 3–4 + fix friction

| Focus | Action |
|-------|--------|
| Onboarding | Watch where teams get stuck (signup? wizard? tasks?) |
| Fix one bug | Only the #1 blocker they report |
| Outreach | 2 WhatsApp groups (college project / startup club) |
| Target | **4 active teams** total |

### Week 3 (Days 15–21) — The “projects die” week

This is your product thesis. **Personally check in** with every team:

- “Did you open Make Big this week?”
- If no → ask why (too complex? forgot? using WhatsApp instead?)

**Target:** 3+ teams still active (task, post, or message in last 7 days).

### Week 4 (Days 22–30) — Team 5 + proof

| Focus | Action |
|-------|--------|
| 5th team | One project from Explore join flow (not your friends) |
| Proof | 2 screenshots + 1 short screen recording (real dashboard) |
| Story | “X teams, Y tasks, Z standups in 30 days” for LinkedIn / pitch |

---

## Manual tracker (copy to Google Sheet)

| Team name | College | Members | Project created | ≥3 tasks | 1 post | 1 standup | Week 3 active? |
|-----------|---------|---------|-----------------|----------|--------|-----------|----------------|
| | | | ☐ | ☐ | ☐ | ☐ | ☐ |
| | | | ☐ | ☐ | ☐ | ☐ | ☐ |
| | | | ☐ | ☐ | ☐ | ☐ | ☐ |
| | | | ☐ | ☐ | ☐ | ☐ | ☐ |
| | | | ☐ | ☐ | ☐ | ☐ | ☐ |

---

## Product: what to **lead with** (hero loop)

Tell every user this exact path:

```
Sign up → Complete profile (skills + college)
       → Create OR join a project
       → Add 3 tasks
       → Post one update
       → Do one standup in team chat
```

**In-app:** Home tab shows “Week 1 checklist” for new users (first 7 days).

---

## Product: what to **de-emphasize** for 30 days

Do not lead demos with these until you have 5 active teams:

| Feature | Why wait |
|---------|----------|
| Learn / courses | Distraction from “ship with team” |
| Ecosystem roadmap | Internal, not user value yet |
| Idea validator (standalone) | OK as hook, but loop is project + tasks |
| Agent / link reader / pitch AI | Power features **after** they have a project |
| Push notifications | Nice later; email/WhatsApp you for now |
| Stripe / Pro | No monetization until retention proven |

You built these for the long term. **For the next 30 days, sell one loop only.**

---

## Outreach script (WhatsApp / college groups)

> We built Make Big for student teams who die in week 3.  
> Find teammates, add tasks, post updates, do standups — one place instead of 5 WhatsApp groups.  
> Looking for **2 teams** to try it this week (free).  
> Link: https://makebig.vercel.app  
> I’ll help you set up in 15 minutes on call.

---

## Success = you moved tiers

| If you hit… | You prove… |
|-------------|------------|
| 5 teams, Week-1 done | Product works for real students |
| 3 teams active in week 3 | Your “momentum” thesis is real |
| 1 stranger joins via Explore | Marketplace can work |
| 0 teams finish Week 1 | Problem is onboarding/focus, not “more features” |

---

## Daily habit (10 minutes)

1. Open MongoDB or admin view — count projects updated in last 24h  
2. Message any team with no activity: “Need help with tasks?”  
3. Do **not** add new features until 3 teams complete Week 1  

---

## After Day 30

If **≥4 teams** completed Week 1 → double down on co-founder matching + health alerts.

If **<2 teams** → run 5 user interviews (15 min each), simplify wizard to 2 steps, remove one dashboard tab.

---

## Quick reference

```bash
# Deploy (do once at start)
git push origin main
# → Redeploy Vercel + Render

# Verify
API_URL=https://makebig.onrender.com npm run verify:deploy
```

**Your rank as a startup is not code anymore — it’s the numbers in the tracker above.**
