import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
import { getModelForClass, mongoose } from '@typegoose/typegoose';
import { LocalConfigService } from '../config/local-config.service';
import type { BaseConfigRegistry } from '../config/index';

export type DbOptions = { 
  uri?: string; 
  useLocalConfig?: boolean; 
  hostName?: string 
};

@Global()
@Module({})
export class TypegooseModule {
  static forRoot(dbName: string, options?: DbOptions): DynamicModule {
    const providers: Provider[] = [
      {
        provide: `MongooseModule_${dbName}`,
        inject: [LocalConfigService],
        useFactory: async (configService: LocalConfigService) => {
          let uri: string | undefined = options?.uri;
          if (!uri && options?.useLocalConfig) {
            const dbConfigs = configService.get('db') as BaseConfigRegistry['db'];
            const isValidHost = (h: any) => h && typeof h.name === 'string' && typeof h.host === 'string' && typeof h.port === 'number' && (h.username === undefined || typeof h.username === 'string') && (h.password === undefined || typeof h.password === 'string') && (h.authSource === undefined || typeof h.authSource === 'string');
            const isValidDb = (d: any) => d && typeof d.database === 'string' && typeof d.hostName === 'string';
            if (!dbConfigs || !Array.isArray((dbConfigs as any).hostList) || !Array.isArray((dbConfigs as any).databaseList) || !(dbConfigs as any).hostList.every(isValidHost) || !(dbConfigs as any).databaseList.every(isValidDb)) {
              throw new Error('db.json 格式不正确，请按照导出的类型结构填充配置');
            }
            const dbConfig = dbConfigs.databaseList.find((db) => db.database === dbName);
            if (!dbConfig) throw new Error(`未找到数据库配置: ${dbName}`);
            const hostName = options?.hostName || dbConfig.hostName;
            const dbHost = dbConfigs.hostList.find((host) => host.name === hostName);
            if (!dbHost) throw new Error(`未找到主机配置: ${hostName}`);
            uri = `mongodb://${dbHost.host}:${dbHost.port}/${dbConfig.database}`;
            if (dbHost.username) {
              uri = `mongodb://${dbHost.username}:${dbHost.password}@${dbHost.host}:${dbHost.port}/${dbConfig.database}`;
            }
            if (dbHost.authSource) {
              uri += `?authSource=${dbHost.authSource}`;
            }
          }
          if (!uri) throw new Error('未配置 MongoDB 连接 URI');
          const connection = mongoose.createConnection();
          await connection.openUri(uri, {
            maxPoolSize: 20,
            minPoolSize: 5,
            waitQueueTimeoutMS: 5000,
            connectTimeoutMS: 30000,
            serverSelectionTimeoutMS: 5000
          });
          connection.set('strictQuery', false);
          return connection;
        }
      }
    ];
    return { module: TypegooseModule, providers, exports: providers, global: true };
  }

  static forFeature(dbName: string, models: any[]): DynamicModule {
    const providers = models.map((model) => ({
      provide: model.name,
      inject: [`MongooseModule_${dbName}`],
      useFactory: (connection: mongoose.Connection) => getModelForClass(model, { existingConnection: connection })
    }));
    return { module: TypegooseModule, providers, exports: providers, global: true };
  }
}