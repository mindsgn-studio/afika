import { useCallback, useEffect, useState } from 'react';
import { Button, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import PocketCore from '@/modules/pocket-module';
import { Directory, Paths } from 'expo-file-system';

export default function App() {
  const [walletAddress, setWalletAddress] = useState('')
  const [summary, setSummary] = useState('')
  const [transactions, setTransactions] = useState('[]')
  const [backupPayload, setBackupPayload] = useState('')
  const [passphrase, setPassphrase] = useState('')
  const [destination, setDestination] = useState('')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [providerID, setProviderID] = useState('')
  const [status, setStatus] = useState('Initializing...')

  const refreshData = useCallback(async () => {
    const accountSummary = await PocketCore.getAccountSummary('gnosis-mainnet')
    setSummary(accountSummary)

    const tx = await PocketCore.getUsdcTransactions('gnosis-mainnet', 20, 0)
    setTransactions(tx)
  }, [])

  useEffect(() => { 
    const bootstrapWallet = async () => {
      const dataDir = new Directory(Paths.document);
      const password = 'dev-password-change-me'

      try {
        await PocketCore.initWalletSecure(dataDir.uri, password)
        const address = await PocketCore.openOrCreateWallet('Main Wallet')
        setWalletAddress(address)
        await refreshData()
        setStatus('Wallet ready')
      } catch (error) {
        setStatus(`Init failed: ${String(error)}`)
      }
    }

    bootstrapWallet()
  }, [refreshData])

  const onSendUsdc = async () => {
    try {
      setStatus('Sending USDC...')
      const result = await PocketCore.sendUsdc('gnosis-mainnet', destination, amount, note, providerID)
      setStatus(`Sent: ${result}`)
      await refreshData()
    } catch (error) {
      setStatus(`Send failed: ${String(error)}`)
    }
  }

  const onExportBackup = async () => {
    try {
      const payload = await PocketCore.exportBackup(passphrase)
      setBackupPayload(payload)
      setStatus('Backup exported')
    } catch (error) {
      setStatus(`Export failed: ${String(error)}`)
    }
  }

  const onImportBackup = async () => {
    try {
      const result = await PocketCore.importBackup(backupPayload, passphrase)
      setStatus(`Import result: ${result}`)
      await refreshData()
    } catch (error) {
      setStatus(`Import failed: ${String(error)}`)
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Pocket Money</Text>
      <Text style={styles.label}>Wallet</Text>
      <Text style={styles.value}>{walletAddress || 'Not ready'}</Text>

      <Text style={styles.label}>Account Summary (USDC / Gnosis)</Text>
      <Text style={styles.value}>{summary || '{}'}</Text>

      <Text style={styles.section}>Send USDC</Text>
      <TextInput style={styles.input} value={destination} onChangeText={setDestination} placeholder="Destination address" autoCapitalize="none" />
      <TextInput style={styles.input} value={amount} onChangeText={setAmount} placeholder="Amount (e.g. 1.50)" keyboardType="decimal-pad" />
      <TextInput style={styles.input} value={note} onChangeText={setNote} placeholder="Note" />
      <TextInput style={styles.input} value={providerID} onChangeText={setProviderID} placeholder="Provider ID (optional)" autoCapitalize="none" />
      <Button title="Send" onPress={onSendUsdc} />

      <Text style={styles.section}>Backup</Text>
      <TextInput style={styles.input} value={passphrase} onChangeText={setPassphrase} placeholder="Backup passphrase" secureTextEntry />
      <Button title="Export Backup" onPress={onExportBackup} />
      <View style={styles.spacer} />
      <Button title="Import Backup" onPress={onImportBackup} />
      <TextInput
        style={[styles.input, styles.multiline]}
        value={backupPayload}
        onChangeText={setBackupPayload}
        placeholder="Backup payload"
        multiline
      />

      <Text style={styles.section}>Transactions</Text>
      <Text style={styles.value}>{transactions}</Text>

      <Text style={styles.status}>{status}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 48,
    paddingHorizontal: 16,
    gap: 8
  },
  title: {
    fontSize: 24,
    fontWeight: '700'
  },
  section: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600'
  },
  label: {
    fontSize: 14,
    fontWeight: '600'
  },
  value: {
    fontSize: 12
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10
  },
  multiline: {
    minHeight: 100,
    textAlignVertical: 'top'
  },
  spacer: {
    height: 8
  },
  status: {
    marginTop: 12,
    fontSize: 12
  }
});
