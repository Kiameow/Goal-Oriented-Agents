import { globalAgents } from "./core/agents/Agent.mjs";
import globalTime from "./core/globalTime.mjs";

let steps = 100;
while (steps--) {
    if (globalTime.isNewDay()) {
        await performDailyAndHourlyPlans();
    }
    await performNextAction();
    globalTime.updateTime();
    globalTime.saveToFile();
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
    const actionPromises = Array.from(globalAgents.values()).map(async (agent) => {
        await agent.getNextAction();
        await agent.saveNextAction();
    });

    // 等待所有 Agents 完成 getNextAction 调用
    await Promise.all(actionPromises);
}
