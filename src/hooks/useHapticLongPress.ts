import { useRef, useCallback } from 'react';

interface LongPressOptions {
  threshold?: number; // ms to trigger long press (default: 380ms)
  onLongPress: (e: React.TouchEvent | React.MouseEvent) => void;
  onClick?: (e: React.MouseEvent) => void;
  disabled?: boolean;
}

export const useHapticLongPress = ({
  threshold = 380,
  onLongPress,
  onClick,
  disabled = false,
}: LongPressOptions) => {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const isLongPressTriggeredRef = useRef<boolean>(false);

  const triggerHaptic = () => {
    try {
      if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
        navigator.vibrate(15);
      }
    } catch {
      // Ignore vibration errors if unsupported or blocked
    }
  };

  const start = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      if (disabled) return;
      isLongPressTriggeredRef.current = false;

      if ('touches' in e && e.touches.length > 0) {
        startPosRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
      } else if ('clientX' in e) {
        startPosRef.current = {
          x: (e as React.MouseEvent).clientX,
          y: (e as React.MouseEvent).clientY,
        };
      }

      timerRef.current = setTimeout(() => {
        isLongPressTriggeredRef.current = true;
        triggerHaptic();
        onLongPress(e);
      }, threshold);
    },
    [disabled, onLongPress, threshold]
  );

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    startPosRef.current = null;
  }, []);

  const move = useCallback(
    (e: React.TouchEvent) => {
      if (!startPosRef.current || !e.touches.length) return;
      const moveX = Math.abs(e.touches[0].clientX - startPosRef.current.x);
      const moveY = Math.abs(e.touches[0].clientY - startPosRef.current.y);

      // If moved more than 8px, user is scrolling: cancel long press immediately
      if (moveX > 8 || moveY > 8) {
        clear();
      }
    },
    [clear]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (isLongPressTriggeredRef.current) {
        e.preventDefault();
        e.stopPropagation();
        isLongPressTriggeredRef.current = false;
        return;
      }
      if (onClick) {
        onClick(e);
      }
    },
    [onClick]
  );

  return {
    onTouchStart: start,
    onTouchEnd: clear,
    onTouchCancel: clear,
    onTouchMove: move,
    onMouseDown: (e: React.MouseEvent) => {
      // Only handle primary mouse clicks
      if (e.button === 0) start(e);
    },
    onMouseUp: clear,
    onMouseLeave: clear,
    onClick: handleClick,
    onContextMenu: (e: React.MouseEvent) => {
      // Allow desktop right-click to trigger popout
      if (!disabled) {
        e.preventDefault();
        triggerHaptic();
        onLongPress(e);
      }
    },
  };
};

