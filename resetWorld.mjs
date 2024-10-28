import { globalAgents } from "./core/agents/Agent.mjs";
import { globalTime } from "./core/globalTime.mjs";
import { getAgentsPath, getProjectPath } from "./filepath.mjs";
import { writeJsonFileAsync } from "./helper.mjs";

await clearAgentsMemos();
await clearDialogs();
await clearTasks();
globalTime.setTime(0, 0, 0);

async function clearAgentsMemos() {
    const clearPromises = Array.from(globalAgents.values()).map(async (agent) => {
        await agent.clearNextActions();
        await agent.clearInstantMemories();
        await agent.clearMemories();
    });

    await Promise.all(clearPromises);
}

async function clearDialogs() {
    const filepath = getAgentsPath() + `/globalDialogs.json`;
    await writeJsonFileAsync(filepath, []);
}

async function clearTasks() {
    const clearPromises = Array.from(globalAgents.values()).map(async (agent) => {
        await agent.clearTask();
    });

    await Promise.all(clearPromises);

    const projectInfoPath = getProjectPath() + "/project_info.json";
    const projectHistoryPath = getProjectPath() + "/project_history.json";
    await writeJsonFileAsync(projectInfoPath, { finalGoal: "", currentPhase: 0, phases: [], tasks: [] });
    await writeJsonFileAsync(projectHistoryPath, []);
}