import { formatUnits, parseUnits } from "viem";

const WAD = 10n ** 18n;

function wadFromNumber(multiplier: number) {
  if (!Number.isFinite(multiplier) || multiplier <= 0) {
    return WAD;
  }
  return BigInt(Math.round(multiplier * 1e18));
}

export function uiToRaw(qty: string | number, multiplier = 1, decimals = 8) {
  const ui = typeof qty === "number" ? qty.toString() : qty;
  const rawUi = parseUnits(ui, decimals);
  const wad = wadFromNumber(multiplier);
  return (rawUi * WAD) / wad;
}

export function rawToUi(raw: string | bigint, multiplier = 1, decimals = 8) {
  const amount = typeof raw === "bigint" ? raw : BigInt(raw || "0");
  const wad = wadFromNumber(multiplier);
  const uiRaw = (amount * wad) / WAD;
  return formatUnits(uiRaw, decimals);
}

export function needsApproval(actualAllowance: string, requiredAllowance: string) {
  return BigInt(actualAllowance || "0") < BigInt(requiredAllowance || "0");
}
