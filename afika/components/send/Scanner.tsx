import { StyleSheet, View } from "react-native";

import type { ScannerProps } from "@/components/send/scanner-types";

/**
 * Fallback for platforms without a native QR scanner (e.g. web). iOS and
 * Android resolve to `Scanner.ios.tsx` / `Scanner.android.tsx` instead, since
 * React Native prefers platform-specific extensions over this base file.
 */
export default function Scanner(_props: ScannerProps) {
  return <View style={styles.fill} />;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
