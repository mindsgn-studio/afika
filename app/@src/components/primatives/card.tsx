import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { colors } from '@/@src/theme/colors';

export const Card: React.FC<ViewProps> = ({ style, children, ...rest }) => (
  <View style={[styles.screen, style]} {...rest}>
    {children}
  </View>
);

const styles = StyleSheet.create({
  screen: {
    borderRadius: 20,
    padding: 20,
    gap: 6,
    height: 150,
    borderWidth: 1,
    // borderColor: '#2A3143',
    marginBottom: 16,
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: colors.cardBackground,
  },
});

