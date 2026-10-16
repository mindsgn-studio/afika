/**
 * Shared contract for the platform-specific QR `Scanner` implementations.
 *
 * `Scanner.ios.tsx` uses VisionCamera's native Object Output (iOS only) and
 * `Scanner.android.tsx` uses the MLKit Barcode Scanner output, so the two are
 * swapped by React Native's platform resolution. Both must render the camera
 * preview and report scans through these same props.
 */
export type ScannerProps = {
  /** Whether the camera session should be running. */
  isActive: boolean;
  /**
   * Called with the raw string value of every scanned QR code. Address parsing
   * and filtering happen in the caller, not here.
   */
  onScan: (value: string) => void;
  /** Called when the camera or the scan output reports an error. */
  onError?: (message: string) => void;
};
