import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * The button family. Shape is ported from the reference —
 * `px-5 py-2.5 text-sm font-semibold rounded-[6px]`, a radius deliberately
 * tighter than the 10px on cards — but the treatments are inverted for the dark
 * canvas.
 *
 * The primary action is the only place the accent appears as a solid fill, and
 * close to the only saturated thing on the page at all. That scarcity is what
 * makes it read as *the* thing to click without needing to be large or loud.
 * White on this terracotta is 5.01:1, so it clears AA as normal-size text.
 */

type ButtonProps<T extends ElementType> = {
  as?: T;
  children: ReactNode;
  className?: string;
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'children' | 'className'>;

const BASE =
  'inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold rounded-[6px]';

/** Primary. Near-black on paper. */
export function InkButton<T extends ElementType = 'button'>({
  as,
  children,
  className,
  ...props
}: ButtonProps<T>) {
  const Tag = (as ?? 'button') as ElementType;
  return (
    <Tag
      className={cn(
        BASE,
        'bg-accent text-white transition-opacity duration-200',
        'hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}

/** Secondary. A hairline outline that lifts slightly on hover. */
export function GhostButton<T extends ElementType = 'button'>({
  as,
  children,
  className,
  ...props
}: ButtonProps<T>) {
  const Tag = (as ?? 'button') as ElementType;
  return (
    <Tag
      className={cn(
        BASE,
        'border border-hairline bg-surface text-bodytext transition-colors duration-200',
        'hover:border-mutedtext/50 hover:text-ink',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/25',
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}

/** Alias of the primary, kept because the name reads better in the hero. */
export function PaperButton<T extends ElementType = 'button'>({
  as,
  children,
  className,
  ...props
}: ButtonProps<T>) {
  const Tag = (as ?? 'button') as ElementType;
  return (
    <Tag
      className={cn(
        BASE,
        'bg-accent text-white transition-opacity duration-200',
        'hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}
