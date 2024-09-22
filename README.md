## Goal-Oriented-Agents
Goal-Oriented-Agents is a project that aims to develop multi-agents systems that can learn to achieve goals in a complex environment. And the core part is borrowing from Generative Agents created by @joonspk-research.

## How to run
1. clone the repository to your local machine
2. make sure you have installed [Node.js](https://nodejs.org/)
3. run `npm install` in the root directory of this project
4. create a .env file in the root directory according to the key-value pairs in the .env-template (provide your AK and SK)
5. run `npm run test` to start simulation, you can adjust the LOG_LEVEL in the .env file to see more detailed or more concise log (error, warn, info, http, verbose, debug)
6. you can check the simulation results in the `agents` directory (`next_action.json` and `globalConversation.json`)
7. any error message will be documented in the combined.log file, you can check it to see what went wrong.

## TODO
- [ ] add task assignment part
- [ ] connect to the frontend and unity