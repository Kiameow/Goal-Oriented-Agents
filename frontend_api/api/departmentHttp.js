import http from "./http.js"

const getAllStaffs = (JWTtoken, project_id) => {
    const path = `/staff/${project_id}/allStaffs`
    return http.get(path, {}, JWTtoken)
}

const getDepartmentList = (JWTtoken, project_id, page=1, size=10, params) => {
    const path = `/staff/${project_id}/department`
    params = params?params:{}
    params['page'] = page
    params['size'] = size
    return http.get(JWTtoken, path, params)
}

const getAllDepartmentLeaders = (JWTtoken) => {
    const path = "/staff/allDepartmentLeaders"
    return http.get(JWTtoken, path)
}

const addDepartment = (JWTtoken, project_id, data) => {
    const path = `/staff/${project_id}/department`
    return http.post(JWTtoken, path, data)
}

const updateDepartment = (JWTtoken, project_id, pk, data) => {
    const path = `/staff/${project_id}/department/` + pk
    return http.put(JWTtoken, path, data)
}

const deleteDepartment = (JWTtoken, project_id, pk) => {
    const path = `/staff/${project_id}/department/` + pk
    return http.delete(JWTtoken, path)
}

const updateDepartmentLeader = (JWTtoken, department_id, leader_id) => {
    const path = "/staff/departmentleader/" + department_id
    return http.put(JWTtoken, path, { leader_id })
}

export default {
    getAllStaffs,
    addDepartment,
    getDepartmentList,
    getAllDepartmentLeaders,
    updateDepartment,
    deleteDepartment,
    updateDepartmentLeader
}