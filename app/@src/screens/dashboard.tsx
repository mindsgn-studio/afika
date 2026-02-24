import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Animated, Clipboard,
} from 'react-native';
import { Screen } from '../../app';
import { useWallet } from '../../hooks/wallet';
import { COLORS } from '../constants';

interface Props { navigate: (s: Screen) => void; }

export function DashboardScreen({ navigate }: Props) {
  const { info, transfers, loading, syncing, refresh } = useWallet();
  const [copied, setCopied] = useState(false);
  const [balanceVisible, setBalanceVisible] = useState(true);

  const copyAddress = () => {
    if (info?.address) {
      Clipboard.setString(info.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shortAddr = (addr: string) =>
    addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : '—';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={syncing}
          onRefresh={refresh}
          tintColor={COLORS.accent}
        />
      }
    >
      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.headerLabel}>USDC WALLET</Text>
        <View style={[styles.syncDot, syncing && styles.syncDotActive]} />
      </View>

      {/* ── Balance Card ── */}
      <View style={styles.balanceCard}>
        <View style={styles.balanceRow}>
          <Text style={styles.balanceLabel}>USDC Balance</Text>
          <TouchableOpacity onPress={() => setBalanceVisible(v => !v)}>
            <Text style={styles.eyeIcon}>{balanceVisible ? '◉' : '◎'}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.balanceAmount}>
          {loading ? '——.——' : balanceVisible ? `$${info?.usdcBalance ?? '0.00'}` : '••••••'}
        </Text>

        <View style={styles.ethRow}>
          <Text style={styles.ethLabel}>ETH for gas</Text>
          <Text style={[
            styles.ethValue,
            parseFloat(info?.ethBalance ?? '0') < 0.001 && styles.ethValueLow,
          ]}>
            {loading ? '…' : `${info?.ethBalance ?? '0.000000'} ETH`}
          </Text>
        </View>

        {/* ── Address ── */}
        <TouchableOpacity style={styles.addressRow} onPress={copyAddress} activeOpacity={0.7}>
          <Text style={styles.addressText}>
            {loading ? '…' : shortAddr(info?.address ?? '')}
          </Text>
          <Text style={styles.copyLabel}>{copied ? '✓ Copied' : 'Copy'}</Text>
        </TouchableOpacity>
      </View>

      {/* ── Sync Info ── */}
      <Text style={styles.blockInfo}>
        {loading ? 'Syncing…' : `Synced to block ${info?.syncedBlock?.toLocaleString() ?? '—'}`}
      </Text>

      {/* ── Action Buttons ── */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => navigate('send')}
          activeOpacity={0.8}
        >
          <Text style={styles.actionIcon}>↗</Text>
          <Text style={styles.actionLabel}>Send</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnSecondary]}
          onPress={() => navigate('transactions')}
          activeOpacity={0.8}
        >
          <Text style={[styles.actionIcon, styles.actionIconSecondary]}>≡</Text>
          <Text style={[styles.actionLabel, styles.actionLabelSecondary]}>History</Text>
        </TouchableOpacity>
      </View>

      {/* ── Recent Activity ── */}
      <Text style={styles.sectionTitle}>Recent Activity</Text>

      {transfers.slice(0, 3).map((t, i) => (
        <View key={t.txHash + i} style={styles.transferRow}>
          <View style={[
            styles.directionBadge,
            t.direction === 'IN' ? styles.inBadge : styles.outBadge,
          ]}>
            <Text style={styles.directionText}>
              {t.direction === 'IN' ? '↙' : '↗'}
            </Text>
          </View>

          <View style={styles.transferMeta}>
            <Text style={styles.transferHash}>{t.txHash.slice(0, 10)}…</Text>
            <Text style={styles.transferBlock}>Block {t.blockNumber.toLocaleString()}</Text>
          </View>

          <View style={styles.transferRight}>
            <Text style={[
              styles.transferAmount,
              t.direction === 'IN' ? styles.amountIn : styles.amountOut,
            ]}>
              {t.direction === 'IN' ? '+' : '-'}${t.amount}
            </Text>
            <Text style={[
              styles.confirmStatus,
              t.confirmed ? styles.confirmed : styles.unconfirmed,
            ]}>
              {t.confirmed ? '✓' : '⏳'}
            </Text>
          </View>
        </View>
      ))}

      {transfers.length === 0 && !loading && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>◌</Text>
          <Text style={styles.emptyText}>No transactions yet</Text>
        </View>
      )}

      {transfers.length > 3 && (
        <TouchableOpacity onPress={() => navigate('transactions')} style={styles.viewAll}>
          <Text style={styles.viewAllText}>View all transactions →</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: COLORS.bg },
  content:    { padding: 20, paddingBottom: 40 },

  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 20,
  },
  headerLabel: {
    color: COLORS.textSub, fontSize: 11,
    letterSpacing: 3, fontWeight: '700',
  },
  syncDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.textMuted,
  },
  syncDotActive: { backgroundColor: COLORS.accent },

  balanceCard: {
    backgroundColor: COLORS.card, borderRadius: 20,
    padding: 24, marginBottom: 12,
    borderWidth: 1, borderColor: COLORS.border,
  },
  balanceRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 8,
  },
  balanceLabel: { color: COLORS.textSub, fontSize: 12, letterSpacing: 1 },
  eyeIcon:      { color: COLORS.textSub, fontSize: 16 },

  balanceAmount: {
    color: COLORS.textPrime, fontSize: 42,
    fontWeight: '300', letterSpacing: -1, marginBottom: 16,
  },

  ethRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border,
    marginBottom: 12,
  },
  ethLabel:    { color: COLORS.textSub, fontSize: 13 },
  ethValue:    { color: COLORS.textPrime, fontSize: 13, fontWeight: '600' },
  ethValueLow: { color: COLORS.warning },

  addressRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', backgroundColor: COLORS.surface,
    borderRadius: 10, padding: 10,
  },
  addressText: { color: COLORS.textSub, fontSize: 13, fontFamily: 'monospace' },
  copyLabel:   { color: COLORS.primary, fontSize: 12, fontWeight: '600' },

  blockInfo: {
    color: COLORS.textMuted, fontSize: 11,
    textAlign: 'center', marginBottom: 24, letterSpacing: 0.5,
  },

  actions: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  actionBtn: {
    flex: 1, backgroundColor: COLORS.accent,
    borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', flexDirection: 'row',
    justifyContent: 'center', gap: 8,
  },
  actionBtnSecondary: {
    backgroundColor: COLORS.card,
    borderWidth: 1, borderColor: COLORS.border,
  },
  actionIcon:          { color: COLORS.bg, fontSize: 18, fontWeight: '700' },
  actionIconSecondary: { color: COLORS.textSub },
  actionLabel:          { color: COLORS.bg, fontSize: 15, fontWeight: '700' },
  actionLabelSecondary: { color: COLORS.textSub },

  sectionTitle: {
    color: COLORS.textSub, fontSize: 11,
    letterSpacing: 2, fontWeight: '700',
    marginBottom: 12,
  },

  transferRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.card, borderRadius: 12,
    padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: COLORS.border,
  },
  directionBadge: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  inBadge:        { backgroundColor: 'rgba(0, 212, 170, 0.15)' },
  outBadge:       { backgroundColor: 'rgba(45, 156, 219, 0.15)' },
  directionText:  { fontSize: 16 },

  transferMeta: { flex: 1 },
  transferHash: { color: COLORS.textPrime, fontSize: 13, fontFamily: 'monospace' },
  transferBlock:{ color: COLORS.textMuted, fontSize: 11, marginTop: 2 },

  transferRight:  { alignItems: 'flex-end' },
  transferAmount: { fontSize: 14, fontWeight: '700' },
  amountIn:       { color: COLORS.accent },
  amountOut:      { color: COLORS.primary },

  confirmStatus:  { fontSize: 11, marginTop: 2 },
  confirmed:      { color: COLORS.accent },
  unconfirmed:    { color: COLORS.warning },

  emptyState:  { alignItems: 'center', paddingVertical: 40 },
  emptyIcon:   { fontSize: 40, color: COLORS.textMuted, marginBottom: 8 },
  emptyText:   { color: COLORS.textMuted, fontSize: 14 },

  viewAll:     { alignItems: 'center', paddingVertical: 12 },
  viewAllText: { color: COLORS.primary, fontSize: 13, fontWeight: '600' },
});