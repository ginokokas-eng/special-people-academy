# Academy video templates

House video furniture for Special People Academy courses, per the Academy Video
Standard: cold-open title cards, objective slates, and the fixed accountability
outro, rendered from course data so every course looks identical.

- `npm install` once (Node 18+).
- `npm run studio` — preview and tweak in the browser.
- `npm run still:all` — PNG previews of each slate.
- `npx remotion render ObjectiveSlate out/L02-objective.mp4 --props='{"courseTitle":"…","lessonLabel":"Lesson 2","outcomes":["…"]}'` — production render for one lesson.

Brand tokens live in `src/brand.ts` and mirror the app palette (src/index.css);
change palette there only. The mark is `public/logo.svg`, copied from the app.

Licensing: Remotion is free for companies of up to 3 people; above that,
production use needs their paid company licence — see remotion.pro.
