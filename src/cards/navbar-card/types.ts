import type { LovelaceCardConfig } from "custom-card-helpers";

import type { TedStyleTheme } from "../../shared/types";
import type { LabelButtonCardConfig } from "../label-button-card/types";

/** Which screen edge the navbar is pinned to. */
export type NavbarAlignment = "bottom" | "top";

/** Snap = edge-to-edge full width; float = centered with margins and rounded corners. */
export type NavbarType = "snap" | "float";

/** Horizontal zone a section is placed in. */
export type NavZone = "left" | "center" | "right";

/** Content alignment of items within a section. */
export type NavAlign = "left" | "center" | "right";

/** Relative width of a nav button. */
export type NavButtonSize = "normal" | "wide";

/** A navbar button: a label-button card plus nav-only sizing. */
export type NavButtonConfig = LabelButtonCardConfig & {
  nav_button_size?: NavButtonSize;
};

/** A section of the navbar, placed in a zone and holding an ordered list of buttons. */
export interface NavSection {
  /** Which zone the section sits in. Defaults to "left". */
  placement?: NavZone;
  /** How the section's content is aligned. Defaults to "center". */
  align?: NavAlign;
  /** Whether the section is shown. Defaults to true. */
  visible?: boolean;
  buttons?: NavButtonConfig[];
}

export interface NavbarCardConfig extends LovelaceCardConfig {
  type: string;
  /** Visual styling: ted-style (default) or follow the HA theme. */
  theme?: TedStyleTheme;
  /** Screen edge: bottom (default) or top. */
  alignment?: NavbarAlignment;
  /** snap (default, edge-to-edge) or float (centered with margins). */
  bar_type?: NavbarType;
  /** Bar thickness in px; buttons/status items size from this. */
  size?: number;
  /** Up to MAX_NAV_SECTIONS sections. */
  sections?: NavSection[];
}
