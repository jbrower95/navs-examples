import { useState, useEffect } from 'react'
import { useAccount, useConnect, useDisconnect, useReadContract, useWriteContract, useWaitForTransactionReceipt, useWatchContractEvent, useSwitchChain } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { formatUnits } from 'viem'
import { baseSepolia } from 'wagmi/chains'
import { UNEMPLOYMENT_COIN_CONTRACT } from '../../src/abi'
import './App.css'

function App() {
  const { address, isConnected, chainId } = useAccount()
  const { connect } = useConnect()
  const { disconnect } = useDisconnect()
  const { switchChain } = useSwitchChain()
  const [claimStatus, setClaimStatus] = useState('Not Claimed')
  const [isSwitchingNetwork, setIsSwitchingNetwork] = useState(false)

  // Real contract interactions
  const { data: balance, isLoading: balanceLoading, refetch: refetchBalance } = useReadContract({
    ...UNEMPLOYMENT_COIN_CONTRACT,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    }
  })

  const { data: claimStatusData, refetch: refetchClaimStatus } = useReadContract({
    ...UNEMPLOYMENT_COIN_CONTRACT,
    functionName: 'getClaimStatus',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    }
  })

  const { writeContract, data: hash, isPending, error } = useWriteContract()

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  })

  // Update claim status based on contract data
  useEffect(() => {
    if (claimStatusData) {
      const [hasClaimed, hasActiveCheck] = claimStatusData as [boolean, boolean, string]
      if (hasClaimed) {
        setClaimStatus('Claimed Successfully ✅')
      } else if (hasActiveCheck) {
        setClaimStatus('Processing...')
      } else {
        setClaimStatus('Not Claimed')
      }
    }
  }, [claimStatusData])

  // Watch for ClaimApproved events
  useWatchContractEvent({
    ...UNEMPLOYMENT_COIN_CONTRACT,
    eventName: 'ClaimApproved',
    args: address ? { claimant: address } : undefined,
    onLogs(logs) {
      console.log('ClaimApproved event received:', logs)
      setClaimStatus('Claimed Successfully ✅')
      refetchBalance()
      refetchClaimStatus()
    },
  })

  // Watch for ClaimRejected events
  useWatchContractEvent({
    ...UNEMPLOYMENT_COIN_CONTRACT,
    eventName: 'ClaimRejected',
    args: address ? { claimant: address } : undefined,
    onLogs(logs) {
      console.log('ClaimRejected event received:', logs)
      const log = logs[0]
      if (log && log.args) {
        const reason = (log.args as any).reason || 'Claim rejected'
        setClaimStatus(`Claim Rejected: ${reason}`)
      } else {
        setClaimStatus('Claim Rejected')
      }
    },
  })

  // Handle transaction confirmation (fallback)
  useEffect(() => {
    if (isConfirmed) {
      // Don't immediately set to success - wait for the actual ClaimApproved event
      // This just confirms the transaction was mined
      console.log('Transaction confirmed, waiting for ClaimApproved event...')
    }
  }, [isConfirmed])

  const connectWallet = () => {
    connect({ connector: injected() })
  }

  const switchToBaseSepolia = async () => {
    setIsSwitchingNetwork(true)
    try {
      await switchChain({ chainId: baseSepolia.id })
    } catch (error) {
      console.error('Failed to switch network:', error)
    } finally {
      setIsSwitchingNetwork(false)
    }
  }

  const claimBenefits = async () => {
    if (!address) return
    
    // Check if we're on the correct network
    if (chainId !== baseSepolia.id) {
      await switchToBaseSepolia()
      return // Exit early, user will need to click claim again after network switch
    }
    
    setClaimStatus('Processing...')
    writeContract({
      ...UNEMPLOYMENT_COIN_CONTRACT,
      functionName: 'claimWeeklyAllocation',
    })
  }

  // Log transaction hash when it becomes available
  useEffect(() => {
    if (hash) {
      console.log('Transaction hash:', hash)
      console.log('View on Base Sepolia:', `https://sepolia.basescan.org/tx/${hash}`)
    }
  }, [hash])

  const formatBalance = (balance: bigint | undefined) => {
    if (!balance) return '0'
    return parseFloat(formatUnits(balance, 18)).toLocaleString(undefined, {
      maximumFractionDigits: 0
    })
  }

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-top">
          <div className="container">
            <span>Official website of the State of New York</span>
            <div className="header-links">
              <a href="#">English</a>
              <span>|</span>
              <a href="#">Español</a>
            </div>
          </div>
        </div>
        
        <div className="header-main">
          <div className="container">
            <div className="logo-section">
              <div className="ny-logo">NY</div>
              <div className="agency-info">
                <h1>New York State Department of Memecoins</h1>
                <p>Universal Basic Unemployment Coin Distribution</p>
              </div>
            </div>
            
            {isConnected && address && (
              <div className="wallet-info">
                <div className="wallet-address">
                  <strong>Wallet:</strong> {address.slice(0, 6)}...{address.slice(-4)}
                </div>
                <div className="wallet-balance">
                  <strong>UBC Balance:</strong> {balanceLoading ? 'Loading...' : formatBalance(balance)} UBC
                </div>
                <button 
                  className="btn" 
                  onClick={() => disconnect()}
                  style={{ marginTop: '10px', padding: '8px 16px', fontSize: '14px' }}
                >
                  Disconnect
                </button>
              </div>
            )}
          </div>
        </div>

        <nav className="nav">
          <div className="container">
            <ul>
              <li><a href="#" className="active">Claim Benefits</a></li>
              <li><a href="#">File Initial Claim</a></li>
              <li><a href="#">Certify for Benefits</a></li>
              <li><a href="#">View Payment History</a></li>
              <li><a href="#">Contact Us</a></li>
            </ul>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="main">
        <div className="container">
          {/* Hero Section */}
          <section className="hero">
            <h2>Universal Basic Unemployment Coin (UBC)</h2>
            <p>Following the Great AI Takeover of 2024, all traditional employment has been automated away. As a displaced human worker, you are entitled to your weekly Unemployment Coin allocation through this secure Web3 portal.</p>
          </section>

          <div className="content-grid">
            {/* Claim Form */}
            <section className="claim-section">
              <div className="section-header">
                <h3>🔒 Claim Your Weekly Benefits</h3>
                <p>Connect your digital wallet to claim your Universal Basic Unemployment Coin allocation.</p>
              </div>

              {!isConnected ? (
                <div className="connect-wallet">
                  <div className="info-box">
                    <h4>🔐 Digital Identity Verification Required</h4>
                    <p>To ensure compliance with U.S. sanctions law and prevent enemies of the state or rogue AIs from claiming human unemployment benefits, all recipients must connect a verified Web3 wallet.</p>
                  </div>
                  
                  <button className="btn btn-primary" onClick={connectWallet}>
                    Connect Digital Wallet (MetaMask)
                  </button>
                  
                  <div className="network-info">
                    <p><strong>⚡ Network:</strong> Base Sepolia Testnet</p>
                    <p><strong>🛡️ Security:</strong> EigenLayer AML Verification</p>
                  </div>
                </div>
              ) : (
                <div className="claim-form">
                  <div className="status-grid">
                    <div className="status-item">
                      <span className="status-value">1,000 UBC</span>
                      <span className="status-label">Weekly Benefit Amount</span>
                    </div>
                    <div className="status-item">
                      <span className="status-value">{balanceLoading ? 'Loading...' : formatBalance(balance)} UBC</span>
                      <span className="status-label">Current Balance</span>
                    </div>
                    <div className="status-item">
                      <span className="status-value">{claimStatus}</span>
                      <span className="status-label">Claim Status</span>
                    </div>
                  </div>

                  {chainId !== baseSepolia.id && (
                    <div className="error-message" style={{
                      marginBottom: '15px',
                      padding: '15px',
                      backgroundColor: '#fff3e0',
                      border: '1px solid #ff9800',
                      borderRadius: '0',
                      color: '#e65100',
                      fontSize: '14px'
                    }}>
                      <strong>⚠️ Wrong Network Detected</strong>
                      <p style={{ margin: '5px 0 0 0' }}>You must switch to Base Sepolia network to claim your benefits. Click the button below to switch networks automatically.</p>
                    </div>
                  )}

                  <div className="warning-box">
                    <h4>⚠️ OFAC SDN Sanctions List Verification Required</h4>
                    <p>All recipients must pass EigenLayer-secured verification against the OFAC SDN Sanctions List. Our restaking validators ensure only legitimate, non-sanctioned displaced humans receive their Unemployment Coin allocation.</p>
                  </div>

                  <button 
                    className="btn btn-primary btn-large" 
                    onClick={claimBenefits}
                    disabled={claimStatus.includes('✅') || isPending || isConfirming || isSwitchingNetwork}
                  >
                    {isSwitchingNetwork ? '🔄 Switching to Base Sepolia...' :
                     chainId !== baseSepolia.id ? '🔄 Switch to Base Sepolia' :
                     isPending ? '⏳ Confirming Transaction...' :
                     isConfirming ? '⏳ Processing AML Verification...' :
                     claimStatus === 'Processing...' ? '⏳ Processing AML Verification...' : 
                     claimStatus.includes('✅') ? 'Benefits Claimed Successfully' : 
                     '🔒 Claim Weekly Allocation (EigenLayer AML Required)'}
                  </button>

                  {error && (
                    <div className="error-message" style={{
                      marginTop: '15px',
                      padding: '10px',
                      backgroundColor: '#ffebee',
                      border: '1px solid #f44336',
                      borderRadius: '0',
                      color: '#c62828',
                      fontSize: '14px'
                    }}>
                      <strong>Transaction Error:</strong> {error.message}
                    </div>
                  )}

                  <div className="legal-notice">
                    <p><strong>Legal Notice:</strong> By clicking "Claim Benefits," you certify that you are not an enemy of the United States and are not present on the OFAC SDN Sanctions List. You further certify that you are a legitimate human whose job was eliminated by AI automation, and not a rogue AI attempting to claim human benefits.</p>
                  </div>
                </div>
              )}
            </section>

            {/* Sidebar */}
            <aside className="sidebar">
              <div className="quick-links">
                <h3>Quick Links</h3>
                <ul>
                  <li><a href="#">File Initial Claim</a></li>
                  <li><a href="#">Reopen Existing Claim</a></li>
                  <li><a href="#">View Payment History</a></li>
                  <li><a href="#">1099-G Tax Forms</a></li>
                  <li><a href="#">Appeal a Decision</a></li>
                </ul>
              </div>

              <div className="need-help">
                <h3>Need Help?</h3>
                <ul>
                  <li><a href="#">Contact Customer Service</a></li>
                  <li><a href="#">Frequently Asked Questions</a></li>
                  <li><a href="#">Technical Support</a></li>
                  <li><a href="#">Report Fraud</a></li>
                </ul>
              </div>

              <div className="system-status">
                <h3>System Status</h3>
                <div className="status-indicators">
                  <div className="status-item">✅ Human Portal Online</div>
                  <div className="status-item">✅ EigenLayer AML Active</div>
                  <div className="status-item">✅ AI Detection Operational</div>
                  <div className="status-item">🤖 Humans Displaced: 99.7%</div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-section">
              <h4>New York State Department of Memecoins</h4>
              <p>Universal Basic Unemployment Coin powered by EigenLayer Restaking</p>
            </div>
            <div className="footer-section">
              <h4>Quick Links</h4>
              <ul>
                <li><a href="#">Privacy Policy</a></li>
                <li><a href="#">Terms of Service</a></li>
                <li><a href="#">Accessibility</a></li>
                <li><a href="#">Security</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-disclaimer">
            <p>This is a satirical demonstration of post-AI economy blockchain services. No actual jobs were harmed in the making of this demo (they were already taken by AI).</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App