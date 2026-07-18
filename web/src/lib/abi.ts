export const factoryAbi = [
  {
    type: "function",
    name: "createVault",
    stateMutability: "payable",
    inputs: [
      { name: "recovery", type: "address" },
      { name: "canary", type: "address" },
      { name: "delay", type: "uint64" },
      { name: "baitAmount", type: "uint256" },
      { name: "canaryGas", type: "uint256" },
    ],
    outputs: [
      { name: "vault", type: "address" },
      { name: "bait", type: "address" },
    ],
  },
  {
    type: "function",
    name: "latestVaultOf",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    name: "vaultsOf",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ type: "address[]" }],
  },
  {
    type: "function",
    name: "deploymentOf",
    stateMutability: "view",
    inputs: [{ name: "vault", type: "address" }],
    outputs: [
      { name: "vault", type: "address" },
      { name: "bait", type: "address" },
      { name: "canary", type: "address" },
      { name: "recovery", type: "address" },
      { name: "delay", type: "uint64" },
      { name: "createdAt", type: "uint64" },
    ],
  },
  {
    type: "event",
    name: "VaultCreated",
    inputs: [
      { name: "owner", type: "address", indexed: true },
      { name: "vault", type: "address", indexed: true },
      { name: "bait", type: "address", indexed: true },
      { name: "canary", type: "address", indexed: false },
      { name: "recovery", type: "address", indexed: false },
      { name: "delay", type: "uint64", indexed: false },
      { name: "vaultFunded", type: "uint256", indexed: false },
      { name: "baitFunded", type: "uint256", indexed: false },
      { name: "canaryGas", type: "uint256", indexed: false },
    ],
  },
] as const;

export const vaultAbi = [
  {
    type: "function",
    name: "snapshot",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "state", type: "uint8" },
      { name: "balance", type: "uint256" },
      { name: "pendingTo", type: "address" },
      { name: "pendingAmount", type: "uint256" },
      { name: "maturesAt", type: "uint64" },
      { name: "now", type: "uint64" },
    ],
  },
  { type: "function", name: "owner", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "recovery", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "bait", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "delay", stateMutability: "view", inputs: [], outputs: [{ type: "uint64" }] },
  { type: "function", name: "state", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
  { type: "function", name: "deposit", stateMutability: "payable", inputs: [], outputs: [] },
  {
    type: "function",
    name: "requestWithdrawal",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  { type: "function", name: "executeWithdrawal", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { type: "function", name: "cancelWithdrawal", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { type: "function", name: "lockByRecovery", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { type: "function", name: "unlock", stateMutability: "nonpayable", inputs: [], outputs: [] },
  {
    type: "function",
    name: "recoverTo",
    stateMutability: "nonpayable",
    inputs: [{ name: "to", type: "address" }],
    outputs: [],
  },
  {
    type: "event",
    name: "Deposited",
    inputs: [
      { name: "from", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "balance", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "WithdrawalRequested",
    inputs: [
      { name: "to", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "maturesAt", type: "uint64", indexed: false },
    ],
  },
  {
    type: "event",
    name: "WithdrawalExecuted",
    inputs: [
      { name: "to", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "WithdrawalCancelled",
    inputs: [
      { name: "to", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "reason", type: "string", indexed: false },
    ],
  },
  {
    type: "event",
    name: "VaultLocked",
    inputs: [
      { name: "by", type: "address", indexed: true },
      { name: "at", type: "uint64", indexed: false },
    ],
  },
  {
    type: "event",
    name: "VaultUnlocked",
    inputs: [
      { name: "by", type: "address", indexed: true },
      { name: "at", type: "uint64", indexed: false },
    ],
  },
  {
    type: "event",
    name: "Recovered",
    inputs: [
      { name: "to", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
] as const;

export const baitAbi = [
  // Error defs let viem decode a revert into its name instead of raw bytes.
  // NotBait can bubble up from vault.lock() inside claim().
  { type: "error", name: "NotCanary", inputs: [] },
  { type: "error", name: "AlreadyClaimed", inputs: [] },
  { type: "error", name: "TransferFailed", inputs: [] },
  { type: "error", name: "ZeroAddress", inputs: [] },
  { type: "error", name: "NotBait", inputs: [] },
  {
    type: "function",
    name: "snapshot",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "vault", type: "address" },
      { name: "canary", type: "address" },
      { name: "claimed", type: "bool" },
      { name: "by", type: "address" },
      { name: "at", type: "uint64" },
      { name: "reward", type: "uint256" },
    ],
  },
  { type: "function", name: "claim", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { type: "function", name: "canary", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "claimed", stateMutability: "view", inputs: [], outputs: [{ type: "bool" }] },
  { type: "function", name: "reward", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  {
    type: "event",
    name: "BaitClaimed",
    inputs: [
      { name: "by", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "at", type: "uint64", indexed: false },
    ],
  },
] as const;
