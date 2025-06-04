/**
 * NAVS AML (Anti-Money Laundering) Services
 * 
 * This package provides AML compliance functions powered by @navs.
 * Functions are executed by a decentralized network of operators with economic stake backing the results.
 */

import { navs as setup } from 'navskit';
import { getAddress } from 'viem';
import * as dotenv from 'dotenv';

dotenv.config();

export const navsClient = setup({
  serviceName: 'navs-aml',
  serviceVersion: '1.0.0',
}) as ReturnType<typeof setup>;

const { navs } = navsClient;

// Cache for OFAC sanctions list to avoid repeated downloads
let __sanctionList: string | undefined = undefined;
let __sanctionPromise: Promise<string> | undefined = undefined;

/**
 * AML Compliance Services
 * 
 * This class provides Anti-Money Laundering (AML) compliance functions
 * that are executed by a decentralized network with cryptoeconomic security.
 */
export class AMLServices {

  /**
   * Check if an Ethereum address appears on the OFAC Sanctions List
   * 
   * This function downloads and searches the official OFAC SDN (Specially Designated Nationals)
   * Enhanced XML file to determine if a given Ethereum address is sanctioned.
   * 
   * Results are backed by cryptoeconomic security through the NAVS network - operators
   * stake tokens to participate and are slashed for providing incorrect results.
   * 
   * @param address The Ethereum address to check (must be valid hex string)
   * @returns Promise<boolean> true if the address is sanctioned, false otherwise
   * 
   * @example
   * ```typescript
   * const isSanctioned = await AMLServices.isAddressSanctioned('0x1234567890123456789012345678901234567890');
   * console.log(`Address is sanctioned: ${isSanctioned}`);
   * ```
   */
  @navs()
  static async isAddressSanctioned(address: `0x${string}`): Promise<boolean> {
    // Download OFAC sanctions list if not already cached
    if (__sanctionList === undefined) {
      if (__sanctionPromise === undefined) {
        console.log('Downloading OFAC sanctions list...');
        __sanctionPromise = fetch('https://sanctionslistservice.ofac.treas.gov/api/PublicationPreview/exports/SDN_ENHANCED.XML')
          .then(res => {
            if (!res.ok) {
              throw new Error(`Failed to fetch OFAC list: ${res.status} ${res.statusText}`);
            }
            return res.text();
          });
      }

      __sanctionList = await __sanctionPromise;
      console.log(`OFAC sanctions list loaded (${__sanctionList.length} characters)`);
    }

    // Normalize address to checksum format for consistent searching
    const searchAddress = getAddress(address);
    
    // Search for the address in the sanctions list
    const isListed = __sanctionList.includes(searchAddress);
    
    console.log(`AML Check: ${searchAddress} -> ${isListed ? 'SANCTIONED' : 'CLEAR'}`);
    return isListed;
  }
}

// Export for external use
export default AMLServices;

// Re-export contract configurations for use in frontends
export * from './abi';