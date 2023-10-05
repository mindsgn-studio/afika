import { colors, fonts } from '@orbyt/constants';
import { StyleSheet } from 'react-native';

export const style = StyleSheet.create({
  default: {
    flex: 1,
    display: 'flex',
    backgroundColor: 'black',
  },
  summary: {
    flex: 1,
    padding: 30,
  },
  chart: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    marginLeft: -50,
  },
  image: {
    width: 40,
    height: 40,
    marginRight: 10,
  },
  text: {
    color: colors.white,
  },
  title: {
    fontSize: 20,
    color: colors.white,
    fontFamily: fonts.Heavy,
  },
  number: {
    fontSize: 30,
    color: colors.white,
    fontFamily: fonts.Heavy,
    marginTop: -15,
  },
  subTitle: {
    fontSize: 20,
    color: colors.gray,
    fontFamily: fonts.Meduim,
  },
});
