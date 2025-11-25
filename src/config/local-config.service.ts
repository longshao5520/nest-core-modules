import { Inject, Injectable } from '@nestjs/common';
import { existsSync, readFileSync, statSync } from 'fs';
import { join, parse, sep } from 'path';
import type { BaseConfigRegistry, ConfigRegistry } from './index';

export type ConfigKey<CR extends BaseConfigRegistry = ConfigRegistry> = keyof CR;

@Injectable()
export class LocalConfigService<CR extends BaseConfigRegistry = ConfigRegistry> {
  private readonly configDir: string;
  constructor(@Inject('LOCAL_CONFIG_OPTIONS') private readonly options: any) {
    this.configDir = options?.configDir || 'config';
    const absDir = join(process.cwd(), this.configDir);
    if (!existsSync(absDir) || !statSync(absDir).isDirectory()) {
      throw new Error(`配置目录不存在: ${absDir}`);
    }
  }
  get<K extends keyof CR>(configPath: K): CR[K] {
    const normalized = String(configPath).replace(/\.json$/i, '').split('.').join(sep);
    const absPath = join(process.cwd(), this.configDir, `${normalized}.json`);
    if (!existsSync(absPath)) throw new Error(`配置文件不存在: ${absPath}`);
    if (!statSync(absPath).isFile()) throw new Error(`路径不是文件: ${absPath}`);
    const { name, ext } = parse(absPath);
    if (name.startsWith('.') || ext !== '.json') throw new Error(`无效的配置文件: ${absPath}`);
    return JSON.parse(readFileSync(absPath, 'utf8'));
  }
}