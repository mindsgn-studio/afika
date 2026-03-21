import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '@/@src/theme/colors';
import { typography } from '@/@src/theme/typography';

export const Button: React.FC<{ 
  label: string; 
  onPress: () => void; 
  testID?: string;
  progress?: boolean;
}> = ({
  label,
  onPress,
  testID,
  progress = false
}) => (
  <Pressable testID={testID} style={styles.button} onPress={onPress}>
    {
      progress?
      <ActivityIndicator />
      :
      <Text style={styles.buttonText}>{label}</Text>
    }
    
  </Pressable>
);


const styles = StyleSheet.create({
  button: {
    width: 200,
    marginTop: 8,
    borderRadius: 999,
    backgroundColor: colors.buttonBackground,
    paddingVertical: 12,
    alignItems: 'center',
    alignSelf: "center"
  },
  buttonText: {
    color: colors.buttonTextBackground,
    ...typography.button,
    fontWeight: '700',
  },
});

  
