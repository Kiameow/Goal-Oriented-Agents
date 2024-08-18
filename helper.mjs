import { promises as fs } from 'fs';
import Handlebars from 'handlebars';

export async function readJsonFile(filePath) {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(fileContent);
}

export async function handlebarHydrate(templatePath, data) {
    const template = await fs.readFile(templatePath, 'utf-8');
    const compliedTemplate = Handlebars.compile(template);
    return compliedTemplate(data);
} 

export function extractContentBetweenFlags(str, flag) {
    const start = str.indexOf(flag) + flag.length;
    const end = str.indexOf(flag, start);
    
    if (start !== -1 && end !== -1 && start < end) {
        const _str = str.substring(start, end).trim();
        const result = _str.split("\\").join("");
        return result;
    }
    
    return null;
}