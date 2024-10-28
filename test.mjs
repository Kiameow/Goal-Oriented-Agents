import { globalAgents } from "./core/agents/Agent.mjs";
import { GlobalConversation, globalConverse } from "./core/globalConversation.mjs";
import { globalTime } from "./core/globalTime.mjs";
import { sysinfo } from "./logger.mjs";
import { GlobalTaskManager } from "./core/agents/assignment.mjs";
import { getProjectPath } from "./filepath.mjs";

let steps = 100;

sysinfo("Starting simulation...");
const projectInfoPath = getProjectPath() + "/project_info.json";
const projectHistoryPath = getProjectPath() + "/project_history.json";
const leaderInfo = globalAgents.get("David_Thompson").agentInfo;
const globalTaskManager = GlobalTaskManager.getInstance(leaderInfo, projectInfoPath, projectHistoryPath);

for (const agent of globalAgents.values()) {
    agent.setGlobalTaskManager(globalTaskManager);
}

await globalTaskManager.setFinalGoal("create a food brand that is loved by everyone");

await globalTaskManager.loadProjectInfo();
// Initialize GlobalTaskManager
sysinfo("Initializing project info...");

for(let i = 0; i < steps; i++) {
    const startTime = Date.now();
    sysinfo("################################");
    sysinfo(`# Step ${i+1} of ${steps}`);
    sysinfo(`# Current time: ${globalTime.toString()}`);
    sysinfo("################################");
    if (globalTime.isNewDay()) {
        await performDailyAndHourlyPlans();
    }
    await performNextAction();
    globalTime.updateTime();
    const endTime = Date.now();
    sysinfo(`--> Step ${i+1} took ${(endTime - startTime) / 1000 }s <--`);
}

async function performDailyAndHourlyPlans() {
    const planPromises = Array.from(globalAgents.values()).map(async (agent) => {
        await globalTaskManager.assignTaskToManager(agent.taskManager);
        await agent.taskManager.generateDailyTask();
        await agent.getDailyPlans();
        await agent.getHourlyPlans();
        await agent.saveToInstantMemory();
    });

    // Wait for all Agents to complete getDailyPlans and getHourlyPlans calls
    await Promise.all(planPromises);
}

async function performNextAction() {
    const willToConversePromises = Array.from(globalAgents.values()).map(agent => {
        return agent.getWillToConverse();
    });

    // Wait for all Agents to complete getNextAction calls
    await Promise.all(willToConversePromises);
    sysinfo("Phase 1 done: will to converse")
    const actionPromises = Array.from(globalAgents.values()).map(async (agent) => {
        await agent.getNextAction();
        await agent.saveNextAction();
        await agent.updateTaskProgress();
    });
    await Promise.all(actionPromises);
    sysinfo("Phase 2 done: action decision and task progress update")
    await globalConverse();
    sysinfo("Phase 3 done: converse")
}
