// ── Hash helpers ──
export function parseHash() {
  const hash = window.location.hash.slice(1);
  const params = new URLSearchParams(hash);
  return {
    videoId: params.get("v"),
    subtitleIndex: params.get("s") ? parseInt(params.get("s")) : null,
    mode: params.get("m") || null,
  };
}

export function setHash(videoId, subtitleIndex, push = false, mode = null) {
  if (!videoId) {
    history.replaceState(null, "", window.location.pathname);
    return;
  }
  let h = `#v=${videoId}`;
  if (subtitleIndex != null) h += `&s=${subtitleIndex}`;
  if (mode) h += `&m=${mode}`;
  if (push) {
    history.pushState(null, "", h);
  } else {
    history.replaceState(null, "", h);
  }
}
