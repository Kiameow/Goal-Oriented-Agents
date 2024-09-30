import { globalAgents } from "./core/agents/Agent.mjs";
import { GlobalConversation, globalConverse } from "./core/globalConversation.mjs";
import { globalTime } from "./core/globalTime.mjs";
import { sysinfo } from "./logger.mjs";

let steps = 100;

sysinfo("Starting simulation...");
for(let i = 0; i < steps; i++) {
    sysinfo("################################");
    sysinfo(`# Step ${i+1} of ${steps}`);
    sysinfo(`# Current time: ${globalTime.toString()}`);
    sysinfo("################################");
    if (globalTime.isNewDay()) {
        await performDailyAndHourlyPlans();
    }
    await performNextAction();
    sysinfo("End of step.")
    globalTime.updateTime();
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
    const willToConversePromises = Array.from(globalAgents.values()).map(async (agent) => {
        await agent.getWillToConverse();
    });
    const actionPromises = Array.from(globalAgents.values()).map(async (agent) => {
        await agent.getNextAction();
        await agent.saveNextAction();
    });

    // 等待所有 Agents 完成 getNextAction 调用
    await Promise.all(willToConversePromises);
    await Promise.all(actionPromises);
    await globalConverse();
}
