import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { KeyButton } from "./button";
import { applyKey, formatDisplay, isAccepted, toNumber } from "./amount-logic";
import {
  AmountKeypadPropsSchema,
  type AmountKeypadSchemaProps,
  type KeyPress,
} from "./schema";

export type AmountKeypadProps = AmountKeypadSchemaProps & {
  onSubmit?: (amount: number) => void;
  onChange?: (amount: number) => void;
  onAccountPress?: () => void;
  /** Wrap the pad in a SafeAreaView. Turn off when embedded, e.g. in a Tray. */
  safeArea?: boolean;
  /** Tighter vertical rhythm for embedded sheets. */
  compact?: boolean;
  /** Container background color. Defaults to the full-screen surface. */
  surfaceColor?: string;
};

const ROWS: KeyPress[][] = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  [".", "0", "backspace"],
];

export function AmountKeypad(rawProps: AmountKeypadProps) {
  const {
    onSubmit,
    onChange,
    onAccountPress,
    safeArea = true,
    compact = false,
    surfaceColor,
    ...schemaProps
  } = rawProps;
  const { max, initialValue, currencySymbol, accountLabel, ctaLabel } =
    AmountKeypadPropsSchema.parse(schemaProps);

  const [raw, setRaw] = useState<string>(() => {
    if (!initialValue) return "";
    return applyKeysFromString(initialValue, max);
  });

  const accepted = isAccepted(raw, max);

  // CTA color animation (0 = gray, 1 = green)
  const acceptedProgress = useSharedValue(accepted ? 1 : 0);
  useEffect(() => {
    acceptedProgress.value = withTiming(accepted ? 1 : 0, { duration: 200 });
  }, [accepted, acceptedProgress]);

  const ctaStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      acceptedProgress.value,
      [0, 1],
      ["#3a3a3a", "#22c55e"]
    ),
  }));

  // Shake animation when the user tries to exceed the max
  const shake = useSharedValue(0);
  const amountShakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shake.value }],
  }));

  const triggerShake = useCallback(() => {
    shake.value = withSequence(
      withTiming(-8, { duration: 40 }),
      withRepeat(withTiming(8, { duration: 80 }), 4, true),
      withTiming(0, { duration: 40 })
    );
  }, [shake]);

  const handleKey = useCallback(
    (key: KeyPress) => {
      const next = applyKey(raw, key, max);
      if (next === raw && key !== "backspace" && key !== ".") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(
          () => {}
        );
        triggerShake();
        return;
      }
      if (next !== raw) {
        setRaw(next);
        onChange?.(toNumber(next));
      }
    },
    [raw, max, onChange, triggerShake]
  );

  const handleSubmit = useCallback(() => {
    if (!accepted) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => {}
    );
    onSubmit?.(toNumber(raw));
  }, [accepted, onSubmit, raw]);

  const display = useMemo(() => formatDisplay(raw), [raw]);
  const isEmpty = raw === "";
  const Container = safeArea ? SafeAreaView : View;

  return (
    <Container
      testID="amount-keypad"
      style={[
        styles.container,
        surfaceColor ? { backgroundColor: surfaceColor } : null,
      ]}
    >
      <View style={[styles.top, compact && styles.topCompact]}>
        <Animated.View style={[styles.amountRow, amountShakeStyle]}>
          <Text
            testID="amount-display"
            style={[styles.amount, isEmpty && styles.amountPlaceholder]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {currencySymbol}
            {display}
          </Text>
        </Animated.View>

        <Pressable
          testID="account-selector"
          onPress={onAccountPress}
          style={[styles.accountPill, compact && styles.accountPillCompact]}
        >
          <View style={styles.walletIcon}>
            <Ionicons name="wallet-outline" size={16} color="#c4b5fd" />
          </View>
          <Text style={styles.accountText}>{accountLabel}</Text>
          <Ionicons name="chevron-down" size={16} color="#fff" />
        </Pressable>
      </View>

      <View style={styles.bottom}>
        <View style={styles.pad}>
          {ROWS.map((row, i) => (
            <View key={i} style={styles.row}>
              {row.map((k) => (
                <KeyButton key={k} keyValue={k} onPress={handleKey} />
              ))}
            </View>
          ))}
        </View>

        <Pressable
          testID="create-button"
          accessibilityRole="button"
          accessibilityState={{ disabled: !accepted }}
          disabled={!accepted}
          onPress={handleSubmit}
        >
          <Animated.View style={[styles.cta, ctaStyle]}>
            <Text style={[styles.ctaText, !accepted && styles.ctaTextDisabled]}>
              {ctaLabel}
            </Text>
          </Animated.View>
        </Pressable>
      </View>
    </Container>
  );
}

function applyKeysFromString(value: string, max: number): string {
  let acc = "";
  for (const ch of value) {
    if (/[0-9.]/.test(ch)) acc = applyKey(acc, ch as KeyPress, max);
  }
  return acc;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "space-between",
  },
  top: {
    alignItems: "center",
    paddingTop: 48,
    paddingHorizontal: 24,
  },
  topCompact: {
    paddingTop: 16,
  },
  amountRow: {
    width: "100%",
    alignItems: "center",
  },
  amount: {
    color: "#fff",
    fontSize: 64,
    fontWeight: "500",
    letterSpacing: -1,
  },
  amountPlaceholder: {
    color: "#6b6b6b",
  },
  accountPill: {
    marginTop: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#1c1c1c",
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  accountPillCompact: {
    marginTop: 16,
  },
  walletIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#2a2140",
    alignItems: "center",
    justifyContent: "center",
  },
  accountText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "500",
  },
  bottom: {
    paddingHorizontal: 12,
    paddingBottom: 16,
  },
  pad: {
    backgroundColor: "#161616",
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 6,
  },
  row: {
    flexDirection: "row",
    marginVertical: 5,
  },
  cta: {
    marginTop: 16,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
  },
  ctaTextDisabled: {
    color: "#8a8a8a",
  },
});
