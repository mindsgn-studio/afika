import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';

export const Balance: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Text style={styles.title}>{children}</Text>
);

const styles = StyleSheet.create({
  title: {
      color: colors.ink,
      ...typography.title,
      marginVertical: 10,
  },
});

  
