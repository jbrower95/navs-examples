import { navs as setup } from 'navskit';
import * as PkgInfo from "../package.json";
import { parseEther } from 'viem';

const { navs, getRegisteredFunctions } = setup({
    serviceName: PkgInfo.name,
    serviceVersion: PkgInfo.version
})

export class TokenAllocator {

    @navs()
    static async getTokenAllocation(address: `0x${string}`): Promise<BigInt> {
        return 42000n;
    }
}

const main = () => {
    console.table(getRegisteredFunctions());
};

main();