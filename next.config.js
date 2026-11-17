/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['lunar-javascript'],
  // 允许用局域网 IP 访问 dev 资源（手机/其他设备预览用）
  allowedDevOrigins: ['10.26.12.19', '10.26.12.19:3000', 'localhost', '127.0.0.1'],
};

module.exports = nextConfig;
