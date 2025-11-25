# @longqi/nest-core-modules

一个面向 NestJS 的核心模块集合，提供严格类型的本地配置读取与 Typegoose/Mongoose 集成，支持通过 CLI 自动生成配置类型并进行运行时校验。

## 特性
- 严格类型的本地配置读取：`LocalConfigModule`、`LocalConfigService`
- 自动配置类型生成：`longqi-gen-config-types`（生成命名空间增强）
- 运行时校验并构建 MongoDB 连接：`TypegooseModule`
- NodeNext/TypeScript 兼容：根导出包含 `types/import/require` 映射

## 安装
- 安装包与对等依赖：

```bash
pnpm add @longqi/nest-core-modules
pnpm add @nestjs/common @typegoose/typegoose mongoose -w
```

- 版本要求：
  - `@nestjs/common` / `@nestjs/core` ≥ 9
  - `@typegoose/typegoose` ≥ 9
  - `mongoose` ≥ 6

## 快速开始
1) 在主项目添加本地配置目录，例如 `config/`：

```json
// config/db.json
{
  "hostList": [
    { "name": "local", "host": "127.0.0.1", "port": 27017 }
  ],
  "databaseList": [
    { "database": "main", "hostName": "local" }
  ]
}
```

```json
// config/index.json
{ "featureEnabled": true, "title": "Demo" }
```

2) 生成配置类型增强（命名空间增强到 `@longqi/nest-core-modules`）：

```bash
longqi-gen-config-types --dir config --out src/types/nest-core-modules-config.d.ts
```

生成的文件大致如下（按你的配置文件自动生成）：

```ts
import '@longqi/nest-core-modules';

import * as dbConfig from '../../config/db.json';
import * as indexConfig from '../../config/index.json';

declare module '@longqi/nest-core-modules' {
  export interface ConfigRegistry {
    db: typeof dbConfig;
    index: typeof indexConfig;
  }
}
```

3) 在应用模块中使用：

```ts
import { Module, Injectable } from '@nestjs/common';
import { LocalConfigModule, LocalConfigService, TypegooseModule } from '@longqi/nest-core-modules';

@Module({
  imports: [
    LocalConfigModule.forRoot({ configDir: 'config' }),
    TypegooseModule.forRoot('main', { useLocalConfig: true })
  ]
})
export class AppModule {}

@Injectable()
export class SomeService {
  constructor(private readonly cfg: LocalConfigService) {}
  use() {
    const db = this.cfg.get('db');        // 类型来自命名空间增强
    const index = this.cfg.get('index');  // 类型来自命名空间增强
  }
}
```

## 配置服务说明
- `LocalConfigModule.forRoot(options)`：注册配置服务，常用 `options.configDir` 指向配置目录（默认 `config`）。
- `LocalConfigService.get(key)`：
  - `key` 为点分路径（如 `env.dev` 对应 `config/env/dev.json`）。
  - 仅支持 `.json` 文件；会进行路径规范化与文件存在校验。
  - 键的类型来源于 CLI 生成的命名空间增强（`ConfigRegistry`），编译期严格约束。

- 进阶（可选）：如果不使用命名空间增强，也可以使用泛型服务与泛型 `forRoot` 搭配你的自定义接口符号：

```ts
import type { NestCoreModulesConfig } from './types/nest-core-modules-config';
LocalConfigModule.forRoot<NestCoreModulesConfig>({ configDir: 'config' });
constructor(private readonly cfg: LocalConfigService<NestCoreModulesConfig>) {}
```

## Typegoose 模块
- `TypegooseModule.forRoot(dbName, options)`：
  - 当 `options.useLocalConfig` 为 `true` 时，自动读取 `db.json`，进行结构校验并构建连接串。
  - 支持用户名/密码与 `authSource`；连接参数包含池配置与超时设置。
- `TypegooseModule.forFeature(dbName, models)`：基于指定连接注册模型。

运行时校验逻辑位于：`src/database/typegoose.module.ts`，关键点：
- 验证 `hostList` 中的 `name/host/port` 等字段类型
- 验证 `databaseList` 中的 `database/hostName`
- 未找到数据库或主机配置时抛出明确错误

## db.json 结构
- `hostList`: `name`, `host`, `port`, `username?`, `password?`, `authSource?`
- `databaseList`: `database`, `hostName`

示例：

```json
{
  "hostList": [
    { "name": "local", "host": "127.0.0.1", "port": 27017, "username": "", "password": "", "authSource": "admin" }
  ],
  "databaseList": [
    { "database": "main", "hostName": "local" },
    { "database": "analytics", "hostName": "local" }
  ]
}
```

## TypeScript 配置建议
- 在主项目 `tsconfig.json`：
  - `compilerOptions.resolveJsonModule: true`
  - 将生成的 `.d.ts` 文件纳入 `include`（例如：`["src", "src/types/**/*.d.ts"]`）
- 包使用 NodeNext 兼容的根导出映射：
  - `types`: `./dist/index.d.ts`
  - `import`: `./dist/index.js`
  - `require`: `./dist/index.cjs`

## CLI 使用
- 基本用法：
  - `longqi-gen-config-types --dir config --out src/types/nest-core-modules-config.d.ts`
- 监听模式：
  - `longqi-gen-config-types --dir config --out src/types/nest-core-modules-config.d.ts --watch`
- 路径与键名规则：
  - `config/db.json` → 键 `db`，别名 `dbConfig`
  - `config/env/dev.json` → 键 `'env.dev'`（字符串字面量），别名 `envDevConfig`

## 常见错误与排查
- “配置目录不存在”：检查 `options.configDir` 与项目目录结构。
- “无效的配置文件”：仅支持 `.json`，且文件名不能以 `.` 开头。
- “db.json 格式不正确”：检查 `hostList` 与 `databaseList` 的字段类型是否符合约定。
- “未找到数据库配置/主机配置”：确认 `databaseList` 和 `hostList` 中的名称匹配。
- 如果 TS 无法识别增强，确认生成的 `.d.ts` 已被 `tsconfig.json` 的 `include` 覆盖。

## 开发与构建（本仓库）
- 构建：

```bash
pnpm run build
```

- 构建输出：
  - `dist/index.js` / `dist/index.cjs` / `dist/index.d.ts`
  - CLI：`dist/cli/gen-config-types.js`

## 许可证
- 待定（根据你的项目策略填写）。