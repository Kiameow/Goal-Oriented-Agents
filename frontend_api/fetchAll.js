import taskHttp from "./api/taskHttp.js";
import departmentHttp from "./api/departmentHttp.js";
import staffHttp from "./api/staffHttp.js";

async function fetchAllTasks(authHeader, project_id, tasks) {
    try {
        let data = await taskHttp.getTask(authHeader, project_id);
        // 通过形参直接改变原数组，要用数组的方法，不能直接赋值
        tasks.length = 0;
        data.forEach(d => tasks.push(d));
        // console.log("获取全部任务：", tasks);
    } catch (detail) {
        console.error("获取全部任务出错：", detail);
    }
}
async function fetchAllDepartments(authHeader, project_id, departments) {
    try {
        let data = await staffHttp.getAllDepartment(authHeader, project_id)
        departments.length = 0;
        data.results.forEach(d => departments.push(d));
        // departments.value = data.results;
    } catch (detail) {
        console.error("获取全部部门出错：", detail);
    }
}

const fetchAllStaffs = async (authHeader, project_id, staffs) => {
    try {
        let data = await departmentHttp.getAllStaffs(authHeader, project_id);
        staffs.length = 0;
        data.results.forEach(d => staffs.push(d));
        // staffs.value = data.results;
    } catch (detail) {
        console.error("获取所有员工出错：", detail);
    }
};

const fetchDepartmentLeaders = async (authHeader, departmentLeaders) => {
    try {
        let data = await departmentHttp.getAllDepartmentLeaders(authHeader);
        departmentLeaders.length = 0;
        data.results.forEach(d => departmentLeaders.push(d));
        // departmentLeaders.value = data.results;
        // console.log('部门领导：', departmentLeaders.value);
    } catch (detail) {
        console.error("获取部门领导出错：", detail);
    }
};

export default {
    fetchAllTasks,
    fetchAllDepartments,
    fetchAllStaffs,
    fetchDepartmentLeaders
}