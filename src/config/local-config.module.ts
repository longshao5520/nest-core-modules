import { DynamicModule, Module } from '@nestjs/common';
import { LocalConfigService } from './local-config.service';
import type { BaseConfigRegistry, ConfigRegistry } from './index';

export type LocalConfigOptions = { configDir?: string };

@Module({})
export class LocalConfigModule {
  static forRoot<CR extends BaseConfigRegistry = ConfigRegistry>(options: LocalConfigOptions): DynamicModule {
    return {
      module: LocalConfigModule,
      providers: [{ provide: 'LOCAL_CONFIG_OPTIONS', useValue: options }, LocalConfigService],
      exports: [LocalConfigService],
      global: true
    };
  }
}