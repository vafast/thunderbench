import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/cli.ts'],
  format: ['esm'],
  dts: false, // 使用单独的 tsc 生成类型
  clean: true,
  target: 'node18',
})

