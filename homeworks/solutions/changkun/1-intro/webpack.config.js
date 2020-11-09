/**
 * Copyright 2020 Changkun Ou <https://changkun.de>. All rights reserved.
 * Use of this source code is governed by a GNU GLPv3 license that can be
 * found in the LICENSE file.
 */

const path = require('path')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')

module.exports = env => {
  const dist = env && env.prod
  return {
    devServer: {
      open: true,
      port: 8080,
    },
    mode: dist ? 'production' : 'development',
    performance: { hints: false },
    entry: { build: ['@babel/polyfill', './src/main.js'] },
    plugins: [
      new CopyWebpackPlugin({
        patterns: [{from: 'src/assets', to: 'assets'}],
      }),
      new HtmlWebpackPlugin({
        title: 'LMU Munich GP WS2021',
        meta: {
          viewport: 'width=device-width, initial-scale=1, shrink-to-fit=no, maximum-scale=1.0, user-scalable=no'
        }
      }),
    ],
    output: {
      filename: '[name].js',
      path: path.resolve(__dirname, 'build')
    },
    module: {
      rules: [{
        test: /\.js$/,
        use: { loader: 'babel-loader',
          options: { compact: false, presets: [['@babel/preset-env']] }
        }
      }]
    },
    devtool: dist ? undefined : 'source-map',
  }
}
