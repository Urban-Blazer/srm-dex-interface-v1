import { client } from '../client';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { normalizeSuiObjectId } from '@mysten/sui.js/utils';
import { PACKAGE_ID } from '../config';

const MODULE_NAME = 'quote';
const FUNC_QUOTE_BY_SELL = 'get_swap_quote_by_sell';
const FUNC_QUOTE_BY_BUY = 'get_swap_quote_by_buy';

export interface QuoteResult {
    amountOut: number;
    lpBuilderFeeIn: number;
    lpBuilderFeeOut: number;
    swapFee: number;
    burnFee: number;
    devFee: number;
    rewardsFee: number;
}

type CommonArgs = {
    isAToB: boolean;
    poolBalanceA: number;
    poolBalanceB: number;
    swapFee: number;
    lpBuilderFee: number;
    burnFee: number;
    devRoyaltyFee: number;
    rewardsFee: number;
};

export async function getQuoteBySell(
    sender: string,
    sellAmount: number,
    args: CommonArgs
): Promise<QuoteResult> {
    const txb = new TransactionBlock();

    txb.moveCall({
        target: `${PACKAGE_ID}::${MODULE_NAME}::${FUNC_QUOTE_BY_SELL}`,
        arguments: [
            txb.pure.u64(sellAmount),
            txb.pure.bool(args.isAToB),
            txb.pure.u64(args.poolBalanceA),
            txb.pure.u64(args.poolBalanceB),
            txb.pure.u64(args.swapFee),
            txb.pure.u64(args.lpBuilderFee),
            txb.pure.u64(args.burnFee),
            txb.pure.u64(args.devRoyaltyFee),
            txb.pure.u64(args.rewardsFee),
        ],
    });

    const { results } = await client.devInspectTransactionBlock({
        transactionBlock: txb,
        sender: normalizeSuiObjectId(sender),
    });

    const returnValues = results?.[0]?.returnValues?.[0]?.[0];

    if (!returnValues || !Array.isArray(returnValues)) {
        throw new Error('Failed to get quote by sell');
    }

    const [
        amountOut,
        lpBuilderFeeIn,
        lpBuilderFeeOut,
        swapFee,
        burnFee,
        devFee,
        rewardsFee,
    ] = returnValues.map((val: any) => Number(val));

    return {
        amountOut,
        lpBuilderFeeIn,
        lpBuilderFeeOut,
        swapFee,
        burnFee,
        devFee,
        rewardsFee,
    };
}

export async function getQuoteByBuy(
    sender: string,
    buyAmount: number,
    args: CommonArgs
): Promise<QuoteResult> {
    const txb = new TransactionBlock();

    txb.moveCall({
        target: `${PACKAGE_ID}::${MODULE_NAME}::${FUNC_QUOTE_BY_BUY}`,
        arguments: [
            txb.pure.u64(buyAmount),
            txb.pure.bool(args.isAToB),
            txb.pure.u64(args.poolBalanceA),
            txb.pure.u64(args.poolBalanceB),
            txb.pure.u64(args.swapFee),
            txb.pure.u64(args.lpBuilderFee),
            txb.pure.u64(args.burnFee),
            txb.pure.u64(args.devRoyaltyFee),
            txb.pure.u64(args.rewardsFee),
        ],
    });

    const { results } = await client.devInspectTransactionBlock({
        transactionBlock: txb,
        sender: normalizeSuiObjectId(sender),
    });

    const returnValues = results?.[0]?.returnValues?.[0]?.[0];

    if (!returnValues || !Array.isArray(returnValues)) {
        throw new Error('Failed to get quote by buy');
    }

    const [
        finalAmountIn,
        lpBuilderFeeIn,
        lpBuilderFeeOut,
        swapFee,
        burnFee,
        devFee,
        rewardsFee,
    ] = returnValues.map((val: any) => Number(val));

    return {
        amountOut: finalAmountIn,
        lpBuilderFeeIn,
        lpBuilderFeeOut,
        swapFee,
        burnFee,
        devFee,
        rewardsFee,
    };
}