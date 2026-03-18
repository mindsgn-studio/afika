import { useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BodyText, Input, PrimaryButton, Screen, Title } from '@/@src/components/Primitives';
import { pocketBackend } from '@/@src/lib/api/pocketBackend';
import useWallet from '@/@src/store/wallet';

const e164Pattern = /^\+[1-9][0-9]{7,14}$/;

export default function LinkPhoneScreen() {
  const router = useRouter();
  const { walletAddress, network } = useWallet();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const canSubmit = useMemo(() => {
    return walletAddress.length > 0 && network.length > 0 && e164Pattern.test(phoneNumber.trim());
  }, [walletAddress, network, phoneNumber]);

  const onLinkPhone = async () => {
    if (!canSubmit) {
      Alert.alert('Invalid phone number', 'Enter phone number in E.164 format, for example +27821234567.');
      return;
    }
    if (!pocketBackend.isConfigured()) {
      Alert.alert('Backend unavailable', 'Configure backend URLs to link phone number.');
      return;
    }

    setIsSaving(true);
    try {
      await pocketBackend.linkPhoneNumber(walletAddress.toLowerCase(), network, phoneNumber.trim());
      Alert.alert('Phone linked', 'Phone number linked successfully. Your account is now Level 1.');
      router.back();
    } catch {
      Alert.alert('Link failed', 'Could not link phone number right now. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Screen style={styles.screen}>
      <Title>Link Phone Number</Title>
      <BodyText style={styles.description}>
        Link your phone number in E.164 format to unlock Level 1 and trigger your gas gift.
      </BodyText>
      <View style={styles.form}>
        <Input
          testID="phone-input"
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          placeholder="+27821234567"
          keyboardType="phone-pad"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <PrimaryButton
          testID="link-phone-button"
          label={isSaving ? 'Linking...' : 'Link Phone Number'}
          onPress={onLinkPhone}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 16,
    paddingVertical: 48,
    gap: 16,
  },
  description: {
    color: '#A0A0AA',
  },
  form: {
    gap: 12,
    marginTop: 8,
  },
});
