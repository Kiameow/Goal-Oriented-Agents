import { sendQuerySafely } from "../llm/sendQuery.mjs";
import { globalScen } from "../scen/Scen.mjs";

/**
 * 
 * @param {*} surrounding 
 * @returns 
 */
async function getSurroundingInfo(locationID, targetAgentID) {
    const locationInfo = globalScen.locations.find(location => location.id === locationID); // locationInfo is an object the describes the location
    const agentIDs = globalScen.agentsDistribution[locationID].filter(agentID => agentID !== targetAgentID); // agents is an array of objects that describe the agents in the location
    // const agentNames = agentIDs.map(agentID => ); 
    // TODO: make the agents info global, map agentID to agentInfo
    const templatePath = getPromptPath() + "/agnetSurroundings.hbs";
    const prompt = await handlebarHydrate(templatePath, {
        location: surrounding.location,
        agents: surrounding.agents,
    })
    return prompt;
}

async function getEstatesInfo(locations) {
    const templatePath = getPromptPath() + "/estates.hbs";
    const prompt = await handlebarHydrate(templatePath, {
        locations: locations,
    })
    return prompt;
}

export { getSurroundingInfo, getEstatesInfo };