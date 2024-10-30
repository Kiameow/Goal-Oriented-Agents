import { getProjectPath } from "../../filepath.mjs";
import { extractLastNumber, readJsonFileAsync, writeJsonFileAsync } from "../../helper.mjs";
import { syserror, sysinfo } from "../../logger.mjs";
import { globalTime, GlobalTime } from "../globalTime.mjs";
import { sendQuerySafely, sendQueryWithValidation } from "../llm/sendQuery.mjs";
import { globalAgents } from "./Agent.mjs";

class TaskManager {
    constructor(taskFilePath, taskHistoryFilePath, globalTaskManager, agentRole) {
        this.taskFilePath = taskFilePath;
        this.taskHistoryFilePath = taskHistoryFilePath;
        this.currentTask = null;
        this.globalTaskManager = globalTaskManager;
        this.agentRole = agentRole;
        this.loadCurrentTask();
    }

    async loadCurrentTask() {
        try {
            this.currentTask = await readJsonFileAsync(this.taskFilePath) || null;
        } catch (error) {
            syserror("Loading current task failed: ", error);
        }
    }

    async saveCurrentTask() {
        try {
            await writeJsonFileAsync(this.taskFilePath, this.currentTask);
        } catch (error) {
            syserror("Saving current task failed: ", error);
        }
    }

    async appendToTaskHistory(action, taskData) {
        try {
            const historyEntry = {
                timestamp: globalTime.getCurrentTimestamp(),
                action,
                task: { ...taskData }
            };
            const history = await readJsonFileAsync(this.taskHistoryFilePath) || [];
            history.push(historyEntry);
            await writeJsonFileAsync(this.taskHistoryFilePath, history);
        } catch (error) {
            syserror("Appending to task history failed: ", error);
        }
    }

    async createTask(description, progress = 0) {
        if (!description || typeof description !== 'string') {
            throw new Error('Invalid task description');
        }
        if (typeof progress !== 'number' || progress < 0 || progress > 100) {
            throw new Error('Invalid progress value');
        }

        const taskNode = { description, progress };
        this.currentTask = taskNode;
        await this.saveCurrentTask();
        await this.appendToTaskHistory('create', taskNode);
    }

    async evaluateActionImpact(action) {
        if (!this.currentTask) {
            return { isRelated: false, newProgress: 0 };
        }

        const prompt = `
            Current task: ${this.currentTask.description}
            Current progress: ${this.currentTask.progress}%
            Agent action: ${action}

            Please evaluate if this action is related to the current task.
            If it is related, estimate the new progress percentage after this action.
            
            Respond in the following JSON format:
            
            {
                "isRelated": true/false,
                "newProgress": number (0-100)
            }
            

            Note: Ensure your response is a valid JSON object and nothing else. All output should be in English.
        `;

        const validateResponse = (response) => {
            return (
                typeof response.isRelated === 'boolean' &&
                typeof response.newProgress === 'number' &&
                response.newProgress >= 0 &&
                response.newProgress <= 100
            );
        };

        try {
            const result = await sendQueryWithValidation(prompt, validateResponse, true);
            return result;
        } catch (error) {
            syserror("Failed to evaluate action impact:", error);
            return { isRelated: false, newProgress: this.currentTask.progress };
        }
    }

    async updateTaskProgress(progress) {
        if (!this.currentTask) {
            throw new Error('No current task to update');
        }
        if (typeof progress !== 'number' || progress < 0 || progress > 100) {
            throw new Error('Invalid progress value');
        }

        this.currentTask.progress = progress;
        await this.saveCurrentTask();
        await this.appendToTaskHistory('update', this.currentTask);

        if (progress >= 100) {
            await this.globalTaskManager.updatePhaseProgress();
        }
    }

    isTaskCompleted() {
        return this.currentTask && this.currentTask.progress >= 100;
    }

    async generateDailyTask() {
        try {
            if (!this.currentTask || this.isTaskCompleted()) {
                const task = await this.globalTaskManager.assignTask(this.agentRole);
                
                if (task) {
                    await this.createTask(task.description, 0);
                    sysinfo("New task assigned by the global task manager.");
                } else {
                    sysinfo("No new task assigned by the global task manager.");
                }
            } else {
                sysinfo("Current task is not completed. No new task will be generated.");
            }
        } catch (error) {
            syserror("Task generation failed: ", error);
        }
    }

    getLatestTaskDescription() {
        return this.currentTask && this.currentTask.progress < 100 ? this.currentTask.description : "";
    }
}

class GlobalTaskManager {
    constructor(leaderInfo, projectInfoPath, historyFilePath) {
        if (GlobalTaskManager.instance) {
            return GlobalTaskManager.instance;
        }
        this.leaderInfo = leaderInfo;
        this.projectInfoPath = projectInfoPath;
        this.projectHistoryFilePath = historyFilePath;
        this.projectInfo = {
            finalGoal: "",
            currentPhase: 0,
            phases: [],
            tasks: []
        };
        GlobalTaskManager.instance = this;
    }

    static getInstance(leaderInfo, projectInfoPath, historyFilePath) {
        if (!GlobalTaskManager.instance) {
            GlobalTaskManager.instance = new GlobalTaskManager(leaderInfo, projectInfoPath, historyFilePath);
        }
        return GlobalTaskManager.instance;
    }

    async setFinalGoal(goal) {
        if (typeof goal !== 'string' || goal.trim() === '') {
            throw new Error('Final goal must be a non-empty string');
        }
        this.projectInfo.finalGoal = goal.trim();
        await this.saveState(this.projectInfoPath);
    }

    async loadProjectInfo() {
        try {
            const projectData = await readJsonFileAsync(this.projectInfoPath);
            this.projectInfo = { ...this.projectInfo, ...projectData };
            if (this.projectInfo.phases.length === 0) {
                await this.generateProjectPhases();
            }
        } catch (error) {
            syserror("Failed to load project info:", error);
        }
    }

    async generateProjectPhases() {
        const prompt = `
            As the project leader, please generate a list of project phases based on the following final goal:
            ${this.projectInfo.finalGoal}

            Please provide the phases in the following JSON format:
            
            [
                {
                    "name": "<Phase name>",
                    "description": "<Phase description>",
                    "progress": 0
                },
                ...
            ]
            

            Note: Ensure your response is a valid JSON object and nothing else. All output should be in English.
        `;

        const validateProjectPhases = (phases) => {
            if (!Array.isArray(phases)) return false;
            return phases.every(phase => 
                typeof phase.name === 'string' &&
                typeof phase.description === 'string' &&
                typeof phase.progress === 'number' &&
                phase.progress === 0
            );
        };

        try {
            this.projectInfo.phases = await sendQueryWithValidation(prompt, validateProjectPhases, true);
            await this.appendToProjectHistory('Project phases generated');
            await this.saveState(this.projectInfoPath);
        } catch (error) {
            syserror("Failed to generate project phases:", error);
        }
    }

    async updatePhaseProgress() {
        const currentPhase = this.projectInfo.phases[this.projectInfo.currentPhase];
        
        const prompt = `
            As the project leader, please review the current progress of the project phase and provide an updated progress percentage.

            Final project goal: ${this.projectInfo.finalGoal}
            Current phase: ${JSON.stringify(currentPhase)}
            Current tasks: ${JSON.stringify(this.projectInfo.tasks)}

            Based on the information above, please provide an updated progress percentage for the current phase.
            
            Note: Your response should be a single number between 0 and 100, representing the percentage of progress with nothing else.

            example: 50
        `;

        const validateProgress = (progress) => {
            return typeof progress === 'number' && progress >= 0 && progress <= 100;
        };

        try {
            let updatedProgress;
            let isValidProgress = false;
            let retryCount = 0;
            const maxRetries = 3;

            while (!isValidProgress && retryCount < maxRetries) {
                const response = await sendQuerySafely(prompt);
                updatedProgress = extractLastNumber(response.result);
                isValidProgress = validateProgress(updatedProgress);

                if (!isValidProgress) {
                    syswarn(`Invalid progress value: ${updatedProgress}. Retrying...`);
                    retryCount++;
                }
            }

            if (isValidProgress) {
                currentPhase.progress = updatedProgress;

                if (currentPhase.progress >= 100) {
                    currentPhase.progress = 100;
                    if (this.projectInfo.currentPhase < this.projectInfo.phases.length - 1) {
                        this.projectInfo.currentPhase++;
                        sysinfo("Moving to next phase");
                    } else {
                        sysinfo("All project phases completed!");
                    }
                }

                await this.appendToProjectHistory('Phase progress updated');
            } else {
                syswarn("Failed to get a valid progress value after multiple attempts. Progress remains unchanged.");
            }
        } catch (error) {
            syserror("Failed to update phase progress:", error);
        }
    }

    async assignTaskToManager(taskManager) {
        const currentPhase = this.projectInfo.phases[this.projectInfo.currentPhase];
        const prompt = `
            As the project leader, please assign a new task to the team.
            Current project goal: ${this.projectInfo.finalGoal}
            Current phase: ${currentPhase.name}
            Phase description: ${currentPhase.description}
            Phase progress: ${currentPhase.progress}%
            Existing tasks: ${JSON.stringify(this.projectInfo.tasks)}

            Please provide a new task for the current phase in the following JSON format:
            {
                "description": "<Task description>"
            }

            Ensure your response is a valid JSON object and nothing else. All output should be in English.
        `;

        const validateTask = (task) => {
            return (
                typeof task.description === 'string'
            );
        };

        try {
            const newTask = await sendQueryWithValidation(prompt, validateTask, true);
            await taskManager.createTask(newTask.description, 0);
            this.projectInfo.tasks.push(newTask);
            sysinfo("New task assigned:", newTask.description);
            await this.appendToProjectHistory('New task assigned');
        } catch (error) {
            syserror("Failed to assign new task:", error);
        }
    }

    async saveState(filePath) {
        try {
            await writeJsonFileAsync(filePath, this.projectInfo);
            sysinfo("Global task manager state saved successfully");
        } catch (error) {
            syserror("Failed to save global task manager state:", error);
        }
    }

    async appendToProjectHistory(action) {
        try {
            const currentState = {
                timestamp: globalTime.getCurrentTimestamp(),
                action: action,
                projectInfo: { ...this.projectInfo }
            };

            let history = [];
            try {
                history = await readJsonFileAsync(this.projectHistoryFilePath) || [];
            } catch (error) {
                // If file doesn't exist or is empty, start with an empty array
            }

            history.push(currentState);
            await writeJsonFileAsync(this.projectHistoryFilePath, history);
        } catch (error) {
            syserror("Failed to append to project history:", error);
        }
    }
}

export { TaskManager, GlobalTaskManager };
