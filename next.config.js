/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  serverExternalPackages: ['@supabase/supabase-js'],
};

module.exports = nextConfig;
