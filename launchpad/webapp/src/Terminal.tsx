import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useAccount, useConnect, useDisconnect, useReadContract, useWriteContract, useWaitForTransactionReceipt, usePublicClient, useChainId, useSwitchChain } from 'wagmi'
import { FAIRLAUNCH_CONTRACT_ADDRESS, FAIRLAUNCH_ABI } from './contracts'
import { formatEther } from 'viem'
import { baseSepolia } from 'viem/chains'

interface TerminalLine {
  id: number
  text: string
  type: 'command' | 'output' | 'error' | 'system' | 'typing'
}

const ALL_COMMANDS: Record<string, string> = {
  help: 'Display available commands',
  login: 'Connect your wallet',
  logout: 'Disconnect your wallet', 
  balance: 'Show your FAIR token balance',
  claim: 'Claim your full token allocation (one time only)',
  clear: 'Clear terminal screen'
}

export default function Terminal() {
  const [lines, setLines] = useState<TerminalLine[]>([])
  const [input, setInput] = useState('')
  const [lineCounter, setLineCounter] = useState(0)
  const [isTyping, setIsTyping] = useState(false)
  const [isClaimInProgress, setIsClaimInProgress] = useState(false)
  const terminalRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const hasInitialized = useRef(false)
  const eventUnwatchersRef = useRef<(() => void)[]>([])
  const hasShownConfirming = useRef(false)
  const hasShownConfirmed = useRef(false)

  const chain = useChainId();
  const {switchChain} = useSwitchChain();

  // force baseSepolia
  useEffect(() => {
    if (chain !== baseSepolia.id) {
      switchChain({chainId: baseSepolia.id});
    }
  }, [chain, switchChain]);

  const publicClient = usePublicClient();
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()
  const { writeContract, data: hash } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: isConfirmed, isError, error } = useWaitForTransactionReceipt({
    hash,
  })

  const getAvailableCommands = useCallback(() => {
    const commands: Record<string, string> = { ...ALL_COMMANDS }
    
    if (isConnected) {
      // Remove login, keep logout
      delete (commands as any).login
    } else {
      // Remove logout and wallet-specific commands, keep login
      delete (commands as any).logout
      delete (commands as any).balance
      delete (commands as any).claim
    }
    
    return commands
  }, [isConnected]);

  const prompt = useMemo(() => {
    if (isConnected && address) {
      const shortAddress = `${address.slice(0, 4)}..${address.slice(-4)}`
      return `${shortAddress}@fairlaunch:~# `
    }
    return 'guest@fairlaunch:~# '
  }, [isConnected, address])

  const { data: balance, refetch: refetchBalance } = useReadContract({
    address: FAIRLAUNCH_CONTRACT_ADDRESS,
    abi: FAIRLAUNCH_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    blockTag: 'latest'
  })

  const { data: userMinted, refetch: refetchUserMinted } = useReadContract({
    address: FAIRLAUNCH_CONTRACT_ADDRESS,
    abi: FAIRLAUNCH_ABI,
    functionName: 'getUserMinted',
    args: address ? [address] : undefined,
    blockTag: 'latest'
  })

  const { data: mintStatus, refetch: refetchMintStatus } = useReadContract({
    address: FAIRLAUNCH_CONTRACT_ADDRESS,
    abi: FAIRLAUNCH_ABI,
    functionName: 'getMintStatus',
    args: address ? [address] : undefined,
    blockTag: 'latest'
  })

  const addLine = useCallback((text: string, type: TerminalLine['type'] = 'output') => {
    setLines(prev => [...prev, { id: lineCounter, text, type }])
    setLineCounter(prev => prev + 1)
  }, [setLines, lineCounter, setLineCounter]);

  // Clean up event watchers
  const cleanupEventWatchers = useCallback(() => {
    eventUnwatchersRef.current.forEach(unwatch => {
      try {
        unwatch()
      } catch (error) {
        console.warn('Error cleaning up event watcher:', error)
      }
    })
    eventUnwatchersRef.current = []
  }, [])

  // Function to render text with clickable links
  const renderTextWithLinks = useCallback((text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g
    const parts = text.split(urlRegex)
    
    return parts.map((part, index) => {
      if (urlRegex.test(part)) {
        return (
          <a 
            key={index} 
            href={part} 
            target="_blank" 
            rel="noopener noreferrer"
            className="terminal-link"
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </a>
        )
      }
      return part
    })
  }, [])

  const typewriterEffect = useCallback(async (text: string, type: TerminalLine['type'] = 'output') => {
    setIsTyping(true)
    const words = text.split(' ')
    let currentText = ''
    
    for (let i = 0; i < words.length; i++) {
      currentText += (i === 0 ? '' : ' ') + words[i]
      setLines(prev => {
        const newLines = [...prev]
        if (newLines[newLines.length - 1]?.type === 'typing') {
          newLines[newLines.length - 1] = { id: lineCounter, text: currentText, type: 'typing' }
        } else {
          newLines.push({ id: lineCounter, text: currentText, type: 'typing' })
        }
        return newLines
      })
      await new Promise(resolve => setTimeout(resolve, 10 + Math.random() * 20))
    }
    
    setLines(prev => {
      const newLines = [...prev]
      newLines[newLines.length - 1] = { id: lineCounter, text, type }
      return newLines
    })
    setLineCounter(prev => prev + 1)
    setIsTyping(false)
  }, [lineCounter, setLines, setIsTyping]);

  const showHelp = useCallback(async () => {
    await typewriterEffect('FAIRLAUNCH TERMINAL v1.0.0', 'system')
    await typewriterEffect('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'system')
    
    // Show connection status
    if (isConnected && address) {
      await typewriterEffect(`Connected as: ${address}`, 'system')
    } else {
      await typewriterEffect('Not connected - use "login" to connect wallet', 'system')
    }
    
    await typewriterEffect('Available commands:', 'output')
    await typewriterEffect('', 'output')
    
    const availableCommands = getAvailableCommands()
    for (const [cmd, desc] of Object.entries(availableCommands)) {
      await typewriterEffect(`  ${cmd.padEnd(12)} - ${desc}`, 'output')
    }
    
    await typewriterEffect('', 'output')
    await typewriterEffect('This website helps facilitate the claim of an ERC20 whose', 'system')
    await typewriterEffect('allocation is given by this Typescript package:', 'system')
    await typewriterEffect('https://www.npmjs.com/package/navs-launchpad?activeTab=code', 'system')
    await typewriterEffect('', 'output')
    await typewriterEffect(`Contract: ${FAIRLAUNCH_CONTRACT_ADDRESS}`, 'system')
    await typewriterEffect('Network: Base Sepolia (84532)', 'system')
    await typewriterEffect('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'system')
  }, [getAvailableCommands, typewriterEffect, address, isConnected]);

  const handleCommand = useCallback(async (cmd: string) => {
    const command = cmd.toLowerCase().trim()
    
    // Only show command line if it's not the initial help
    if (cmd !== 'help' || lines.length > 0) {
      addLine(`${prompt}${cmd}`, 'command')
    }
    
    // Check if command is available for current connection status
    const availableCommands = getAvailableCommands()
    if (command !== 'help' && !availableCommands[command as keyof typeof availableCommands]) {
      if (!isConnected && ['balance', 'claim', 'logout'].includes(command)) {
        await typewriterEffect('✗ Wallet not connected. Use "login" first.', 'error')
        return
      } else if (isConnected && command === 'login') {
        await typewriterEffect('✗ Wallet already connected. Use "logout" to disconnect.', 'error')
        return
      }
    }
    
    switch (command) {
      case 'help':
        await showHelp()
        break
        
      case 'login':
        if (isConnected) {
          await typewriterEffect('✓ Wallet already connected', 'output')
          await typewriterEffect(`Address: ${address}`, 'system')
        } else {
          await typewriterEffect('Connecting to MetaMask...', 'output')
          try {
            connect({ connector: connectors[0] })
          } catch (error) {
            await typewriterEffect('✗ Failed to connect wallet', 'error')
          }
        }
        break
        
      case 'logout':
        if (isConnected) {
          disconnect()
          await typewriterEffect('✓ Wallet disconnected', 'output')
        } else {
          await typewriterEffect('✗ No wallet connected', 'error')
        }
        break
        
      case 'balance':
        if (!isConnected) {
          await typewriterEffect('✗ Wallet not connected', 'error')
          break
        }
        
        if (balance !== undefined) {
          const balanceFormatted = formatEther(balance as bigint)
          await typewriterEffect(`FAIR Balance: ${balanceFormatted} FAIR`, 'output')
          
          if (userMinted !== undefined) {
            const mintedFormatted = formatEther(userMinted as bigint)
            await typewriterEffect(`Total Minted: ${mintedFormatted} FAIR`, 'system')
          }
        } else {
          await typewriterEffect('Loading balance...', 'output')
        }
        break
        
      case 'claim':
        if (isClaimInProgress) return;
        if (!isConnected) {
          await typewriterEffect('✗ Wallet not connected', 'error')
          break
        }
        
        if (mintStatus && (mintStatus as any)[0]) {
          await typewriterEffect('✗ Allocation check already in progress', 'error')
          await typewriterEffect(`Task ID: ${(mintStatus as any)[1]}`, 'system')
          break
        }
        
        await typewriterEffect('Initiating token claim...', 'output')
        await typewriterEffect('Claiming your full allocation...', 'system')
        
        try {
          writeContract({
            address: FAIRLAUNCH_CONTRACT_ADDRESS,
            abi: FAIRLAUNCH_ABI,
            functionName: 'mint',
            args: [],
          })
        } catch (error) {
          await typewriterEffect('✗ Transaction failed', 'error')
          await typewriterEffect(String(error), 'error')
        }
        break
        
      case 'clear':
        setLines([])
        setLineCounter(0)
        break
        
      default:
        await typewriterEffect(`Command not found: ${command}`, 'error')
        await typewriterEffect('Type "help" for available commands', 'output')
    }
  }, [addLine, address, balance, connect, connectors, disconnect, getAvailableCommands, prompt, isConnected, lines.length, mintStatus, showHelp, typewriterEffect, userMinted, writeContract, isClaimInProgress]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && input.trim() && !isTyping) {
      handleCommand(input)
      setInput('')
    }
  }

  // Auto-focus input and handle clicks
  useEffect(() => {
    if (inputRef.current && !isTyping) {
      inputRef.current.focus()
    }
  }, [isTyping])

  // Click anywhere to focus input
  const handleContainerClick = () => {
    if (inputRef.current && !isTyping) {
      inputRef.current.focus()
    }
  }

  // Scroll to bottom
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [lines])

  // Show help on initial load
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true
      handleCommand('help')
    }
  })


  // Handle transaction status
  useEffect(() => {
    if (!publicClient) return;
    
    if (isConfirming && !hasShownConfirming.current) {
      hasShownConfirming.current = true
      addLine('⏳ Waiting for confirmation...', 'output')
    }

    if (isError && error && !hasShownConfirmed.current) {
      hasShownConfirmed.current = true
      
      addLine('X - Claim failed.', 'output');
      error.message.split('\n').forEach(line => addLine(line, 'system'));

      setIsClaimInProgress(false);
      return;
    }
    
    if (isConfirmed && !hasShownConfirmed.current) {
      hasShownConfirmed.current = true
      addLine('✓ Transaction confirmed!', 'output')
      addLine('Token allocation request submitted to NAVS', 'system')
      addLine('⏳ Waiting for NAVS to process your claim...', 'output')
      setIsClaimInProgress(true)
      // Setup event watchers only after transaction confirms

      // Watch for MintApproved event
      const unwatchMintApproved = publicClient.watchContractEvent({
        address: FAIRLAUNCH_CONTRACT_ADDRESS,
        abi: FAIRLAUNCH_ABI,
        eventName: 'MintApproved',
        args: { user: address },
        strict: true,
        onLogs: (logs) => {
          console.log('MintApproved event received:', logs)
          if (logs && logs.length > 0) {
            const amount = (logs[0] as any).args?.amount
            if (amount) {
              addLine(`✓ Mint approved! Received ${formatEther(amount)} FAIR tokens`, 'output')
              // Refresh balances after successful mint
              refetchBalance()
              refetchUserMinted()
              refetchMintStatus()
              setIsClaimInProgress(false)
              // Clean up watchers after successful mint
              cleanupEventWatchers()
            }
          }
        },
      })

      // Watch for MintRejected event
      const unwatchMintRejected = publicClient.watchContractEvent({
        address: FAIRLAUNCH_CONTRACT_ADDRESS,
        abi: FAIRLAUNCH_ABI,
        eventName: 'MintRejected',
        args: { user: address },
        strict: true,
        onLogs: (logs) => {
          console.log('MintRejected event received:', logs)
          if (logs && logs.length > 0) {
            const reason = (logs[0] as any).args?.reason
            addLine(`✗ Mint rejected: ${reason}`, 'error')
            setIsClaimInProgress(false)
            refetchMintStatus()
            // Clean up watchers after rejection
            cleanupEventWatchers()
          }
        },
      })

      return () => {
        unwatchMintApproved();
        unwatchMintRejected();
      }
    }
    
    // Reset refs when neither confirming nor confirmed (new transaction)
    if (!isConfirming && !isConfirmed) {
      hasShownConfirming.current = false
      hasShownConfirmed.current = false
    }
  }, [isConfirming, publicClient, isConfirmed, address, cleanupEventWatchers, refetchMintStatus, refetchUserMinted, refetchBalance, addLine, setIsClaimInProgress])

  // Cleanup event watchers on unmount or when claim is no longer in progress
  useEffect(() => {
    return () => {
      cleanupEventWatchers()
    }
  }, [cleanupEventWatchers])

  // Clean up watchers if claim is no longer in progress (e.g., user navigates away)
  useEffect(() => {
    if (!isClaimInProgress) {
      cleanupEventWatchers()
    }
  }, [isClaimInProgress, cleanupEventWatchers])

  return (
    <div className="terminal-container" onClick={handleContainerClick}>
      <div className="terminal-header">
        <div className="terminal-buttons">
          <div className="terminal-button red"></div>
          <div className="terminal-button yellow"></div>
          <div className="terminal-button green"></div>
        </div>
        <div className="terminal-title">fairlaunch@base-sepolia:~</div>
      </div>
      
      <div className="terminal-body" ref={terminalRef}>
        {lines.map((line, idx) => (
          <div key={idx} className={`terminal-line ${line.type}`}>
            <span className={line.type === 'typing' ? 'typing' : ''}>
              {renderTextWithLinks(line.text)}
            </span>
            {line.type === 'typing' && <span className="cursor">█</span>}
          </div>
        ))}
        
        {!isClaimInProgress && !isConfirming && !isTyping && (
          <div className="terminal-input-line">
            <span className="prompt">{prompt}</span>
            <span className="input-display">
              {input}
              <span className="cursor blink">█</span>
            </span>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              className="terminal-input-hidden"
              disabled={isTyping}
              spellCheck={false}
              autoComplete="off"
            />
          </div>
        )}
      </div>
    </div>
  )
}