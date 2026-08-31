# Axis Robotics Activity Score

Unofficial Next.js + Viem checker for the public Axis Robotics AttemptRegistry on Base.

## Current score model
Only data available from the on-chain AttemptRegistry is used:

- Signed trajectories — 30%
- Verified runs — 25%
- Average run score / Quality — 25%
- Task diversity — 10%
- Signing consistency — 10%

Points and Badges are intentionally **removed** because they are not available in the contract data used by this checker.

## Features
- No wallet connection
- Paste wallet address and check
- Yellow/black animated UI
- Success popup animation
- Activity cards
- Signing activity chart
- Score distribution chart
- Signed-run table
- Base proof link
- Share on X / Copy result
- “Start on Axis Robotics” CTA opens the supplied referral link
- Built by @ArhnOne

## Run
```bash
npm install
npm run dev
```

## Vercel
Push the project to GitHub, import it in Vercel, and deploy. No environment variables are required.
