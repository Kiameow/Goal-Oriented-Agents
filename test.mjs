import { globalAgents } from "./core/agents/Agent.mjs";
import { GlobalConversation, globalConverse } from "./core/globalConversation.mjs";
import { globalTime } from "./core/globalTime.mjs";
import { sysinfo } from "./logger.mjs";

let steps = 100;

sysinfo("Starting simulation...");
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
        await agent.getDailyPlans();
        await agent.getHourlyPlans();
        await agent.saveToInstantMemory();
    });

    // 等待所有 Agents 完成 getDailyPlans 和 getHourlyPlans 调用
    await Promise.all(planPromises);
}

async function performNextAction() {
    const willToConversePromises = Array.from(globalAgents.values()).map(agent => {
        return agent.getWillToConverse();
    });

    // 等待所有 Agents 完成 getNextAction 调用
    await Promise.all(willToConversePromises);
    sysinfo("Phase 1 done: will to converse")
    const actionPromises = Array.from(globalAgents.values()).map(async (agent) => {
        await agent.getNextAction();
        await agent.saveNextAction();
    });
    await Promise.all(actionPromises);
    sysinfo("Phase 2 done: action decision")
    await globalConverse();
    sysinfo("Phase 3 done: converse")
}
