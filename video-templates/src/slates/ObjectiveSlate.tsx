import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { brand } from '../brand';

export interface ObjectiveSlateProps {
  courseTitle: string;
  lessonLabel: string;
  outcomes: string[];
}

/** House objective slate — R2 of the Academy Video Standard: one objective, phrased as behaviour. */
export const ObjectiveSlate: React.FC<ObjectiveSlateProps> = ({ courseTitle, lessonLabel, outcomes }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = (delay: number) => {
    const s = spring({ frame: frame - delay, fps, config: { damping: 200 } });
    return { opacity: s, transform: `translateY(${interpolate(s, [0, 1], [14, 0])}px)` };
  };
  return (
    <AbsoluteFill style={{ background: brand.paper, fontFamily: brand.font, padding: 120, justifyContent: 'center' }}>
      <div style={{ position: 'absolute', top: 64, left: 120, display: 'flex', alignItems: 'center', gap: 24 }}>
        <Img src={staticFile('logo.svg')} style={{ width: 84, height: 84 }} />
        <div style={{ fontFamily: brand.mono, fontSize: 26, letterSpacing: 4, color: brand.inkSoft, textTransform: 'uppercase' }}>
          {courseTitle} · {lessonLabel}
        </div>
      </div>
      <div style={{ ...enter(0), fontSize: 64, fontWeight: 800, color: brand.ink, maxWidth: 1300, lineHeight: 1.1 }}>
        By the end of this lesson you will be able to…
      </div>
      <div style={{ marginTop: 56, display: 'flex', flexDirection: 'column', gap: 28 }}>
        {outcomes.map((o, i) => (
          <div key={i} style={{ ...enter(10 + i * 7), display: 'flex', gap: 24, alignItems: 'flex-start' }}>
            <div style={{ width: 44, height: 44, borderRadius: 22, background: brand.violet, color: brand.white, fontSize: 26, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</div>
            <div style={{ fontSize: 40, color: brand.ink, lineHeight: 1.35, maxWidth: 1350 }}>{o}</div>
          </div>
        ))}
      </div>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 14, background: `linear-gradient(90deg, ${brand.violet}, ${brand.green})` }} />
    </AbsoluteFill>
  );
};
