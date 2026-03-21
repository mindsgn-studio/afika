import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { colors } from '@/@src/theme/colors';
import { typography } from '@/@src/theme/typography';

export const Body: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Text style={styles.title}>{children}</Text>
);

const styles = StyleSheet.create({
  title: {
      color: colors.textPrimary,
      ...typography.body,
  },
});
