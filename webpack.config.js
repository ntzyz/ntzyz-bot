import { resolve } from 'node:path';
import NodePolyfillPlugin from 'node-polyfill-webpack-plugin';

export default {
  entry: './src/index.ts',
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  target: 'webworker',
  output: {
    filename: 'worker.js',
    path: '/tmp',
  },
  mode: 'production',
  resolve: {
    extensions: ['.ts', '.js'],
    fallback: {
      fs: false,
    },
  },
  plugins: [new NodePolyfillPlugin()],
  performance: {
    hints: false,
  },
};
