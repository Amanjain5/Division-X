'use client';

import { useEffect, useRef, useState } from 'react';
import { reportIdle } from '@divisionx/api-client';

export interface ActivityMetrics {
  keystrokes: number;
  mouseMovement: number;
  clicks: number;
  activeScore: number;
  isIdle: boolean;
}

export function useActivityTracker(
  isActive: boolean,
  idleMinutesPolicy = 10,
  onAutoPaused?: () => void,
  onIdleDetected?: () => void
) {
  // Real-time accumulators
  const keystrokesRef = useRef(0);
  const mouseMovementRef = useRef(0);
  const clicksRef = useRef(0);
  const lastPositionRef = useRef<{ x: number; y: number } | null>(null);
  const lastActiveTimeRef = useRef(Date.now());
  const throttleTimerRef = useRef<any>(null);

  // Live HUD States (for displaying in the UI dashboard)
  const [metrics, setMetrics] = useState<ActivityMetrics>({
    keystrokes: 0,
    mouseMovement: 0,
    clicks: 0,
    activeScore: 100,
    isIdle: false
  });

  // Calculate active score over a rolling 1-minute window
  const activeWindowsRef = useRef<Array<{ keys: number; mouse: number; clicks: number; time: number }>>([]);

  // Preserve stable references to dynamic callback parameters to prevent infinite re-renders
  const onAutoPausedRef = useRef(onAutoPaused);
  const onIdleDetectedRef = useRef(onIdleDetected);

  useEffect(() => {
    onAutoPausedRef.current = onAutoPaused;
    onIdleDetectedRef.current = onIdleDetected;
  }, [onAutoPaused, onIdleDetected]);

  useEffect(() => {
    if (!isActive) {
      // Reset tracker state when timer stops
      keystrokesRef.current = 0;
      mouseMovementRef.current = 0;
      clicksRef.current = 0;
      lastPositionRef.current = null;
      lastActiveTimeRef.current = Date.now();
      activeWindowsRef.current = [];
      
      setMetrics(prev => {
        if (
          prev.keystrokes === 0 &&
          prev.mouseMovement === 0 &&
          prev.clicks === 0 &&
          prev.activeScore === 100 &&
          !prev.isIdle
        ) {
          return prev; // No state change, skips re-render!
        }
        return { keystrokes: 0, mouseMovement: 0, clicks: 0, activeScore: 100, isIdle: false };
      });
      return;
    }

    // --- Dynamic Event Listeners ---
    
    // 1. Keyboard event listener
    const handleKeyDown = () => {
      keystrokesRef.current += 1;
      lastActiveTimeRef.current = Date.now();
    };

    // 2. Mouse Click event listener
    const handleMouseClick = () => {
      clicksRef.current += 1;
      lastActiveTimeRef.current = Date.now();
    };

    // 3. Pointer Move event listener (Throttled to protect FPS)
    let isThrottled = false;
    const handleMouseMove = (e: MouseEvent) => {
      if (isThrottled) return;
      isThrottled = true;

      const current = { x: e.clientX, y: e.clientY };
      const last = lastPositionRef.current;

      if (last) {
        // Calculate Euclidean distance (pixels traveled)
        const dx = current.x - last.x;
        const dy = current.y - last.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Discard extreme teleports (e.g. initial window entry)
        if (distance < 500) {
          mouseMovementRef.current += Math.round(distance);
        }
      }

      lastPositionRef.current = current;
      lastActiveTimeRef.current = Date.now();

      setTimeout(() => {
        isThrottled = false;
      }, 150); // Throttle to ~6 mouse calculations per second
    };

    // Bind listeners
    window.addEventListener('keydown', handleKeyDown, { passive: true });
    window.addEventListener('mousedown', handleMouseClick, { passive: true });
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    // --- Metric Accumulator & Idle Sweep Loop ---
    const tickInterval = setInterval(() => {
      const now = Date.now();
      const elapsedInactiveMs = now - lastActiveTimeRef.current;
      const elapsedInactiveMinutes = elapsedInactiveMs / 60000;

      // 1. Capture rolling window slice
      const currentSlice = {
        keys: keystrokesRef.current,
        mouse: mouseMovementRef.current,
        clicks: clicksRef.current,
        time: now
      };

      // Add to array, keep only last 6 slices (last 1 minute if running 10s tick)
      activeWindowsRef.current.push(currentSlice);
      if (activeWindowsRef.current.length > 6) {
        activeWindowsRef.current.shift();
      }

      // Calculate activity levels in the rolling window
      let totalSlices = activeWindowsRef.current.length;
      let activeSlices = activeWindowsRef.current.filter(
        slice => slice.keys > 0 || slice.mouse > 50 || slice.clicks > 0
      ).length;

      // Active score is percentage of active slices in the sliding window
      const activeScore = totalSlices > 0 ? Math.round((activeSlices / totalSlices) * 100) : 100;

      // Update live metrics state
      setMetrics({
        keystrokes: keystrokesRef.current,
        mouseMovement: mouseMovementRef.current,
        clicks: clicksRef.current,
        activeScore,
        isIdle: elapsedInactiveMinutes >= idleMinutesPolicy
      });

      // 2. Idle Policy Enforcement Trigger
      if (elapsedInactiveMinutes >= idleMinutesPolicy) {
        console.log(`⚡ Inactivity Threshold Breached: ${elapsedInactiveMinutes.toFixed(1)} mins`);
        
        // Report metrics to the backend
        reportIdle({
          keystrokes: keystrokesRef.current,
          mouseMovement: mouseMovementRef.current,
          clicks: clicksRef.current
        }).then((res: any) => {
          if (res.autoPaused && onAutoPausedRef.current) {
            onAutoPausedRef.current();
          } else if (onIdleDetectedRef.current) {
            onIdleDetectedRef.current();
          }
        }).catch((err) => {
          console.error('Failed to report idle forensics metrics:', err);
        });

        // Reset accumulators to avoid infinite loop alerts
        keystrokesRef.current = 0;
        mouseMovementRef.current = 0;
        clicksRef.current = 0;
        lastActiveTimeRef.current = Date.now();
      }

    }, 10000); // Check and slide rolling window every 10 seconds

    // Cleanup listeners and loops
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handleMouseClick);
      window.removeEventListener('mousemove', handleMouseMove);
      clearInterval(tickInterval);
      if (throttleTimerRef.current) clearTimeout(throttleTimerRef.current);
    };

  }, [isActive, idleMinutesPolicy]);

  return metrics;
}
