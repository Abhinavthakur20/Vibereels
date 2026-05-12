import { useRef, useEffect, useCallback, useState } from 'react';
import type { ReelData } from '../App';
import { ReelCard } from './ReelCard';

interface ReelFeedProps {
  reels: ReelData[];
  autoScroll: boolean;
  onLoadMore: () => void;
  loading: boolean;
}

export function ReelFeed({ reels, autoScroll, onLoadMore, loading }: ReelFeedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Intersection observer for detecting which reel is active
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = Number(entry.target.getAttribute('data-index'));
            if (!isNaN(index)) {
              setActiveIndex(index);
            }
          }
        });
      },
      {
        root: container,
        threshold: 0.6,
      }
    );

    const cards = container.querySelectorAll('[data-index]');
    cards.forEach((card) => observer.observe(card));

    return () => observer.disconnect();
  }, [reels]);

  // Intersection observer for infinite scroll
  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading) {
          onLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [onLoadMore, loading]);

  // Auto-scroll: advance when the current reel finishes
  const handleReelEnded = useCallback(
    (index: number) => {
      if (!autoScroll || index !== activeIndex) return;

      const container = containerRef.current;
      if (!container) return;

      const nextCard = container.querySelector(`[data-index="${index + 1}"]`);
      if (nextCard) {
        nextCard.scrollIntoView({ behavior: 'smooth' });
      }
    },
    [autoScroll, activeIndex]
  );

  if (reels.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center animate-fade-in">
          <div className="text-4xl mb-3">🎬</div>
          <p className="text-vr-text-muted text-sm">No reels available</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto reel-feed"
      style={{ scrollSnapType: 'y mandatory' }}
    >
      {reels.map((reel, index) => (
        <ReelCard
          key={reel.id}
          reel={reel}
          index={index}
          isActive={index === activeIndex}
          onEnded={() => handleReelEnded(index)}
        />
      ))}

      {/* Load more trigger */}
      <div ref={loadMoreRef} className="h-20 flex items-center justify-center">
        {loading && (
          <div className="flex items-center gap-2 text-vr-text-dim text-xs">
            <div className="w-4 h-4 border-2 border-vr-accent/30 border-t-vr-accent rounded-full animate-spin" />
            Loading more...
          </div>
        )}
      </div>
    </div>
  );
}
