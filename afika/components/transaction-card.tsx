import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '@/theme/colors';
import * as Haptics from "expo-haptics"
<<<<<<< HEAD

function shortenAddress(addr: any) {
  if (!addr) return '';
  return addr.slice(0, 6) + '...' + addr.slice(-4);
}
=======
>>>>>>> 027395c94bd11b65accd657b1de20fec82b24362

function formatDate(timestamp: any) {
  if (!timestamp) {
    return "Just now";
  }
  const numericTimestamp = Number(timestamp);
  const date = new Date(numericTimestamp > 1e12 ? numericTimestamp : numericTimestamp * 1000);
  return date.toLocaleString();
}

function getDisplayAmount(tx: any) {
  if (tx.usdAmount && !Number.isNaN(Number(tx.usdAmount))) {
    return `$ ${Number(tx.usdAmount).toFixed(2)}`;
  }

  if (tx.amount && tx.tokenSymbol) {
    return `${tx.amount} ${tx.tokenSymbol}`;
  }

  return tx.tokenSymbol || "Pending";
}

export default function TransactionCard({ tx }: { tx: any}) {
  return (
    <TouchableOpacity 
      style={styles.card}
<<<<<<< HEAD
=======
      onPress={() => {}}
>>>>>>> 027395c94bd11b65accd657b1de20fec82b24362
      onPressIn={() => [
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)  
      ]}
      onPressOut={() => {
         Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid)  
      }}
    >
      <View>
        {
          tx.direction === 'credit' ? 
          <View style={{flexDirection: "row"}}>
            <Ionicons style={[styles.primaryBalance, {color: "#00E71F"}]} name='arrow-down' />
            <Text style={styles.secondaryBalance}>Recieved {tx.tokenSymbol}</Text>
          </View>
            
          :
          <View style={{flexDirection: "row"}}>
            <Ionicons style={[styles.primaryBalance, {color: "#FF225E"}]} name='arrow-up' />
            <Text style={styles.secondaryBalance}>Sent {tx.tokenSymbol}</Text>
          </View>

        }

        <Text style={styles.meta}>
          {(tx.state || "pending").toString()} • {formatDate(tx.timestampMs || tx.timestamp)}
        </Text>
      </View>
      
      <View>
        <Text style={styles.primaryBalance}>
           {getDisplayAmount(tx)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    flexDirection: "row",
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    padding: 20,
    gap: 6,
    // borderColor: '#2A3143',
    marginBottom: 16,
    justifyContent: "space-between"
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 4,
  },

  networkBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: '#60A5FA',
    backgroundColor: '#1E2D4A',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
    overflow: 'hidden',
  },
  primaryBalance: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  secondaryBalance: {
    fontSize: 15,
    color: '#94A3B8',
    fontWeight: '500',
  },

  address: {
    marginTop: 6,
    fontSize: 13,
    color: '#64748B',
    fontFamily: 'monospace',
  },

  meta: {
    marginTop: 10,
    fontSize: 12,
    color: '#475569',
  },
});
