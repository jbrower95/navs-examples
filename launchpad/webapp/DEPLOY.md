# FairLaunch Terminal Deployment

This webapp is automatically deployed to GitHub Pages when changes are pushed to the main/master branch.

## Setup Instructions

1. **Enable GitHub Pages**: Go to your repository Settings > Pages
2. **Set Source**: Select "GitHub Actions" as the source
3. **Push Changes**: The deployment will trigger automatically on push to main/master

## Manual Deployment

You can also trigger deployment manually:
1. Go to the "Actions" tab in your GitHub repository
2. Select "Deploy to GitHub Pages"
3. Click "Run workflow"

## Local Development

```bash
cd webapp
npm install
npm run dev
```

## Building Locally

```bash
cd webapp
npm run build
npm run preview
```

## Features

- **Terminal Interface**: Retro CRT-style terminal with green text
- **Wallet Integration**: Connect with MetaMask on Base Sepolia
- **Token Claiming**: Mint tokens based on NAVS allocation verification
- **Real-time Updates**: Dynamic prompt based on wallet connection status

## Contract Details

- **Network**: Base Sepolia (Chain ID: 84532)
- **Contract**: `0x8714B76930902FF40Ed1cEc626fA2BBf37f7747b`
- **Token**: FairLaunch Token (FAIR)
- **Verification**: NAVS (Node-Assisted Verification Service)