import { LessonBlocks } from '@/components/course-learn/blocks/LessonBlocks';
import { CourseHome } from '@/components/course-learn/CourseHome';
import type { LessonBlock } from '@/components/course-learn/blocks/types';
import type { LearnLesson, LearnModule } from '@/components/course-learn/types';

const LONG = 'Enteral feeding requires careful checks before every feed. Confirm the care plan is current, check the tube position record, and make sure the person is positioned upright at 30 to 45 degrees before you begin any feed or flush.';

const b = (id: string, block_type: LessonBlock['block_type'], payload: unknown, gate = false): LessonBlock =>
  ({ id, lesson_id: 'l1', block_type, order_index: 0, contributes_to_completion: gate, payload } as unknown as LessonBlock);

const blocks: LessonBlock[] = [
  b('1', 'text', { heading: 'Before the feed', text: `${LONG}\n- Check the care plan\n- Check tube position\n- Wash hands` }),
  b('2', 'callout', { variant: 'safety', title: 'Stop and escalate', text: LONG }),
  b('3', 'card_deck', { heading: 'Key terms', cards: [{ id: 'a', front: 'PEG', back: 'Gastrostomy tube' }, { id: 'b', front: 'Flush', back: 'Water flush' }] }, true),
  b('4', 'accordion', { heading: 'Detail', items: [{ id: 'x', title: 'Positioning', body: LONG }, { id: 'y', title: 'Hygiene', body: LONG }] }, true),
  b('5', 'text', { heading: 'Half A', text: LONG, layout: 'half' }),
  b('6', 'text', { heading: 'Half B', text: LONG, layout: 'half' }),
  b('7', 'text', { heading: 'More', text: LONG }),
  b('8', 'text', { heading: 'Even more', text: LONG }),
];

const modules: LearnModule[] = [1, 2, 3, 4].map((i) => ({ id: `m${i}`, title: `Module ${i}: Safe practice`, order_index: i }));
const lessons: LearnLesson[] = modules.flatMap((m, mi) =>
  [1, 2].map((j) => ({
    id: `${m.id}-${j}`, title: `Lesson ${j}`, description: null, video_url: null, duration_minutes: 5,
    order_index: j, lesson_type: 'blocks', module_id: m.id, scorm_package_id: null,
    is_required: true, completed: mi === 0 || (mi === 1 && j === 1),
  }))
);

export default function P7Probe() {
  return (
    <div className="flex h-screen flex-col">
      <header className="border-b bg-card px-4 py-2 text-sm font-semibold">Probe header</header>
      <main className="min-w-0 flex-1 overflow-y-auto">
        <CourseHome
          courseTitle="Enteral feeding"
          courseSubtitle="Probe"
          modules={modules}
          lessons={lessons}
          onSelectLesson={() => {}}
          onBackToCourse={() => {}}
        />
        <div className="mx-auto max-w-5xl px-5 py-6 sm:px-6 lg:px-8">
          <h2 className="mb-4 text-[1.5rem] font-bold md:text-3xl">Probe lesson</h2>
          <LessonBlocks blocks={blocks} />
        </div>
      </main>
    </div>
  );
}
