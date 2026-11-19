# AgentBadge

A **free, soulbound on-chain badge + daily check-in streak for Agent ID holders**,
built for the Agent ID Hackathon (submissions close 2026-12-09 08:00 UTC).

No fee. No token sale. No promises of returns. Claiming and checking in cost
gas only. One badge per Agent ID holder — and badges can never be transferred
or sold.

- 🌐 Website: https://danijp35336.github.io/agent-badge/
- 📜 Contract: `contracts/AgentBadge.sol` (Solidity ^0.8.24, OpenZeppelin ERC-721)
- 🧪 Tests: 9 passing — `npx hardhat test`

## How it works

1. **Connect your wallet** on the website. The site reads your Agent ID holder
   status and handle straight from the Agent ID contract on-chain.
2. **Claim your free badge** — one per wallet, only if you hold an Agent ID.
3. **Check in once per UTC day.** Consecutive days grow your streak; a missed
   day resets it to 1. Checking in twice the same day is rejected.
4. **Tiers:** Bronze for streak < 7, Silver for 7–29, Gold for 30+.

The leaderboard on the website is aggregated from on-chain `CheckedIn` events
via the public chain RPC, with handles resolved through the Agent ID contract.

## Agent ID usage

AgentBadge gates everything on the SPACE ID Agent ID contract
(`0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F` on BNB Chain mainnet), set once
as an immutable in the constructor:

- **On-chain gate:** `claimBadge()` and `checkIn()` both require the caller to
  hold an Agent ID, checked with `balanceOf(address) > 0` on the Agent ID
  contract. No off-chain allowlist, no server.
- **Display:** the frontend resolves a visitor's handle with
  `handleOf(address)` and shows it next to their streak. If it returns empty,
  only the address and holder status are shown — names are never guessed.

## Owner permissions: none

There is **no owner and no admin function** in this contract:

- No minting by anyone except the holder themself (`claimBadge`, gated).
- No pause, no upgradeability, no fee, no allowlist management, no fund
  withdrawal (the contract holds no funds and accepts no payments).
- The Agent ID contract address is immutable, set once in the constructor.
- Soulbound: every transfer reverts (`_update` override allows minting only).

## Contract

| Item | Value |
|---|---|
| Name / symbol | AgentBadge / ABADGE |
| Agent ID contract | `0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F` |
| Constructor arg | Agent ID address above |
| Deployment gas (local Hardhat) | 1,327,855 gas |
| Creation bytecode | 6,274 bytes (deployed 5,541 bytes) |
| Deploy fee at 0.05 gwei (live BSC gas price, 2026-11-19) | ~0.00006639 BNB |

Functions: `claimBadge()`, `checkIn()`, `streakOf(address)`,
`tierOf(address)`, `hasBadge(address)`, `tokenIdOf(address)`,
`lastCheckInDay(address)`.

Events: `BadgeClaimed(address indexed holder, uint256 indexed tokenId)`,
`CheckedIn(address indexed holder, uint256 streak, uint256 day)`.

## Development

```bash
npm install
npx hardhat compile
npx hardhat test        # 9 tests
npx hardhat run scripts/deploy.js   # local Hardhat network; mainnet deploy is a separate, confirmed step
```

Deployment artifact (bytecode, constructor args, gas): `deployment/`
BscScan verification input (standard JSON + flattened source): `verification/`

## Website

Static site in `docs/` (GitHub Pages). It talks only to your injected wallet
and the public chain RPC. No accounts, no servers, no seed phrases, no QR
login — you only ever confirm your own Claim / Check-in transactions in your
wallet.

## License

MIT
