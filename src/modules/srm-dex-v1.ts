import { client } from '../client';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { normalizeSuiObjectId } from '@mysten/sui.js/utils';
import { PACKAGE_ID } from '../config';
import { bcs } from '@mysten/bcs';

const MODULE_NAME = 'SRMV1';

export interface PoolBalancesResult {
    balanceA: number;
    balanceB: number;
    lpSupply: number;
}

export interface PoolFeesResult {
    lpBuilderFee: number;
    burnFee: number;
    creatorRoyaltyFee: number;
    rewardsFee: number;
}

export interface PoolInfoResult {
    balanceA: number;
    balanceB: number;
    lpSupply: number;
    lpBuilderFee: number;
    burnFee: number;
    creatorRoyaltyFee: number;
    rewardsFee: number;
    swapBalanceA: number;
    burnBalanceA: number;
    burnBalanceB: number;
    creatorBalanceA: number;
    rewardBalanceA: number;
    creatorRoyaltyWallet: string;
}

/**
 * Gets the balances of pool tokens A, B and LP supply
 */
export async function getPoolBalances<A = unknown, B = unknown>(
    sender: string,
    poolId: string
): Promise<PoolBalancesResult> {
    const tx = new TransactionBlock();

    tx.moveCall({
        target: `${PACKAGE_ID}::${MODULE_NAME}::pool_balances`,
        arguments: [tx.object(poolId)],
        typeArguments: ['0x1::sui::SUI', '0x1::sui::SUI'], // Replace with actual coin types
    });

    const result = await client.devInspectTransactionBlock({
        sender: normalizeSuiObjectId(sender),
        transactionBlock: tx,
    });

    const returnValues = result.results?.[0]?.returnValues?.[0]?.[0];
    if (!returnValues || !Array.isArray(returnValues)) {
        throw new Error('Failed to fetch pool balances');
    }

    const [balanceA, balanceB, lpSupply] = returnValues.map((val: any) => Number(val));

    return { balanceA, balanceB, lpSupply };
}

/**
 * Fetches the configured fee rates of the pool
 */
export async function getPoolFees<A = unknown, B = unknown>(
    sender: string,
    poolId: string
): Promise<PoolFeesResult> {
    const tx = new TransactionBlock();

    tx.moveCall({
        target: `${PACKAGE_ID}::${MODULE_NAME}::get_pool_fees`,
        arguments: [tx.object(poolId)],
        typeArguments: ['0x1::sui::SUI', '0x1::sui::SUI'], // Replace with actual coin types
    });

    const result = await client.devInspectTransactionBlock({
        sender: normalizeSuiObjectId(sender),
        transactionBlock: tx,
    });

    const returnValues = result.results?.[0]?.returnValues?.[0]?.[0];
    if (!returnValues || !Array.isArray(returnValues)) {
        throw new Error('Failed to fetch pool fees');
    }

    const [lpBuilderFee, burnFee, creatorRoyaltyFee, rewardsFee] = returnValues.map((val: any) => Number(val));

    return {
        lpBuilderFee,
        burnFee,
        creatorRoyaltyFee,
        rewardsFee,
    };
}

/**
 * Returns all data about the pool
 */
export async function getPoolInfo<A = unknown, B = unknown>(
    sender: string,
    poolId: string
): Promise<PoolInfoResult> {
    const tx = new TransactionBlock();

    tx.moveCall({
        target: `${PACKAGE_ID}::${MODULE_NAME}::get_pool_info`,
        arguments: [tx.object(poolId)],
        typeArguments: ['0x1::sui::SUI', '0x1::sui::SUI'], // Replace with actual coin types
    });

    const result = await client.devInspectTransactionBlock({
        sender: normalizeSuiObjectId(sender),
        transactionBlock: tx,
    });

    const returnValues = result.results?.[0]?.returnValues?.[0]?.[0];

    if (!returnValues || !Array.isArray(returnValues) || returnValues.length < 13) {
        throw new Error('Failed to fetch pool info');
    }

    const [
        balanceA,
        balanceB,
        lpSupply,
        lpBuilderFee,
        burnFee,
        creatorRoyaltyFee,
        rewardsFee,
        swapBalanceA,
        burnBalanceA,
        burnBalanceB,
        creatorBalanceA,
        rewardBalanceA,
        creatorRoyaltyWallet,
    ] = returnValues;

    return {
        balanceA: Number(balanceA),
        balanceB: Number(balanceB),
        lpSupply: Number(lpSupply),
        lpBuilderFee: Number(lpBuilderFee),
        burnFee: Number(burnFee),
        creatorRoyaltyFee: Number(creatorRoyaltyFee),
        rewardsFee: Number(rewardsFee),
        swapBalanceA: Number(swapBalanceA),
        burnBalanceA: Number(burnBalanceA),
        burnBalanceB: Number(burnBalanceB),
        creatorBalanceA: Number(creatorBalanceA),
        rewardBalanceA: Number(rewardBalanceA),
        creatorRoyaltyWallet: creatorRoyaltyWallet as string,
    };
}

/**
 * Fetches the Pool ID from the factory's dynamic table based on coin types.
 */
export async function getPoolIdFromFactory(
    factoryId: string,
    coinTypeA: string,
    coinTypeB: string
): Promise<string | null> {
    const factory = await client.getObject({
        id: factoryId,
        options: { showContent: true },
    });

    const tableId = factory.data?.content?.fields?.pools?.fields?.id?.id;

    if (!tableId) {
        throw new Error('Could not locate table ID in factory object');
    }

    const poolKey = {
        a: coinTypeA,
        b: coinTypeB,
    };

    try {
        const dynamicField = await client.getDynamicFieldObject({
            parentId: tableId,
            name: {
                type: `${PACKAGE_ID}::${MODULE_NAME}::PoolItem`,
                value: poolKey,
            },
        });

        const poolId = dynamicField.data?.content?.fields?.value;
        return normalizeSuiObjectId(poolId);
    } catch (e) {
        // Pool does not exist
        return null;
    }
}

/**
 * Swap Coin A for Coin B and transfer to sender
 */
export function buildSwapAForBEntry({
    poolId,
    configId,
    coinObjectId,
    amountIn,
    minAmountOut,
    clockObjectId,
    coinTypeA,
    coinTypeB,
}: {
    poolId: string;
    configId: string;
    coinObjectId: string;
    amountIn: string;
    minAmountOut: string;
    clockObjectId: string;
    coinTypeA: string;
    coinTypeB: string;
}): TransactionBlock {
    const tx = new TransactionBlock();

    tx.moveCall({
        target: `${PACKAGE_ID}::SRMV1::swap_a_for_b_with_coins_and_transfer_to_sender`,
        arguments: [
            tx.object(poolId),
            tx.object(configId),
            tx.object(coinObjectId),
            tx.pure(amountIn, 'u64'),
            tx.pure(minAmountOut, 'u64'),
            tx.object(clockObjectId),
        ],
        typeArguments: [coinTypeA, coinTypeB],
    });

    return tx;
}

/**
 * Swap Coin B for Coin A and transfer to sender
 */
export function buildSwapBForAEntry({
    poolId,
    configId,
    coinObjectId,
    amountIn,
    minAmountOut,
    clockObjectId,
    coinTypeA,
    coinTypeB,
}: {
    poolId: string;
    configId: string;
    coinObjectId: string;
    amountIn: string;
    minAmountOut: string;
    clockObjectId: string;
    coinTypeA: string;
    coinTypeB: string;
}): TransactionBlock {
    const tx = new TransactionBlock();

    tx.moveCall({
        target: `${PACKAGE_ID}::SRMV1::swap_b_for_a_with_coins_and_transfer_to_sender`,
        arguments: [
            tx.object(poolId),
            tx.object(configId),
            tx.object(coinObjectId),
            tx.pure(amountIn, 'u64'),
            tx.pure(minAmountOut, 'u64'),
            tx.object(clockObjectId),
        ],
        typeArguments: [coinTypeA, coinTypeB],
    });

    return tx;
}

/**
 * Builds a transaction to add liquidity using Coin<A> and Coin<B>
 */
export function buildAddLiquidityTx({
    poolId,
    coinA,
    amountA,
    coinB,
    amountB,
    minLpOut,
    clockObjectId,
    coinTypeA,
    coinTypeB,
}: {
    poolId: string;
    coinA: string;
    amountA: number;
    coinB: string;
    amountB: number;
    minLpOut: number;
    clockObjectId: string;
    coinTypeA: string;
    coinTypeB: string;
}): TransactionBlock {
    const tx = new TransactionBlock();

    const [splitA] = tx.splitCoins(tx.object(coinA), [tx.pure.u64(amountA)]);
    const [splitB] = tx.splitCoins(tx.object(coinB), [tx.pure.u64(amountB)]);

    tx.moveCall({
        target: `${PACKAGE_ID}::${MODULE_NAME}::add_liquidity_with_coins_and_transfer_to_sender`,
        typeArguments: [coinTypeA, coinTypeB],
        arguments: [
            tx.object(poolId),
            splitA,
            tx.pure.u64(amountA),
            splitB,
            tx.pure.u64(amountB),
            tx.pure.u64(minLpOut),
            tx.object(clockObjectId),
        ],
    });

    return tx;
}


/**
 * Builds a transaction to remove liquidity
 */
export function buildRemoveLiquidityTx({
    poolId,
    lpCoinId,
    lpAmount,
    minAOut,
    minBOut,
    clockObjectId,
    coinTypeA,
    coinTypeB,
}: {
    poolId: string;
    lpCoinId: string;
    lpAmount: number;
    minAOut: number;
    minBOut: number;
    clockObjectId: string;
    coinTypeA: string;
    coinTypeB: string;
}): TransactionBlock {
    const tx = new TransactionBlock();

    const [splitLP] = tx.splitCoins(tx.object(lpCoinId), [tx.pure.u64(lpAmount)]);

    tx.moveCall({
        target: `${PACKAGE_ID}::${MODULE_NAME}::remove_liquidity_with_coins_and_transfer_to_sender`,
        typeArguments: [coinTypeA, coinTypeB],
        arguments: [
            tx.object(poolId),
            splitLP,
            tx.pure.u64(lpAmount),
            tx.pure.u64(minAOut),
            tx.pure.u64(minBOut),
            tx.object(clockObjectId),
        ],
    });

    return tx;
}

/**
 * Builds a transaction to deposit Coin<B> for manual burning
 */
export function buildDepositCoinBTx({
    poolId,
    coinB,
    amount,
    clockObjectId,
    coinTypeA,
    coinTypeB,
}: {
    poolId: string;
    coinB: string;
    amount: number;
    clockObjectId: string;
    coinTypeA: string;
    coinTypeB: string;
}): TransactionBlock {
    const tx = new TransactionBlock();

    const [splitB] = tx.splitCoins(tx.object(coinB), [tx.pure.u64(amount)]);

    tx.moveCall({
        target: `${PACKAGE_ID}::${MODULE_NAME}::deposit_coinB_tokens`,
        typeArguments: [coinTypeA, coinTypeB],
        arguments: [
            tx.object(poolId),
            splitB,
            tx.pure.u64(amount),
            tx.object(clockObjectId),
        ],
    });

    return tx;
}


/**
 * Builds a transaction to lock LP tokens in the pool
 */
export function buildDepositLPTokensTx({
    poolId,
    lpTokenId,
    amount,
    coinTypeA,
    coinTypeB,
}: {
    poolId: string;
    lpTokenId: string;
    amount: number;
    coinTypeA: string;
    coinTypeB: string;
}): TransactionBlock {
    const tx = new TransactionBlock();

    const [splitLP] = tx.splitCoins(tx.object(lpTokenId), [tx.pure.u64(amount)]);

    tx.moveCall({
        target: `${PACKAGE_ID}::${MODULE_NAME}::deposit_lp_tokens`,
        typeArguments: [coinTypeA, coinTypeB],
        arguments: [
            tx.object(poolId),
            splitLP,
            tx.pure.u64(amount),
        ],
    });

    return tx;
}