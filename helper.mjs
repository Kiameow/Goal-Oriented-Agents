import fs from 'fs';
const fsAsync = fs.promises;
import Handlebars from 'handlebars';
import { getPromptPath } from './filepath.mjs';

export async function readJsonFileAsync(filepath) {
    const fileContent = await fsAsync.readFile(filepath, 'utf-8');
    if (fileContent === '') 
        return null;
    return JSON.parse(fileContent);
}

export function readJsonFileSync(filepath) {
    const fileContent = fs.readFileSync(filepath, 'utf-8');
    if (fileContent === '') 
        return null;
    return JSON.parse(fileContent);
}

export async function writeJsonFileAsync(filepath, data) {
    const jsonContent = JSON.stringify(data, null, 2);
    await fsAsync.writeFile(filepath, jsonContent, 'utf-8');
}

export async function handlebarHydrate(templatePath, data) {
    const template = await fsAsync.readFile(templatePath, 'utf-8');
    const compliedTemplate = Handlebars.compile(template);
    return compliedTemplate(data);
} 

export async function getPrompt(fileName, data) {
    const templatePath = getPromptPath() + fileName;
    const prompt = await handlebarHydrate(templatePath, data);
    return prompt;
}

export function extractContentBetweenFlags(str, startFlag, endFlag=startFlag) {
    if (str === null || str === undefined) {
        return "";
    }
    if (str.indexOf(startFlag) === -1 && str.indexOf(endFlag) === -1) {
        return str;
    }
    if (str.indexOf(startFlag) === -1) {
        str = flag + str;
    }
    if (str.indexOf(endFlag) === -1) {
        str = str + flag;
    }
    const start = str.indexOf(startFlag) + startFlag.length;
    const end = str.indexOf(endFlag, start);
    
    if (start !== -1 && end !== -1 && start < end) {
        const _str = str.substring(start, end);
        const result = standardizeString(_str);
        return result;
    }
    
    return "";
}

export function standardizeString(str) {
    let result = str.trim();
    result = str.split("\\").join("");
    result = result.split("\“").join("\"");
    result = result.split("\‘").join("\'");
    result = result.split("：").join(":");
    result = result.split("，").join(",");
    return result;
}

export function isJSON(str) {
    try {
        JSON.parse(str);
        return true;
    } catch (e) {
        return false;   
    }
}

export function hasOverlap(arrA, arrB) {
    const setA = new Set(arrA);
    const setB = new Set(arrB);
    return [...setA].some(item => setB.has(item));
}

export function containsChinese(str) {
    const chineseRegex = /[\u4e00-\u9fff]/;
    return chineseRegex.test(str);
}