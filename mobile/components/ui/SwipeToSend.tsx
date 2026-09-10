/**
 * KudiFlow SwipeToSend Component
 *
 * Implements the Stitch swipe-to-send slider:
 * - 56px track, full pill rounding, #D8E8FF soft blue track
 * - Compact track width (~324px max, centered) keeping it pleasantly short
 * - Deep navy thumb with glowing emerald border (#10B981) and double chevron icon
 * - Expanding emerald progress fill behind the thumb
 * - Dynamic fading of center label as swipe progresses
 * - Rock-solid gesture handling via react-native-gesture-handler (Gesture.Pan())
 * - Directional locking: activeOffsetX([0, 8]), failOffsetY([-20, 20]) to prevent vertical scroll conflict
 * - Parent scroll locking via onSwipeStart / onSwipeEnd callbacks
 * - Clamped handle translation between 0 and maxDrag
 * - Springs back smoothly on partial drag (< 85%) or cancellation (NEVER stops halfway)
 * - Fires onComplete strictly once upon completing the full swipe (>= 85%)
 */
import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  LayoutChangeEvent,
} from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';

export interface SwipeToSendProps {
  amount: string;
  onComplete: () => void;
  onSwipeStart?: () => void;
  onSwipeEnd?: () => void;
  disabled?: boolean;
  completed?: boolean;
}

const THUMB_SIZE = 48;
const TRACK_HEIGHT = 56;
const COMPLETION_THRESHOLD = 0.85; // 85% deliberate swipe completion

export function SwipeToSend({
  amount,
  onComplete,
  onSwipeStart,
  onSwipeEnd,
  disabled = false,
  completed = false,
}: SwipeToSendProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const [isCompleted, setIsCompleted] = useState(completed);
  const dragX = useRef(new Animated.Value(0)).current;
  const hasCompleted = useRef(false);
  const hasTriggeredRef = useRef(false);
  const maxDragRef = useRef(260);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const width = e.nativeEvent.layout.width;
    if (width > 0) {
      setTrackWidth(width);
      maxDragRef.current = Math.max(10, width - THUMB_SIZE - 8);
    }
  }, []);

  const maxDrag = Math.max(10, (trackWidth || 310) - THUMB_SIZE - 8);

  useEffect(() => {
    if (!completed) {
      hasCompleted.current = false;
      hasTriggeredRef.current = false;
      setIsCompleted(false);
      Animated.spring(dragX, {
        toValue: 0,
        useNativeDriver: false,
        tension: 160,
        friction: 8,
      }).start();
    }
  }, [completed]);

  // Text opacity fades as drag progresses
  const textOpacity = dragX.interpolate({
    inputRange: [0, Math.max(1, maxDrag * 0.45)],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  // Animated width of the green progress fill behind the thumb
  const fillWidth = dragX.interpolate({
    inputRange: [0, maxDrag],
    outputRange: [THUMB_SIZE + 8, trackWidth || 310],
    extrapolate: 'clamp',
  });

  const panGesture = Gesture.Pan()
    .enabled(!disabled && !isCompleted)
    .activeOffsetX([0, 8])
    .failOffsetY([-20, 20])
    .runOnJS(true)
    .onBegin(() => {
      onSwipeStart?.();
    })
    .onUpdate((e) => {
      if (hasCompleted.current) return;
      const currentMax = maxDragRef.current;
      const clampedX = Math.max(0, Math.min(e.translationX, currentMax));
      dragX.setValue(clampedX);
    })
    .onEnd((e) => {
      if (hasCompleted.current) return;
      const currentMax = maxDragRef.current;
      const progress = currentMax > 0 ? e.translationX / currentMax : 0;

      if (progress >= COMPLETION_THRESHOLD) {
        // Success: Snap to end, lock state, trigger callback exactly once
        hasCompleted.current = true;
        setIsCompleted(true);

        Animated.spring(dragX, {
          toValue: currentMax,
          useNativeDriver: false,
          tension: 140,
          friction: 9,
        }).start(() => {
          if (!hasTriggeredRef.current) {
            hasTriggeredRef.current = true;
            onComplete();
          }
        });
      } else {
        // Abort / halfway swipe: snap smoothly and cleanly back to 0
        Animated.spring(dragX, {
          toValue: 0,
          useNativeDriver: false,
          tension: 160,
          friction: 8,
        }).start();
      }
    })
    .onFinalize(() => {
      onSwipeEnd?.();
      // Safety guarantee: If gesture was cancelled/interrupted before completing, reset back to 0
      if (!hasCompleted.current) {
        Animated.spring(dragX, {
          toValue: 0,
          useNativeDriver: false,
          tension: 160,
          friction: 8,
        }).start();
      }
    });

  return (
    <GestureDetector gesture={panGesture}>
      <View
        style={styles.track}
        onLayout={onLayout}
        collapsable={false}
      >
        {/* Dynamic green progress fill */}
        <Animated.View
          style={[
            styles.progressFill,
            {
              width: isCompleted ? '100%' : fillWidth,
            },
          ]}
        />

        {/* Draggable thumb */}
        <Animated.View
          style={[
            styles.thumb,
            {
              backgroundColor: isCompleted ? '#059669' : '#0F172A',
              transform: [{ translateX: dragX }],
            },
          ]}
        >
          <Text style={styles.thumbIcon}>
            {isCompleted ? '✓' : '»'}
          </Text>
        </Animated.View>

        {/* Center label — fades on drag */}
        <Animated.Text
          style={[
            styles.label,
            { opacity: isCompleted ? 0 : textOpacity },
          ]}
          pointerEvents="none"
        >
          {isCompleted ? '' : `Slide to send GH₵ ${amount} ➔`}
        </Animated.Text>

        {/* Completion text */}
        {isCompleted && (
          <Text style={styles.completedLabel} pointerEvents="none">
            Authorizing & Sending...
          </Text>
        )}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  track: {
    height: TRACK_HEIGHT,
    width: '92%',
    maxWidth: 324,
    alignSelf: 'center',
    borderRadius: TRACK_HEIGHT / 2,
    backgroundColor: '#D8E8FF',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  progressFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#A7F3D0',
    borderRadius: TRACK_HEIGHT / 2,
  },
  thumb: {
    position: 'absolute',
    left: 4,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    borderWidth: 2.5,
    borderColor: '#10B981',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  thumbIcon: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -1,
    marginTop: -2,
  },
  label: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.2,
    textAlign: 'center',
    paddingHorizontal: THUMB_SIZE + 12,
    zIndex: 5,
  },
  completedLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#065F46',
    textAlign: 'center',
    zIndex: 5,
  },
});
