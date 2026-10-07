import "server-only";

import mysql, {
  type ResultSetHeader,
  type RowDataPacket,
} from "mysql2/promise";

type SqlValue = string | number | boolean | Date | Buffer | null;

declare global {
  var courseUpPool: mysql.Pool | undefined;
}

function getPool() {
  if (!globalThis.courseUpPool) {
    const { DB_HOST, DB_PORT, DB_DATABASE, DB_USERNAME, DB_PASSWORD, DB_SSL } = process.env;

    if (!DB_HOST || !DB_DATABASE || !DB_USERNAME || !DB_PASSWORD) {
      throw new Error("Database is not configured. Set the DB_* environment variables.");
    }

    // Penanganan SSL yang aman untuk TypeScript & mysql2
    const sslConfig = DB_SSL === "true" ? { rejectUnauthorized: false } : undefined;

    globalThis.courseUpPool = mysql.createPool({
      host: DB_HOST,
      port: Number(DB_PORT || 3306),
      database: DB_DATABASE,
      user: DB_USERNAME,
      password: DB_PASSWORD,
      charset: "utf8mb4",
      ssl: sslConfig,
      waitForConnections: true,
      connectionLimit: 5,
      maxIdle: 2,
      idleTimeout: 30_000,
      queueLimit: 0,
      enableKeepAlive: true,
      connectTimeout: 10_000,
    });
  }

  return globalThis.courseUpPool;
}

export async function queryRows<T extends RowDataPacket[]>(
  sql: string,
  values: SqlValue[] = [],
): Promise<T> {
  const [rows] = await getPool().execute<T>(sql, values);
  return rows;
}

export async function execute(sql: string, values: SqlValue[] = []) {
  const [result] = await getPool().execute<ResultSetHeader>(sql, values);
  return result;
}

export async function transaction<T>(callback: (connection: mysql.PoolConnection) => Promise<T>) {
  const connection = await getPool().getConnection();

  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}