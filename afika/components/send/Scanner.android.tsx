import { useCallback } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Camera, useCameraDevice } from "react-native-vision-camera";
import {
  useBarcodeScannerOutput,
  type Barcode,
  type TargetBarcodeFormat,
} from "react-native-vision-camera-barcode-scanner";

import { colors } from "@/theme";
import type { ScannerProps } from "@/components/send/scanner-types";

// Stable reference: `useBarcodeScannerOutput` rebuilds the output when the
// formats array identity changes, so it must not be inlined.
const QR_FORMATS: TargetBarcodeFormat[] = ["qr-code"];

/**
 * Android scanner backed by the MLKit Barcode Scanner output. Android has no
 * native Object Output, so this uses `react-native-vision-camera-barcode-scanner`.
 * That package is excluded from iOS autolinking in `package.json`, so MLKit is
 * only pulled into the Android build.
 */
export default function Scanner({ isActive, onScan, onError }: ScannerProps) {
  const device = useCameraDevice("back");

  const handleBarcodes = useCallback(
    (barcodes: Barcode[]) => {
      for (const barcode of barcodes) {
        if (barcode.rawValue) onScan(barcode.rawValue);
      }
    },
    [onScan],
  );

  const scannerOutput = useBarcodeScannerOutput({
    barcodeFormats: QR_FORMATS,
    onBarcodeScanned: handleBarcodes,
    onError: (error) => onError?.(error.message),
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
      outputs={[scannerOutput]}
      onError={(error) => onError?.(error.message)}
    />
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, alignItems: "center", justifyContent: "center" },
});
