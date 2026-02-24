import { Stack } from "expo-router";
import { ActivityIndicator } from "react-native";
import { Suspense } from "react";

export default function RootLayout() {
  return (
    <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}
