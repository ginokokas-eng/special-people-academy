import { LessonBlocks } from '@/components/course-learn/blocks/LessonBlocks';
import type { LessonBlock } from '@/components/course-learn/blocks/types';

const LONG =
  'Enteral feeding requires careful checks before every feed. Confirm the care plan is current, check the tube position record, and make sure the person is positioned upright at 30 to 45 degrees before you begin any feed or flush.';

const blocks: LessonBlock[] = [
  { id: '1', lesson_id: 'l', block_type: 'text', position: 0, contributes_to_completion: false, payload: { heading: 'Before the feed', text: LONG + '\n- Check the care plan\n- Check tube position\n- Wash hands' } },
  { id: '2', lesson_id: 'l', block_type: 'callout', position: 1, contributes_to_completion: false, payload: { variant: 'safety', title: 'Stop and escalate', text: LONG } },
  { id: '3', lesson_id: 'l', block_type: 'card_deck', position: 2, contributes_to_completion: true, payload: { heading: 'Key terms', cards: [{ id: 'a', front: 'PEG', back: LONG }, { id: 'b', front: 'Flush', back: LONG }] } },
  { id: '4', lesson_id: 'l', block_type: 'accordion', position: 3, contributes_to_completion: false, payload: { heading: 'Detail', items: [{ id: 'x', title: 'Positioning', body: LONG }, { id: 'y', title: 'Hygiene', body: LONG }] } },
  { id: '5', lesson_id: 'l', block_type: 'mcq', position: 4, contributes_to_completion: false, payload: { question: 'What comes first?', options: [{ id: 'o1', label: 'Check the care plan', correct: true }, { id: 'o2', label: 'Start the feed' }] } },
  { id: '6', lesson_id: 'l', block_type: 'text', position: 5, contributes_to_completion: false, payload: { layout: 'half', heading: 'Half A', text: LONG } },
  { id: '7', lesson_id: 'l', block_type: 'text', position: 6, contributes_to_completion: false, payload: { layout: 'half', heading: 'Half B', text: LONG } },
] as unknown as LessonBlock[];

export default function P7Probe() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-5 py-6 sm:px-6 lg:px-8">
        <h2 className="mb-4 text-[1.5rem] font-bold leading-tight text-foreground md:text-3xl">Probe lesson</h2>
        <LessonBlocks blocks={blocks} />
      </div>
    </div>
  );
}
