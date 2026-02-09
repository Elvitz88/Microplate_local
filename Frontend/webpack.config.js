const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const webpack = require('webpack');
require('dotenv').config();

const packageJson = require('./package.json');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';

  return {
    mode: isProduction ? 'production' : 'development',
    entry: './src/main.tsx',
    output: {
      path: path.resolve(__dirname, 'build'),
      filename: isProduction ? 'static/js/[name].[contenthash:8].js' : 'static/js/[name].js',
      chunkFilename: isProduction ? 'static/js/[name].[contenthash:8].chunk.js' : 'static/js/[name].chunk.js',
      assetModuleFilename: 'static/media/[name].[hash][ext]',
      publicPath: '/',
      clean: true,
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.jsx', '.js'],
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
      fallback: {
        "util": false,
        "path": false,
        "stream": false,
        "buffer": false,
        "fs": false,
        "os": false,
        "crypto": false,
      },
    },
    module: {
      rules: [
        {
          test: /\.(ts|tsx)$/,
          exclude: /node_modules/,
          use: {
            loader: 'ts-loader',
            options: {
              transpileOnly: true,
              configFile: path.resolve(__dirname, 'tsconfig.app.json'),
            },
          },
        },
        {
          test: /\.css$/i,
          use: [
            'style-loader',
            'css-loader',
            {
              loader: 'postcss-loader',
              options: {
                postcssOptions: {
                  plugins: [
                    require('@tailwindcss/postcss'),
                    require('autoprefixer'),
                  ],
                },
              },
            },
          ],
        },
        {
          test: /\.(png|jpe?g|gif|svg|ico)$/i,
          type: 'asset/resource',
        },
        {
          test: /\.(woff|woff2|eot|ttf|otf)$/i,
          type: 'asset/resource',
        },
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: './index.html',
        filename: 'index.html',
        inject: 'body',
      }),
      new CopyWebpackPlugin({
        patterns: [
          {
            from: path.resolve(__dirname, 'public'),
            to: path.resolve(__dirname, 'build'),
            noErrorOnMissing: true,
          },
        ],
      }),
      new webpack.DefinePlugin({
        'process.env.VITE_AUTH_SERVICE_URL': JSON.stringify(process.env.VITE_AUTH_SERVICE_URL || 'http://localhost:6401'),
        'process.env.VITE_IMAGE_SERVICE_URL': JSON.stringify(process.env.VITE_IMAGE_SERVICE_URL || 'http://localhost:6402'),
        'process.env.VITE_VISION_SERVICE_URL': JSON.stringify(process.env.VITE_VISION_SERVICE_URL || 'http://localhost:6403'),
        'process.env.VITE_RESULTS_SERVICE_URL': JSON.stringify(process.env.VITE_RESULTS_SERVICE_URL || 'http://localhost:6404'),
        'process.env.VITE_LABWARE_SERVICE_URL': JSON.stringify(process.env.VITE_LABWARE_SERVICE_URL || 'http://localhost:6405'),
        'process.env.VITE_PREDICTION_SERVICE_URL': JSON.stringify(process.env.VITE_PREDICTION_SERVICE_URL || 'http://localhost:6406'),
        'process.env.VITE_VISION_CAPTURE_SERVICE_URL': JSON.stringify(process.env.VITE_VISION_CAPTURE_SERVICE_URL || 'http://localhost:6407'),
        'process.env.VITE_AUTH_PATH_PREFIX': JSON.stringify(process.env.VITE_AUTH_PATH_PREFIX || ''),
        'process.env.VITE_IMAGE_PATH_PREFIX': JSON.stringify(process.env.VITE_IMAGE_PATH_PREFIX || ''),
        'process.env.VITE_VISION_PATH_PREFIX': JSON.stringify(process.env.VITE_VISION_PATH_PREFIX || ''),
        'process.env.VITE_RESULTS_PATH_PREFIX': JSON.stringify(process.env.VITE_RESULTS_PATH_PREFIX || ''),
        'process.env.VITE_LABWARE_PATH_PREFIX': JSON.stringify(process.env.VITE_LABWARE_PATH_PREFIX || ''),
        'process.env.VITE_PREDICTION_PATH_PREFIX': JSON.stringify(process.env.VITE_PREDICTION_PATH_PREFIX || ''),
        'process.env.VITE_CAPTURE_PATH_PREFIX': JSON.stringify(process.env.VITE_CAPTURE_PATH_PREFIX || ''),
        'process.env.VITE_MINIO_BASE_URL': JSON.stringify(process.env.VITE_MINIO_BASE_URL || 'http://localhost:9000'),
        'process.env.VITE_WS_URL': JSON.stringify(process.env.VITE_WS_URL || ''),
        'process.env.VITE_API_BASE_URL': JSON.stringify(process.env.VITE_API_BASE_URL || 'http://localhost:6400'),
        'process.env.NODE_ENV': JSON.stringify(isProduction ? 'production' : 'development'),
        'process.env.APP_VERSION': JSON.stringify(packageJson.version),
        'process.browser': true,
      }),
      new webpack.IgnorePlugin({
        resourceRegExp: /^winston$/,
      }),
    ],
    devServer: {
      static: [
        {
          directory: path.join(__dirname, 'public'),
          publicPath: '/',
        },
        {
          directory: path.join(__dirname, 'build'),
        },
      ],
      port: 6410,
      host: '0.0.0.0',
      hot: true,
      historyApiFallback: true,
      open: false,
      proxy: [
        {
          context: ['/api/v1/files'],
          target: 'http://localhost:6402',
          changeOrigin: true,
          secure: false,
        },
        {
          context: ['/api/v1/images'],
          target: 'http://localhost:6402',
          changeOrigin: true,
          secure: false,
        },
        {
          context: ['/api/v1/ingestion'],
          target: 'http://localhost:6402',
          changeOrigin: true,
          secure: false,
        },
        {
          context: ['/api/v1/signed-urls'],
          target: 'http://localhost:6402',
          changeOrigin: true,
          secure: false,
        },
        {
          context: ['/api/v1/auth'],
          target: 'http://localhost:6401',
          changeOrigin: true,
          secure: false,
        },
        {
          context: ['/api/v1/capture'],
          target: 'http://localhost:6407',
          changeOrigin: true,
          secure: false,
        },
        {
          context: ['/ws/capture'],
          target: 'ws://localhost:6407',
          changeOrigin: true,
          secure: false,
          ws: true,
        },
        {
          context: ['/api/v1/inference', '/api/v1/vision'],
          target: 'http://localhost:6403',
          changeOrigin: true,
          secure: false,
        },
        {
          context: ['/api/v1/results', '/api/v1/result'],
          target: 'http://localhost:6404',
          changeOrigin: true,
          secure: false,
        },
        {
          context: ['/api/v1/labware', '/api/v1/interface'],
          target: 'http://localhost:6405',
          changeOrigin: true,
          secure: false,
        },
        {
          context: ['/api/v1/prediction'],
          target: 'http://localhost:6406',
          changeOrigin: true,
          secure: false,
        },
      ],
    },
    devtool: isProduction ? 'source-map' : 'eval-source-map',
    optimization: {
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          vendor: {
            name: 'vendor',
            chunks: 'all',
            test: /node_modules/,
            priority: 20,
          },
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            priority: 10,
            reuseExistingChunk: true,
            enforce: true,
          },
        },
      },
    },
  };
};

