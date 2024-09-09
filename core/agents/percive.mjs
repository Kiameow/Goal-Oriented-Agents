import { getPromptPath } from "../../filepath.mjs";
import { handlebarHydrate } from "../../helper.mjs";
import { syserror } from "../../logger.mjs";
import { sendQuerySafely } from "../llm/sendQuery.mjs";
import { globalScen } from "../scen/Scen.mjs";
import { globalAgents } from "./Agent.mjs";

/**
 * return one agent's surrounding information, where and with whom
 * @param {*} surrounding 
 * @returns 
 */
async function getSurroundingInfo(agent) {
    try {
        const locationInfo = globalScen.locations.find(location => location.id === agent.currentLocation); // locationInfo is an object the describes the location
        // agentDistribution has no agent info, need to fix
        const agentIDs = globalScen.agentsDistribution.get(agent.currentLocation).filter(agentID => agentID !== agent.id); // agents is an array of objects that describe the agents in the location
        const agents = agentIDs.map(agentID => globalAgents.get(agentID).agentInfo); 

        const templatePath = getPromptPath() + "/agentSurroundings.hbs";
        const prompt = await handlebarHydrate(templatePath, {
            location: locationInfo.name,
            agents: agents.length > 0 ? agents : null
        })
        return prompt;
    } catch (error) {
        syserror(error);
    }
    
}

async function getEstatesInfo() {
    try {
        const locations = globalScen.locations;

        const templatePath = getPromptPath() + "/estates.hbs";
        const prompt = await handlebarHydrate(templatePath, {
            locations: locations,
        })
        return prompt;
    } catch (error) {
        syserror(error);
    }
}

export { getSurroundingInfo, getEstatesInfo };