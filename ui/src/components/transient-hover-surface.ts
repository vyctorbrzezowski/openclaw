type TransientHoverSurface = {
  closeTransientSurface: () => void;
};

const activeSurfaceByDocument = new WeakMap<Document, TransientHoverSurface>();

export function claimTransientHoverSurface(document: Document, surface: TransientHoverSurface) {
  const active = activeSurfaceByDocument.get(document);
  if (active && active !== surface) {
    active.closeTransientSurface();
  }
  activeSurfaceByDocument.set(document, surface);
}

export function releaseTransientHoverSurface(document: Document, surface: TransientHoverSurface) {
  if (activeSurfaceByDocument.get(document) === surface) {
    activeSurfaceByDocument.delete(document);
  }
}
