import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Screen } from '../../app';
import { useSend } from '../../hooks/send';
import { useWallet } from '../../hooks/wallet';
import { COLORS } from '../constants';

interface Props { navigate: (s: Screen) => void; }

type Step = 'form' | 'confirm' | 'success';

export function SendScreen({ navigate }: Props) {
  const { info } = useWallet();
  const [step, setStep] = useState<Step>('form');
  const [toAddress, setToAddress] = useState('');
  const [amount, setAmount]       = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [formError, setFormError] = useState('');

  const { sending, result, error: sendError, send, reset } = useSend(() => {
    setStep('success');
  });

  const validate = () => {
    if (!/^0x[0-9a-fA-F]{40}$/.test(toAddress.trim())) {
      setFormError('Invalid Ethereum address');
      return false;
    }
    const n = parseFloat(amount);
    if (isNaN(n) || n <= 0) {
      setFormError('Enter a valid amount');
      return false;
    }
    const bal = parseFloat(info?.usdcBalance ?? '0');
    if (n > bal) {
      setFormError(`Insufficient USDC balance (have $${info?.usdcBalance})`);
      return false;
    }
    const eth = parseFloat(info?.ethBalance ?? '0');
    if (eth < 0.0005) {
      setFormError('Low ETH balance — may not cover gas fees');
      return false;
    }
    setFormError('');
    return true;
  };

  const handleReview = () => {
    if (validate()) setStep('confirm');
  };

  const handleSend = async () => {
    await send(toAddress.trim(), amount, passphrase);
  };

  const handleReset = () => {
    setStep('form');
    setToAddress('');
    setAmount('');
    setPassphrase('');
    setFormError('');
    reset();
  };

  // ── Success ───────────────────────────────────────────────────────────────
  if (step === 'success' && result) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.successIcon}>✓</Text>
        <Text style={styles.successTitle}>Sent!</Text>
        <Text style={styles.successSub}>Your transaction has been broadcast</Text>
        <View style={styles.hashBox}>
          <Text style={styles.hashLabel}>TX HASH</Text>
          <Text style={styles.hashValue}>{result.txHash.slice(0, 20)}…</Text>
        </View>
        <TouchableOpacity style={styles.primaryBtn} onPress={handleReset}>
          <Text style={styles.primaryBtnText}>Send Another</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.ghostBtn} onPress={() => navigate('dashboard')}>
          <Text style={styles.ghostBtnText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>

        {/* ── Back + Title ── */}
        <View style={styles.topRow}>
          <TouchableOpacity onPress={() => navigate('dashboard')}>
            <Text style={styles.backBtn}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Send USDC</Text>
          <View style={{ width: 50 }} />
        </View>

        {/* ── Balance Pill ── */}
        <View style={styles.balancePill}>
          <Text style={styles.balancePillLabel}>Available</Text>
          <Text style={styles.balancePillValue}>${info?.usdcBalance ?? '—'}</Text>
        </View>

        {/* ── Form or Confirm ── */}
        {step === 'form' && (
          <>
            <Field label="Recipient Address">
              <TextInput
                style={styles.input}
                value={toAddress}
                onChangeText={setToAddress}
                placeholder="0x…"
                placeholderTextColor={COLORS.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </Field>

            <Field label="Amount (USDC)">
              <View style={styles.amountRow}>
                <TextInput
                  style={[styles.input, styles.amountInput]}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0.00"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="decimal-pad"
                />
                <TouchableOpacity
                  style={styles.maxBtn}
                  onPress={() => setAmount(info?.usdcBalance ?? '0')}
                >
                  <Text style={styles.maxBtnText}>MAX</Text>
                </TouchableOpacity>
              </View>
            </Field>

            {formError ? <Text style={styles.errorText}>{formError}</Text> : null}

            <View style={styles.gasWarning}>
              <Text style={styles.gasIcon}>⛽</Text>
              <Text style={styles.gasText}>
                ETH balance: {info?.ethBalance ?? '—'}
                {parseFloat(info?.ethBalance ?? '0') < 0.001 ? ' ⚠ Low' : ' ✓'}
              </Text>
            </View>

            <TouchableOpacity style={styles.primaryBtn} onPress={handleReview}>
              <Text style={styles.primaryBtnText}>Review →</Text>
            </TouchableOpacity>
          </>
        )}

        {step === 'confirm' && (
          <>
            <View style={styles.confirmCard}>
              <ConfirmRow label="To" value={`${toAddress.slice(0,8)}…${toAddress.slice(-6)}`} mono />
              <ConfirmRow label="Amount" value={`$${amount} USDC`} highlight />
              <ConfirmRow label="Network" value="Ethereum Mainnet" />
              <ConfirmRow label="Gas (est.)" value="~$0.80" />
            </View>

            <Field label="Wallet Passphrase">
              <TextInput
                style={styles.input}
                value={passphrase}
                onChangeText={setPassphrase}
                placeholder="Enter passphrase to sign"
                placeholderTextColor={COLORS.textMuted}
                secureTextEntry
              />
            </Field>

            {(sendError || formError) ? (
              <Text style={styles.errorText}>{sendError || formError}</Text>
            ) : null}

            <TouchableOpacity
              style={[styles.primaryBtn, sending && styles.primaryBtnDisabled]}
              onPress={handleSend}
              disabled={sending}
            >
              {sending
                ? <ActivityIndicator color={COLORS.bg} />
                : <Text style={styles.primaryBtnText}>Confirm & Send</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity style={styles.ghostBtn} onPress={() => setStep('form')}>
              <Text style={styles.ghostBtnText}>← Edit</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function ConfirmRow({ label, value, mono, highlight }: {
  label: string; value: string; mono?: boolean; highlight?: boolean;
}) {
  return (
    <View style={styles.confirmRow}>
      <Text style={styles.confirmLabel}>{label}</Text>
      <Text style={[
        styles.confirmValue,
        mono && { fontFamily: 'monospace' },
        highlight && styles.confirmHighlight,
      ]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: COLORS.bg },
  content:    { padding: 20, paddingBottom: 60 },
  centered:   { justifyContent: 'center', alignItems: 'center' },

  topRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 24,
  },
  backBtn: { color: COLORS.primary, fontSize: 15 },
  title:   { color: COLORS.textPrime, fontSize: 18, fontWeight: '700' },

  balancePill: {
    backgroundColor: COLORS.card, borderRadius: 40,
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
    marginBottom: 28, borderWidth: 1, borderColor: COLORS.border,
  },
  balancePillLabel: { color: COLORS.textSub, fontSize: 13 },
  balancePillValue: { color: COLORS.accent, fontSize: 13, fontWeight: '700' },

  field:      { marginBottom: 20 },
  fieldLabel: { color: COLORS.textSub, fontSize: 11, letterSpacing: 1.5, fontWeight: '700', marginBottom: 8 },

  input: {
    backgroundColor: COLORS.card, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.border,
    color: COLORS.textPrime, fontSize: 15,
    paddingHorizontal: 16, paddingVertical: 14,
  },

  amountRow:  { flexDirection: 'row', gap: 10 },
  amountInput:{ flex: 1 },
  maxBtn: {
    backgroundColor: COLORS.card, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.primary,
    paddingHorizontal: 16, justifyContent: 'center',
  },
  maxBtnText: { color: COLORS.primary, fontWeight: '700', fontSize: 12 },

  errorText: {
    color: COLORS.error, fontSize: 13, marginBottom: 12,
    backgroundColor: 'rgba(235,87,87,0.1)', padding: 10, borderRadius: 8,
  },

  gasWarning: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.card, borderRadius: 10,
    padding: 12, marginBottom: 24,
    borderWidth: 1, borderColor: COLORS.border,
  },
  gasIcon: { fontSize: 16 },
  gasText: { color: COLORS.textSub, fontSize: 13 },

  primaryBtn: {
    backgroundColor: COLORS.accent, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginBottom: 12,
  },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { color: COLORS.bg, fontSize: 16, fontWeight: '700' },

  ghostBtn:     { alignItems: 'center', paddingVertical: 12 },
  ghostBtnText: { color: COLORS.textSub, fontSize: 14 },

  confirmCard: {
    backgroundColor: COLORS.card, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.border,
    padding: 16, marginBottom: 24,
  },
  confirmRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  confirmLabel:    { color: COLORS.textSub, fontSize: 13 },
  confirmValue:    { color: COLORS.textPrime, fontSize: 13, fontWeight: '600' },
  confirmHighlight:{ color: COLORS.accent, fontSize: 15 },

  successIcon:  { fontSize: 64, color: COLORS.accent, marginBottom: 16 },
  successTitle: { color: COLORS.textPrime, fontSize: 28, fontWeight: '700', marginBottom: 8 },
  successSub:   { color: COLORS.textSub, fontSize: 14, marginBottom: 32 },
  hashBox: {
    backgroundColor: COLORS.card, borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 32,
    alignItems: 'center', width: '100%',
  },
  hashLabel: { color: COLORS.textMuted, fontSize: 10, letterSpacing: 2, marginBottom: 4 },
  hashValue: { color: COLORS.textPrime, fontFamily: 'monospace', fontSize: 13 },
});