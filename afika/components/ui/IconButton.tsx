import { ReactNode } from "react";
import { Pressable, StyleSheet } from "react-native";
import { colors } from "@/theme";

export default function IconButton({
  children,
  onPress,
  testID,
}: {
  children: ReactNode;
  onPress?: () => void;
  testID?: string;
}) {
  return (
    <Pressable testID={testID} style={styles.iconBtn} onPress={onPress}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
  },
});
