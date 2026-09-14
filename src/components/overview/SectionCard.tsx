import React from 'react';
import { ChevronRight } from 'lucide-react';

interface SectionCardProps {
  title: string;
  subtitle?: string;
  action?: { label: string; onClick: () => void; icon?: 'chevron' | 'none' };
  children: React.ReactNode;
  bodyClassName?: string;
}

/**
 * One card shell for the whole screen: same padding, same hairline, same
 * header rhythm. Previously each block on this page hand-rolled its own
 * border, radius, shadow and heading size, which is why the page never felt
 * like one object.
 */
export const SectionCard: React.FC<SectionCardProps> = ({
  title,
  subtitle,
  action,
  children,
  bodyClassName = 'p-5',
}) => (
  <section className="lg-card flex flex-col">
    <header className="flex items-start justify-between gap-4 px-5 py-4 border-b border-line">
      <div className="min-w-0">
        <h2 className="t-card truncate">{title}</h2>
        {subtitle ? <p className="t-meta mt-1 truncate">{subtitle}</p> : null}
      </div>

      {action ? (
        <button
          onClick={action.onClick}
          className="shrink-0 inline-flex items-center gap-1 text-[0.875rem] font-bold text-accent hover:text-accent-hover transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent rounded"
        >
          {action.label}
          {action.icon === 'chevron' ? (
            <ChevronRight className="w-4 h-4 stroke-[1.7]" />
          ) : null}
        </button>
      ) : null}
    </header>

    <div className={`flex-1 ${bodyClassName}`}>{children}</div>
  </section>
);
