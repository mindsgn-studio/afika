module.exports = {
  presets: ['module:metro-react-native-babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        alias: {
          '@orbyt/assets': './src/assets',
          '@orbyt/components': './src/components',
          '@orbyt/constants': './src/constants',
          '@orbyt/context': './src/context',
          '@orbyt/screen': './src/screen',
          '@orbyt/types': './src/types',
          '@orbyt/style': './src/style',
          '@orbyt/hooks': './src/hooks',
        },
      },
    ],
    [
      'module:react-native-dotenv',
      {
        moduleName: '@env',
        path: '.env',
      },
    ],
    'react-native-reanimated/plugin',
  ],
};
