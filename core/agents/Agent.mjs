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

import { extractContentBetweenFlags, readJsonFileAsync, readJsonFileSync, writeJsonFileAsync } from "../../helper.mjs";
import { globalTime } from "../globalTime.mjs";
import { getAgentInfo } from "./agentHelper.mjs";
import { getSurroundingInfo } from "./percive.mjs";
import { dailyPlanning, getCurrentPlan, getNextAction, hourlyPlanning } from "./planning.mjs";
import { writeFile } from "fs/promises";
import { getAgentsPath } from "../../filepath.mjs";
import { syserror, syswarn, sysinfo } from "../../logger.mjs";
import { converse, willToConverse } from "./converse.mjs";
import { GlobalConversation } from "../globalConversation.mjs";
import { globalScen } from "../scen/Scen.mjs";
import { getInnerThoughts, getMemosDescription, Memory } from "./memory.mjs";

class Agent {
    constructor(id) {
        this.id = id;
        this.agentInfo = {};
        this.dailyPlans = "";
        this.hourlyPlans = [];
        this.currentPlan = "";
        this.nextAction = "";
        this.currentLocation = "";
        this.innerThoughts = "";
        this.memoryLocation = getAgentsPath() + `/${this.id}/memos.json`;
        this.memory = {};
        this.relatedMemos = "";
    }

    async init() {
        this.agentInfo = await getAgentInfo(this.id);
        const instantMemoPath = getAgentsPath() + `/${this.id}/instant_memos.json`;
        const { currentLocation, dailyPlans, hourlyPlans, nextAction, innerThoughts } = await readJsonFileAsync(instantMemoPath);
        this.currentLocation = currentLocation ?? this.agentInfo.initialLocation;;
        this.dailyPlans = dailyPlans;
        this.hourlyPlans = hourlyPlans;
        const timestamp = globalTime.getCurrentTimestamp();
        this.nextAction = nextAction ?? [timestamp, "stay", "keep doing what you are doing"];
        this.memory = new Memory(this.memoryLocation);
        this.innerThoughts = innerThoughts;
        globalScen.updateAgentLocation(this.id, this.currentLocation);
    }

    async getDailyPlans() {
        const dailyPlans = await dailyPlanning(this.agentInfo, globalTime.value.day)
        sysinfo(`|${this.id}| dailyPlans: ${dailyPlans}`)
        if (dailyPlans) {
            this.dailyPlans = dailyPlans;
        } else {
            syswarn(`|${this.id}| No daily plans found for he/she today.`);
        }
    }

    async getHourlyPlans() {
        if (!this.dailyPlans) {
            syswarn("Cannot get hourly plans without daily plans.");
            return false;
        }

        try {
            const timetable = await hourlyPlanning(this.agentInfo, this.dailyPlans)
            sysinfo("|", this.id, "| timetable:", timetable);
            this.hourlyPlans = timetable;
        } catch (error) {
            syserror("error | getHourlyPlans | Agent.mjs | ", error);
        }
    }

    async getRelatedMemos(event) {
        const relatedMemos = await this.memory.retrieveMemories(event);
        const relatedMemosStr = getMemosDescription(relatedMemos);
        this.relatedMemos = relatedMemosStr;
    }

    async getInnerThoughts(topic) {
        const innerThoughts = await getInnerThoughts(this, topic)
        this.innerThoughts = innerThoughts;
    }

    async getWillToConverse() {
        // check whether there is another agent try to converse with this agent
        // if yes, set the next action to converse with this agent
        if (this.agentInfo.wakeHour > globalTime.value.hour) {
            return;
        } 
        const planRightNow = getCurrentPlan(this.hourlyPlans, globalTime.value);
        this.currentPlan = planRightNow;
        await this.getRelatedMemos(this.currentPlan)
        const willing = await willToConverse(this);

        if (willing.will_converse) {
            const someoneIsSleeping = willing.converse_with.some((id) => globalAgents.get(id).agentInfo.wakeHour < globalTime.value.hour);
            if (someoneIsSleeping) {
                return ;
            }
            GlobalConversation.push({
                timestamp: globalTime.getCurrentTimestamp(),
                participants: [...willing.converse_with, this.id],
                topic: willing.topic
            })
        }
    }

    // nextAction = [timestamp, location, action]

    async getNextAction() {
        // compare the current time with the timetable and return the current running plan
        // ["stay", "keep finishing the research about the local food"]
        const timestamp = globalTime.getCurrentTimestamp();
        if (this.agentInfo.wakeHour > globalTime.value.hour) {
            this.nextAction = [timestamp, this.currentLocation, "sleep"];
            sysinfo("|", this.id, "| location:", this.nextAction[1], ", action:", this.nextAction[2]);
            return;
        } 

        if (GlobalConversation.length > 0) {
            for (let i = 0; i < GlobalConversation.length; i++) {
                const conversation = GlobalConversation[i];
                if (conversation.participants.includes(this.id)) {
                    this.nextAction = [timestamp, this.currentLocation, "converse with " + conversation.participants.filter((id) => id!== this.id).join(',') + " about " + conversation.topic];
                    return;
                }
            }
        }
        
        const surroundingRightNow = await getSurroundingInfo(this);
        let nextAction = null;
        while (!nextAction) {
            nextAction = await getNextAction(this.agentInfo, this.currentPlan, surroundingRightNow, this.relatedMemos) 
        }
        
        this.nextAction = nextAction ?? [timestamp, "stay", "keep doing what you are doing"]

        this.currentLocation = this.nextAction[1] === "stay" ? this.currentLocation : this.nextAction[1];
        globalScen.updateAgentLocation(this.id, this.currentLocation);
        sysinfo("|", this.id, "| location:", this.currentLocation, ", action:", this.nextAction[2]);
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
            sysinfo("|", this.id, "| Instant memory saved to", memoryLocation);
        } catch (error) {
            syserror("error | saveToInstantMemory | Agent.mjs | ", error);
        }
    }

    async saveToMemory() {
        await this.memory.createMemoryNode(`${this.nextAction[2]} at ${this.currentLocation} `)
    }

    async saveNextAction() {
        const filepath = getAgentsPath() + `/${this.id}/next_action.json`;
        const previousActions = readJsonFileSync(filepath) ?? [];
        const nextAction = [...previousActions, this.nextAction];

        await writeJsonFileAsync(filepath, nextAction);
        sysinfo("|", this.id, "| Next action saved to", filepath);
    }

    async clearNextActions() {
        const filepath = getAgentsPath() + `/${this.id}/next_action.json`;
        await writeJsonFileAsync(filepath, []);
    }

    async clearInstantMemories() {
        const memoryLocation = getAgentsPath() + `/${this.id}/instant_memos.json`;
        await writeJsonFileAsync(memoryLocation, {});
    }

    async clearMemories() {
        const memoryLocation = getAgentsPath() + `/${this.id}/memos.json`;
        await writeJsonFileAsync(memoryLocation, []);
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

// const globalAgentIds = ["Maria_Lopez"];
const globalAgentIds = ["Maria_Lopez", "Zhang_Chen", "David_Thompson", "Emily_Carter"];
const globalAgents = new Map();
await initializeAgents(globalAgentIds);

function turnIdToName(agentId) {
    return agentId.split("_").join(" ");
}

function turnNameToId(agentName) {
    return agentName.split(" ").join("_");
}

export { Agent, globalAgents, globalAgentIds, turnIdToName, turnNameToId };