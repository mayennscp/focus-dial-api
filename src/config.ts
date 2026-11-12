export type Config = {
  port: number;
  host: string;
  dbPath: string;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return {
    port: Number(env.PORT ?? 3000),
    // 0.0.0.0 so a phone on the same Wi-Fi (Expo Go) can reach the API.
    host: env.HOST ?? '0.0.0.0',
    dbPath: env.DB_PATH ?? 'focus-dial.db',
  };
}
