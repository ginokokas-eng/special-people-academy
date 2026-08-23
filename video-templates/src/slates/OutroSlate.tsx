import { AbsoluteFill, Img, spring, staticFile, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { brand } from '../brand';

export interface OutroSlateProps {
  reviewedBy: string;
  reviewDate: string;
}

/** Fixed outro (R6): accountability + the escalation line, identical on every video. */
export const OutroSlate: React.FC<OutroSlateProps> = ({ reviewedBy, reviewDate }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = (delay: number) => {
    const s = spring({ frame: frame - delay, fps, config: { damping: 200 } });
    return { opacity: s, transform: `translateY(${interpolate(s, [0, 1], [12, 0])}px)` };
  };
  return (
    <AbsoluteFill style={{ background: brand.ink, fontFamily: brand.font, justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: 140 }}>
      <Img src={staticFile('logo.svg')} style={{ width: 130, height: 130, marginBottom: 48, ...enter(0) }} />
      <div style={{ fontSize: 52, fontWeight: 700, color: brand.white, maxWidth: 1350, lineHeight: 1.3, ...enter(6) }}>
        Always follow the person&rsquo;s care plan and local policy.
      </div>
      <div style={{ fontSize: 40, color: 'hsl(270, 10%, 75%)', marginTop: 20, ...enter(12) }}>
        If anything is unclear or unsafe, escalate.
      </div>
      <div style={{ fontFamily: brand.mono, fontSize: 26, color: 'hsl(268, 55%, 75%)', marginTop: 72, letterSpacing: 2, ...enter(18) }}>
        Reviewed by {reviewedBy} · Review due {reviewDate}
      </div>
    </AbsoluteFill>
  );
};
