import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import type { KeyPress } from "./schema";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = {
  keyValue: KeyPress;
  onPress: (key: KeyPress) => void;
};

export function KeyButton({ keyValue, onPress }: Props) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.93, { damping: 15, stiffness: 300 });
  };
  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress(keyValue);
  };

  return (
    <AnimatedPressable
      testID={`key-${keyValue}`}
      accessibilityRole="button"
      accessibilityLabel={keyValue === "backspace" ? "Delete" : keyValue}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      style={[styles.key, animatedStyle]}
    >
      {keyValue === "backspace" ? (
        <Ionicons name="backspace" size={22} color="#fff" />
      ) : (
        <Text style={styles.keyText}>{keyValue}</Text>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  key: {
    flex: 1,
    height: 64,
    marginHorizontal: 5,
    borderRadius: 32,
    backgroundColor: "#262626",
    alignItems: "center",
    justifyContent: "center",
  },
  keyText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "500",
  },
});
