import winston from 'winston';
import chalk from 'chalk';
import dotenv from 'dotenv';

// 创建自定义的颜色格式
const colorizeFormat = winston.format.printf(({ level, message, timestamp }) => {
    let coloredLevel;
    let colorizedMessage;

    switch (level) {
        case 'debug':
            coloredLevel = chalk.green(level);
            colorizedMessage = chalk.green(message);
            break;
        case 'verbose':
            coloredLevel = chalk.gray(level);
            colorizedMessage = chalk.gray(message);
            break;
        case 'http': 
            coloredLevel = chalk.magenta(level);
            colorizedMessage = chalk.magenta(message);
            break;
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

dotenv.config();
const logLevel = process.env.LOG_LEVEL || 'info';
const logger = winston.createLogger({
    level: logLevel, // 日志级别，info 及以上级别的日志将被记录
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
        new winston.transports.File({ 
            filename: 'combined.log', 
            format: plainFormat,
            level: 'error'
        }) // only capture error logs to file
    ],
});

function sysinfo(...args) {
    if (!logger.isLevelEnabled('info')) return;

    const message = args.map(arg => 
        {
            if (arg instanceof Error) {
                // 对 Error 对象进行特殊处理，获取其 message 和 stack
                return `${arg.message}\n${arg.stack}`;
            } else if (typeof arg === 'object') {
                // 对其他对象使用 JSON.stringify 进行格式化
                return JSON.stringify(arg, null, 2);
            } else {
                return String(arg);
            }
        }
    ).join(' ');
    logger.info(message);
}

function syswarn(...args) {
    if (!logger.isLevelEnabled('warn')) return;

    const message = args.map(arg => 
        {
            if (arg instanceof Error) {
                // 对 Error 对象进行特殊处理，获取其 message 和 stack
                return `${arg.message}\n${arg.stack}`;
            } else if (typeof arg === 'object') {
                // 对其他对象使用 JSON.stringify 进行格式化
                return JSON.stringify(arg, null, 2);
            } else {
                return String(arg);
            }
        }
    ).join(' ');
    logger.warn(message);
}

function syserror(...args) {
    if (!logger.isLevelEnabled('error')) return;

    const message = args.map(arg => 
        {
            if (arg instanceof Error) {
                // 对 Error 对象进行特殊处理，获取其 message 和 stack
                return `${arg.message}\n${arg.stack}`;
            } else if (typeof arg === 'object') {
                // 对其他对象使用 JSON.stringify 进行格式化
                return JSON.stringify(arg, null, 2);
            } else {
                return String(arg);
            }
        }
    ).join(' ');
    logger.error(message);
}

function syshttp(...args) {
    if (!logger.isLevelEnabled('http')) return;

    const message = args.map(arg => 
        {
            if (arg instanceof Error) {
                // 对 Error 对象进行特殊处理，获取其 message 和 stack
                return `${arg.message}\n${arg.stack}`;
            } else if (typeof arg === 'object') {
                // 对其他对象使用 JSON.stringify 进行格式化
                return JSON.stringify(arg, null, 2);
            } else {
                return String(arg);
            }
        }
    ).join(' ');
    logger.http(message);
}

function sysverbose(...args) {
    if (!logger.isLevelEnabled('verbose')) return;

    const message = args.map(arg => 
        {
            if (arg instanceof Error) {
                // 对 Error 对象进行特殊处理，获取其 message 和 stack
                return `${arg.message}\n${arg.stack}`;
            } else if (typeof arg === 'object') {
                // 对其他对象使用 JSON.stringify 进行格式化
                return JSON.stringify(arg, null, 2);
            } else {
                return String(arg);
            }
        }
    ).join(' ');
    logger.verbose(message);
}

function sysdebug(...args) {
    if (!logger.isLevelEnabled('debug')) return;

    const message = args.map(arg => 
        {
            if (arg instanceof Error) {
                // 对 Error 对象进行特殊处理，获取其 message 和 stack
                return `${arg.message}\n${arg.stack}`;
            } else if (typeof arg === 'object') {
                // 对其他对象使用 JSON.stringify 进行格式化
                return JSON.stringify(arg, null, 2);
            } else {
                return String(arg);
            }
        }
    ).join(' ');
    logger.debug(message);
}

export { logger, sysinfo, syswarn, syserror, syshttp, sysverbose, sysdebug };
