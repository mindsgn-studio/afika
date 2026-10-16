import { useCallback } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import {
  Camera,
  useCameraDevice,
  useObjectOutput,
  type ScannedCode,
  type ScannedObject,
  type ScannedObjectType,
} from "react-native-vision-camera";

import { colors } from "@/theme";
import type { ScannerProps } from "@/components/send/scanner-types";

// Stable reference: `useObjectOutput` rebuilds the output when the array
// identity changes, so it must not be inlined.
const QR_TYPES: ScannedObjectType[] = ["qr"];

/**
 * iOS scanner backed by VisionCamera's native Object Output
 * (`AVCaptureMetadataOutput`). This keeps MLKit and its ~2.4 MB model out of
 * the iOS app, and avoids the MLKit Simulator build failures.
 */
export default function Scanner({ isActive, onScan, onError }: ScannerProps) {
  const device = useCameraDevice("back");

  const handleObjects = useCallback(
    (objects: ScannedObject[]) => {
      for (const object of objects) {
        if (object.type !== "qr") continue;
        const value = (object as ScannedCode).value;
        if (value) onScan(value);
      }
    },
    [onScan],
  );

  const objectOutput = useObjectOutput({
    types: QR_TYPES,
    onObjectsScanned: handleObjects,
  });

  if (!device) {
    return (
      <View style={styles.fill}>
        <ActivityIndicator color={colors.lime} />
      </View>
    );
  }

  return (
    <Camera
      style={StyleSheet.absoluteFill}
      device={device}
      isActive={isActive}
      outputs={[objectOutput]}
      onError={(error) => onError?.(error.message)}
    />
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, alignItems: "center", justifyContent: "center" },
});
