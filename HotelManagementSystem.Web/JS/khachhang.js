"use strict";

function getCustomerApiUrl() {
    if (typeof API_BASE_URL !== "undefined" && API_BASE_URL) {
        return `${API_BASE_URL}/Guest`;
    }
    if (window.location.protocol.startsWith("http")) {
        return `${window.location.origin}/api/Guest`;
    }
    return "http://localhost:5054/api/Guest";
}

const CUSTOMER_API = getCustomerApiUrl();

let allCustomers = [];
let editingCustomerId = null;

document.addEventListener("DOMContentLoaded", () => {
    const fullName =
        localStorage.getItem("fullName") ||
        localStorage.getItem("username") ||
        "Quản trị viên";

    const greeting = document.querySelector(".header-right span, #adminWelcome");
    if (greeting) {
        greeting.textContent = `Xin chào, ${fullName}`;
    }

    const customerForm = document.getElementById("customerForm");
    if (customerForm) {
        customerForm.addEventListener("submit", saveCustomer);
    }

    const searchInput = document.getElementById("searchCustomer");
    if (searchInput) {
        searchInput.addEventListener("input", filterCustomer);
    }

    loadCustomers();
});

async function customerRequest(url, options = {}) {
    const token = localStorage.getItem("token");

    if (!token) {
        alert("Bạn chưa đăng nhập. Vui lòng đăng nhập lại.");
        window.location.href = "dangnhap.html";
        throw new Error("Chưa có token đăng nhập.");
    }

    const response = await fetch(url, {
        ...options,
        headers: {
            Authorization: `Bearer ${token}`,
            ...(options.body ? { "Content-Type": "application/json" } : {}),
            ...(options.headers || {})
        }
    });

    if (response.status === 401) {
        throw new Error("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
    }

    if (response.status === 403) {
        throw new Error("Tài khoản không có quyền quản lý khách hàng.");
    }

    if (!response.ok) {
        let message = `Yêu cầu thất bại (${response.status}).`;

        try {
            const data = await response.json();
            message = data.message || data.title || message;
        } catch {
            // Phản hồi không phải JSON.
        }

        throw new Error(message);
    }

    if (response.status === 204) return null;

    return response.json().catch(() => null);
}

function getCustomerList(result) {
    if (Array.isArray(result)) return result;
    if (Array.isArray(result?.data)) return result.data;
    if (Array.isArray(result?.items)) return result.items;
    if (Array.isArray(result?.Data)) return result.Data;
    return [];
}

function escapeCustomerHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

async function loadCustomers() {
    const tbody = document.getElementById("customerTableBody");
    if (!tbody) return;

    tbody.innerHTML =
        '<tr><td colspan="7" style="text-align:center; color:#6b7280;">Đang tải dữ liệu khách hàng...</td></tr>';

    try {
        const result = await customerRequest(
            `${CUSTOMER_API}?page=1&pageSize=100`
        );

        allCustomers = getCustomerList(result);
        filterCustomer();
    } catch (error) {
        tbody.innerHTML =
            `<tr><td colspan="7" style="text-align:center; color:#dc2626;">${escapeCustomerHtml(error.message)}</td></tr>`;

        console.error("Lỗi tải khách hàng:", error);
    }
}

function renderCustomers(list) {
    const tbody = document.getElementById("customerTableBody");
    if (!tbody) return;

    if (!list || !list.length) {
        tbody.innerHTML =
            '<tr><td colspan="7" style="text-align:center; color:#6b7280; padding:20px;">Không tìm thấy khách hàng nào</td></tr>';
        return;
    }

    tbody.innerHTML = list.map(customer => {
        const id = Number(customer.id);

        return `
            <tr>
                <td>${escapeCustomerHtml(customer.id)}</td>
                <td><strong>${escapeCustomerHtml(customer.fullName)}</strong></td>
                <td>${escapeCustomerHtml(customer.phone || "—")}</td>
                <td>${escapeCustomerHtml(customer.identityNumber || "—")}</td>
                <td>${escapeCustomerHtml(customer.email || "—")}</td>
                <td>${escapeCustomerHtml(customer.address || "—")}</td>
                <td>
                    <button type="button" class="btn-edit"
                        onclick="editCustomer(${id})">
                        Sửa
                    </button>
                    <button type="button" class="btn-delete"
                        onclick="deleteCustomer(${id})">
                        Xóa
                    </button>
                </td>
            </tr>
        `;
    }).join("");
}

function filterCustomer() {
    const searchInput = document.getElementById("searchCustomer");
    const keyword = (searchInput ? searchInput.value : "")
        .trim()
        .toLocaleLowerCase("vi");

    if (!keyword) {
        renderCustomers(allCustomers);
        return;
    }

    const filtered = allCustomers.filter(customer => {
        const name = String(customer.fullName || "").toLocaleLowerCase("vi");
        const phone = String(customer.phone || "").toLowerCase();
        const identity = String(customer.identityNumber || "").toLowerCase();
        const email = String(customer.email || "").toLowerCase();
        const address = String(customer.address || "").toLocaleLowerCase("vi");

        return (
            name.includes(keyword) ||
            phone.includes(keyword) ||
            identity.includes(keyword) ||
            email.includes(keyword) ||
            address.includes(keyword)
        );
    });

    renderCustomers(filtered);
}

function searchCustomer() {
    filterCustomer();
}

function openCustomerForm() {
    editingCustomerId = null;

    const form = document.getElementById("customerForm");
    if (form) form.reset();

    const title = document.getElementById("customerFormTitle");
    if (title) title.textContent = "Thêm khách hàng";

    const modal = document.getElementById("customerModal");
    if (modal) modal.style.display = "flex";
}

function closeCustomerForm() {
    const modal = document.getElementById("customerModal");
    if (modal) modal.style.display = "none";

    const form = document.getElementById("customerForm");
    if (form) form.reset();

    editingCustomerId = null;
}

async function editCustomer(id) {
    try {
        const customer = await customerRequest(`${CUSTOMER_API}/${id}`);

        if (!customer) {
            throw new Error("Không tìm thấy thông tin khách hàng.");
        }

        editingCustomerId = id;

        const nameInput = document.getElementById("customerName");
        const phoneInput = document.getElementById("customerPhone");
        const identityInput = document.getElementById("customerIdentityNumber");
        const emailInput = document.getElementById("customerEmail");
        const addressInput = document.getElementById("customerAddress");

        if (nameInput) nameInput.value = customer.fullName || "";
        if (phoneInput) phoneInput.value = customer.phone || "";
        if (identityInput) identityInput.value = customer.identityNumber || "";
        if (emailInput) emailInput.value = customer.email || "";
        if (addressInput) addressInput.value = customer.address || "";

        const title = document.getElementById("customerFormTitle");
        if (title) title.textContent = "Sửa thông tin khách hàng";

        const modal = document.getElementById("customerModal");
        if (modal) modal.style.display = "flex";
    } catch (error) {
        alert("Không thể tải thông tin khách hàng: " + error.message);
    }
}

async function saveCustomer(event) {
    event.preventDefault();

    const nameInput = document.getElementById("customerName");
    const phoneInput = document.getElementById("customerPhone");
    const identityInput = document.getElementById("customerIdentityNumber");
    const emailInput = document.getElementById("customerEmail");
    const addressInput = document.getElementById("customerAddress");

    const fullName = (nameInput ? nameInput.value : "").trim();
    const phone = (phoneInput ? phoneInput.value : "").trim();
    const identityNumber = (identityInput ? identityInput.value : "").trim();
    const email = (emailInput ? emailInput.value : "").trim();
    const address = (addressInput ? addressInput.value : "").trim();

    if (!fullName) {
        alert("Vui lòng nhập họ và tên khách hàng.");
        if (nameInput) nameInput.focus();
        return;
    }

    const payload = {
        fullName,
        phone: phone || null,
        identityNumber: identityNumber || null,
        email: email || null,
        address: address || null
    };

    const isEditing = editingCustomerId !== null;
    const url = isEditing
        ? `${CUSTOMER_API}/${editingCustomerId}`
        : CUSTOMER_API;

    if (isEditing) {
        payload.id = editingCustomerId;
    }

    const saveBtn = document.getElementById("btnSaveCustomer");
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = "Đang lưu...";
    }

    try {
        await customerRequest(url, {
            method: isEditing ? "PUT" : "POST",
            body: JSON.stringify(payload)
        });

        alert(isEditing
            ? "Cập nhật thông tin khách hàng thành công!"
            : "Thêm khách hàng mới thành công!");

        closeCustomerForm();
        await loadCustomers();
    } catch (error) {
        alert("Không thể lưu khách hàng: " + error.message);
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = "Lưu khách hàng";
        }
    }
}

async function deleteCustomer(id) {
    if (!confirm("Bạn có chắc chắn muốn xóa khách hàng này?")) return;

    try {
        await customerRequest(`${CUSTOMER_API}/${id}`, {
            method: "DELETE"
        });

        alert("Xóa khách hàng thành công!");
        await loadCustomers();
    } catch (error) {
        alert("Không thể xóa khách hàng: " + error.message);
    }
}

// Gán hàm vào window để các thuộc tính onclick trong HTML luôn gọi được
window.openCustomerForm = openCustomerForm;
window.closeCustomerForm = closeCustomerForm;
window.editCustomer = editCustomer;
window.deleteCustomer = deleteCustomer;
window.searchCustomer = searchCustomer;
window.filterCustomer = filterCustomer;
