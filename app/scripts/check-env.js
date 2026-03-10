#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const appRoot = path.resolve(__dirname, '..');
const easPath = path.join(appRoot, 'eas.json');

const REQUIRED_KEYS = [
  'EXPO_PUBLIC_APP_ENV',
  'EXPO_PUBLIC_POCKET_APP_ENV',
  'EXPO_PUBLIC_POCKET_FACTORY_ETHEREUM_SEPOLIA',
  'EXPO_PUBLIC_POCKET_IMPLEMENTATION_ETHEREUM_SEPOLIA',
  'EXPO_PUBLIC_POCKET_ENTRY_POINT_ETHEREUM_SEPOLIA',
  'EXPO_PUBLIC_POCKET_BUNDLER_URL_ETHEREUM_SEPOLIA',
  'EXPO_PUBLIC_POCKET_PAYMASTER_ETHEREUM_SEPOLIA',
  'EXPO_PUBLIC_POCKET_OWNER_MIN_GAS_WEI_ETHEREUM_SEPOLIA',
  'EXPO_PUBLIC_POCKET_FACTORY_ETHEREUM_MAINNET',
  'EXPO_PUBLIC_POCKET_IMPLEMENTATION_ETHEREUM_MAINNET',
  'EXPO_PUBLIC_POCKET_ENTRY_POINT_ETHEREUM_MAINNET',
  'EXPO_PUBLIC_POCKET_BUNDLER_URL_ETHEREUM_MAINNET',
  'EXPO_PUBLIC_POCKET_PAYMASTER_ETHEREUM_MAINNET',
  'EXPO_PUBLIC_POCKET_OWNER_MIN_GAS_WEI_ETHEREUM_MAINNET',
  'EXPO_PUBLIC_POCKET_PAYMASTER_ENABLED',
  'EXPO_PUBLIC_POCKET_PAYMASTER_TOKEN',
  'EXPO_PUBLIC_POCKET_PAYMASTER_MAX_PER_OP_UNITS',
  'EXPO_PUBLIC_POCKET_PAYMASTER_DAILY_LIMIT_UNITS',
  'EXPO_PUBLIC_POCKET_PAYMASTER_DAILY_OP_LIMIT',
  'EXPO_PUBLIC_POCKET_BACKEND_BASE_URL',
  'EXPO_PUBLIC_POCKET_BACKEND_API_KEY'
];

const PROFILE_NON_EMPTY_KEYS = {
  development: [
    'EXPO_PUBLIC_APP_ENV',
    'EXPO_PUBLIC_POCKET_APP_ENV',
    'EXPO_PUBLIC_POCKET_FACTORY_ETHEREUM_SEPOLIA',
    'EXPO_PUBLIC_POCKET_IMPLEMENTATION_ETHEREUM_SEPOLIA',
    'EXPO_PUBLIC_POCKET_ENTRY_POINT_ETHEREUM_SEPOLIA',
    'EXPO_PUBLIC_POCKET_BUNDLER_URL_ETHEREUM_SEPOLIA',
    'EXPO_PUBLIC_POCKET_PAYMASTER_ETHEREUM_SEPOLIA',
    'EXPO_PUBLIC_POCKET_OWNER_MIN_GAS_WEI_ETHEREUM_SEPOLIA',
    'EXPO_PUBLIC_POCKET_PAYMASTER_ENABLED',
    'EXPO_PUBLIC_POCKET_PAYMASTER_TOKEN',
    'EXPO_PUBLIC_POCKET_BACKEND_BASE_URL'
  ],
  preview: [
    'EXPO_PUBLIC_APP_ENV',
    'EXPO_PUBLIC_POCKET_APP_ENV',
    'EXPO_PUBLIC_POCKET_FACTORY_ETHEREUM_SEPOLIA',
    'EXPO_PUBLIC_POCKET_IMPLEMENTATION_ETHEREUM_SEPOLIA',
    'EXPO_PUBLIC_POCKET_ENTRY_POINT_ETHEREUM_SEPOLIA',
    'EXPO_PUBLIC_POCKET_BUNDLER_URL_ETHEREUM_SEPOLIA',
    'EXPO_PUBLIC_POCKET_PAYMASTER_ETHEREUM_SEPOLIA',
    'EXPO_PUBLIC_POCKET_OWNER_MIN_GAS_WEI_ETHEREUM_SEPOLIA',
    'EXPO_PUBLIC_POCKET_PAYMASTER_ENABLED',
    'EXPO_PUBLIC_POCKET_PAYMASTER_TOKEN',
    'EXPO_PUBLIC_POCKET_BACKEND_BASE_URL'
  ],
  production: [
    'EXPO_PUBLIC_APP_ENV',
    'EXPO_PUBLIC_POCKET_APP_ENV',
    'EXPO_PUBLIC_POCKET_FACTORY_ETHEREUM_MAINNET',
    'EXPO_PUBLIC_POCKET_IMPLEMENTATION_ETHEREUM_MAINNET',
    'EXPO_PUBLIC_POCKET_ENTRY_POINT_ETHEREUM_MAINNET',
    'EXPO_PUBLIC_POCKET_BUNDLER_URL_ETHEREUM_MAINNET',
    'EXPO_PUBLIC_POCKET_PAYMASTER_ETHEREUM_MAINNET',
    'EXPO_PUBLIC_POCKET_OWNER_MIN_GAS_WEI_ETHEREUM_MAINNET',
    'EXPO_PUBLIC_POCKET_PAYMASTER_ENABLED',
    'EXPO_PUBLIC_POCKET_PAYMASTER_TOKEN',
    'EXPO_PUBLIC_POCKET_BACKEND_BASE_URL'
  ]
};

function readJSON(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`Unable to read ${filePath}: ${error.message}`);
  }
}

function isEmpty(value) {
  return value === undefined || value === null || String(value).trim() === '';
}

function validateEASBuildProfiles(eas) {
  const build = eas && eas.build;
  if (!build || typeof build !== 'object') {
    return ['Missing top-level build object in eas.json'];
  }

  const errors = [];
  const profiles = Object.keys(PROFILE_NON_EMPTY_KEYS);

  for (const profileName of profiles) {
    const profile = build[profileName];
    if (!profile || typeof profile !== 'object') {
      errors.push(`Missing build profile: ${profileName}`);
      continue;
    }

    const env = profile.env;
    if (!env || typeof env !== 'object') {
      errors.push(`Missing env map for profile: ${profileName}`);
      continue;
    }

    for (const key of REQUIRED_KEYS) {
      if (!(key in env)) {
        errors.push(`[${profileName}] missing key: ${key}`);
      }
    }

    for (const key of PROFILE_NON_EMPTY_KEYS[profileName]) {
      if (isEmpty(env[key])) {
        errors.push(`[${profileName}] required non-empty value: ${key}`);
      }
    }
  }

  return errors;
}

function run() {
  const eas = readJSON(easPath);
  const errors = validateEASBuildProfiles(eas);

  if (errors.length > 0) {
    console.error('Environment profile validation failed:');
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log('Environment profile validation passed.');
}

run();
