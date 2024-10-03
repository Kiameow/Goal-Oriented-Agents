import { readJsonFileAsync, writeJsonFileAsync } from "../../helper.mjs";
import { syserror, sysinfo } from "../../logger.mjs";
import { GlobalTime } from "../globalTime.mjs";

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
                timestamp: GlobalTime.getCurrentTimestamp(),
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

    // startTime and deadline are timestamp like 1:12:00 (means day 1, 12:00)
    async createTask(description, startTime, deadline, progress = 0) {
        if (!description || typeof description !== 'string') {
            throw new Error('Invalid task description');
        }
        if (!GlobalTime.isValidTimestamp(startTime) || !GlobalTime.isValidTimestamp(deadline)) {
            throw new Error('Invalid start time or deadline');
        }
        if (GlobalTime.compareTimestamps(startTime, deadline) >= 0) {
            throw new Error('Start time must be before deadline');
        }
        if (typeof progress !== 'number' || progress < 0 || progress > 100) {
            throw new Error('Invalid progress value');
        }

        const taskNode = { description, startTime, deadline, progress };
        this.currentTask = taskNode;
        await this.saveCurrentTask();
        await this.appendToTaskHistory('create', taskNode);
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
                    await this.createTask(task.description, task.startTime, task.deadline, 0);
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
    constructor(leaderInfo) {
        if (GlobalTaskManager.instance) {
            return GlobalTaskManager.instance;
        }
        this.leaderInfo = leaderInfo;
        this.projectInfo = {
            finalGoal: "",
            currentProgress: 0,
            currentPhase: 0,
            phases: [],
            tasks: []
        };
        this.projectHistoryFilePath = 'project_history.json';
        GlobalTaskManager.instance = this;
    }

    static getInstance(leaderInfo) {
        if (!GlobalTaskManager.instance) {
            GlobalTaskManager.instance = new GlobalTaskManager(leaderInfo);
        }
        return GlobalTaskManager.instance;
    }

    async loadProjectInfo(filePath) {
        try {
            const projectData = await readJsonFileAsync(filePath);
            this.projectInfo = { ...this.projectInfo, ...projectData };
            if (this.projectInfo.phases.length === 0) {
                await this.generateProjectPhases();
            }
            await this.appendToProjectHistory('Project info loaded');
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
        } catch (error) {
            syserror("Failed to generate project phases:", error);
        }
    }

    async updatePhaseProgress() {
        const currentPhase = this.projectInfo.phases[this.projectInfo.currentPhase];
        currentPhase.progress += 10;

        if (currentPhase.progress >= 100) {
            currentPhase.progress = 100;
            if (this.projectInfo.currentPhase < this.projectInfo.phases.length - 1) {
                this.projectInfo.currentPhase++;
            } else {
                sysinfo("All project phases completed!");
            }
        }

        await this.reviewAndUpdateProgress();
        await this.appendToProjectHistory('Phase progress updated');
    }

    async reviewAndUpdateProgress() {
        const prompt = `
            As the project leader, please review the current progress of the project and provide an updated progress percentage.

            Final project goal: ${this.projectInfo.finalGoal}
            Current overall progress: ${this.projectInfo.currentProgress}%
            Current phase: ${JSON.stringify(this.projectInfo.phases[this.projectInfo.currentPhase])}
            Current tasks: ${JSON.stringify(this.projectInfo.tasks)}

            Based on the information above, please provide an updated overall progress percentage for the entire project.
            Your response should be a single number between 0 and 100, representing the percentage of progress.
        `;

        const validateProgress = (progress) => {
            return typeof progress === 'number' && progress >= 0 && progress <= 100;
        };

        try {
            const updatedProgress = await sendQueryWithValidation(prompt, validateProgress, false);
            if (updatedProgress !== this.projectInfo.currentProgress) {
                this.projectInfo.currentProgress = updatedProgress;
                sysinfo(`Project progress updated to ${updatedProgress}%`);
                await this.appendToProjectHistory('Overall progress updated');
            }
        } catch (error) {
            syserror("Failed to review and update progress:", error);
        }
    }

    async assignTaskToManager(taskManager) {
        const currentPhase = this.projectInfo.phases[this.projectInfo.currentPhase];
        const prompt = `
            As the project leader, please assign a new task to the team.
            Current project goal: ${this.projectInfo.finalGoal}
            Current progress: ${this.projectInfo.currentProgress}%
            Current phase: ${currentPhase.name}
            Phase description: ${currentPhase.description}
            Phase progress: ${currentPhase.progress}%
            Existing tasks: ${JSON.stringify(this.projectInfo.tasks)}

            Please provide a new task for the current phase in the following JSON format:
            {
                "description": "<Task description>",
                "startTime": "<Start time>",
                "deadline": "<Deadline>"
            }
        `;

        const validateTask = (task) => {
            return (
                typeof task.description === 'string' &&
                typeof task.startTime === 'string' &&
                typeof task.deadline === 'string' &&
                GlobalTime.isValidTimestamp(task.startTime) &&
                GlobalTime.isValidTimestamp(task.deadline) &&
                GlobalTime.compareTimestamps(task.startTime, task.deadline) < 0
            );
        };

        try {
            const newTask = await sendQueryWithValidation(prompt, validateTask, true);
            await taskManager.createTask(newTask.description, newTask.startTime, newTask.deadline, 0);
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
                timestamp: new Date().toISOString(),
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
