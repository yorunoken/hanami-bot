import { mkdir, appendFile, access, readdir, unlink } from "fs/promises";
import { join } from "path";

export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
    FATAL = 4,
}

interface LogEntry {
    timestamp: string;
    level: LogLevel;
    message: string;
    context?: Record<string, any>;
    error?: Error;
}

interface LoggerConfig {
    level: LogLevel;
    logDir: string;
    maxFiles: number;
    dateFormat: string;
    enableConsole: boolean;
    enableFile: boolean;
}

const DEFAULT_CONFIG: LoggerConfig = {
    level: LogLevel.INFO,
    logDir: "./logs",
    maxFiles: 30,
    dateFormat: "YYYY-MM-DD",
    enableConsole: true,
    enableFile: true,
};

class Logger {
    private config: LoggerConfig;
    private currentLogFile: string | null = null;
    private writeQueue: Array<string> = [];
    private isWriting = false;

    constructor(config: Partial<LoggerConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    private getLevelName(level: LogLevel): string {
        const names = ["DEBUG", "INFO", "WARN", "ERROR", "FATAL"];
        return names[level] ?? "UNKNOWN";
    }

    private getColorCode(level: LogLevel): string {
        const colors = ["\x1b[36m", "\x1b[32m", "\x1b[33m", "\x1b[31m", "\x1b[35m"];
        return colors[level] ?? "\x1b[0m";
    }

    private formatTimestamp(): string {
        return new Date().toISOString();
    }

    private formatMessage(entry: LogEntry): string {
        const contextStr = entry.context ? ` | Context: ${JSON.stringify(entry.context)}` : "";
        const errorStr = entry.error ? ` | Error: ${entry.error.stack || entry.error.message}` : "";
        return `[${entry.timestamp}] [${this.getLevelName(entry.level)}] ${entry.message}${contextStr}${errorStr}`;
    }

    private formatConsoleMessage(entry: LogEntry): string {
        const colorCode = this.getColorCode(entry.level);
        const resetCode = "\x1b[0m";
        const levelName = this.getLevelName(entry.level).padEnd(5);
        const contextStr = entry.context ? ` | ${JSON.stringify(entry.context)}` : "";
        const errorStr = entry.error ? ` | ${entry.error.message}` : "";

        return `${colorCode}[${entry.timestamp}] [${levelName}]${resetCode} ${entry.message}${contextStr}${errorStr}`;
    }

    private async getCurrentLogFile(): Promise<string> {
        const now = new Date();
        const dateStr = now.toISOString().split("T")[0]; // YYYY-MM-DD format
        const fileName = `${dateStr}.log`;
        const filePath = join(this.config.logDir, fileName);

        if (this.currentLogFile !== filePath) {
            await this.ensureLogDirectory();
            this.currentLogFile = filePath;
        }

        return filePath;
    }

    private async ensureLogDirectory(): Promise<void> {
        try {
            await access(this.config.logDir);
        } catch {
            await mkdir(this.config.logDir, { recursive: true });
        }
    }

    private async cleanOldLogs(): Promise<void> {
        try {
            const files = await readdir(this.config.logDir);
            const logFiles = files
                .filter((file) => file.endsWith(".log"))
                .map((file) => ({
                    name: file,
                    path: join(this.config.logDir, file),
                }))
                .sort((a, b) => b.name.localeCompare(a.name)); // Sort newest first

            if (logFiles.length > this.config.maxFiles) {
                const filesToDelete = logFiles.slice(this.config.maxFiles);
                for (const file of filesToDelete) {
                    await unlink(file.path);
                }
            }
        } catch {
            // Nothing here :)
        }
    }

    private async processWriteQueue(): Promise<void> {
        if (this.isWriting || this.writeQueue.length === 0) {
            return;
        }

        this.isWriting = true;
        const entries = this.writeQueue.splice(0);
        const logFile = await this.getCurrentLogFile();

        try {
            const content = entries.join("\n") + "\n";
            await appendFile(logFile, content, "utf8");
        } catch (error) {
            // If file writing fails, output to console at least
            console.error("Failed to write to log file:", error);
        } finally {
            this.isWriting = false;
            // Process any new entries that came in while we were writing
            if (this.writeQueue.length > 0) {
                setImmediate(() => this.processWriteQueue());
            }
        }
    }

    private async log(level: LogLevel, message: string, context?: Record<string, any>, error?: Error): Promise<void> {
        if (level < this.config.level) {
            return;
        }

        const entry: LogEntry = {
            timestamp: this.formatTimestamp(),
            level,
            message,
            context,
            error,
        };

        // Console output
        if (this.config.enableConsole) {
            const consoleMessage = this.formatConsoleMessage(entry);
            if (level >= LogLevel.ERROR) {
                console.error(consoleMessage);
            } else {
                console.log(consoleMessage);
            }
        }

        // File output
        if (this.config.enableFile) {
            const fileMessage = this.formatMessage(entry);
            this.writeQueue.push(fileMessage);
            setImmediate(() => this.processWriteQueue());
        }
    }

    debug(message: string, context?: Record<string, any>): Promise<void> {
        return this.log(LogLevel.DEBUG, message, context);
    }

    info(message: string, context?: Record<string, any>): Promise<void> {
        return this.log(LogLevel.INFO, message, context);
    }

    warn(message: string, context?: Record<string, any>): Promise<void> {
        return this.log(LogLevel.WARN, message, context);
    }

    error(message: string, error?: Error, context?: Record<string, any>): Promise<void> {
        return this.log(LogLevel.ERROR, message, context, error);
    }

    fatal(message: string, error?: Error, context?: Record<string, any>): Promise<void> {
        return this.log(LogLevel.FATAL, message, context, error);
    }

    // Flush any pending writes
    async flush(): Promise<void> {
        while (this.writeQueue.length > 0 || this.isWriting) {
            await new Promise((resolve) => setTimeout(resolve, 10));
        }
    }
}

export const logger = new Logger();
