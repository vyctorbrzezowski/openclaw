// Shape of one entry in the selects context dossier.
//
// Split from the page that renders it because the habitats are the bulk of the
// material and they are read, argued with, and edited on their own — the render
// and measure engine beside them should not have to be scrolled past.

/** What the operator may do with this family's trigger in a standardization pass. */
export type BlendVerdict =
  /** Nothing dimensional depends on this trigger; it can take the canonical box whole. */
  | { readonly kind: "free"; readonly note: string }
  /** Can standardize, but one measurement has to stay to keep a neighbour aligned. */
  | { readonly kind: "constrained"; readonly keep: string; readonly note: string }
  /** Standardizing would break the region; the reason is not a preference. */
  | { readonly kind: "leave"; readonly note: string };

export type SelectFamily = {
  /** Stable slug: names the anchor, the screenshot, and the operator's reply. */
  readonly id: string;
  readonly label: string;
  /** Where in the product the operator meets this control. */
  readonly where: string;
  /**
   * The route on this same mock server where the real thing renders, so the
   * reconstruction below can be checked against it rather than trusted. Omitted
   * where the mock cannot reach the region without a live session.
   */
  readonly liveRoute?: string;
  /** file:line the habitat was reconstructed from, so a reader can go verify it. */
  readonly source: string;
  /** Which implementation this is, so the dossier groups by mechanism too. */
  readonly kind: "native" | "wa-select" | "wa-dropdown" | "wa-popover" | "hand-rolled";
  /**
   * The real surrounding region, under production class names, with the real
   * neighbours visible. Exactly one element carries `data-measure`: the trigger
   * whose box the metrics table reports.
   */
  readonly habitat: string;
  /**
   * Measure the shadow part rather than the host — wa-select and wa-dropdown
   * draw their box inside a shadow root, so the host's own geometry is not the
   * box a reader sees.
   */
  readonly measurePart?: string;
  /**
   * What this trigger's size is dimensionally tied to, and through which rule.
   * Empty means nothing found — which is the finding, not a gap.
   */
  readonly locks: readonly string[];
  readonly verdict: BlendVerdict;
};

/** The box a standardization pass would converge on, if the operator says go. */
export type CanonicalTriggerProposal = {
  readonly height: string;
  readonly fontSize: string;
  readonly padding: string;
  readonly radius: string;
  readonly border: string;
  readonly fill: string;
  readonly chevron: string;
};
