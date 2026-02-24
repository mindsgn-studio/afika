import React, { useState } from 'react';
import {
  StyleSheet, View, Text, StatusBar, SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { DashboardScreen } from './../@src/screens/dashboard';
import { SendScreen } from './../@src/screens/send';
import { TransactionsScreen } from './../@src/screens/transactions';
import { SetupScreen } from './../@src/screens/setup';
import { COLORS } from '../@src/constants';

export type Screen = 'setup' | 'dashboard' | 'send' | 'transactions';

export default function App() {
  const [screen, setScreen] = useState<Screen>('dashboard');
  const [walletReady, setWalletReady] = useState(true);

  if (!walletReady) {
    return <SetupScreen onComplete={() => setWalletReady(true)} />;
  }

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      <View style={styles.content}>
        {screen === 'dashboard'     && <DashboardScreen navigate={setScreen} />}
        {screen === 'send'          && <SendScreen navigate={setScreen} />}
        {screen === 'transactions'  && <TransactionsScreen navigate={setScreen} />}
      </View>

      <View style={styles.tabBar}>
        <TabButton label="Home"    icon="⬡" active={screen === 'dashboard'}    onPress={() => setScreen('dashboard')} />
        <TabButton label="Send"    icon="↗" active={screen === 'send'}         onPress={() => setScreen('send')} />
        <TabButton label="History" icon="≡" active={screen === 'transactions'} onPress={() => setScreen('transactions')} />
      </View>
    </SafeAreaView>
  );
}

function TabButton({ label, icon, active, onPress }: {
  label: string; icon: string; active: boolean; onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.tab} onPress={onPress} activeOpacity={0.7}>
      <Text style={[styles.tabIcon, active && styles.tabIconActive]}>{icon}</Text>
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingBottom: 8,
    paddingTop: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  tabIcon: {
    fontSize: 20,
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  tabIconActive: {
    color: COLORS.accent,
  },
  tabLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  tabLabelActive: {
    color: COLORS.accent,
  },
});