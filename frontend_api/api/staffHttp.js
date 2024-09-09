import http from "./http.js"

const getStaffDefaultImages = (JWTtoken) => {
    const path = "/staff/getStaffDefaultImages"
    return http.get(JWTtoken, path)
}

const getAllDepartment = (JWTtoken, project_id) => {
    const path = `/staff/${project_id}/allDepartments`
    return http.get(JWTtoken, path)
}

const addStaff = (JWTtoken, project_id, data) => {
    const path = `/staff/${project_id}/staff`
    return http.postWithImage(JWTtoken, path, data)
}

const getStaffList = (JWTtoken, project_id, page=1, size=10, params) => {
    const path = `/staff/${project_id}/staff`
    params = params?params:{}
    params['page'] = page
    params['size'] = size
    return http.get(JWTtoken, path, params)
}

const updateStaff = (JWTtoken, project_id, pk, data) => {
    const path = `/staff/${project_id}/staff/` + pk
    return http.putWithImage(JWTtoken, path, data)
}

const deleteStaff = (JWTtoken, project_id, pk) => {
    const path = `/staff/${project_id}/staff/` + pk
    return http.delete(JWTtoken, path)
}

const downloadStaffs = (JWTtoken, pks) => {
    const path = "/staff/download"
    return http.downloadFile(JWTtoken, path, {"pks": JSON.stringify(pks)})
}

export default {
    getStaffDefaultImages,
    getAllDepartment,
    addStaff,
    getStaffList,
    updateStaff,
    deleteStaff,
    downloadStaffs
}