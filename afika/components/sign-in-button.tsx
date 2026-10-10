import { View, Text, Platform, Pressable } from "react-native";
import ChromaRing from "@/shared/ui/organisms/chroma-ring";
<<<<<<< HEAD
import * as Haptics from "expo-haptics";
const SignInButton = ({ onPress }: { onPress: () => void }) => {
  return (
    <ChromaRing glow="#000000" base="#000000">
      <Pressable
        onPress={onPress}
        onPressIn={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        }}
        onPressOut={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
        }}
      >
=======

const SignInButton = ({ onPress }: { onPress: () => void }) => {
  return (
    <ChromaRing glow="#000000" base="#000000">
      <Pressable onPress={onPress}>
>>>>>>> 6f6d95b1 (update)
        <Text style={{ color: "#fff", fontWeight: "bold" }}>
          {Platform.OS === "ios" ? "SIGN IN WITH APPLE" : "SIGN IN WITH"}
        </Text>
      </Pressable>
    </ChromaRing>
  );
};

export { SignInButton };
