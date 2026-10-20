"use strict";

function getServiceApiUrl() {
    if (typeof API_BASE_URL !== "undefined" && API_BASE_URL) {
        return `${API_BASE_URL}/Service`;
    }
    if (window.location.protocol.startsWith("http")) {
        return `${window.location.origin}/api/Service`;
    }
    return "http://localhost:5054/api/Service";
}

const SERVICE_API_URL = getServiceApiUrl();

let allServices = [];
let editingServiceId = null;

document.addEventListener("DOMContentLoaded", () => {
    const fullName =
        localStorage.getItem("fullName") ||
        localStorage.getItem("username") ||
        "Quản trị viên";

    const greeting = document.querySelector(".header-right span, #adminWelcome");
    if (greeting) {
        greeting.textContent = `Xin chào, ${fullName}`;
    }

    const form = document.getElementById("serviceForm");
    if (form) {
        form.addEventListener("submit", saveService);
    }

    const searchInput = document.getElementById("searchService");
    if (searchInput) {
        searchInput.addEventListener("input", searchService);
    }

    const priceInput = document.getElementById("servicePrice");
    if (priceInput) {
        priceInput.addEventListener("input", updatePricePreview);
    }

    loadServices();
});

function getToken() {
    return localStorage.getItem("token");
}

async function apiRequest(url, options = {}) {
    const token = getToken();

    if (!token) {
        alert("Bạn chưa đăng nhập. Vui lòng đăng nhập lại.");
        window.location.href = "dangnhap.html";
        throw new Error("Chưa có token đăng nhập.");
    }

    const headers = {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers
    };

    const response = await fetch(url, { ...options, headers });

    if (response.status === 401) {
        throw new Error("Phiên đăng nhập hết hạn hoặc không hợp lệ.");
    }

    if (response.status === 403) {
        throw new Error("Tài khoản không có quyền quản lý dịch vụ.");
    }

    if (response.status === 204) return null;

    const text = await response.text();
    let data = null;
    try {
        data = text ? JSON.parse(text) : null;
    } catch {
        data = text;
    }

    if (!response.ok) {
        const message =
            data?.message ||
            data?.title ||
            (typeof data === "string" ? data : "") ||
            `API trả về lỗi ${response.status}`;

        throw new Error(message);
    }

    return data;
}

function getList(result) {
    if (Array.isArray(result)) return result;
    if (Array.isArray(result?.data)) return result.data;
    if (Array.isArray(result?.items)) return result.items;
    return [];
}

function getValue(object, ...keys) {
    for (const key of keys) {
        if (object?.[key] !== undefined && object[key] !== null) {
            return object[key];
        }
    }
    return undefined;
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function formatPrice(value) {
    const price = Number(value);
    if (!Number.isFinite(price)) return "—";
    return price.toLocaleString("vi-VN") + " VNĐ";
}

function parseEnteredPrice(inputStr) {
    if (!inputStr) return 0;
    // Bỏ tất cả ký tự không phải số
    const clean = String(inputStr).replace(/[^\d]/g, "");
    if (!clean) return 0;
    const num = Number(clean);
    // Nếu nhập số nhỏ hơn 1000 (ví dụ nhập 15, 20, 50, 100, 500) -> nhân 1000 vì có đuôi .000 VNĐ
    if (num < 1000) {
        return num * 1000;
    }
    return num;
}

function updatePricePreview() {
    const priceInput = document.getElementById("servicePrice");
    const previewEl = document.getElementById("pricePreview");
    if (!priceInput || !previewEl) return;

    const raw = priceInput.value.trim();
    if (!raw) {
        previewEl.textContent = "";
        return;
    }

    const actual = parseEnteredPrice(raw);
    previewEl.textContent = `Thành tiền: ${actual.toLocaleString("vi-VN")} VNĐ`;
}

async function loadServices() {
    const tbody = document.getElementById("serviceTableBody");
    if (tbody) {
        tbody.innerHTML = `
            <tr><td colspan="6" style="text-align: center; color: #6b7280; padding: 20px;">Đang tải danh sách dịch vụ...</td></tr>
        `;
    }

    try {
        const result = await apiRequest(SERVICE_API_URL);
        allServices = getList(result);
        renderServices(allServices);
    } catch (error) {
        console.error("Lỗi tải dịch vụ:", error);
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; color: #dc2626; padding: 20px;">${escapeHtml(error.message)}</td>
                </tr>
            `;
        }
    }
}

function renderServices(services) {
    const tbody = document.getElementById("serviceTableBody");
    if (!tbody) return;

    if (!services || !services.length) {
        tbody.innerHTML = `
            <tr><td colspan="6" style="text-align: center; color: #6b7280; padding: 20px;">Chưa có dịch vụ nào trong hệ thống.</td></tr>
        `;
        return;
    }

    tbody.innerHTML = services.map(service => {
        const id = getValue(service, "id", "Id");
        const name = getValue(service, "name", "Name", "serviceName", "ServiceName") ?? "Chưa có tên";
        const unit = getValue(service, "unit", "Unit") || "—";
        const price = getValue(service, "price", "Price", "unitPrice", "UnitPrice");
        const desc = getValue(service, "description", "Description") || "—";

        return `
            <tr>
                <td>${escapeHtml(id)}</td>
                <td><strong>${escapeHtml(name)}</strong></td>
                <td><span style="display:inline-block; padding:2px 8px; background:#f3f4f6; border-radius:4px; font-size:12px;">${escapeHtml(unit)}</span></td>
                <td><strong style="color: #059669;">${escapeHtml(formatPrice(price))}</strong></td>
                <td>${escapeHtml(desc)}</td>
                <td>
                    <button type="button" class="btn-edit" onclick="editService(${Number(id)})">
                        Sửa
                    </button>
                    <button type="button" class="btn-delete" onclick="deleteService(${Number(id)})">
                        Xóa
                    </button>
                </td>
            </tr>
        `;
    }).join("");
}

function searchService() {
    const searchInput = document.getElementById("searchService");
    const keyword = (searchInput ? searchInput.value : "")
        .trim()
        .toLocaleLowerCase("vi");

    if (!keyword) {
        renderServices(allServices);
        return;
    }

    const filtered = allServices.filter(service => {
        const name = String(getValue(service, "name", "Name") || "").toLocaleLowerCase("vi");
        const unit = String(getValue(service, "unit", "Unit") || "").toLocaleLowerCase("vi");
        const desc = String(getValue(service, "description", "Description") || "").toLocaleLowerCase("vi");
        const price = String(getValue(service, "price", "Price") || "");

        return (
            name.includes(keyword) ||
            unit.includes(keyword) ||
            desc.includes(keyword) ||
            price.includes(keyword)
        );
    });

    renderServices(filtered);
}

function openServiceForm() {
    editingServiceId = null;

    const form = document.getElementById("serviceForm");
    if (form) form.reset();

    const title = document.getElementById("serviceFormTitle");
    if (title) title.textContent = "Thêm dịch vụ";

    const saveBtn = document.getElementById("saveServiceButton");
    if (saveBtn) saveBtn.textContent = "Lưu dịch vụ";

    const previewEl = document.getElementById("pricePreview");
    if (previewEl) previewEl.textContent = "";

    const modal = document.getElementById("serviceModal");
    if (modal) modal.style.display = "flex";
}

function closeServiceForm() {
    const modal = document.getElementById("serviceModal");
    if (modal) modal.style.display = "none";

    const form = document.getElementById("serviceForm");
    if (form) form.reset();

    const previewEl = document.getElementById("pricePreview");
    if (previewEl) previewEl.textContent = "";

    editingServiceId = null;
}

async function editService(id) {
    const service = allServices.find(item =>
        Number(getValue(item, "id", "Id")) === Number(id)
    );

    if (!service) {
        alert("Không tìm thấy dịch vụ.");
        return;
    }

    editingServiceId = Number(id);

    const nameInput = document.getElementById("serviceName");
    const unitInput = document.getElementById("serviceUnit");
    const priceInput = document.getElementById("servicePrice");
    const descInput = document.getElementById("serviceDescription");

    if (nameInput) nameInput.value = getValue(service, "name", "Name", "serviceName") ?? "";
    if (unitInput) unitInput.value = getValue(service, "unit", "Unit") ?? "";

    const rawPrice = Number(getValue(service, "price", "Price") ?? 0);
    if (priceInput) {
        // Nếu giá là bội số của 1000 (ví dụ 15000) -> hiển thị 15 (vì đuôi có .000 VNĐ)
        if (rawPrice > 0 && rawPrice % 1000 === 0) {
            priceInput.value = String(rawPrice / 1000);
        } else {
            priceInput.value = String(rawPrice);
        }
    }

    if (descInput) descInput.value = getValue(service, "description", "Description") ?? "";

    updatePricePreview();

    const title = document.getElementById("serviceFormTitle");
    if (title) title.textContent = "Sửa dịch vụ";

    const saveBtn = document.getElementById("saveServiceButton");
    if (saveBtn) saveBtn.textContent = "Cập nhật dịch vụ";

    const modal = document.getElementById("serviceModal");
    if (modal) modal.style.display = "flex";
}

async function saveService(event) {
    event.preventDefault();

    const nameInput = document.getElementById("serviceName");
    const unitInput = document.getElementById("serviceUnit");
    const priceInput = document.getElementById("servicePrice");
    const descInput = document.getElementById("serviceDescription");

    const name = (nameInput ? nameInput.value : "").trim();
    const unit = (unitInput ? unitInput.value : "").trim();
    const rawPrice = (priceInput ? priceInput.value : "").trim();
    const description = (descInput ? descInput.value : "").trim();

    if (!name) {
        alert("Vui lòng nhập tên dịch vụ.");
        if (nameInput) nameInput.focus();
        return;
    }

    const price = parseEnteredPrice(rawPrice);
    if (!Number.isFinite(price) || price < 0) {
        alert("Vui lòng nhập đơn giá hợp lệ.");
        if (priceInput) priceInput.focus();
        return;
    }

    // Khớp chính xác với model Service.cs của backend
    const payload = {
        name: name,
        unit: unit || null,
        price: price,
        isActive: true,
        description: description || null
    };

    const isEditing = editingServiceId !== null;
    const url = isEditing
        ? `${SERVICE_API_URL}/${editingServiceId}`
        : SERVICE_API_URL;

    if (isEditing) {
        payload.id = editingServiceId;
    }

    const saveBtn = document.getElementById("saveServiceButton");
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = "Đang lưu...";
    }

    try {
        await apiRequest(url, {
            method: isEditing ? "PUT" : "POST",
            body: JSON.stringify(payload)
        });

        alert(isEditing
            ? "Cập nhật dịch vụ thành công!"
            : "Thêm dịch vụ mới thành công!");

        closeServiceForm();
        await loadServices();

    } catch (error) {
        console.error("Lỗi lưu dịch vụ:", error);
        alert(`Không thể lưu dịch vụ: ${error.message}`);
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = isEditing ? "Cập nhật dịch vụ" : "Lưu dịch vụ";
        }
    }
}

async function deleteService(id) {
    if (!confirm("Bạn có chắc chắn muốn xóa dịch vụ này?")) return;

    try {
        await apiRequest(`${SERVICE_API_URL}/${id}`, {
            method: "DELETE"
        });

        alert("Xóa dịch vụ thành công!");
        await loadServices();

    } catch (error) {
        console.error("Lỗi xóa dịch vụ:", error);
        alert(`Không thể xóa dịch vụ: ${error.message}`);
    }
}

// Bắt sự kiện click ngoài modal để đóng
document.addEventListener("click", event => {
    const modal = document.getElementById("serviceModal");
    if (event.target === modal) {
        closeServiceForm();
    }
});

// Window exports
window.openServiceForm = openServiceForm;
window.closeServiceForm = closeServiceForm;
window.editService = editService;
window.deleteService = deleteService;
window.searchService = searchService;
window.updatePricePreview = updatePricePreview;
