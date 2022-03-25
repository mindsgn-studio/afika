export const GET_AUTH = 'GET_AUTH';
export const ADD_AUTH = 'ADD_AUTH';
export const REMOVE_AUTH = 'REMOVE_AUTH';

export const get_auth = () => {
    try {
        return async (dispatch: (arg0: { type?: string; payload?: boolean; }) => void) => {
            const response = true;
            dispatch({
                type: GET_AUTH,
                payload: response
            });
        }
    }catch(error){
    console.log(error)       
    }
}