import { SuiClient, getFullnodeUrl } from '@mysten/sui.js/client';

export const client = new SuiClient({ url: getFullnodeUrl('mainnet') });