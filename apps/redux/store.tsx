import { createStore, combineReducers, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { persistStore, persistReducer } from 'redux-persist';
import { authReducer } from './reducer';

const persistConfig = {
    key: '@orbyt',
    storage: AsyncStorage,
    whitelist: ['wallets']
};

export interface State {
    authReducer: any
}

const rootReducer: any = combineReducers({
    authReducer: persistReducer(persistConfig, authReducer)
});

export const store = createStore<State, any, any, any>(rootReducer, applyMiddleware(thunk));
export const persistor = persistStore(store)