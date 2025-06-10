import { useState, useEffect, useRef } from 'react'
import { useAccount, useConnect, useDisconnect, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { FAIRLAUNCH_CONTRACT_ADDRESS, FAIRLAUNCH_ABI } from './contracts'
import { formatEther } from 'viem'

interface TerminalLine {
  id: number
  text: string
  type: 'command' | 'output' | 'error' | 'system'
}

const ALL_COMMANDS = {
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
  const terminalRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const hasInitialized = useRef(false)

  // Create dynamic prompt based on wallet connection
  const getPrompt = () => {
    if (isConnected && address) {
      const shortAddress = `${address.slice(0, 4)}..${address.slice(-4)}`
      return `${shortAddress}@fairlaunch:~# `
    }
    return 'guest@fairlaunch:~# '
  }

  // Get available commands based on wallet connection status
  const getAvailableCommands = () => {
    const commands = { ...ALL_COMMANDS }
    
    if (isConnected) {
      // Remove login, keep logout
      delete commands.login
    } else {
      // Remove logout and wallet-specific commands, keep login
      delete commands.logout
      delete commands.balance
      delete commands.claim
    }
    
    return commands
  }

  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()
  const { writeContract, data: hash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  })

  // Read contract data
  const { data: balance } = useReadContract({
    address: FAIRLAUNCH_CONTRACT_ADDRESS,
    abi: FAIRLAUNCH_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  })

  const { data: userMinted } = useReadContract({
    address: FAIRLAUNCH_CONTRACT_ADDRESS,
    abi: FAIRLAUNCH_ABI,
    functionName: 'getUserMinted',
    args: address ? [address] : undefined,
  })

  const { data: mintStatus } = useReadContract({
    address: FAIRLAUNCH_CONTRACT_ADDRESS,
    abi: FAIRLAUNCH_ABI,
    functionName: 'getMintStatus',
    args: address ? [address] : undefined,
  })

  const addLine = (text: string, type: TerminalLine['type'] = 'output') => {
    setLines(prev => [...prev, { id: lineCounter, text, type }])
    setLineCounter(prev => prev + 1)
  }

  const typewriterEffect = async (text: string, type: TerminalLine['type'] = 'output') => {
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
  }

  const showHelp = async () => {
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
    await typewriterEffect(`Contract: ${FAIRLAUNCH_CONTRACT_ADDRESS}`, 'system')
    await typewriterEffect('Network: Base Sepolia (84532)', 'system')
    await typewriterEffect('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'system')
  }

  const handleCommand = async (cmd: string) => {
    const command = cmd.toLowerCase().trim()
    
    // Only show command line if it's not the initial help
    if (cmd !== 'help' || lines.length > 0) {
      addLine(`${getPrompt()}${cmd}`, 'command')
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
          
          if (isPending) {
            await typewriterEffect('Transaction pending...', 'output')
          }
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
  }

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
  }, [])

  // Handle transaction status
  useEffect(() => {
    if (isConfirming) {
      addLine('⏳ Waiting for confirmation...', 'output')
    }
    
    if (isConfirmed) {
      addLine('✓ Transaction confirmed!', 'output')
      addLine('Token allocation request submitted to NAVS', 'system')
    }
  }, [isConfirming, isConfirmed])

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
        {lines.map((line) => (
          <div key={line.id} className={`terminal-line ${line.type}`}>
            <span className={line.type === 'typing' ? 'typing' : ''}>{line.text}</span>
            {line.type === 'typing' && <span className="cursor">█</span>}
          </div>
        ))}
        
        <div className="terminal-input-line">
          <span className="prompt">{getPrompt()}</span>
          <span className="input-display">
            {input}
            <span className="cursor blink">█</span>
          </span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            className="terminal-input-hidden"
            disabled={isTyping}
            spellCheck={false}
            autoComplete="off"
          />
        </div>
      </div>
    </div>
  )
}