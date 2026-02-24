import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Linking,
} from 'react-native';
import { Screen } from '../../app';
import { useWallet } from '../../hooks/wallet';
import { Transfer } from '../../services';
import { COLORS } from '../constants';

interface Props { navigate: (s: Screen) => void; }

type Filter = 'ALL' | 'IN' | 'OUT';

export function TransactionsScreen({ navigate }: Props) {
  const { transfers, syncing, refresh } = useWallet();
  const [filter, setFilter] = useState<Filter>('ALL');

  const filtered = transfers.filter(t =>
    filter === 'ALL' ? true : t.direction === filter
  );

  const openEtherscan = (txHash: string) => {
    Linking.openURL(`https://etherscan.io/tx/${txHash}`);
  };

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigate('dashboard')}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Transactions</Text>
        <View style={{ width: 50 }} />
      </View>

      {/* ── Filter Pills ── */}
      <View style={styles.filters}>
        {(['ALL', 'IN', 'OUT'] as Filter[]).map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterPill, filter === f && styles.filterPillActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'ALL' ? 'All' : f === 'IN' ? '↙ Received' : '↗ Sent'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── List ── */}
      <FlatList
        data={filtered}
        keyExtractor={(t, i) => t.txHash + i}
        refreshControl={
          <RefreshControl refreshing={syncing} onRefresh={refresh} tintColor={COLORS.accent} />
        }
        contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>◌</Text>
            <Text style={styles.emptyText}>No transactions</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TransferItem item={item} onPress={() => openEtherscan(item.txHash)} />
        )}
      />
    </View>
  );
}

function TransferItem({ item, onPress }: { item: Transfer; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      {/* Direction Icon */}
      <View style={[styles.iconBox, item.direction === 'IN' ? styles.iconIn : styles.iconOut]}>
        <Text style={styles.iconText}>{item.direction === 'IN' ? '↙' : '↗'}</Text>
      </View>

      {/* Meta */}
      <View style={styles.meta}>
        <Text style={styles.dirLabel}>
          {item.direction === 'IN' ? 'Received' : 'Sent'}
        </Text>
        <Text style={styles.blockLabel}>Block {item.blockNumber.toLocaleString()}</Text>
        <Text style={styles.hashLabel}>{item.txHash.slice(0, 14)}…</Text>
      </View>

      {/* Amount + Status */}
      <View style={styles.right}>
        <Text style={[
          styles.amount,
          item.direction === 'IN' ? styles.amountIn : styles.amountOut,
        ]}>
          {item.direction === 'IN' ? '+' : '-'}${item.amount}
        </Text>
        <View style={[styles.badge, item.confirmed ? styles.badgeConfirmed : styles.badgePending]}>
          <Text style={[styles.badgeText, item.confirmed ? styles.badgeTextConfirmed : styles.badgeTextPending]}>
            {item.confirmed ? 'Confirmed' : 'Pending'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: COLORS.bg },

  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20, paddingBottom: 12,
  },
  backBtn: { color: COLORS.primary, fontSize: 15 },
  title:   { color: COLORS.textPrime, fontSize: 18, fontWeight: '700' },

  filters: {
    flexDirection: 'row', gap: 8,
    paddingHorizontal: 20, paddingBottom: 16,
  },
  filterPill: {
    flex: 1, paddingVertical: 8, borderRadius: 20,
    backgroundColor: COLORS.card, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  filterPillActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  filterText:       { color: COLORS.textSub, fontSize: 12, fontWeight: '600' },
  filterTextActive: { color: COLORS.bg },

  listContent:    { paddingHorizontal: 20, paddingBottom: 40 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyState:     { alignItems: 'center', paddingTop: 60 },
  emptyIcon:      { fontSize: 48, color: COLORS.textMuted, marginBottom: 12 },
  emptyText:      { color: COLORS.textMuted, fontSize: 15 },

  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.card, borderRadius: 14,
    padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: COLORS.border,
  },

  iconBox: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  iconIn:   { backgroundColor: 'rgba(0,212,170,0.12)' },
  iconOut:  { backgroundColor: 'rgba(45,156,219,0.12)' },
  iconText: { fontSize: 18 },

  meta:       { flex: 1 },
  dirLabel:   { color: COLORS.textPrime, fontSize: 14, fontWeight: '600' },
  blockLabel: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  hashLabel:  { color: COLORS.textMuted, fontSize: 11, fontFamily: 'monospace' },

  right:     { alignItems: 'flex-end', gap: 6 },
  amount:    { fontSize: 15, fontWeight: '700' },
  amountIn:  { color: COLORS.accent },
  amountOut: { color: COLORS.primary },

  badge:              { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  badgeConfirmed:     { backgroundColor: 'rgba(0,212,170,0.12)' },
  badgePending:       { backgroundColor: 'rgba(242,201,76,0.12)' },
  badgeText:          { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  badgeTextConfirmed: { color: COLORS.accent },
  badgeTextPending:   { color: COLORS.warning },
});