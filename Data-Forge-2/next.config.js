/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  // Configurações para evitar problemas de build no Vercel
  swcMinify: true,
};

module.exports = nextConfig;
