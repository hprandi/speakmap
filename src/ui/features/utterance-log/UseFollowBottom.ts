import { useLayoutEffect, useRef } from "react";

const BOTTOM_TOLERANCE_PX = 8;

export function useFollowBottom<T extends HTMLElement>(content: unknown) {
  const ref = useRef<T>(null);
  const following = useRef(true);

  useLayoutEffect(() => {
    const element = ref.current;
    if (element !== null && following.current) element.scrollTop = element.scrollHeight;
  }, [content]);

  function onScroll() {
    const element = ref.current;
    if (element !== null) following.current = isAtBottom(element);
  }

  return { ref, onScroll };
}

function isAtBottom(element: HTMLElement): boolean {
  return element.scrollHeight - element.scrollTop - element.clientHeight <= BOTTOM_TOLERANCE_PX;
}
