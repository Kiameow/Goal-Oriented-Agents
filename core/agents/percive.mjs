import { getPromptPath } from "../../filepath.mjs";
import { handlebarHydrate } from "../../helper.mjs";
import { sendQuerySafely } from "../llm/sendQuery.mjs";
import { globalScen } from "../scen/Scen.mjs";
import { globalAgents } from "./Agent.mjs";

/**
 * return one agent's surrounding information, where and with whom
 * @param {*} surrounding 
 * @returns 
 */
async function getSurroundingInfo(locationID, targetAgentID) {
    const locationInfo = globalScen.locations.find(location => location.id === locationID); // locationInfo is an object the describes the location
    const agentIDs = globalScen.agentsDistribution.get(locationID).filter(agentID => agentID !== targetAgentID); // agents is an array of objects that describe the agents in the location
    const agents = agentIDs.map(agentID => globalAgents.get(agentID)); 

    const templatePath = getPromptPath() + "/agentSurroundings.hbs";
    const prompt = await handlebarHydrate(templatePath, {
        location: locationInfo.name,
        agents: agents
    })
    return prompt;
}

async function getEstatesInfo() {
    const locations = globalScen.locations;

    const templatePath = getPromptPath() + "/estates.hbs";
    const prompt = await handlebarHydrate(templatePath, {
        locations: locations,
    })
    return prompt;
}

export { getSurroundingInfo, getEstatesInfo };