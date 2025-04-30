import { formatEther } from "ethers";
import { Network, Alchemy } from "alchemy-sdk";
import { formatCompactNumber } from "../utils/formatCompactNumber";

interface Tokens {
    balance: number,
    fiatBalance: number,
    symbol: string,
    currency: string,
    value: number,
    lastUpdatedAt: string
};


interface GetBalance {
    address: string,
};

const getTotalBalance = async({
    address,
}: GetBalance) => {
    const currency = "zar"
    const lastUpdatedAt = `${new Date()}`
    let value = 1;
    let tokens: Tokens[] = [];
    let totalBalance: number = 0; 

    try{
        const coingeckoEndpoint = 'https://api.coingecko.com/api/v3/simple/price';

        const queryParams = new URLSearchParams({
            ids: 'xdai',
            vs_currencies: 'zar',
        });

        const response = await fetch(`${coingeckoEndpoint}?${queryParams}`);

        if (response.ok) {
            const data = await response.json();
            const { xdai } = data;
            const { zar } = xdai;
            value = zar;
        }

        let _network =  Network.GNOSIS_MAINNET

        const settings = {
            apiKey: `${process.env.ALCHEMY_API}`,
            network: _network,
        };
        
        const alchemy = new Alchemy(settings);
        const nativeBalance = await alchemy.core.getBalance(address, "latest");
        const { _hex } = nativeBalance;
        const balance = formatEther(_hex);

        const fiatBalance = parseFloat(balance) * value;
        totalBalance += fiatBalance;

        //@ts-expect-error
        const formaTotaltedBalance: string = formatCompactNumber(totalBalance);

        tokens.push({
            balance: parseFloat(balance),
            fiatBalance,
            symbol: "xDAI",
            currency,
            value,
            lastUpdatedAt
        });

        return {
            totalBalance: formaTotaltedBalance,
            tokens,
            tokenValue: value,
            currency,
            lastUpdatedAt,
        }
        
    } catch (error) {
        return {
            error: {
                message: "",
            }
        }
    }
}

export {
    getTotalBalance
}