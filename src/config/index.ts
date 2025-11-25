export interface BaseConfigRegistry {
  db: {
    hostList: {
      name: string;
      host: string;
      port: number;
      username?: string;
      password?: string;
      authSource?: string;
    }[];
    databaseList: {
      database: string;
      hostName: string;
    }[];
  };
}
export interface ConfigRegistry extends BaseConfigRegistry {}