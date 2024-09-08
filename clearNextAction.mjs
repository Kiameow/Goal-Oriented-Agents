import { globalAgents } from "./core/agents/Agent.mjs";

await clearNextActions();

async function clearNextActions() {
    const planPromises = Array.from(globalAgents.values()).map(async (agent) => {
        await agent.clearNextActions();
    });

    // 等待所有 Agents 完成 getDailyPlans 和 getHourlyPlans 调用
    await Promise.all(planPromises);
}