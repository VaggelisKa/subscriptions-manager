import { useSyncExternalStore } from "react";

const MOBILE_MEDIA_QUERY = "(max-width: 768px)";
const MOBILE_USER_AGENT_REGEX =
  /Android|BlackBerry|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i;

function subscribe(callback: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const mediaQueryList = window.matchMedia(MOBILE_MEDIA_QUERY);
  mediaQueryList.addEventListener("change", callback);

  return () => {
    mediaQueryList.removeEventListener("change", callback);
  };
}

function getSnapshot() {
  if (typeof window === "undefined") {
    return false;
  }

  const isSmall = window.matchMedia(MOBILE_MEDIA_QUERY).matches;
  const isMobileUserAgent = MOBILE_USER_AGENT_REGEX.test(navigator.userAgent);
  const isDev = process.env.NODE_ENV !== "production";

  return isDev ? isSmall || isMobileUserAgent : isSmall && isMobileUserAgent;
}

export function useIsMobile() {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
