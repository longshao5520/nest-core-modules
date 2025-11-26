import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/cli/gen-config-types.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  shims: true,
  // 确保不打包 peerDependencies
  external: ['@nestjs/common', '@nestjs/core', '@nestjs/swagger', 'mongoose', '@typegoose/typegoose'],
});