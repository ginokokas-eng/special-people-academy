import { Composition } from 'remotion';
import { ObjectiveSlate } from './slates/ObjectiveSlate';
import { ColdOpenTitle } from './slates/ColdOpenTitle';
import { OutroSlate } from './slates/OutroSlate';

/**
 * House furniture per the Academy Video Standard. 1920x1080 @ 25fps (UK).
 * Sample props = the real Enteral Feeding course; renders take per-lesson
 * JSON via --props for production use.
 */
export const Root: React.FC = () => (
  <>
    <Composition
      id="ColdOpenTitle" component={ColdOpenTitle} durationInFrames={100} fps={25} width={1920} height={1080}
      defaultProps={{ lessonTitle: 'The foundation: what enteral feeding is and why it is used', courseTitle: 'Enteral Feeding Tubes' }}
    />
    <Composition
      id="ObjectiveSlate" component={ObjectiveSlate} durationInFrames={200} fps={25} width={1920} height={1080}
      defaultProps={{
        courseTitle: 'Enteral Feeding Tubes', lessonLabel: 'Lesson 2',
        outcomes: [
          'Explain when and why a person is fed by tube instead of by mouth',
          'Name the three routes you will meet in the community and what makes each different',
          'Check the care plan before every feed — and stop if anything does not match it',
        ],
      }}
    />
    <Composition
      id="OutroSlate" component={OutroSlate} durationInFrames={150} fps={25} width={1920} height={1080}
      defaultProps={{ reviewedBy: 'Clinical Lead', reviewDate: 'February 2027' }}
    />
  </>
);
