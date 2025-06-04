# @navs Application - AML - Anti-Money Laundering Services

Use Navs to check whether a particular address is on the SDN (Special Designated Nationals) list,
to avoid transacting with a sanctioned individual.

To reproduce this code yourself;

1. See the core logic in `src/index.ts`.

2. Run `npx navskit gen` to recreate the auto-generated contracts.

3. See `UnemploymentCoin.sol`, and the associated `/app` directory, which utilizes a deployment of this OFAC-aware ERC20 to allow claiming of a token if the address is not sanctioned.