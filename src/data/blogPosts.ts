export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  date: string;
  category: string;
  readTime: string;
}

export const blogCategories = [
  "All",
  "Life Skills",
  "Learning Supports",
  "Classroom & Programs",
  "Workforce Readiness",
  "Product Updates"
];

export const blogPosts: BlogPost[] = [
  {
    id: "1",
    slug: "how-to-break-down-skills-into-steps",
    title: "How to Break Down a Skill Into Steps (Without Overwhelming the Learner)",
    excerpt: "Task analysis is a powerful tool for teaching complex skills. Learn how to identify the right level of detail and create step-by-step guides that support independence.",
    content: `
## Why Breaking Down Skills Matters

When teaching a new skill, it's tempting to demonstrate the whole thing at once. But for many learners—especially those who benefit from structured support—seeing the entire process can be overwhelming.

**Task analysis** is the practice of breaking a skill into smaller, teachable steps. Done well, it creates a clear path from "I don't know how" to "I can do this myself."

## Finding the Right Level of Detail

The key is matching the steps to the learner's current abilities. Too few steps, and they might get stuck. Too many, and the list becomes confusing.

### Start with observation

Watch someone complete the task naturally. Note every action, then group similar actions into logical steps.

### Test and adjust

Try the steps with your learner. If they struggle at a particular point, that step might need to be broken down further.

## Example: Making a Sandwich

A basic breakdown might include:
1. Get ingredients from the fridge
2. Get bread from the cupboard
3. Open the bread bag
4. Take out two slices
5. Put ingredients on the bread
6. Close the sandwich
7. Put everything away

For some learners, step 5 alone might need its own breakdown: open the jar, pick up the knife, scoop the spread, etc.

## Tips for Success

- **Use visuals** when possible—photos or icons for each step
- **Be consistent** with language across all steps
- **Celebrate progress** at each step, not just completion
- **Fade prompts** gradually as the learner gains confidence

Task analysis isn't about making things complicated—it's about making success achievable, one step at a time.
    `,
    author: "Dr. Emily Harrison",
    date: "2026-01-18",
    category: "Life Skills",
    readTime: "6 min read"
  },
  {
    id: "2",
    slug: "building-routines-that-stick",
    title: "Building Routines That Stick: Gentle Structure for Consistent Progress",
    excerpt: "Routines provide predictability and reduce anxiety. Discover how to design flexible routines that support learners without feeling rigid or overwhelming.",
    content: `
## The Power of Predictable Routines

For many learners, knowing what comes next reduces anxiety and frees up mental energy for learning. Routines aren't about rigidity—they're about creating a foundation of predictability.

## What Makes a Routine Stick?

### 1. Start Small

Don't try to structure the entire day at once. Pick one transition or activity to focus on first.

### 2. Use Visual Schedules

A visual schedule—photos, icons, or written words—gives learners something to reference. It reduces the need for verbal reminders and builds independence.

### 3. Build in Flexibility

Life happens. Build "choice" moments into routines so learners practice flexibility within a safe structure.

### 4. Consistent Cues

Use the same words, sounds, or signals to mark transitions. Consistency helps the brain recognize patterns.

## Sample Morning Routine Structure

| Step | Visual Cue | Notes |
|------|-----------|-------|
| Wake up | Alarm + light | Same time daily |
| Get dressed | Picture sequence | Clothes laid out the night before |
| Breakfast | Timer + place setting | Same seat, same routine |
| Brush teeth | Mirror checklist | Step-by-step visual guide |

## When Routines Break

Don't panic. Acknowledge the change, talk through it if possible, and return to the routine as soon as you can. Flexibility is a skill too—and routines make it safer to practice.

Routines are guardrails, not prison bars. They create space for learning, growth, and eventually, independence.
    `,
    author: "Marcus Chen",
    date: "2026-01-14",
    category: "Learning Supports",
    readTime: "7 min read"
  },
  {
    id: "3",
    slug: "making-training-accessible",
    title: "Making Training Accessible: Captions, Plain Language, and Visual Supports",
    excerpt: "Accessibility isn't an add-on—it's foundational. Learn practical strategies for creating training content that works for everyone.",
    content: `
## Accessibility Is Design, Not Accommodation

When we design for accessibility from the start, we create better experiences for everyone—not just those who "need" accommodations.

## Key Accessibility Strategies

### Captions and Transcripts

Every video should have captions. Every audio file should have a transcript. This helps:
- Learners who are deaf or hard of hearing
- People in noisy environments
- Those who process written information better
- Anyone who wants to search or reference content later

### Plain Language

Plain language means choosing clarity over complexity:
- Use short sentences
- Avoid jargon unless you define it
- One idea per paragraph
- Active voice over passive

**Instead of:** "Utilize appropriate hand hygiene protocols prior to meal preparation."

**Write:** "Wash your hands before making food."

### Visual Supports

Pair text with visuals whenever possible:
- Step-by-step photos
- Simple diagrams
- Icons for navigation
- Color coding (with text labels, never color alone)

## Checklist: Is Your Content Accessible?

- [ ] All videos have accurate captions
- [ ] Audio content has transcripts
- [ ] Text is written in plain language (8th grade reading level or below)
- [ ] Visuals have alt text descriptions
- [ ] Color is not the only way information is conveyed
- [ ] Navigation is consistent and predictable
- [ ] Content works with keyboard-only navigation

Accessibility is an ongoing practice, not a one-time checkbox. Build it into your process from day one.
    `,
    author: "Sarah Williams",
    date: "2026-01-10",
    category: "Classroom & Programs",
    readTime: "8 min read"
  },
  {
    id: "4",
    slug: "tracking-progress-without-pressure",
    title: "Tracking Progress Without Pressure: What to Measure and Why",
    excerpt: "Data is valuable, but only when it supports the learner—not stresses them out. Learn what to track, how often, and how to use insights constructively.",
    content: `
## The Purpose of Progress Tracking

Progress tracking should answer: "Is this working? What should we adjust?" It shouldn't create anxiety for learners or busywork for educators.

## What to Measure

### Focus on Meaningful Outcomes

Instead of tracking every attempt, focus on:
- **Skill acquisition**: Can they do it independently?
- **Generalization**: Can they do it in different settings?
- **Maintenance**: Do they still remember after time passes?

### Process Indicators

Sometimes the journey matters as much as the destination:
- Engagement levels
- Number of prompts needed (are they decreasing?)
- Learner self-reporting (How do they feel about their progress?)

## How Often to Track

Daily data collection is exhausting and often unnecessary. Consider:
- **Weekly probes** for active goals
- **Monthly reviews** for overall progress
- **Quarterly summaries** for stakeholders

## Sharing Progress Constructively

When sharing data with learners or families:
- Lead with growth, not gaps
- Use visuals (charts, graphs) that are easy to understand
- Connect data to real-world meaning ("You can now do X independently!")
- Set collaborative goals for next steps

Progress tracking is a tool for support, not surveillance. Use it to celebrate growth and guide next steps—not to judge or pressure.
    `,
    author: "Dr. Emily Harrison",
    date: "2026-01-06",
    category: "Learning Supports",
    readTime: "6 min read"
  },
  {
    id: "5",
    slug: "generalizing-skills-beyond-the-lesson",
    title: "From Practice to Real Life: Generalizing Skills Beyond the Lesson",
    excerpt: "A skill isn't truly learned until it transfers to new situations. Explore strategies for helping learners use what they've practiced in everyday life.",
    content: `
## The Generalization Gap

Learning a skill in one setting doesn't automatically mean it transfers to others. A learner might fold laundry perfectly during a lesson but struggle at home with different clothes and a different space.

## Why Generalization Is Hard

- Different environments have different cues
- New people might give different instructions
- Materials and tools vary
- Stress or distraction affects performance

## Strategies for Building Generalization

### 1. Vary the Training Environment

Practice the same skill in multiple locations: classroom, home, community. Each environment teaches adaptability.

### 2. Use Multiple Instructors

When possible, have different people teach or prompt the skill. This reduces dependency on one person's style.

### 3. Vary Materials

If teaching handwashing, use different sinks, different soap types, and different towel arrangements.

### 4. Teach Self-Monitoring

Help learners recognize when and where to use a skill. Checklists, visual cues, and self-prompting strategies build independence.

### 5. Practice in Natural Contexts

Move from simulated practice to real situations as soon as safely possible. Real-world practice is the ultimate test.

## Measuring Generalization

Track skill performance across:
- Different settings
- Different people present
- Different materials
- Different times of day

True mastery means consistent performance regardless of these variables.
    `,
    author: "Marcus Chen",
    date: "2025-12-28",
    category: "Life Skills",
    readTime: "7 min read"
  },
  {
    id: "6",
    slug: "prompting-strategies-that-fade",
    title: "Supporting Independence: Prompting Strategies That Fade Over Time",
    excerpt: "Prompts help learners succeed, but the goal is always independence. Learn how to provide just enough support—and how to step back as skills grow.",
    content: `
## The Prompting Paradox

Prompts are essential for teaching new skills, but too much prompting creates dependency. The art is in knowing when and how to fade support.

## Types of Prompts (from most to least intrusive)

1. **Physical guidance** - Hand-over-hand assistance
2. **Modeling** - Demonstrating the action
3. **Gestural** - Pointing or motioning
4. **Verbal** - Spoken instructions or hints
5. **Visual** - Pictures, written cues, or checklists
6. **Natural cues** - Environmental signals (the doorbell means answer the door)

## Fading Strategies

### Most-to-Least Prompting

Start with full support, then systematically reduce. Good for learners who need initial success to build confidence.

### Least-to-Most Prompting

Start with minimal support, adding more only if needed. Encourages learners to try first.

### Time Delay

Wait a few seconds before prompting. Gradually increase the delay, giving learners more time to respond independently.

## Signs It's Time to Fade

- Learner anticipates the next step before you prompt
- Prompts are happening out of habit, not necessity
- Learner seems frustrated by too much help
- Skill is consistent across multiple attempts

## When Fading Feels Scary

It's natural to worry about learners failing without support. Remember:
- Mistakes are learning opportunities
- Independence is the ultimate goal
- You can always provide support again if needed

Fading prompts isn't abandoning learners—it's trusting their growing capabilities.
    `,
    author: "Sarah Williams",
    date: "2025-12-20",
    category: "Learning Supports",
    readTime: "8 min read"
  },
  {
    id: "7",
    slug: "creating-safe-motivating-learning-environment",
    title: "Creating a Safe, Motivating Learning Environment",
    excerpt: "Learning happens best when people feel safe to try, fail, and try again. Discover how to design spaces and interactions that encourage growth.",
    content: `
## Safety First—Then Learning

Before learners can focus on new skills, they need to feel physically and emotionally safe. This isn't about coddling—it's about creating the conditions where learning becomes possible.

## Elements of a Safe Learning Environment

### Physical Safety

- Clear pathways and organized spaces
- Predictable routines and schedules
- Sensory considerations (lighting, noise, temperature)
- Easy access to breaks when needed

### Emotional Safety

- Mistakes are treated as learning opportunities
- Effort is valued alongside results
- Learners have voice and choice when possible
- Relationships are built on trust and respect

## Building Motivation

### Intrinsic vs. Extrinsic Motivation

External rewards (stickers, prizes) can help initially, but lasting motivation comes from:
- Experiencing success
- Feeling competent
- Having autonomy
- Finding meaning in the activity

### Strategies That Work

1. **Celebrate effort**, not just outcomes
2. **Connect skills to real-world meaning** - "This helps you do X"
3. **Offer choices** within structure
4. **Use interests** to make learning relevant
5. **Set achievable goals** that build confidence

## When Motivation Dips

- Check for underlying issues (fatigue, anxiety, health)
- Reassess difficulty level—too hard or too easy?
- Revisit the "why" behind the skill
- Take a break and return fresh

A safe, motivating environment doesn't happen by accident. It requires intention, observation, and willingness to adjust.
    `,
    author: "Dr. James Mitchell",
    date: "2025-12-15",
    category: "Classroom & Programs",
    readTime: "7 min read"
  },
  {
    id: "8",
    slug: "whats-new-january-2026",
    title: "What's New in Special People Training (January 2026)",
    excerpt: "This month we've launched improved progress dashboards, new lesson templates, and enhanced accessibility features. Here's everything you need to know.",
    content: `
## January 2026 Updates

We've been busy improving Special People Training based on your feedback. Here's what's new this month.

## 🎯 Improved Progress Dashboards

The learner progress dashboard now includes:
- **Visual skill maps** showing mastery levels at a glance
- **Trend indicators** highlighting growth over time
- **Goal progress bars** for active objectives
- **Export options** for PDF summaries

## 📝 New Lesson Templates

We've added three new lesson template categories:
- **Daily living skills** (cooking, hygiene, household tasks)
- **Social skills** (conversation, emotional regulation, boundaries)
- **Community skills** (shopping, transportation, safety)

Each template includes step-by-step instructions, visual supports, and assessment criteria.

## ♿ Accessibility Enhancements

Based on feedback from educators and learners:
- **Improved screen reader support** across all pages
- **High contrast mode** option in user settings
- **Larger click targets** for mobile users
- **Simplified navigation** in the learner view

## 🔧 Bug Fixes

- Fixed an issue where progress data occasionally duplicated
- Resolved loading delays on the certificates page
- Corrected date display in some time zones

## Coming Next Month

We're working on:
- Group reporting features for teams
- New integration options
- Enhanced notification preferences

As always, we'd love your feedback. Reach out through the Help Center or your account manager.

Thank you for being part of the Special People Training community!
    `,
    author: "SPA Product Team",
    date: "2026-01-20",
    category: "Product Updates",
    readTime: "4 min read"
  }
];

export function getBlogPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find(post => post.slug === slug);
}

export function getBlogPostsByCategory(category: string): BlogPost[] {
  if (category === "All") return blogPosts;
  return blogPosts.filter(post => post.category === category);
}
