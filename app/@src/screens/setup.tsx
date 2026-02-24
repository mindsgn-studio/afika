import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { walletBridge } from '../../services';
import { COLORS } from '../constants';

interface Props { onComplete: () => void; }

type Step = 'choose' | 'create' | 'backup' | 'import' | 'setpass';

export function SetupScreen({ onComplete }: Props) {
  const [step, setStep] = useState<Step>('choose');
  const [passphrase, setPassphrase]   = useState('');
  const [confirm, setConfirm]         = useState('');
  const [mnemonic, setMnemonic]       = useState('');
  const [importPhrase, setImportPhrase] = useState('');
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');

  const handleCreate = async () => {
    if (passphrase.length < 8) {
      setError('Passphrase must be at least 8 characters');
      return;
    }
    if (passphrase !== confirm) {
      setError('Passphrases do not match');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const phrase = await walletBridge.createWallet(passphrase);
      setMnemonic(phrase);
      setStep('backup');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    const words = importPhrase.trim().split(/\s+/);
    if (words.length !== 12 && words.length !== 24) {
      setError('Enter a 12 or 24-word seed phrase');
      return;
    }
    if (passphrase.length < 8) {
      setError('Passphrase must be at least 8 characters');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await walletBridge.importWallet(importPhrase.trim(), passphrase);
      onComplete();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Choose ─────────────────────────────────────────────────────────────────
  if (step === 'choose') return (
    <View style={[styles.container, styles.centered]}>
      <Text style={styles.logo}>⬡</Text>
      <Text style={styles.appName}>USDC Wallet</Text>
      <Text style={styles.tagline}>Non-custodial. Your keys, your coins.</Text>

      <TouchableOpacity style={styles.primaryBtn} onPress={() => setStep('setpass')}>
        <Text style={styles.primaryBtnText}>Create New Wallet</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.secondaryBtn} onPress={() => setStep('import')}>
        <Text style={styles.secondaryBtnText}>Import Seed Phrase</Text>
      </TouchableOpacity>
    </View>
  );

  // ── Set Passphrase ──────────────────────────────────────────────────────────
  if (step === 'setpass') return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.stepTitle}>Set a Passphrase</Text>
      <Text style={styles.stepSub}>
        This encrypts your seed phrase on this device. You'll need it to send transactions.
      </Text>

      <Field label="Passphrase">
        <TextInput
          style={styles.input} secureTextEntry
          value={passphrase} onChangeText={setPassphrase}
          placeholder="Min. 8 characters"
          placeholderTextColor={COLORS.textMuted}
        />
      </Field>
      <Field label="Confirm Passphrase">
        <TextInput
          style={styles.input} secureTextEntry
          value={confirm} onChangeText={setConfirm}
          placeholder="Repeat passphrase"
          placeholderTextColor={COLORS.textMuted}
        />
      </Field>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.primaryBtn, loading && styles.disabled]}
        onPress={handleCreate} disabled={loading}
      >
        {loading
          ? <ActivityIndicator color={COLORS.bg} />
          : <Text style={styles.primaryBtnText}>Generate Wallet →</Text>
        }
      </TouchableOpacity>
      <TouchableOpacity style={styles.ghostBtn} onPress={() => setStep('choose')}>
        <Text style={styles.ghostBtnText}>← Back</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  // ── Backup Seed ─────────────────────────────────────────────────────────────
  if (step === 'backup') return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.warningBanner}>⚠ Write this down safely</Text>
      <Text style={styles.stepTitle}>Your Seed Phrase</Text>
      <Text style={styles.stepSub}>
        This is the only way to recover your wallet. Never share it. Never store it digitally.
      </Text>

      <View style={styles.seedGrid}>
        {mnemonic.split(' ').map((word, i) => (
          <View key={i} style={styles.seedWord}>
            <Text style={styles.seedNum}>{i + 1}</Text>
            <Text style={styles.seedText}>{word}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={styles.primaryBtn}
        onPress={() => {
          Alert.alert(
            'Confirm',
            'Have you written down all 24 words in order?',
            [
              { text: 'Not yet', style: 'cancel' },
              { text: 'Yes, continue', onPress: onComplete },
            ]
          );
        }}
      >
        <Text style={styles.primaryBtnText}>I've Saved My Phrase →</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  // ── Import ──────────────────────────────────────────────────────────────────
  if (step === 'import') return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.stepTitle}>Import Wallet</Text>
      <Text style={styles.stepSub}>Enter your 12 or 24-word BIP-39 seed phrase.</Text>

      <Field label="Seed Phrase">
        <TextInput
          style={[styles.input, styles.seedInput]}
          value={importPhrase} onChangeText={setImportPhrase}
          placeholder="word1 word2 word3 …"
          placeholderTextColor={COLORS.textMuted}
          multiline autoCapitalize="none" autoCorrect={false}
        />
      </Field>
      <Field label="New Passphrase">
        <TextInput
          style={styles.input} secureTextEntry
          value={passphrase} onChangeText={setPassphrase}
          placeholder="Min. 8 characters"
          placeholderTextColor={COLORS.textMuted}
        />
      </Field>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.primaryBtn, loading && styles.disabled]}
        onPress={handleImport} disabled={loading}
      >
        {loading
          ? <ActivityIndicator color={COLORS.bg} />
          : <Text style={styles.primaryBtnText}>Import Wallet →</Text>
        }
      </TouchableOpacity>
      <TouchableOpacity style={styles.ghostBtn} onPress={() => setStep('choose')}>
        <Text style={styles.ghostBtnText}>← Back</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  return null;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: COLORS.bg },
  centered:      { justifyContent: 'center', alignItems: 'center', padding: 32 },
  scrollContent: { padding: 24, paddingBottom: 60 },

  logo:    { fontSize: 64, color: COLORS.accent, marginBottom: 12 },
  appName: { color: COLORS.textPrime, fontSize: 28, fontWeight: '700', marginBottom: 8 },
  tagline: { color: COLORS.textSub, fontSize: 14, textAlign: 'center', marginBottom: 48 },

  stepTitle: { color: COLORS.textPrime, fontSize: 24, fontWeight: '700', marginBottom: 8 },
  stepSub:   { color: COLORS.textSub, fontSize: 14, lineHeight: 20, marginBottom: 28 },

  warningBanner: {
    backgroundColor: 'rgba(242,201,76,0.12)', borderRadius: 10,
    color: COLORS.warning, padding: 12, fontSize: 13,
    fontWeight: '700', textAlign: 'center', marginBottom: 16,
  },

  field:      { marginBottom: 20 },
  fieldLabel: {
    color: COLORS.textSub, fontSize: 11, letterSpacing: 1.5,
    fontWeight: '700', marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.card, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.border,
    color: COLORS.textPrime, fontSize: 15,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  seedInput: { minHeight: 100, textAlignVertical: 'top' },

  seedGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 32,
  },
  seedWord: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.card, borderRadius: 8,
    borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 10, paddingVertical: 6,
    width: '30%',
  },
  seedNum:  { color: COLORS.textMuted, fontSize: 10, marginRight: 4, width: 16 },
  seedText: { color: COLORS.textPrime, fontSize: 12, fontFamily: 'monospace' },

  error: {
    color: COLORS.error, fontSize: 13, marginBottom: 16,
    backgroundColor: 'rgba(235,87,87,0.1)', padding: 10, borderRadius: 8,
  },

  primaryBtn: {
    backgroundColor: COLORS.accent, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginBottom: 12,
  },
  primaryBtnText: { color: COLORS.bg, fontSize: 16, fontWeight: '700' },

  secondaryBtn: {
    borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 14, paddingVertical: 16, alignItems: 'center',
  },
  secondaryBtnText: { color: COLORS.textSub, fontSize: 15 },

  ghostBtn:     { alignItems: 'center', paddingVertical: 12 },
  ghostBtnText: { color: COLORS.textSub, fontSize: 14 },

  disabled: { opacity: 0.5 },
});