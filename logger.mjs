import winston from 'winston';
import chalk from 'chalk';

// 创建自定义的颜色格式
const colorizeFormat = winston.format.printf(({ level, message, timestamp }) => {
    let coloredLevel;
    let colorizedMessage;

    switch (level) {
        case 'info':
            coloredLevel = chalk.blue(level);
            colorizedMessage = chalk.blue(message);
            break;
        case 'warn':
            coloredLevel = chalk.yellow(level);
            colorizedMessage = chalk.yellow(message);
            break;
        case 'error':
            coloredLevel = chalk.red(level);
            colorizedMessage = chalk.red(message);
            break;
        default:
            coloredLevel = level;
            colorizedMessage = message;
    }

    return `${timestamp} [${coloredLevel}]: ${colorizedMessage}`;
});

const plainFormat = winston.format.printf(({ level, message, timestamp }) => {
    return `${timestamp} [${level}]: ${message}`;
});

const logger = winston.createLogger({
    level: 'info', // 日志级别，info 及以上级别的日志将被记录
    format: winston.format.combine(
        winston.format.timestamp(),
        plainFormat
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.timestamp(),
                colorizeFormat // 控制台使用带颜色的格式
            )
        }), // 输出到控制台
        new winston.transports.File({ filename: 'combined.log', format: plainFormat }) // 输出到文件
    ],
});

function syslog(...args) {
    const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ');
    logger.info(message);
}

function syswarn(...args) {
    const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ');
    logger.warn(message);
}

function syserror(...args) {
    const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ');
    logger.error(message);
}

export { logger, syslog, syswarn, syserror };
