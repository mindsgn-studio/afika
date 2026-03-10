import type { SmartAccountCreationReadiness } from '@/@src/store/wallet';

type BackendErrorEnvelope = {
  error?: {
    code?: string;
    message?: string;
    retryable?: boolean;
  };
  requestId?: string;
};

type BackendSuccess<T> = {
  data: T;
  requestId?: string;
  timingsMs?: Record<string, number>;
};

type SponsoredCreateResponse = {
  ownerAddress?: string;
  predictedAccountAddress?: string;
  entryPointAddress?: string;
  chainId?: string;
  userOperation?: {
    sender: string;
    nonce: string;
    initCode: string;
    callData: string;
    callGasLimit: string;
    verificationGasLimit: string;
    preVerificationGas: string;
    maxFeePerGas: string;
    maxPriorityFeePerGas: string;
    paymasterAndData: string;
    signature: string;
  };
  network?: string;
};

type SponsoredSubmitResponse = {
  network?: string;
  entryPointAddress?: string;
  userOpHash?: string;
  status?: string;
};

type PrepareOwnerResponse = {
  network: string;
  ownerAddress: string;
  status: 'already_funded' | 'funded';
  funded: boolean;
  txHash?: string;
  ownerBalanceWei: string;
  requiredMinGasWei: string;
};

const BASE_URL = (process.env.EXPO_PUBLIC_POCKET_BACKEND_BASE_URL || '').trim().replace(/\/$/, '');
const API_KEY = (process.env.EXPO_PUBLIC_POCKET_BACKEND_API_KEY || '').trim();

function isConfigured() {
  return BASE_URL.length > 0;
}

function buildHeaders() {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (API_KEY) {
    headers['X-API-Key'] = API_KEY;
  }
  return headers;
}

async function callBackend<T>(path: string, body?: Record<string, unknown>): Promise<T> {
  if (!isConfigured()) {
    throw new Error('backend_not_configured');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      method: body ? 'POST' : 'GET',
      headers: buildHeaders(),
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    const json = (await response.json()) as BackendSuccess<T> | BackendErrorEnvelope;
    if (!response.ok) {
      const errorMessage = ('error' in json ? json.error?.message : undefined) || `backend_request_failed_${response.status}`;
      throw new Error(errorMessage);
    }

    return (json as BackendSuccess<T>).data;
  } finally {
    clearTimeout(timeout);
  }
}

export const pocketBackend = {
  isConfigured,
  async health() {
    return callBackend<{ ok: boolean; service: string; version: string; timestamp: string }>('/health');
  },
  async getCreationReadiness(network: string, ownerAddress: string) {
    return callBackend<SmartAccountCreationReadiness>('/v1/aa/readiness', { network, ownerAddress });
  },
  async prepareOwner(network: string, ownerAddress: string) {
    return callBackend<PrepareOwnerResponse>('/v1/aa/prepare-owner', { network, ownerAddress });
  },
  async createSponsoredSmartAccount(network: string, ownerAddress: string) {
    return callBackend<SponsoredCreateResponse>('/v1/aa/create-sponsored', { network, ownerAddress });
  },
  async submitSponsoredUserOperation(input: {
    network: string;
    entryPointAddress?: string;
    userOperation: SponsoredCreateResponse['userOperation'];
  }) {
    return callBackend<SponsoredSubmitResponse>('/v1/aa/send-sponsored', {
      network: input.network,
      entryPointAddress: input.entryPointAddress || '',
      userOperation: input.userOperation,
    });
  },
};
