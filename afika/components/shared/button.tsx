import React from 'react';
import { ActivityIndicator, Dimensions, Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { HapticPressable } from './haptic-pressable';
import * as Haptics from 'expo-haptics';

export const Button: React.FC<{ 
  label: string; 
  onPress: () => void; 
  width?: number
  testID?: string;
  progress?: boolean;
  backgroundColor?: string;
  color?: string;
}> = ({
  label,
  onPress,
  width = 150,
  testID,
  progress = false,
  backgroundColor = colors.ink,
  color = colors.lime,
}) => (
  <Pressable 
    testID={testID} 
    style={[styles.button, 
      {
        width,
        backgroundColor
      }
    ]} 
    onPress={onPress}
    onPressIn={() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    }}
    onPressOut={() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid)
    }}
    >
    {
      progress?
      <ActivityIndicator color={color} />
      :
      <Text 
        style={[
          styles.buttonText,
          {
            color,
          }
        ]}>
          {label}
      </Text>
    }
  </Pressable>
);


const styles = StyleSheet.create({
  button: {
    marginTop: 8,
    borderRadius: 20,
    paddingVertical: 20,
    alignItems: 'center',
    alignSelf: "center",  
  },
  buttonText: {
    ...typography.button,
    fontWeight: '700',
  },
});

  
