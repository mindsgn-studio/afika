import {CONNECT, DISCONNECT, INCREMENT, DECREMENT} from '../../constants';

interface walletState{
    connected?: boolean;
    chainId?: number | null;
    network?: string | null;
    address?: string | null;
    totalAmount?: number | null;
    disabled?: boolean;
    peerId?: string | null;
    peerMeta?: any | null;
};

const initialState: walletState = {
    connected: false,
    address: null,
    peerId: null,
    peerMeta: null,
}

export default (state = initialState, action: any) => {
    switch (action.type) {
        case CONNECT:
            return { 
                connected: action.connected,
                address: action.address,
                chainId: action.chainId,
                peerMeta: action.peerMeta,
            };
        case DISCONNECT:
            return {
                connected: action.connected,
                address: action.address,
                chainId: action.chainId,
                peerMeta: action.peerMeta,
            };
        default:
            return state;
    }
}