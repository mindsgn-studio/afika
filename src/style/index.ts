import { StyleSheet } from 'react-native';
import { colors } from '@orbyt/constants';

const GlobalStyle = StyleSheet.create({
  logo: {},
  column: {
    display: 'flex',
    flexDirection: 'column',
  },
  row: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
  },
  flexRow: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});

export { GlobalStyle };
