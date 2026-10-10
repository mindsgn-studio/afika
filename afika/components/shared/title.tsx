import React from "react";
import { Pressable, StyleSheet, Text, TextProps } from "react-native";
import { colors } from "@/theme/colors";
import { typography } from "@/theme/typography";

export const Title: React.FC<{ children: React.ReactNode; color?: string }> = ({
  children,
  color = colors.ink,
}) => <Text style={[styles.title, { color }]}>{children}</Text>;

const styles = StyleSheet.create({
  title: {
    color: colors.ink,
    ...typography.title,
    marginVertical: 20,
  },
});
