import type { SVGProps } from 'react';
import { cn } from '@/lib/utils';
import * as Icons from '@/components/icons';

/**
 * House "Aperture" glyph, addressed by its sprite id ("home", "safeguarding", …).
 *
 * The handoff ships these 36 glyphs as an SVG sprite fetched at runtime. Here
 * they resolve from `@/components/icons` instead — the same drawings, already
 * in the bundle, so a glyph paints on first frame rather than after a network
 * round trip. Colour still comes from currentColor.
 */

const toPascal = (name: string) =>
  name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');

type IconComponent = (props: SVGProps<SVGSVGElement>) => JSX.Element;

export interface ApertureIconProps extends SVGProps<SVGSVGElement> {
  /** Sprite id without the ap- prefix: "home", "safeguarding", "goals", … */
  name: string;
  size?: number;
}

export const ApertureIcon = ({ name, size = 20, className, ...rest }: ApertureIconProps) => {
  const registry = Icons as unknown as Record<string, IconComponent | undefined>;
  const Glyph = registry[`Aperture${toPascal(name)}`] ?? registry.ApertureMore;
  if (!Glyph) return null;
  return (
    <Glyph
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      className={cn('shrink-0', className)}
      {...rest}
    />
  );
};
