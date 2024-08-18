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

import { extractContentBetweenFlags } from "../../helper.mjs";
import globalTime from "../globalTime.mjs";
import globalState from "../globalTime.mjs";
import { getAgentInfo } from "./agentHelper.mjs";
import { getSurroundingInfo } from "./percive.mjs";
import { dailyPlanning, getCurrentPlan, getNextAction, hourlyPlanning } from "./planning.mjs";

class Agent {
    constructor(id) {
        this.id = id;
        this.dailyPlans = "";
        this.hourlyPlans = [];
        this.nextAction = "";
        this.currentLocation = "";
    }

    async init() {
        const agentInfo = await getAgentInfo(this.id);
        Object.assign(this, agentInfo);
        this.currentLocation = agentInfo.initialLocation;
    }

    async getDailyPlans() {
        const data = await dailyPlanning(this.id, globalTime.getCurrentDay())
        const dailyPlans = extractContentBetweenFlags(data, "<##FLAG##>");
        console.log(dailyPlans);
        if (dailyPlans) {
            this.dailyPlans = dailyPlans;
        } else {
            console.log("No daily plans found for today.");
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
            console.log("Cannot get hourly plans without daily plans.");
            return false;
        }

        try {
            const data = await hourlyPlanning(this.id, this.dailyPlans, globalTime.getCurrentDay())
            const hourlyPlans = extractContentBetweenFlags(data, "<##FLAG##>");
            console.log(hourlyPlans);
            if (hourlyPlans) {
                try {
                    const timeTable = JSON.parse(hourlyPlans);
                    this.hourlyPlans = timeTable;
                }
                catch (error) {
                    console.warn("error | getHourlyPlans | Agent.mjs | JSON.parse(hourlyPlans) | ", error);
                    this.hourlyPlans = []
                }
            } else {
                console.log("No hourly plans found for today.");
            }

            if (this.hourlyPlans) {
                return true;
            } else {
                return false;
            }

        } catch (error) {
            console.warn("error | getHourlyPlans | Agent.mjs | ", error);
            return false;
        }
    }

    async getNextAction() {
        // compare the current time with the timetable and return the current running plan
        // ["stay", "keep finishing the research about the local food"]
        const planRightNow = await getCurrentPlan(this.hourlyPlans, globalTime.getCurrentClockTime())
        const surroundingRightNow = await getSurroundingInfo(this.currentLocation, this.id)
        const nextActionStr = await getNextAction(this.id, planRightNow, surroundingRightNow, globalTime.getCurrentTime(), 10) 
        let nextAction = extractContentBetweenFlags(nextActionStr, "<##FLAG##>")
        
        nextAction = nextAction ?? ["stay", "keep doing what you are doing"]
        this.nextAction = JSON.parse(nextAction);

        console.log("Next Action: I' going to ", this.nextAction[0], " and ", this.nextAction[1]);
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