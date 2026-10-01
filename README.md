# Habit Tracker

A German-language habit tracker built with Expo, React Native, Expo Router, and Supabase. It includes daily habit check-ins, habit ordering, a challenge list, and a seven-day review.

## Requirements

- Node.js compatible with Expo SDK 54 (Node.js 20.19.x or newer)
- A Supabase project
- Expo Go or an iOS/Android development environment

## Supabase setup

The app currently connects to the Supabase project configured in `lib/supabase.ts`. To use a different project, replace the URL and anon key in that file with the values from **Supabase Dashboard → Project Settings → API**. The anon/publishable key is intended for client apps; never put a `service_role` or secret key in the app.

For a fresh Supabase project:

1. Open **SQL Editor** in the Supabase Dashboard.
2. Run the contents of `supabase/schema.sql`. This creates the `habits`, `logs`, `challenges`, and `challenge_progress` tables, indexes, grants, and row-level security policies.
3. Run the contents of `supabase/challenges.sql` to insert the starter challenge list. It is safe to run again; challenge titles already present are skipped.
4. In **Table Editor**, confirm those four tables exist. The app creates habits and log rows as you use it.

`schema.sql` is a bootstrap for a fresh project. If tables already exist, back up the project and compare their columns and policies before running it; `create table if not exists` does not alter an existing table's structure.

### Important security limitation

The app does not currently sign users in. The policies in `schema.sql` therefore allow unauthenticated app clients to read and change the shared habits, logs, and challenge progress. This is suitable only for a private prototype with non-sensitive data: anyone who obtains the public app can access that shared data. Before a public release or personal-data use, add authentication, add an owner/user ID to user-owned rows, scope all app queries to that user, and replace the prototype policies with per-user policies. Challenge definitions can remain publicly readable if desired.

## Run the app

Install packages and start Expo:

```bash
npm install
npm run start
```

Use the Expo CLI prompt to open the app in Expo Go, a simulator, or a development build. Run `npm run lint` to check the project with ESLint.

## Main screens

- **Heute:** View active habits and record today's completion.
- **Habits:** Add, reorder, and deactivate habits.
- **Challenges:** Draw and track challenges from the seeded list.
- **Review:** Review completion rates for the previous seven days.
