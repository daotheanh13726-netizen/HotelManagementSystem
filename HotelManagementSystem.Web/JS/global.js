
"use strict";

// Địa chỉ ASP.NET Core Web API
const API_BASE_URL = "https://localhost:44365/api";

// Lấy JWT đã lưu sau khi đăng nhập
function getToken() {
    return localStorage.getItem("token");
}

// Tạo headers cho các yêu cầu API
function getAuthHeaders(includeJson = true) {
    const headers = {};

    if (includeJson) {
        headers["Content-Type"] = "application/json";
    }

    const token = getToken();

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    return headers;
}

// Gọi API dùng chung
async function apiFetch(endpoint, options = {}) {
    const headers = {
        ...getAuthHeaders(),
        ...(options.headers || {})
    };

    const response = await fetch(
        `${API_BASE_URL}${endpoint}`,
        {
            ...options,
            headers
        }
    );

    if (response.status === 401) {
        throw new Error(
            "Phiên đăng nhập hết hạn hoặc bạn chưa đăng nhập."
        );
    }

    if (response.status === 403) {
        throw new Error(
            "Bạn không có quyền thực hiện thao tác này."
        );
    }

    if (!response.ok) {
        const errorText = await response.text();

        throw new Error(
            errorText || `API trả về lỗi ${response.status}.`
        );
    }

    // Một số API không trả nội dung khi thành công
    if (response.status === 204) {
        return null;
    }

    const contentType = response.headers.get("content-type");

    if (contentType && contentType.includes("application/json")) {
        return await response.json();
    }

    return await response.text();
}

// Xóa thông tin đăng nhập và quay lại trang đăng nhập
function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("username");
    localStorage.removeItem("fullName");
    localStorage.removeItem("roleName");

    window.location.href = "dangnhap.html";
}
