// [
//     {
//         "id": "MLH",
//         "name": "Maria Lopez's Home",
//         "description": "Where Maria Lopez rest"
//     },
// ]
class Scen {
    constructor(locationsInfo) {
        this.locations = locationsInfo;
        this.agentsDistribution = new Map();
    }

    confirmAgentLocation(agentName, locationID) {
        this.agentsDistribution.set(locationID, agentName);
    }
}

export default Scen;