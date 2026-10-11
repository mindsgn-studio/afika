import { Stack } from "expo-router";

export default function MarketLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[address]" />
    </Stack>
  );
}