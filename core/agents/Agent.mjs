import { ensureFileExists, readJsonFileSync, writeJsonFileAsync } from "../../helper.mjs";
import { globalTime } from "../globalTime.mjs";
import { getAgentInfo } from "./agentHelper.mjs";
import { getSurroundingInfo } from "./percive.mjs";
import { dailyPlanning, getCurrentPlan, getNextAction, hourlyPlanning } from "./planning.mjs";
import { getAgentsPath } from "../../filepath.mjs";
import { syserror, syswarn, sysinfo } from "../../logger.mjs";
import { willToConverse } from "./converse.mjs";
import { GlobalConversation } from "../globalConversation.mjs";
import { globalScen } from "../scen/Scen.mjs";
import { getInnerThoughts, getMemosDescription, Memory } from "./memory.mjs";
import { GlobalTaskManager, TaskManager } from "./assignment.mjs";

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
        this.taskLocation = getAgentsPath() + `/${this.id}/assignment.json`;
        this.taskHistoryLocation = getAgentsPath() + `/${this.id}/task_history.json`;
        this.taskManager = null;
    }

    async init() {
        this.agentInfo = await getAgentInfo(this.id);
        const instantMemoPath = getAgentsPath() + `/${this.id}/instant_memos.json`;
        
        let instantMemoData = await ensureFileExists(instantMemoPath, {
            currentLocation: null,
            dailyPlans: "",
            hourlyPlans: [],
            nextAction: null,
            innerThoughts: ""
        });

        const { currentLocation, dailyPlans, hourlyPlans, nextAction, innerThoughts } = instantMemoData;
        this.currentLocation = currentLocation ?? this.agentInfo.initialLocation;
        this.dailyPlans = dailyPlans ?? "";
        this.hourlyPlans = hourlyPlans ?? [];
        const timestamp = globalTime.getCurrentTimestamp();
        this.nextAction = nextAction ?? [timestamp, "stay", "keep doing what you are doing"];
        this.innerThoughts = innerThoughts ?? "";

        await ensureFileExists(this.memoryLocation, []);
        this.memory = new Memory(this.memoryLocation);

        await ensureFileExists(this.taskLocation, {});
        await ensureFileExists(this.taskHistoryLocation, []);
        globalScen.updateAgentLocation(this.id, this.currentLocation);
    }

    async getDailyPlans() {
        const dailyPlans = await dailyPlanning(this.agentInfo, this.taskManager.getLatestTaskDescription(), globalTime.value.day)
        if (dailyPlans) {
            this.dailyPlans = dailyPlans;
            sysinfo(`|${this.id}| dailyPlans: ${dailyPlans}`);
        } else {
            syswarn(`|${this.id}| No daily plans found for today.`);
        }
    }

    async getHourlyPlans() {
        if (!this.dailyPlans) {
            syswarn("Cannot get hourly plans without daily plans.");
            return false;
        }

        try {
            this.hourlyPlans = await hourlyPlanning(this.agentInfo, this.dailyPlans);
            sysinfo("|", this.id, "| timetable:", this.hourlyPlans);
        } catch (error) {
            syserror("Error in getHourlyPlans:", error);
        }
    }

    async getRelatedMemos(event) {
        const relatedMemos = await this.memory.retrieveMemories(event);
        this.relatedMemos = getMemosDescription(relatedMemos);
    }

    async getInnerThoughts(topic) {
        this.innerThoughts = await getInnerThoughts(this, topic);
    }

    setGlobalTaskManager(globalTaskManager) {
        this.taskManager = new TaskManager(this.taskLocation, this.taskHistoryLocation, globalTaskManager, this.agentInfo.role);
    }

    async getWillToConverse() {
        if (this.agentInfo.wakeHour > globalTime.value.hour) return;

        this.currentPlan = getCurrentPlan(this.hourlyPlans, globalTime.value);
        await this.getRelatedMemos(this.currentPlan);
        const willing = await willToConverse(this);

        if (willing.will_converse) {
            const someoneIsSleeping = willing.converse_with.some((id) => globalAgents.get(id).agentInfo.wakeHour > globalTime.value.hour);
            if (!someoneIsSleeping) {
                GlobalConversation.push({
                    timestamp: globalTime.getCurrentTimestamp(),
                    participants: [...willing.converse_with, this.id],
                    topic: willing.topic
                });
            }
        }
    }

    async getNextAction() {
        const timestamp = globalTime.getCurrentTimestamp();
        if (this.agentInfo.wakeHour > globalTime.value.hour) {
            this.nextAction = [timestamp, this.currentLocation, "sleep"];
            sysinfo("|", this.id, "| location:", this.nextAction[1], ", action:", this.nextAction[2]);
            return;
        }

        const conversation = GlobalConversation.find(conv => conv.participants.includes(this.id));
        if (conversation) {
            const otherParticipants = conversation.participants.filter(id => id !== this.id).join(',');
            this.nextAction = [timestamp, this.currentLocation, `converse with ${otherParticipants} about ${conversation.topic}`];
            return;
        }

        const surroundingRightNow = await getSurroundingInfo(this);
        this.nextAction = await getNextAction(this.agentInfo, this.currentPlan, surroundingRightNow, this.relatedMemos) 
            || [timestamp, "stay", "keep doing what you are doing"];

        this.currentLocation = this.nextAction[1] === "stay" ? this.currentLocation : this.nextAction[1];
        globalScen.updateAgentLocation(this.id, this.currentLocation);
        sysinfo("|", this.id, "| location:", this.currentLocation, ", action:", this.nextAction[2]);
    }

    async saveToInstantMemory() {
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
            syserror("Error in saveToInstantMemory:", error);
        }
    }

    async saveToMemory() {
        await this.memory.createMemoryNode(`${this.nextAction[2]} at ${this.currentLocation}`);
    }

    async saveNextAction() {
        const filepath = getAgentsPath() + `/${this.id}/next_action.json`;
        const previousActions = readJsonFileSync(filepath) ?? [];
        const nextAction = [...previousActions, this.nextAction];

        await writeJsonFileAsync(filepath, nextAction);
        sysinfo("|", this.id, "| Next action saved to", filepath);
    }

    async updateTaskProgress() {
        const actionImpact = await this.taskManager.evaluateActionImpact(this.nextAction[2]);
        if (actionImpact.isRelated) {
            await this.taskManager.updateTaskProgress(actionImpact.newProgress);
            sysinfo("|", this.id, "| Task progress updated:", actionImpact.newProgress);
        } else {
            sysinfo("|", this.id, "| No task progress update for this action.");
        }
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

    async clearTask() {
        const assignmentPath = getAgentsPath() + `/${this.id}/assignment.json`;
        const taskHistoryPath = getAgentsPath() + `/${this.id}/task_history.json`;
        await writeJsonFileAsync(assignmentPath, {});
        await writeJsonFileAsync(taskHistoryPath, []);
    }
}

async function initializeAgents(agentIds) {
    const agentPromises = agentIds.map(async (id) => {
        const agent = new Agent(id);
        await agent.init();
        return [id, agent];
    });

    const agentsArray = await Promise.all(agentPromises);
    agentsArray.forEach(([id, agent]) => {
        globalAgents.set(id, agent);
    });
}

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
