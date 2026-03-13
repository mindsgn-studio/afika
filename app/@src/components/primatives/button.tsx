import React from 'react';
import { Pressable, StyleSheet, Text, TextProps } from 'react-native';
import { colors } from '@/@src/theme/colors';
import { typography } from '@/@src/theme/typography';

export const PrimaryButton: React.FC<{ label: string; onPress: () => void; testID?: string }> = ({
  label,
  onPress,
  testID,
}) => (
  <Pressable testID={testID} style={styles.button} onPress={onPress}>
    <Text style={styles.buttonText}>{label}</Text>
  </Pressable>
);


const styles = StyleSheet.create({
  title: {
      color: colors.balance,
      ...typography.balance,
      marginVertical: 10,
  },
  button: {
    marginTop: 8,
    borderRadius: 999,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: colors.textPrimary,
    ...typography.body,
    fontWeight: '700',
  },
});

  