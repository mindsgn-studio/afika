import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { usePrivy } from "@privy-io/expo";
import PillButton from "@/components/ui/PillButton";
import { useRouter, useFocusEffect } from "expo-router";
import { colors, fonts } from "@/theme";
import * as Haptics from "expo-haptics";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { useWallet } from "@/store/wallet";
import {
  deletePushNotificationDetails,
  getWalletSettings,
  hasPushNotificationDetails,
  PreferredCurrency,
  savePushNotificationDetails,
  setWalletCurrencyPreference,
} from "@/lib/firebase";

export default function Settings() {
  const [progress, setProgress] = useState<boolean>(false);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationSaving, setNotificationSaving] = useState(false);
  const [preferredCurrency, setPreferredCurrency] =
    useState<PreferredCurrency>("USD");
  const [currencySaving, setCurrencySaving] =
    useState<PreferredCurrency | null>(null);
  const { logout } = usePrivy();
  const { address, smartAdress } = useWallet();
  const router = useRouter();
  const walletAddress = smartAdress ?? address ?? null;

  async function logoutWallet() {
    setProgress(true);
    try {
      await logout();
      await router.replace("/sign-in");
    } catch (error) {
    } finally {
      setProgress(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadSettings() {
      if (!walletAddress) {
        if (!cancelled) {
          setPreferredCurrency("USD");
          setNotificationsEnabled(false);
          setSettingsLoading(false);
        }
        return;
      }

      setSettingsLoading(true);

      try {
        const [settings, pushEnabled] = await Promise.all([
          getWalletSettings(walletAddress),
          hasPushNotificationDetails(walletAddress),
        ]);

        if (!cancelled) {
          setPreferredCurrency(settings.preferredCurrency);
          setNotificationsEnabled(pushEnabled);
        }
      } catch (error) {
        if (!cancelled) {
          setPreferredCurrency("USD");
          setNotificationsEnabled(false);
        }
      } finally {
        if (!cancelled) {
          setSettingsLoading(false);
        }
      }
    }

    loadSettings();

    return () => {
      cancelled = true;
    };
  }, [walletAddress]);

  async function updateCurrency(currency: PreferredCurrency) {
    if (!walletAddress || currencySaving || preferredCurrency === currency) {
      return;
    }

    setCurrencySaving(currency);
    try {
      await setWalletCurrencyPreference(walletAddress, currency);
      setPreferredCurrency(currency);
    } catch (error) {
      Alert.alert("Could not save currency", "Please try again.");
    } finally {
      setCurrencySaving(null);
    }
  }

  async function registerPushDetails() {
    const existingPermissions = await Notifications.getPermissionsAsync();
    let finalStatus = existingPermissions.status;

    if (finalStatus !== "granted") {
      const requested = await Notifications.requestPermissionsAsync();
      finalStatus = requested.status;
    }

    if (finalStatus !== "granted") {
      throw new Error("Push notification permission was not granted.");
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    let expoPushToken: string | null = null;
    let devicePushToken: string | null = null;
    let devicePushTokenType: string | null = null;

    try {
      if (projectId) {
        const expoTokenResult = await Notifications.getExpoPushTokenAsync({
          projectId,
        });
        expoPushToken = expoTokenResult.data;
      }
    } catch (error) {
      console.log("getExpoPushTokenAsync error:", error);
    }

    try {
      const deviceTokenResult = await Notifications.getDevicePushTokenAsync();
      devicePushToken =
        typeof deviceTokenResult.data === "string"
          ? deviceTokenResult.data
          : JSON.stringify(deviceTokenResult.data);
      devicePushTokenType = deviceTokenResult.type;
    } catch (error) {
      console.log("getDevicePushTokenAsync error:", error);
    }

    if (!walletAddress) {
      throw new Error("Wallet not ready.");
    }

    await savePushNotificationDetails(walletAddress, {
      enabled: true,
      permissionStatus: finalStatus,
      platform: Platform.OS,
      expoPushToken,
      devicePushToken,
      devicePushTokenType,
    });
  }

  async function toggleNotifications(nextValue: boolean) {
    if (!walletAddress || notificationSaving) {
      return;
    }

    setNotificationSaving(true);

    try {
      if (nextValue) {
        await registerPushDetails();
      } else {
        await deletePushNotificationDetails(walletAddress);
      }

      setNotificationsEnabled(nextValue);
    } catch (error) {
      Alert.alert(
        "Could not update notifications",
        nextValue
          ? "Please allow notifications on this device and try again."
          : "Please try again.",
      );
    } finally {
      setNotificationSaving(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

      return () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
      };
    }, []),
  );

  return (
    <ScrollView contentContainerStyle={styles.content} testID="account-screen">
      <View style={styles.section}>
        <Text style={styles.title}>Preferences</Text>
        <Text style={styles.subtitle}>
          Manage how your account stays updated and which currency you see by
          default.
        </Text>
      </View>

      {settingsLoading ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator />
        </View>
      ) : (
        <>
          <View style={styles.card}>
            <View style={styles.rowCopy}>
              <Text style={styles.rowTitle}>Push notifications</Text>
              <Text style={styles.rowDescription}>
                Turn on account alerts for this device.
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={toggleNotifications}
              disabled={!walletAddress || notificationSaving}
            />
          </View>

          <View style={styles.cardColumn}>
            <Text style={styles.rowTitle}>Default currency</Text>
            <Text style={styles.rowDescription}>
              Choose whether balances should default to USD or ZAR.
            </Text>
            <View style={styles.currencyRow}>
              {(["USD"] as PreferredCurrency[]).map((currency) => {
                const selected = preferredCurrency === currency;
                const savingThisOption = currencySaving === currency;

                return (
                  <Pressable
                    key={currency}
                    onPress={() => updateCurrency(currency)}
                    disabled={!walletAddress || !!currencySaving}
                    style={[
                      styles.currencyOption,
                      selected && styles.currencyOptionSelected,
                    ]}
                  >
                    {savingThisOption ? (
                      <ActivityIndicator
                        color={selected ? colors.lime : colors.ink}
                      />
                    ) : (
                      <Text
                        style={[
                          styles.currencyLabel,
                          selected && styles.currencyLabelSelected,
                        ]}
                      >
                        {currency}
                      </Text>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        </>
      )}

      <PillButton
        onPress={logoutWallet}
        label="Sign out"
        loading={progress}
        testID="sign-out"
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingTop: 48, gap: 16, backgroundColor: colors.paper },
  section: { gap: 6 },
  title: { fontFamily: fonts.medium, fontSize: 28, color: colors.ink },
  subtitle: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.muted },
  loadingCard: {
    minHeight: 120,
    borderRadius: 20,
    backgroundColor: colors.canvas,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    backgroundColor: colors.canvas,
    borderRadius: 20,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  cardColumn: { backgroundColor: colors.canvas, borderRadius: 20, padding: 18, gap: 14 },
  rowCopy: { flex: 1, gap: 4 },
  rowTitle: { fontFamily: fonts.medium, fontSize: 16, color: colors.ink },
  rowDescription: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.muted },
  currencyRow: { flexDirection: "row", gap: 12 },
  currencyOption: {
    minWidth: 96,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.paper,
  },
  currencyOptionSelected: { backgroundColor: colors.ink, borderColor: colors.ink },
  currencyLabel: { fontFamily: fonts.medium, fontSize: 14, color: colors.ink },
  currencyLabelSelected: { color: colors.lime },
});
