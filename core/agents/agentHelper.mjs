import { getAgentsPath } from "../../filepath.mjs";
import { readJsonFileAsync } from "../../helper.mjs";

async function getAgentInfo(agentName) {
    // {
    //     "name": "Maria Lopez",
    //     "age": "23",
    //     "gender": "male",
    //     "personality": "energetic, enthusiastic, inquisitive",
    //     "learned": "Maria Lopez is a student at Oak Hill College studying physics and a part time Twitch game streamer who loves to connect with people and explore new ideas.",
    //     "role": "student",
    //     "memoryLocation": "./memeories/MariaLopezMemory.json",
    //     "currentPlace": "Maria Lopez's Home",
    //     "dailyPlan": ""
    // }
    const agentInfoPath = getAgentsPath() + `/${agentName}/info.json`;
    const agentInfo = await readJsonFileAsync(agentInfoPath);

    return agentInfo;
}

function getCommonset(agentInfo) {
    let commonset = "";
    commonset += `Name: ${agentInfo.name}\n`;
    commonset += `Age: ${agentInfo.age}\n`;
    commonset += `Role: ${agentInfo.role}\n`;
    commonset += `Personality traits: ${agentInfo.personality}\n`;
    commonset += `Learned traits: ${agentInfo.learned}`;

    return commonset;
}

export {getAgentInfo, getCommonset};