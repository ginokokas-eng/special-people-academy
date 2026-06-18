# Special People Training Academy

A learning platform for Special People Training: course catalogue, learner dashboard,
admin and trainer portals, SCORM lessons, quizzes, practical sign-offs, certificates,
Stripe checkout, and Outlook calendar sync.

## Project info

- **Lovable project**: https://lovable.dev/projects/edd3e58d-bed9-45da-a486-cb4829ce6793
- **GitHub repository**: https://github.com/ginokokas-eng/special-people-academy.git

## Technologies

This project is built with:

- Vite
- TypeScript
- React
- shadcn/ui
- Tailwind CSS
- Supabase (database, auth, storage, edge functions)
- Stripe (checkout & billing)
- SCORM (HeyGen course lessons)

## How can I edit this code?

**Use Lovable**

Visit the [Lovable Project](https://lovable.dev/projects/edd3e58d-bed9-45da-a486-cb4829ce6793)
and start prompting. Changes made via Lovable are committed automatically to this repo.

**Use your preferred IDE**

Clone the repo, make changes locally, and push. Pushed changes sync back to Lovable.
You need Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
# 1. Clone the repository
git clone https://github.com/ginokokas-eng/special-people-academy.git

# 2. Navigate to the project directory
cd special-people-academy

# 3. Install dependencies
npm ci

# 4. Start the dev server
npm run dev
```

## Local verification

Before pushing changes, confirm the project installs, lints, and builds cleanly:

```sh
npm ci          # clean, lockfile-faithful install
npm run lint    # eslint
npm run build   # production build
```

All three should complete without errors.

## How can I deploy this project?

Open [Lovable](https://lovable.dev/projects/edd3e58d-bed9-45da-a486-cb4829ce6793)
and click Share -> Publish.

## Can I connect a custom domain?

Yes. Navigate to Project > Settings > Domains and click Connect Domain.
Read more: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
