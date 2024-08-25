const __dirname = import.meta.dirname;
export function getPromptPath() {
    return __dirname + "/prompt_templates/";
}

export function getAgentsPath() {
    return __dirname + "/agents";
}

export function getScenPath() {
    return __dirname + "/scen";
}