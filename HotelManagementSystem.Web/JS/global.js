"use strict";

// ========================================================
// CẤU HÌNH ĐỊA CHỈ API
// ========================================================
// Tự động nhận diện Origin hiện tại.
// - Khi chạy trực tiếp qua API (http://localhost:5054): dùng cùng origin
// - Khi chạy qua Gateway (http://localhost:5000): dùng cùng origin (Gateway sẽ proxy)
// - Khi mở file trực tiếp (file://): fallback về localhost:5054

function _detectApiBase() {
    if (window.location.protocol.startsWith("http")) {
        return window.location.origin;
    }
    return "http://localhost:5054";
}

const API_ORIGIN = _detectApiBase();
const API_BASE_URL = `${API_ORIGIN}/api`;
const API_CLIENT_URL = `${API_ORIGIN}/api-client`;
const API_ADMIN_URL = `${API_ORIGIN}/api-admin`;

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

    // Xác định URL đầy đủ
    let fullUrl = endpoint;
    if (!endpoint.startsWith("http")) {
        if (endpoint.startsWith("/api")) {
            fullUrl = `${API_ORIGIN}${endpoint}`;
        } else {
            const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
            fullUrl = `${API_BASE_URL}${cleanEndpoint}`;
        }
    }

    const response = await fetch(fullUrl, {
        ...options,
        headers
    });

    if (response.status === 401) {
        throw new Error(
            "Phiên đăng nhập hết hạn hoặc bạn chưa đăng nhập."
        );
    }

    if (response.status === 403) {
        throw new Error(
            "Bạn không có quyền thực hiện thao tác này qua Gateway."
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

// Gọi API phân hệ Khách hàng (Client API) qua Gateway
async function apiFetchClient(endpoint, options = {}) {
    const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    return await apiFetch(`/api-client${cleanEndpoint}`, options);
}

// Gọi API phân hệ Quản trị (Admin API) qua Gateway
async function apiFetchAdmin(endpoint, options = {}) {
    const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    return await apiFetch(`/api-admin${cleanEndpoint}`, options);
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
