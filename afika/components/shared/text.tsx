import React from 'react';
import { Pressable, StyleSheet, Text, TextProps } from 'react-native';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';

export const BodyText: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Text style={styles.title}>{children}</Text>
);

const styles = StyleSheet.create({
  title: {
      color: colors.ink,
      ...typography.body,
  },
});

