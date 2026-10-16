import { useCallback, useRef, useState } from "react";
import {
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useCameraPermission } from "react-native-vision-camera";
import { Feather } from "@expo/vector-icons";

import { Tray, useTray } from "@/shared/ui/organisms/tray";
import { colors, fonts } from "@/theme";
import { extractWalletAddress } from "@/lib/scan";
import Scanner from "@/components/send/Scanner";

const PALETTE = {
  surface: colors.ink,
  border: colors.inkSoft,
  handle: colors.muted,
  text: colors.paper,
  mutedText: colors.muted,
  backdrop: "rgba(0,0,0,0.55)",
};

const DENIED_STEPS =
  Platform.select({
    ios: [
      "Open the Settings app.",
      "Tap Privacy & Security, then Camera.",
      "Turn on Camera for Afika, then scan again.",
    ],
    android: [
      "Open the Settings app.",
      "Tap Apps, then Afika, then Permissions.",
      "Allow Camera, then scan again.",
    ],
    default: ["Open the Settings app and allow Camera for Afika."],
  }) ?? [];

function TrayHead({ title }: { title: string }) {
  return (
    <Tray.Header>
      <View style={styles.headerRow}>
        <Tray.Title>{title}</Tray.Title>
      </View>
      <Tray.Close>
        {({ color, size }) => <Feather name="x" size={size} color={color} />}
      </Tray.Close>
    </Tray.Header>
  );
}

function PermissionView() {
  const { close, setView } = useTray();
  const { requestPermission } = useCameraPermission();
  const [requesting, setRequesting] = useState(false);

  const handleContinue = useCallback(async () => {
    setRequesting(true);
    await requestPermission()
      .then((granted) => setView(granted ? "camera" : "denied"))
      .finally(() => setRequesting(false));
  }, [requestPermission, setView]);

  return (
    <Tray.View id="permission">
      <View testID="scan-permission">
        <TrayHead title="Scan address" />
        <Tray.Body>
          <View style={styles.status}>
            <View style={styles.iconMark}>
              <Feather name="camera" size={24} color={colors.ink} />
            </View>
            <Text style={styles.statusTitle}>Camera access needed</Text>
            <Text style={styles.statusDetail}>
              Afika uses your camera only to scan wallet QR codes. Nothing is
              captured or uploaded.
            </Text>
          </View>
        </Tray.Body>
        <Tray.Footer>
          <Pressable
            testID="scan-permission-continue"
            style={[styles.primary, requesting && styles.disabled]}
            onPress={handleContinue}
            disabled={requesting}
          >
            <Text style={styles.primaryLabel}>
              {requesting ? "Requesting…" : "Continue"}
            </Text>
          </Pressable>
          <Pressable style={styles.ghost} onPress={close}>
            <Text style={styles.ghostLabel}>Not now</Text>
          </Pressable>
        </Tray.Footer>
      </View>
    </Tray.View>
  );
}

function DeniedView() {
  const { close } = useTray();
  return (
    <Tray.View id="denied">
      <View testID="scan-denied">
        <TrayHead title="Camera blocked" />
        <Tray.Body>
          <View style={styles.status}>
            <View style={[styles.iconMark, styles.errorMark]}>
              <Feather name="camera-off" size={24} color={colors.paper} />
            </View>
            <Text style={styles.statusTitle}>Camera access is off</Text>
            <Text style={styles.statusDetail}>
              Enable it in{" "}
              {Platform.OS === "ios" ? "iOS" : "Android"} Settings to scan a
              wallet address.
            </Text>
          </View>
          <View style={styles.steps}>
            {DENIED_STEPS.map((step, index) => (
              <View key={step} style={styles.stepRow}>
                <Text style={styles.stepIndex}>{index + 1}</Text>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>
        </Tray.Body>
        <Tray.Footer>
          <Pressable
            testID="scan-open-settings"
            style={styles.primary}
            onPress={() => Linking.openSettings()}
          >
            <Text style={styles.primaryLabel}>Open settings</Text>
          </Pressable>
          <Pressable style={styles.ghost} onPress={close}>
            <Text style={styles.ghostLabel}>Close</Text>
          </Pressable>
        </Tray.Footer>
      </View>
    </Tray.View>
  );
}

function CameraView({ onScanned }: { onScanned: (address: string) => void }) {
  const { close, view } = useTray();
  const handled = useRef(false);
  const [error, setError] = useState<string | null>(null);

  const handleScan = useCallback(
    (value: string) => {
      if (handled.current) return;
      const address = extractWalletAddress(value);
      if (address) {
        handled.current = true;
        onScanned(address);
        close();
        return;
      }
      setError("That QR code is not an Ethereum or Bitcoin address.");
    },
    [close, onScanned],
  );

  const handleError = useCallback(
    (message: string) =>
      setError(message || "The camera could not be started."),
    [],
  );

  return (
    <Tray.View id="camera">
      <View testID="scan-camera">
        <TrayHead title="Scan QR code" />
        <Tray.Body>
          <View style={styles.cameraFrame}>
            <Scanner
              isActive={view === "camera"}
              onScan={handleScan}
              onError={handleError}
            />
            <View pointerEvents="none" style={styles.reticle} />
          </View>
          <Text style={styles.hint}>
            {error ??
              "Point the camera at a QR code containing an Ethereum or Bitcoin address."}
          </Text>
        </Tray.Body>
        <Tray.Footer>
          <Pressable style={styles.ghost} onPress={close}>
            <Text style={styles.ghostLabel}>Close</Text>
          </Pressable>
        </Tray.Footer>
      </View>
    </Tray.View>
  );
}

/**
 * Scan a wallet QR code and hand the address back via `onScanned`.
 *
 * Opens straight to the camera when permission is already granted, shows a
 * permission prompt when it can still be requested, and explains how to enable
 * the camera in system settings when access has been permanently denied.
 * Only Ethereum and Bitcoin addresses are accepted.
 */
export default function ScanTray({
  onScanned,
}: {
  onScanned: (address: string) => void;
}) {
  const { hasPermission, canRequestPermission } = useCameraPermission();
  const initialView = hasPermission
    ? "camera"
    : canRequestPermission
      ? "permission"
      : "denied";

  return (
    <Tray
      theme="dark"
      palette={PALETTE}
      defaultView={initialView}
      motion={{
        viewAxis: "x",
        viewSlide: 90,
        viewStartScale: 1,
        startScale: 0.5,
      }}
    >
      <View testID="scan-button">
        <Tray.Trigger view={initialView} style={styles.scanButton}>
          <Feather name="maximize" size={18} color={colors.muted} />
        </Tray.Trigger>
      </View>

      <Tray.Content>
        <PermissionView />
        <CameraView onScanned={onScanned} />
        <DeniedView />
      </Tray.Content>
    </Tray>
  );
}

const styles = StyleSheet.create({
  scanButton: {
    width: 46,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.inkSoft,
    backgroundColor: colors.inkSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  status: { alignItems: "center", gap: 10, paddingVertical: 16 },
  statusTitle: {
    fontFamily: fonts.semibold,
    fontSize: 20,
    color: colors.paper,
  },
  statusDetail: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.muted,
    textAlign: "center",
  },
  iconMark: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.lime,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  errorMark: { backgroundColor: colors.red },
  steps: { gap: 12, marginTop: 4 },
  stepRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  stepIndex: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.ink,
    backgroundColor: colors.lime,
    width: 22,
    height: 22,
    borderRadius: 11,
    textAlign: "center",
    lineHeight: 22,
    overflow: "hidden",
  },
  stepText: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.muted,
    lineHeight: 20,
  },
  cameraFrame: {
    height: 320,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: colors.inkSoft,
  },
  reticle: {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: 220,
    height: 220,
    marginLeft: -110,
    marginTop: -110,
    borderWidth: 2,
    borderColor: colors.lime,
    borderRadius: 24,
  },
  hint: {
    marginTop: 14,
    textAlign: "center",
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.muted,
  },
  primary: {
    backgroundColor: colors.lime,
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: "center",
  },
  disabled: { opacity: 0.6 },
  primaryLabel: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.ink,
  },
  ghost: { paddingVertical: 12, alignItems: "center" },
  ghostLabel: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.muted,
  },
});
