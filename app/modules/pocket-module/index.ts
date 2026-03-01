// Reexport the native module. On web, it will be resolved to PocketModule.web.ts
// and on native platforms to PocketModule.ts
export { default } from './src/PocketModule';
export { default as PocketModuleView } from './src/PocketModuleView';
export * from  './src/PocketModule.types';
