const withPlugins = require("next-compose-plugins")
const withTM = require("next-transpile-modules")([
  "@blocto/sdk",
  "@project-serum/sol-wallet-adapter",
  "@solana/wallet-adapter-base",
  "@solana/wallet-adapter-react",
  "@solana/wallet-adapter-react-ui",
  "@solana/wallet-adapter-ledger",
  "@solana/wallet-adapter-phantom",
  "@solana/wallet-adapter-slope",
])

/** @type {import('next').NextConfig} */
module.exports = withPlugins([withTM], {
  reactStrictMode: true
})
