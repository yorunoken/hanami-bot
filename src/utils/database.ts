import db from "@db" with { type: "sqlite" };
import { logger } from "./logger";
import type { Tables, TableToArgument, TableToType } from "@type/database";

const preparedStatements = new Map<string, any>();
const ENABLE_DB_PERF_MONITORING = process.env.NODE_ENV === "development";

function getPreparedStatement(sql: string) {
    if (!preparedStatements.has(sql)) {
        preparedStatements.set(sql, db.prepare(sql));
    }
    return preparedStatements.get(sql);
}

function withPerfMonitoring<T>(operation: string, fn: () => T): T {
    if (!ENABLE_DB_PERF_MONITORING) {
        return fn();
    }

    const start = performance.now();
    const result = fn();
    const end = performance.now();

    if (end - start > 10) {
        // Log slow queries (>10ms)
        logger.warn(`Slow DB operation: ${operation} took ${(end - start).toFixed(2)}ms`);
    }

    return result;
}


export function getEntry<T extends Tables>(table: T, id: string | number): TableToType<T> | null {
    return withPerfMonitoring(`getEntry: ${table}`, () => {
        const stmt = getPreparedStatement(`SELECT * FROM ${table} WHERE id = ?`);
        const data = stmt.get(id) as TableToType<T> | null;
        if (data !== null && "prefixes" in data && typeof data.prefixes === "string") data.prefixes = JSON.parse(data.prefixes) as Array<string>;

        return data;
    });
}

export function removeEntry(table: Tables, id: string | number): void {
    const stmt = getPreparedStatement(`DELETE FROM ${table} WHERE id = ?`);
    stmt.run(id);
}

export function getRowCount(table: Tables): number {
    const stmt = getPreparedStatement(`SELECT COUNT(*) as count FROM ${table}`);
    const qr = stmt.get() as { count: number | null };
    return qr.count ?? 0;
}

export function getRowSum(table: Tables): number {
    const stmt = getPreparedStatement(`SELECT SUM(count) AS sum FROM ${table}`);
    const qr = stmt.get() as { sum: number | null };
    return qr.sum ?? 0;
}

export function insertData<T extends Tables>(
    {
        table,
        id,
        data,
    }: {
        table: T;
        id: string | number;
        data: Array<{ key: TableToArgument<T>; value: string | number | boolean | null }>;
    },
    ignore?: boolean,
): void {
    const fields: Array<TableToArgument<T>> = data.map((item) => item.key);
    const values: Array<string | number | boolean | null> = data.map((item) => item.value);

    // Execute all operations in a single transaction to prevent database locks
    const transaction = db.transaction(() => {
        const selectStmt = getPreparedStatement(`SELECT 1 FROM ${table} WHERE id = ? LIMIT 1`);
        const existingRow = selectStmt.get(id);

        if (!existingRow) {
            const placeholders = fields.map(() => "?").join(", ");
            const insertSql = `INSERT OR ${ignore ? "IGNORE" : "REPLACE"} INTO ${table} (id, ${fields.join(", ")}) VALUES (?, ${placeholders})`;
            const insertStmt = getPreparedStatement(insertSql);
            insertStmt.run(id, ...values);
        } else {
            const setClause = fields.map((field) => `${field} = ?`).join(", ");
            const updateSql = `UPDATE ${table} SET ${setClause} WHERE id = ?`;
            const updateStmt = getPreparedStatement(updateSql);
            updateStmt.run(...values, id);
        }
    });

    transaction();
}
export function bulkInsertData<T extends Tables>(
    entries: Array<{
        table: T;
        id: string | number;
        data: Array<{ key: TableToArgument<T>; value: string | number | boolean | null }>;
        ignore?: boolean;
    }>,
): void {
    const insertByTable = new Map<string, Array<any>>();
    const statementCache = new Map<string, any>();

    for (const entry of entries) {
        const { table, id, data, ignore } = entry;
        const fields = data.map((item) => item.key);
        const values = data.map((item) => item.value);

        const placeholders = fields.map(() => "?").join(", ");
        const sql = `INSERT OR ${ignore ? "IGNORE" : "REPLACE"} INTO ${table} (id, ${fields.join(", ")}) VALUES (?, ${placeholders})`;

        if (!statementCache.has(sql)) {
            statementCache.set(sql, getPreparedStatement(sql));
        }

        if (!insertByTable.has(sql)) {
            insertByTable.set(sql, []);
        }

        insertByTable.get(sql)!.push([id, ...values]);
    }

    // Execute all operations in a single transaction
    const transaction = db.transaction(() => {
        for (const [sql, valuesList] of insertByTable) {
            const stmt = statementCache.get(sql);
            for (const values of valuesList) {
                stmt.run(...values);
            }
        }
    });

    transaction();
}
