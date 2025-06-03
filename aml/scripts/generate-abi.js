#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read the compiled contract artifacts
function readContractABI(contractName) {
  const artifactPath = path.join(__dirname, '..', 'out', `${contractName}.sol`, `${contractName}.json`);
  
  if (!fs.existsSync(artifactPath)) {
    throw new Error(`Contract artifact not found: ${artifactPath}`);
  }
  
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  return artifact.abi;
}

// Generate TypeScript ABI file with proper viem types
function generateABIFile() {
  try {
    console.log('🔧 Generating ABI TypeScript file...');
    
    // Read ABIs
    const unemploymentCoinABI = readContractABI('UnemploymentCoin');
    const taskDispatchABI = readContractABI('TaskDispatch');
    
    // Generate TypeScript file content
    const abiContent = `// Auto-generated ABI file
// Generated on: ${new Date().toISOString()}

export const UnemploymentCoinABI = ${JSON.stringify(unemploymentCoinABI, null, 2)} as const;

export const TaskDispatchABI = ${JSON.stringify(taskDispatchABI, null, 2)} as const;

// Contract addresses (loaded from addresses.json)
import addresses from './addresses.json';

export const CONTRACT_ADDRESSES = addresses;

// Type-safe contract configurations for viem
export const UNEMPLOYMENT_COIN_CONTRACT = {
  address: addresses.unemploymentCoin as \`0x\${string}\`,
  abi: UnemploymentCoinABI,
} as const;

export const TASK_DISPATCH_CONTRACT = {
  address: addresses.taskDispatch as \`0x\${string}\`,
  abi: TaskDispatchABI,
} as const;

// Legacy export for backwards compatibility
export const AIRDROP_CONTRACT = UNEMPLOYMENT_COIN_CONTRACT;
`;

    // Write to src/abi.ts
    const outputPath = path.join(__dirname, '..', 'src', 'abi.ts');
    fs.writeFileSync(outputPath, abiContent);
    
    console.log('✅ ABI TypeScript file generated at:', outputPath);
    console.log('📄 Contracts included:');
    console.log('  - UnemploymentCoin (ERC20 with NAVS AML)');
    console.log('  - TaskDispatch');
    
  } catch (error) {
    console.error('❌ Error generating ABI file:', error.message);
    process.exit(1);
  }
}

// Create src directory if it doesn't exist
const srcDir = path.join(__dirname, '..', 'src');
if (!fs.existsSync(srcDir)) {
  fs.mkdirSync(srcDir, { recursive: true });
}

// Generate the ABI file
generateABIFile();