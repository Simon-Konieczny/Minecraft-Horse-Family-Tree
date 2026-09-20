import type { NextConfig } from "next";
import { createVanillaExtractPlugin } from '@vanilla-extract/next-plugin';
const withVanillaExtract = createVanillaExtractPlugin();

const nextConfig: NextConfig = {
  devIndicators: false,
};

export default withVanillaExtract(nextConfig);
