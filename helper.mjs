import { promises as fs } from 'fs';
import Handlebars from 'handlebars';
import { getPromptPath } from './filepath.mjs';

export async function readJsonFile(filePath) {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(fileContent);
}

export async function handlebarHydrate(templatePath, data) {
    const template = await fs.readFile(templatePath, 'utf-8');
    const compliedTemplate = Handlebars.compile(template);
    return compliedTemplate(data);
} 

export async function getPrompt(fileName, data) {
    const templatePath = getPromptPath() + fileName;
    const prompt = await handlebarHydrate(templatePath, data);
    return prompt;
}

export function extractContentBetweenFlags(str, flag) {
    const start = str.indexOf(flag) + flag.length;
    const end = str.indexOf(flag, start);
    
    if (start !== -1 && end !== -1 && start < end) {
        const _str = str.substring(start, end);
        const result = standardizeString(_str);
        return result;
    }
    
    return null;
}

export function standardizeString(str) {
    let result = str.trim();
    result = str.split("\\").join("");
    result = result.split("\“").join("\"");
    result = result.split("\‘").join("\'");
    result = result.split("：").join(":");
    result = result.split("，").join(",");
    result = result.split("\'").join("\"");
    return result;
}