const HappyPack = require('happypack')
const webpack = require('webpack')
const path = require('path')

module.exports = {
  bail: true,
  devtool: 'eval-source-map', // or source-map
  target: 'node',
  entry: {
    index: path.resolve('src', 'index.ts'),
  },
  output: {
    filename: './dist/[name].bundle.js',
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        include: path.resolve('src'),
        use: [
          {
            loader: 'happypack/loader',
            options: {
              id: 'buildLoader'
            }
          },
        ],
      },
    ],
  },
  plugins: [
    new webpack.NoEmitOnErrorsPlugin(),
    new HappyPack({
      id: 'buildLoader',
      verbose: false,
      loaders: [
        {
          loader: '../lib/index.js',
          options: {
            tslint: './tslint.json',
            tsconfig: './tsconfig.json',
            cache: true,
          },
        },
      ],
    }),
  ],
}
