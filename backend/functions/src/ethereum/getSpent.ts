interface GetSpentInterface{
    periodInDays: number, 
    transactions: any
};

const getSpentInPeriod = async ({periodInDays, transactions } : GetSpentInterface) => {
    const now = Date.now() / 1000;
    const periodStart = now - periodInDays * 24 * 60 * 60;

    const totalSpent = transactions.filter((tx: any) => tx.transactionType === "withdraw" && Number(tx.timeStamp) >= periodStart ).reduce((sum: any, tx: any) => sum + (tx.fiatValue || 0), 0);

    return totalSpent;
};

export { getSpentInPeriod };