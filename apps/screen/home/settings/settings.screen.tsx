import React from 'react';
import { View, Text, Image } from 'react-native';
import { DefaultButton as Button } from '../../../components/onboarding/button/defaultButton/default.button';
import WalletAction from '../../../redux/actions/wallet.action';

import { connect } from 'react-redux';
import { colors } from '../../../constants';

const Settings = (props: any) => {
    const { connected, navigation, auth, user} = props;
    const { disconnectWallet } = WalletAction(props);

    React.useEffect(() => {
        if (!connected) navigation.navigate('Onboarding');
    }, [connected]);

    return (
        <View
            style={{
                flex: 1,
                backgroundColor: 'gray'
            }}>
                <View
                    style={{
                        display: "flex",
                        flexDirection: "row",
                        justifyContent: "center",
                        alignItems: 'flex-end',
                        backgroundColor: 'white'
                    }}>
                    <View>
                        {
                            user?
                            <Image 
                                style={{
                                    maxWidth: 100,
                                    maxHeight: 100,
                                    minWidth: 90,
                                    minHeight: 90,
                                    borderRadius: 50,
                                    margin: 10
                                }}
                                source={{ uri: user.profileImage}}/>
                                :
                                null
                            }
                    </View>
                </View>
                <View>
                    {
                        user?
                        <View
                            style={{
                                padding: 10,
                                backgroundColor: 'white'
                            }}>
                            <Text
                                style={{
                                    fontFamily: 'SF-Pro-Rounded-Bold',
                                    fontSize: 21
                                }}>Name: {user.name}</Text>
                            <Text
                                style={{
                                    fontFamily: 'SF-Pro-Rounded-Bold',
                                    fontSize: 21,
                                    marginTop: -15
                                }}>Email: {user.email}</Text>
                            <Text
                                style={{
                                    fontFamily: 'SF-Pro-Rounded-Bold',
                                    fontSize: 21,
                                    marginTop: -15
                                }}>Langauge: English</Text>
                        </View>
                        :
                        null
                    }
                </View>
                <View>
                    <View
                        style={{
                            padding: 10,
                            backgroundColor: 'white'
                        }}>
                            <Button
                                onPress={() => {}}
                                text="Show Private Keys"
                                color={colors.orange}
                                fontColor={"white"} />
                    </View>
                    <View
                        style={{
                            padding: 10,
                            backgroundColor: 'white'
                        }}>
                            <Button
                                onPress={() => {}}
                                text="Backup Wallet Keys"
                                color={colors.green}
                                fontColor={"white"} />
                    </View>
                </View>

                <View
                    style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "row",
                        justifyContent: "center",
                        alignItems: 'flex-end',
                        backgroundColor: 'white'
                    }}>
                    <Button
                        onPress={() =>  disconnectWallet(auth)}
                        text="DISCONNECT"
                        color={colors.red}
                        fontColor={"white"} />
                </View>
        </View>
    );
};

const mapStateToProps = (state: any, props: any) => {
    return { 
        connected: state.connected,
        auth: state.auth,
        user: state.user
     };
};

export default connect(mapStateToProps)(Settings);
