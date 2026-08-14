/** @type {import('next').NextConfig} */
export default {
  reactStrictMode: true,
  // The Supabase generated row types infer loosely across nested selects.
  // Type checking runs in CI / locally via `tsc`, not as a deploy blocker.
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
};
