import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

interface UseVirtualScrollOptions {
  itemCount: number;
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}

interface UseVirtualScrollResult {
  visibleRange: { start: number; end: number };
  totalHeight: number;
  offsetY: number;
  onScroll: (scrollTop: number) => void;
  scrollToBottom: () => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * Hook de virtualização simples para listas longas.
 * Renderiza apenas os itens visíveis no viewport + buffer (overscan).
 */
export function useVirtualScroll({
  itemCount,
  itemHeight,
  containerHeight,
  overscan = 5,
}: UseVirtualScrollOptions): UseVirtualScrollResult {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const totalHeight = itemCount * itemHeight;

  const visibleRange = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const end = Math.min(itemCount - 1, start + visibleCount + overscan * 2);
    return { start, end };
  }, [scrollTop, itemHeight, containerHeight, itemCount, overscan]);

  const offsetY = visibleRange.start * itemHeight;

  const onScroll = useCallback((newScrollTop: number) => {
    setScrollTop(newScrollTop);
  }, []);

  const scrollToBottom = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = totalHeight;
    }
  }, [totalHeight]);

  // Auto-scroll to bottom when new items are added
  const prevItemCount = useRef(itemCount);
  useEffect(() => {
    if (itemCount > prevItemCount.current) {
      scrollToBottom();
    }
    prevItemCount.current = itemCount;
  }, [itemCount, scrollToBottom]);

  return {
    visibleRange,
    totalHeight,
    offsetY,
    onScroll,
    scrollToBottom,
    containerRef,
  };
}
