import type { ReactNode } from 'react';

/**
 * Artwork for the two "there is no menu, and that is fine" states.
 *
 * Resolved by glob rather than by static import so the slot degrades instead of
 * breaking: if the folder is empty the build still succeeds and each state falls
 * back to the emoji it used before. The pattern is deliberately format-agnostic
 * so a raster export (from an AI image tool or any other source) can replace the
 * checked-in SVG by being dropped in under the same basename, with no code
 * change. Vite fingerprints whatever it finds.
 *
 * One basename should map to one file. Paths are sorted so that a repo that
 * accidentally holds both `summer.svg` and `summer.webp` still renders the same
 * asset on every build instead of picking one by filesystem order.
 */
const HERO_ART = import.meta.glob('../assets/hero/*.{svg,webp,png,avif}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

export type HeroVariant = 'summer' | 'break';

function basename(path: string): string {
  return path.split('/').pop()?.replace(/\.[^.]+$/, '') ?? '';
}

export function findHeroArt(variant: HeroVariant): string | null {
  const match = Object.keys(HERO_ART)
    .filter((path) => basename(path) === variant)
    .sort()[0];

  return match ? HERO_ART[match] : null;
}

interface Props {
  variant: HeroVariant;
  /** Rendered when no artwork is present for this variant. */
  fallbackEmoji: string;
  title: string;
  children: ReactNode;
}

export function NoSchoolHero({ variant, fallbackEmoji, title, children }: Props) {
  const art = findHeroArt(variant);

  return (
    <div className="no-school-week">
      {art ? (
        // Decorative: the heading directly below states the same thing, so alt
        // text here would make a screen reader say it twice.  width/height carry
        // the intrinsic square ratio to reserve layout space; CSS sets the real
        // displayed size.
        <img
          className="no-school-art"
          src={art}
          alt=""
          width={192}
          height={192}
          decoding="async"
        />
      ) : (
        <span className="no-school-emoji">{fallbackEmoji}</span>
      )}
      <h2 className="no-school-title">{title}</h2>
      <p className="sub">{children}</p>
    </div>
  );
}
