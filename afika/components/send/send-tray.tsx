import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";

import { Tray, useTray } from "@/shared/ui/organisms/tray";
import { colors, fonts } from "@/theme";
import { useSendUsdc } from "@/hooks/use-send-usdc";
import { useCurrency } from "@/hooks/use-currency";
import { shortenAddress } from "@/lib/wallet";
import { currencySymbol } from "@/lib/money";
import {
  fromUsdcAmount,
  SEND_AMOUNT_CURRENCIES,
  toUsdcAmount,
  validateCurrencySendAmount,
  validateRecipient,
  type SendAmountCurrency,
} from "@/lib/send";
import ScanTray from "@/components/send/scan-tray";

const PALETTE = {
  surface: colors.ink,
  border: colors.inkSoft,
  handle: colors.muted,
  text: colors.paper,
  mutedText: colors.muted,
  backdrop: "rgba(0,0,0,0.55)",
};

function amountCurrencyLabel(currency: SendAmountCurrency) {
  return currency === "USDC" ? "USDC" : currencySymbol(currency);
}

function TrayHead({ title, back }: { title: string; back?: boolean }) {
  return (
    <Tray.Header>
      <View style={styles.headerRow}>
        {back ? (
          <Tray.Back>
            {({ color, size }) => (
              <Feather name="chevron-left" size={size} color={color} />
            )}
          </Tray.Back>
        ) : null}
        <Tray.Title>{title}</Tray.Title>
      </View>
      <Tray.Close>
        {({ color, size }) => <Feather name="x" size={size} color={color} />}
      </Tray.Close>
    </Tray.Header>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value}</Text>
    </View>
  );
}

function RecipientView({
  recipient,
  onChange,
}: {
  recipient: string;
  onChange: (value: string) => void;
}) {
  const { setView } = useTray();
  const [error, setError] = useState<string | null>(null);

  return (
    <Tray.View id="recipient">
      <View testID="send-recipient">
        <TrayHead title="Send to" />
        <Tray.Body>
          <Text style={styles.fieldLabel}>Recipient address</Text>
          <View style={styles.inputRow}>
            <TextInput
              testID="send-recipient-input"
              value={recipient}
              onChangeText={(next) => {
                onChange(next);
                setError(null);
              }}
              placeholder="0x…"
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              style={[styles.input, styles.recipientInput]}
            />
            <ScanTray
              onScanned={(address) => {
                onChange(address);
                setError(null);
              }}
            />
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </Tray.Body>
        <Tray.Footer>
          <Pressable
            testID="send-recipient-next"
            style={styles.primary}
            onPress={() => {
              const nextError = validateRecipient(recipient);
              setError(nextError);
              if (!nextError) setView("amount");
            }}
          >
            <Text style={styles.primaryLabel}>Next</Text>
          </Pressable>
        </Tray.Footer>
      </View>
    </Tray.View>
  );
}

function AmountView({
  amount,
  onChange,
  available,
  decimals,
  tokenSymbol,
  currency,
  onCurrencyChange,
  rates,
}: {
  amount: string;
  onChange: (value: string) => void;
  available: string;
  decimals: number;
  tokenSymbol: string;
  currency: SendAmountCurrency;
  onCurrencyChange: (currency: SendAmountCurrency) => void;
  rates: Record<SendAmountCurrency, number>;
}) {
  const { setView, goBack } = useTray();
  const [error, setError] = useState<string | null>(null);
  const rate = rates[currency];
  const usdcAmount = toUsdcAmount(amount, currency, rate, decimals);

  const handleCurrencyChange = (next: SendAmountCurrency) => {
    if (next === currency) return;
    setError(null);
    if (amount.trim()) {
      const converted = fromUsdcAmount(usdcAmount, next, rates[next], 2);
      onChange(converted === "0" ? "" : converted);
    }
    onCurrencyChange(next);
  };

  return (
    <Tray.View id="amount">
      <View testID="send-amount">
        <TrayHead title="Amount" back />
        <Tray.Body>
          <View style={styles.amountRow}>
            <Text style={styles.amountValue}>{amount || "0"}</Text>
            <Text style={styles.amountSymbol}>
              {amountCurrencyLabel(currency)}
            </Text>
          </View>

          <View style={styles.currencyRow}>
            {SEND_AMOUNT_CURRENCIES.map((code) => {
              const on = code === currency;
              return (
                <Pressable
                  key={code}
                  testID={`send-currency-${code}`}
                  onPress={() => handleCurrencyChange(code)}
                  style={[styles.currencyPill, on && styles.currencyPillOn]}
                >
                  <Text
                    style={[
                      styles.currencyLabel,
                      on && styles.currencyLabelOn,
                    ]}
                  >
                    {amountCurrencyLabel(code)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.available}>
            Available {available} {tokenSymbol}
          </Text>
          {currency !== "USDC" && usdcAmount !== "0" ? (
            <Text style={styles.converted}>
              ≈ {usdcAmount} {tokenSymbol}
            </Text>
          ) : null}
          <TextInput
            testID="send-amount-input"
            value={amount}
            onChangeText={(next) => {
              onChange(next);
              setError(null);
            }}
            placeholder="0.00"
            placeholderTextColor={colors.muted}
            keyboardType="decimal-pad"
            style={styles.input}
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <Pressable
            onPress={() => {
              onChange(fromUsdcAmount(available, currency, rate, 2));
              setError(null);
            }}
          >
            <Text style={styles.maxLabel}>Use max</Text>
          </Pressable>
        </Tray.Body>
        <Tray.Footer>
          <Pressable
            testID="send-amount-next"
            style={styles.primary}
            onPress={() => {
              const nextError = validateCurrencySendAmount(
                amount,
                currency,
                available,
                decimals,
                rate,
              );
              setError(nextError);
              if (!nextError) setView("review");
            }}
          >
            <Text style={styles.primaryLabel}>Review</Text>
          </Pressable>
          <Pressable style={styles.ghost} onPress={goBack}>
            <Text style={styles.ghostLabel}>Back</Text>
          </Pressable>
        </Tray.Footer>
      </View>
    </Tray.View>
  );
}

function ReviewView({
  recipient,
  amount,
  tokenSymbol,
  onSend,
  onError,
}: {
  recipient: string;
  amount: string;
  tokenSymbol: string;
  onSend: (recipient: string, amount: string) => Promise<unknown>;
  onError: (message: string) => void;
}) {
  const { goBack, setView } = useTray();

  const confirm = async () => {
    setView("sending");
    try {
      await onSend(recipient, amount);
      setView("success");
    } catch (cause) {
      onError(cause instanceof Error ? cause.message : "The transfer failed.");
      setView("error");
    }
  };

  return (
    <Tray.View id="review">
      <View testID="send-review">
        <TrayHead title="Review" back />
        <Tray.Body>
          <View style={styles.amountRow}>
            <Text style={styles.amountValue}>{amount || "0"}</Text>
            <Text style={styles.amountSymbol}>{tokenSymbol}</Text>
          </View>
          <View style={styles.fields}>
            <Field label="To" value={shortenAddress(recipient)} />
            <Field label="Network" value="Base" />
            <Field label="Network fee" value="Sponsored" />
          </View>
          <Text style={styles.hint}>
            Confirm to send {amount} {tokenSymbol} to{" "}
            {shortenAddress(recipient)}.
          </Text>
        </Tray.Body>
        <Tray.Footer>
          <Pressable
            testID="send-confirm"
            style={styles.primary}
            onPress={confirm}
          >
            <Text style={styles.primaryLabel}>Confirm</Text>
          </Pressable>
          <Pressable style={styles.ghost} onPress={goBack}>
            <Text style={styles.ghostLabel}>Back</Text>
          </Pressable>
        </Tray.Footer>
      </View>
    </Tray.View>
  );
}

function SendingView() {
  return (
    <Tray.View id="sending">
      <View testID="send-sending">
        <Tray.Body>
          <View style={styles.status}>
            <ActivityIndicator color={colors.lime} />
            <Text style={styles.statusTitle}>Sending</Text>
            <Text style={styles.statusDetail}>Broadcasting to the network…</Text>
          </View>
        </Tray.Body>
      </View>
    </Tray.View>
  );
}

function SuccessView({
  recipient,
  amount,
  tokenSymbol,
  onDone,
}: {
  recipient: string;
  amount: string;
  tokenSymbol: string;
  onDone: () => void;
}) {
  const { close } = useTray();
  return (
    <Tray.View id="success">
      <View testID="send-success">
        <Tray.Body>
          <View style={styles.status}>
            <View style={styles.successMark}>
              <Feather name="check" size={26} color={colors.ink} />
            </View>
            <Text style={styles.statusTitle}>
              Sent {amount} {tokenSymbol}
            </Text>
            <Text style={styles.statusDetail}>
              to {shortenAddress(recipient)}
            </Text>
          </View>
        </Tray.Body>
        <Tray.Footer>
          <Pressable
            style={styles.primary}
            onPress={() => {
              onDone();
              close();
            }}
          >
            <Text style={styles.primaryLabel}>Done</Text>
          </Pressable>
        </Tray.Footer>
      </View>
    </Tray.View>
  );
}

function ErrorView({
  message,
  onRetry,
  onDone,
}: {
  message: string | null;
  onRetry: () => void;
  onDone: () => void;
}) {
  const { close, setView } = useTray();
  return (
    <Tray.View id="error">
      <View testID="send-error">
        <Tray.Body>
          <View style={styles.status}>
            <View style={[styles.successMark, styles.errorMark]}>
              <Feather name="alert-triangle" size={24} color={colors.paper} />
            </View>
            <Text style={styles.statusTitle}>Transfer failed</Text>
            <Text style={styles.statusDetail}>
              {message || "Something went wrong while sending."}
            </Text>
          </View>
        </Tray.Body>
        <Tray.Footer>
          <Pressable
            testID="send-error-retry"
            style={styles.primary}
            onPress={() => {
              onRetry();
              setView("review");
            }}
          >
            <Text style={styles.primaryLabel}>Try again</Text>
          </Pressable>
          <Pressable
            style={styles.ghost}
            onPress={() => {
              onDone();
              close();
            }}
          >
            <Text style={styles.ghostLabel}>Close</Text>
          </Pressable>
        </Tray.Footer>
      </View>
    </Tray.View>
  );
}

/**
 * Send money to another address. Opened from a `Tray.Trigger` pill and driven
 * by `useSendUsdc`, which broadcasts an exact USDC transfer from the active
 * smart wallet and records pending → submitted/failed states.
 */
export default function SendTray() {
  const { available, decimals, tokenSymbol, error, resetError, send } =
    useSendUsdc();
  const { rates } = useCurrency();
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [amountCurrency, setAmountCurrency] =
    useState<SendAmountCurrency>("USDC");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const rateByCurrency = useMemo<Record<SendAmountCurrency, number>>(
    () => ({ USDC: 1, ZAR: rates.ZAR, EUR: rates.EUR }),
    [rates.ZAR, rates.EUR],
  );
  const rate = rateByCurrency[amountCurrency];
  const usdcAmount = useMemo(
    () => toUsdcAmount(amount, amountCurrency, rate, decimals),
    [amount, amountCurrency, rate, decimals],
  );

  const reset = useCallback(() => {
    setRecipient("");
    setAmount("");
    setAmountCurrency("USDC");
    setSubmitError(null);
    resetError();
  }, [resetError]);

  return (
    <Tray
      theme="dark"
      palette={PALETTE}
      defaultView="recipient"
      motion={{ viewAxis: "x", viewSlide: 90, viewStartScale: 1, startScale: 0.5 }}
    >
      <View testID="send-tray-trigger">
        <Tray.Trigger style={styles.trigger}>
          <Feather name="arrow-up-right" size={17} color={colors.ink} />
          <Text style={styles.triggerLabel}>Send</Text>
        </Tray.Trigger>
      </View>

      <Tray.Content>
        <RecipientView recipient={recipient} onChange={setRecipient} />
        <AmountView
          amount={amount}
          onChange={setAmount}
          available={available}
          decimals={decimals}
          tokenSymbol={tokenSymbol}
          currency={amountCurrency}
          onCurrencyChange={setAmountCurrency}
          rates={rateByCurrency}
        />
        <ReviewView
          recipient={recipient}
          amount={usdcAmount}
          tokenSymbol={tokenSymbol}
          onSend={send}
          onError={setSubmitError}
        />
        <SendingView />
        <SuccessView
          recipient={recipient}
          amount={usdcAmount}
          tokenSymbol={tokenSymbol}
          onDone={reset}
        />
        <ErrorView
          message={submitError || error}
          onRetry={() => {
            setSubmitError(null);
            resetError();
          }}
          onDone={reset}
        />
      </Tray.Content>
    </Tray>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: colors.lime,
  },
  triggerLabel: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.ink,
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  fieldLabel: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.muted,
  },
  fieldValue: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.paper,
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  fields: { marginTop: 8 },
  input: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.inkSoft,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.paper,
    fontFamily: fonts.regular,
    fontSize: 16,
    backgroundColor: colors.inkSoft,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
  },
  recipientInput: { flex: 1, marginTop: 0 },
  errorText: {
    marginTop: 8,
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.red,
  },
  hint: {
    marginTop: 14,
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.muted,
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
  },
  amountValue: {
    fontFamily: fonts.semibold,
    fontSize: 40,
    color: colors.paper,
    letterSpacing: -1,
  },
  amountSymbol: {
    fontFamily: fonts.medium,
    fontSize: 18,
    color: colors.muted,
    paddingBottom: 6,
  },
  available: {
    textAlign: "center",
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.muted,
  },
  converted: {
    marginTop: 4,
    textAlign: "center",
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.lime,
  },
  currencyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
  },
  currencyPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.inkSoft,
    backgroundColor: colors.inkSoft,
  },
  currencyPillOn: {
    borderColor: colors.lime,
    backgroundColor: colors.lime,
  },
  currencyLabel: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.muted,
  },
  currencyLabelOn: { color: colors.ink },
  maxLabel: {
    marginTop: 10,
    textAlign: "center",
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.lime,
  },
  status: { alignItems: "center", gap: 10, paddingVertical: 24 },
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
  successMark: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.lime,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  errorMark: { backgroundColor: colors.red },
  primary: {
    backgroundColor: colors.lime,
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: "center",
  },
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
