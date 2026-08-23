import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { brand } from '../brand';

export interface ColdOpenTitleProps {
  lessonTitle: string;
  courseTitle: string;
}

/** Title card shown AFTER the cold-open line has been spoken — never before it (R1). */
export const ColdOpenTitle: React.FC<ColdOpenTitleProps> = ({ lessonTitle, courseTitle }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 200 } });
  const bar = interpolate(spring({ frame: frame - 6, fps, config: { damping: 200 } }), [0, 1], [0, 220]);
  return (
    <AbsoluteFill style={{ background: brand.ink, fontFamily: brand.font, justifyContent: 'center', padding: 140 }}>
      <Img src={staticFile('logo.svg')} style={{ position: 'absolute', top: 64, left: 140, width: 92, height: 92 }} />
      <div style={{ fontFamily: brand.mono, fontSize: 28, letterSpacing: 5, color: 'hsl(268, 55%, 75%)', textTransform: 'uppercase', opacity: s }}>{courseTitle}</div>
      <div style={{ width: bar, height: 10, background: brand.green, margin: '36px 0' }} />
      <div style={{ fontSize: 92, fontWeight: 800, color: brand.white, lineHeight: 1.05, maxWidth: 1500, opacity: s, transform: `translateY(${interpolate(s, [0, 1], [22, 0])}px)` }}>
        {lessonTitle}
      </div>
    </AbsoluteFill>
  );
};
