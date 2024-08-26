// {
//     "name": "Maria Lopez",
//     "age": "23",
//     "gender": "male",
//     "personality": "energetic, enthusiastic, inquisitive",
//     "learned": "Maria Lopez is a student at Oak Hill College studying physics and a part time Twitch game streamer who loves to connect with people and explore new ideas.",
//     "role": "student",
//     "memoryLocation": "./memeories/MariaLopezMemory.json",
//     "initialLocation": "Maria Lopez's Home",
//     "lifestyle": "Maria Lopez goes to bed around 2am, awakes up around 9am, eats dinner around 6pm. She likes to hang out at Hobbs Cafe if it is before 6pm.",
//     "wakeHour": "9am"
// }

import chalk from "chalk";
import { extractContentBetweenFlags, readJsonFileAsync, readJsonFileSync, writeJsonFileAsync } from "../../helper.mjs";
import globalTime from "../globalTime.mjs";
import { getAgentInfo } from "./agentHelper.mjs";
import { getSurroundingInfo } from "./percive.mjs";
import { dailyPlanning, getCurrentPlan, getNextAction, hourlyPlanning } from "./planning.mjs";
import { writeFile } from "fs/promises";
import { getAgentsPath } from "../../filepath.mjs";
import { syserror, syswarn, syslog } from "../../logger.mjs";

class Agent {
    constructor(id) {
        this.id = id;
        this.agentInfo = {};
        this.dailyPlans = "";
        this.hourlyPlans = [];
        this.nextAction = "";
        this.currentLocation = "";
        this.innerThoughts = "";
    }

    async init() {
        this.agentInfo = await getAgentInfo(this.id);
        this.currentLocation = this.agentInfo.initialLocation;
        const instantMemoPath = getAgentsPath() + `/${this.id}/instant_memos.json`;
        const { currentLocation, dailyPlans, hourlyPlans, nextAction, innerThoughts } = await readJsonFileAsync(instantMemoPath);
        this.currentLocation = currentLocation;
        this.dailyPlans = dailyPlans;
        this.hourlyPlans = hourlyPlans;
        this.nextAction = nextAction;
        this.innerThoughts = innerThoughts;
    }

    async getDailyPlans() {
        const dailyPlans = await dailyPlanning(this.agentInfo, globalTime.value.day)
        syslog(this.id, " dailyPlans: ", dailyPlans)
        if (dailyPlans) {
            this.dailyPlans = dailyPlans;
        } else {
            syswarn("No daily plans found for today.");
        }

        this.dailyPlans = dailyPlans;
        if (this.dailyPlans) {
            return true;
        } else {
            return false;
        }
    }

    async getHourlyPlans() {
        if (!this.dailyPlans) {
            syswarn("Cannot get hourly plans without daily plans.");
            return false;
        }

        try {
            const timetable = await hourlyPlanning(this.agentInfo, this.dailyPlans)
            syslog(timetable);
            this.hourlyPlans = timetable;
        } catch (error) {
            syserror("error | getHourlyPlans | Agent.mjs | ", error);
        }
    }

    async getNextAction() {
        // compare the current time with the timetable and return the current running plan
        // ["stay", "keep finishing the research about the local food"]
        const timestamp = globalTime.getCurrentTimestamp();
        if (this.agentInfo.wakeHour > globalTime.value.hour) {
            this.nextAction = [timestamp, "stay", "sleep"];
        } else {
            const planRightNow = await getCurrentPlan(this.hourlyPlans, globalTime.toString())
            const surroundingRightNow = await getSurroundingInfo(this)
            let nextAction = await getNextAction(this.agentInfo, planRightNow, surroundingRightNow, 10) 
            
            this.nextAction = nextAction ?? [timestamp, "stay", "keep doing what you are doing"]
        }

        syslog("location: ", this.nextAction[1], ", action: ", this.nextAction[2]);
        this.currentLocation = this.nextAction[1] === "stay" ? this.currentLocation : this.nextAction[1];
    }

    async saveToInstantMemory() {
        // save the current state of the agent to the memory file
        const memory = {
            currentLocation: this.currentLocation,
            dailyPlans: this.dailyPlans,
            hourlyPlans: this.hourlyPlans,
            nextAction: this.nextAction,
            innerThoughts: this.innerThoughts
        };

        const memoryLocation = getAgentsPath() + `/${this.id}/instant_memos.json`;

        try {
            await writeJsonFileAsync(memoryLocation, memory);
            syslog("Memory saved to ", memoryLocation);
        } catch (error) {
            syserror("error | saveToInstantMemory | Agent.mjs | ", error);
        }
    }

    async saveNextAction() {
        const filepath = getAgentsPath() + `/${this.id}/next_action.json`;
        const previousAction = readJsonFileSync(filepath) ?? [];
        const nextAction = [...previousAction, this.nextAction];

        await writeJsonFileAsync(filepath, nextAction);
    }
}

async function initializeAgents(agentIds) {
    const agentPromises = agentIds.map(async (id) => {
        const agent = new Agent(id);
        await agent.init(); // 初始化 Agent
        return [id, agent];
    });

    // 使用 Promise.all 等待所有 Agent 初始化完成
    const agentsArray = await Promise.all(agentPromises);
    agentsArray.forEach(([id, agent]) => {
        globalAgents.set(id, agent);
    });
}

const agentIds = ["Maria_Lopez"];
const globalAgents = new Map();
await initializeAgents(agentIds);

export { Agent, globalAgents };