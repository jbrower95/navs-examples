# Navs - Deploy anything on Ethereum

[![navskit](https://badge.fury.io/js/navskit.svg)](https://badge.fury.io/js/navskit)

## Quick Reference

| Network | Contract | Address |
| ------- | -------- | ------- |
| Sepolia | NavsMultisig | 0x11111024ABcf07fD39bee0Be5d8F7AFD196A726d |
| Sepolia | AVS | 0x0048fd2f8c9E77d6729686f295b793F0DE8Ac7BA |
| Sepolia | DelegationManager | 0xD4A7E1Bd8015057293f0D0A557088c286942e84b |
| Sepolia | AllocationManager | 0x42583067658071247ec8CE0A516A58f682002d07 |
| Sepolia | Strategy | 0x424246eF71b01ee33aA33aC590fd9a0855F5eFbc |
| Base Sepolia | TaskDispatch | 0xc739e01E8d873700948AD191d64C3FBaB93b1C1A |



# Quick Intro

1. Write any logic, in Ethereum.
2. Annotate it with `@navs`, and generate code with `npx navskit gen`
3. Push your package to npm.

That's it - run any code you want from within a smart contract.

`@navs` utilizes EigenLayer's network of restaking operators to run your code.

Using `@navs(consensus)`, you can even specify a custom consensus function to use, which allows slashing (or ejecting) operators based on their submitted responses. 

Consensus can also take multiple answers into account, and output a completely different result -- imagine numerically averaging all of the responses from your nodes!

`@navs` is designed to be flexible, but powerful by default.

# Getting Started 

## For The Infra Developer

1. Install the library.
```bash
npm i navskit
```

2. Write your logic -- preferably as static functions within a class. (NOTE: Make sure your project has `experimentalDecorators` enabled in your TypeScript settings.)

```js

import { navs as setup } from 'navskit';
import * as Pkg from '../package.json';

// navs setup
export const navsClient = setup({
  serviceName: Pkg.name,
  serviceVersion: Pkg.version,
}) as ReturnType<typeof setup>;

export class BitcoinOracle {

    @navs()
    static async currentPriceOfBitcoinPennies(): Promise<bigint> {
        const resp = await fetch('https://api.coinbase.com/v2/prices/spot?currency=USD');
        const value = await resp.json();

        return BigInt(Math.floor(value.data.amount * 100));
    }

}
```

This example calls out to the Coinbase API, loads the price of Bitcoin, and computes the amount in pennies. You might want to call this somewhere onchain, to check whether to do something -- maybe a trading strategy, or a Uniswap hook!

3. Use `npx navskit gen`, and you'll see a `contracts` directory appear. 

Congrats, you're done! Publish this source code, and anyone can import your `contracts` and invoke this call from onchain.

`@navs` will perform exact matching over the response, so the result may fail depending on your stake requirements, and the number of operators that are needed to satisfy it. 


## For The App Developer

For starters, check out `aml` for an example of how to call one of these functions.

1. You'll want to extend the `NavsReceiver.sol` that is generated.

2. Outgoing - You'll want to utilize the `service.sol` generated library to call out to your service! Note that you should only do this from a valid `NavsReceiver`, or your callbacks won't work.

3. Incoming - Once your response is ready, your callback will be activated. In the AML example, `_onIsAddressSanctioned` is called with the task ID, the parameter supplied, and the response or optional error. You should use this to proceed your state, and resolve whatever request began in [2].

That's it! Make requests with `service.sol`'s generated Library, and then receive the responses with `NavsReceiver.sol`'s generated callbacks.


# How does it work?

`@navs` uses a two-pass execution -> consensus mechanism to allow Operators to execute your task, form consensus on the output, and then form consensus on how to manage the AVS itself.

This allows for map/reduce style transformations, arbitrary slashing and ejection, and other operator management -- all from within TypeScript.

Navs Operators use `npx navskit operator`.





