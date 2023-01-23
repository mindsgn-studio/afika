import React from 'react';
import { View, Text, Image } from 'react-native';
import { connect } from 'react-redux';

const Card = (
    {
        url, 
        id, 
        symbol, 
        currentPrice, 
        marketCapChange
    }: {
        url: string, 
        id: any, 
        symbol: string, 
        currentPrice: any, 
        marketCapChange: any
    }) => {
    const isPositive = (number: string) => {
        if(number.indexOf('-') === 0){
            return false
        }
        return true
    }
    
    const roundOff = (number: number) => {
        return number.toFixed(2) 
    }

    return (
        <View
            style={{
                margin: 5,
                padding: 10,
                backgroundColor:'white',
                display: 'flex',
                flexDirection:'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                elevation: 20,
                shadowColor: '#000000',
                borderRadius: 20
            }}>
            <View
                style={{
                    display: 'flex',
                    flexDirection:'row',
                    alignItems: 'center',
                }}>
                <Image
                    source={{uri: url}}
                    style={{
                    width:50,
                    height:50,
                    borderRadius: 50,
                    marginRight: 10,
                }}/>
                                    <View>
                                        <Text
                                            style={{
                                                fontFamily: 'SF-Pro-Rounded-Bold',
                                                color:'black',
                                                fontSize: 21,
                                            }}>
                                            {id}
                                        </Text>
                                        <Text
                                            style={{
                                                fontFamily: 'SF-Pro-Rounded-Bold',
                                                fontSize: 18,
                                                marginTop: -20,
                                                color: 'grey'   
                                            }}>
                                            {symbol}
                                        </Text>
                                    </View>
                                </View>
                                <View
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'flex-end'
                                    }}
                                    >
                                        <Text
                                                style={{
                                                fontFamily: 'SF-Pro-Rounded-Bold',
                                                color:'black',
                                                fontSize: 21,
                                            }}>
                                            {`$ ${roundOff(currentPrice)}`}
                                        </Text>
                                        <Text
                                                style={{
                                                fontFamily: 'SF-Pro-Rounded-Bold',
                                                color: `${isPositive(`${marketCapChange}`) ? "green" :  "red"}`,
                                                fontSize: 21,
                                                marginTop: -20
                                            }}>
                                            {`${roundOff(marketCapChange)} %`}
                                        </Text>
                                </View>
                            </View>
    );
};

const mapStateToProps = (state: any, props: any) => {
    return { address: state.address };
};

export default connect(mapStateToProps)(Card);
