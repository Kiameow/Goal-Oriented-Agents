import { globalAgents } from "./core/agents/Agent.mjs";
import { globalTime } from "./core/globalTime.mjs";

await clearAgentsMemos();
globalTime.setTime(0, 0, 0);

async function clearAgentsMemos() {
    const clearPromises = Array.from(globalAgents.values()).map(async (agent) => {
        await agent.clearNextActions();
        await agent.clearInstantMemories();
        await agent.clearMemories();
    });

    await Promise.all(clearPromises);
}