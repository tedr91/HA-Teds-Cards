import { NAMESPACE } from "../../shared/const";

export const NAVBAR_CARD_TYPE = `${NAMESPACE}-navbar-card`;
export const NAVBAR_CARD_EDITOR_TYPE = `${NAVBAR_CARD_TYPE}-editor`;
export const NAVBAR_CARD_NAME = "Ted Navbar Card";
export const NAVBAR_CARD_DESCRIPTION =
  "A navigation bar pinned to the top or bottom of the dashboard, holding buttons in left / center / right zones.";

/** Default bar thickness (px). Buttons and status items size from this. */
export const DEFAULT_NAVBAR_SIZE = 64;

/** Maximum number of NavSections a navbar can hold. */
export const MAX_NAV_SECTIONS = 5;
