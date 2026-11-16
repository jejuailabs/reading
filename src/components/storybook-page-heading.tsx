import type { ReactNode } from "react";
import { BookArtwork, JourneyLandscape } from "./artwork";

type HeadingArtwork = "coast" | "forest" | "night" | "mail" | "journey";

export type StorybookPageHeadingProps = {
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: string;
  art?: HeadingArtwork;
  children?: ReactNode;
  compact?: boolean;
  className?: string;
};

/** Existing approved pencil artwork only. No remote assets or generation calls. */
export function StorybookPageHeading({
  title,
  description,
  eyebrow,
  art = "forest",
  children,
  compact = false,
  className = "",
}: StorybookPageHeadingProps) {
  return <header className={["storybook-heading", compact ? "is-compact" : "", className].filter(Boolean).join(" ")}>
    <div className="storybook-heading-copy">
      {eyebrow ? <span className="storybook-eyebrow"><span aria-hidden="true"/>{eyebrow}</span> : null}
      <h1>{title}</h1>
      {description ? <p className="storybook-heading-description">{description}</p> : null}
      {children ? <div className="storybook-heading-actions">{children}</div> : null}
    </div>
    <div className={`storybook-heading-art is-${art}`} aria-hidden="true">
      {art === "journey" ? <JourneyLandscape/> : <BookArtwork variant={art}/>}
    </div>
  </header>;
}

export function StorybookSectionHeading({title, description, children}: {
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
}) {
  return <div className="storybook-section-heading">
    <div><h2>{title}</h2>{description ? <p>{description}</p> : null}</div>
    {children ? <div className="storybook-section-action">{children}</div> : null}
  </div>;
}
