import { useRef, useEffect, useState, useCallback } from 'react';
import type { ReelData } from '../App';

interface ReelCardProps {
  reel: ReelData;
  index: number;
  isActive: boolean;
  onEnded: () => void;
}

export function ReelCard({ reel, index, isActive, onEnded }: ReelCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [videoError, setVideoError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Auto-play/pause based on active state
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isActive && !paused) {
      video.play().catch(() => {
        // Autoplay blocked; mute and retry
        video.muted = true;
        setMuted(true);
        video.play().catch(() => {});
      });
    } else {
      video.pause();
    }
  }, [isActive, paused]);

  // Update muted state
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = muted;
    }
  }, [muted]);

  // Track progress
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      if (video.duration) {
        setProgress((video.currentTime / video.duration) * 100);
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }, []);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().catch(() => {});
      setPaused(false);
    } else {
      video.pause();
      setPaused(true);
    }
  }, []);

  const toggleMute = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setMuted((m) => !m);
  }, []);

  const handleVideoError = useCallback(() => {
    setVideoError(true);
  }, []);

  const handleLoadedData = useCallback(() => {
    setLoaded(true);
  }, []);

  // Check if URL is a valid video source
  const isDirectVideoUrl =
    reel.videoUrl &&
    !reel.videoUrl.startsWith('blob:') &&
    !reel.videoUrl.includes('instagram.com/reel');

  return (
    <div
      data-index={index}
      className="reel-snap relative w-full flex items-center justify-center bg-black"
      style={{ height: '100vh', minHeight: '100vh' }}
    >
      {/* Video or Fallback */}
      {isDirectVideoUrl && !videoError ? (
        <>
          {/* Loading skeleton */}
          {!loaded && (
            <div className="absolute inset-0 skeleton-shimmer" />
          )}

          <video
            ref={videoRef}
            src={reel.videoUrl}
            poster={reel.posterUrl}
            className="w-full h-full object-cover cursor-pointer"
            playsInline
            muted={muted}
            preload="metadata"
            loop={false}
            onClick={togglePlay}
            onEnded={onEnded}
            onError={handleVideoError}
            onLoadedData={handleLoadedData}
          />

          {/* Progress bar */}
          <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/10">
            <div
              className="h-full bg-gradient-to-r from-vr-accent to-pink-400 transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Paused overlay */}
          {paused && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                  <polygon points="8,5 19,12 8,19" />
                </svg>
              </div>
            </div>
          )}
        </>
      ) : (
        // Fallback for non-direct URLs or errored videos
        <div className="flex flex-col items-center justify-center p-6 text-center">
          <div className="w-20 h-20 rounded-2xl bg-vr-surface flex items-center justify-center mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#e040fb" strokeWidth="2">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
              <polygon points="10,8 16,12 10,16" fill="#e040fb" stroke="none" />
            </svg>
          </div>
          <p className="text-vr-text-muted text-xs mb-2">
            {videoError ? 'Video failed to load' : 'Reel available on Instagram'}
          </p>
          {reel.username && (
            <p className="text-vr-text-dim text-xs">@{reel.username}</p>
          )}
        </div>
      )}

      {/* Overlay controls */}
      <div className="absolute bottom-4 left-0 right-0 px-4 pointer-events-none">
        <div className="flex items-end justify-between">
          {/* User info */}
          <div className="flex-1 min-w-0 mr-3">
            {reel.username && (
              <p className="text-white text-sm font-semibold drop-shadow-lg truncate">
                @{reel.username}
              </p>
            )}
            {reel.caption && (
              <p className="text-white/70 text-xs mt-1 line-clamp-2 drop-shadow-md">
                {reel.caption}
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col items-center gap-3 pointer-events-auto">
            {/* Mute/Unmute */}
            <button
              onClick={toggleMute}
              className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center
                         hover:bg-black/60 transition-colors"
              title={muted ? 'Unmute' : 'Mute'}
            >
              {muted ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11,5 6,9 2,9 2,15 6,15 11,19" fill="white" />
                  <line x1="23" y1="9" x2="17" y2="15" />
                  <line x1="17" y1="9" x2="23" y2="15" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11,5 6,9 2,9 2,15 6,15 11,19" fill="white" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
