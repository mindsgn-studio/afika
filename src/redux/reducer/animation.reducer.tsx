//@ts-ignore
import {
  UPDATE_LOADING,
  UPDATE_RECEIVE,
  UPDATE_SWITCH_NETWORK,
  UPDATE_SEND,
  //@ts-ignore
} from '@orbyt/constants';

const initialState: any = {
  loading: false,
  receive: false,
  send: false,
  switchNetwork: false,
};

export default (state = initialState, action: any) => {
  switch (action.type) {
    case UPDATE_LOADING:
      return {
        ...state,
        loading: action.loading,
      };
    case UPDATE_RECEIVE:
      return {
        ...state,
        receive: action.receive,
      };
    case UPDATE_SEND:
      return {
        ...state,
        send: action.send,
      };
    case UPDATE_SWITCH_NETWORK:
      return {
        ...state,
        switchNetwork: action.switchNetwork,
      };
    default:
      return state;
  }
};
