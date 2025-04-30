import { onCall } from "firebase-functions/v2/https";
import { Wallet } from "ethers";
import { getTotalBalance } from "./ethereum/getTotalBalance";
import { getTotalHistory } from "./ethereum/getTotalHistory";
import { getSpentInPeriod } from "./ethereum/getSpent"

// import { logger } from "firebase-functions";


export const newWallet = onCall(async(request) => {
    try{
        const { data } = request;
        const { network, type, encrypted, password } = data;
        
        switch (type) {
            case "optimism":
            case "polygon":
            case "gnosis":
            case "celo":
            case "base":
            case "arbitrum":
            case "ethereum":
                const wallet = Wallet.createRandom();
                const { privateKey, address, mnemonic, publicKey } = wallet;
                //@ts-expect-error
                const { phrase } = mnemonic;
                
                return {
                    error: false,
                    message: null,
                    address,
                    privateKey,
                    publicKey,
                    mnemonic: phrase,
                    network,
                    encrypted,
                    password,
                    type
                };
            case "stellar":
                return {
                    type
                }
            case "bitcoin":
                return {
                    type
                }
            case "cardano":
                return {
                    type
                }
            default:
                throw new Error ("Error: Cannot create wallet");
        }
    } catch (error) {
        return {
            error: true,
            message: `${error}`,
            address: "",
        }
    } finally {
        console.log("Done!");
    } 
});

export const getBalance = onCall(async(request) => {
    try{
        const { data } = request;
        const { type, address, network } = data;

        switch (type) {
            case "optimism":
            case "polygon":
            case "gnosis":
            case "celo":
            case "base":
            case "arbitrum":
            case "ethereum":
                const balanceResponse = await getTotalBalance({ address });
                const { tokenValue = 1 } = balanceResponse
                
                //@ts-expect-error
                const TransactionHistory = await getTotalHistory({ network, address, tokenValue });
                
                const today = await getSpentInPeriod({
                    periodInDays: 1, transactions: TransactionHistory
                });
        
                const week = await getSpentInPeriod({
                    periodInDays: 7, transactions: TransactionHistory
                });
        
                const month = await getSpentInPeriod({
                    periodInDays: 30, transactions: TransactionHistory
                });

                return {
                    type,
                    ...balanceResponse,
                    transactions: TransactionHistory,
                    today,
                    week,
                    month
                }
            case "stellar":
                return {
                    type
                }
            case "bitcoin":
                return {
                    type
                }
            case "cardano":
                return {
                    type
                }
            default:
                throw new Error ("Error: Cannot create wallet");
        }
    } catch (error) {
        console.log(error);
        return {
            error: true,
            message: `${error}`,
            address: "",
        }
    } finally {
        console.log("Done!");
    }
});
