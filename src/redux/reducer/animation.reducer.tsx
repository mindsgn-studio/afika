//@ts-ignore
import {
  UPDATE_LOADING,
  UPDATE_RECEIVE,
  UPDATE_SEND,
  //@ts-ignore
} from '@orbyt/constants';

const initialState: any = {
  loading: true,
  receive: false,
  send: false,
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
    default:
      return state;
  }
};
