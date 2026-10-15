
"use strict";

const ROOM_TYPE_API_URL = "https://localhost:44365/api/RoomType";

let roomTypes = [];
let editingId = null;

// ========================================
// KHỞI TẠO
// ========================================

document.addEventListener("DOMContentLoaded", async function () {
    document
        .getElementById("formLoaiPhong")
        .addEventListener("submit", saveRoomType);

    await loadRoomTypes();
});

// ========================================
// GỌI API CÓ JWT
// ========================================

function getHeaders() {
    const headers = {
        "Content-Type": "application/json"
    };

    const token = localStorage.getItem("token");

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    return headers;
}

async function apiRequest(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            ...getHeaders(),
            ...(options.headers || {})
        }
    });

    if (response.status === 401) {
        throw new Error("Bạn chưa đăng nhập hoặc phiên đăng nhập hết hạn.");
    }

    if (response.status === 403) {
        throw new Error("Tài khoản không có quyền thực hiện thao tác này.");
    }

    if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `Lỗi API: ${response.status}`);
    }

    if (response.status === 204) {
        return null;
    }

    const contentType = response.headers.get("content-type");

    if (contentType && contentType.includes("application/json")) {
        return await response.json();
    }

    return null;
}

function extractData(result) {
    if (Array.isArray(result)) return result;
    if (result && Array.isArray(result.data)) return result.data;
    return [];
}

// ========================================
// HỖ TRỢ ĐỌC TRƯỜNG DỮ LIỆU
// ========================================

function getId(item) {
    return item.id ?? item.Id;
}

function getName(item) {
    return item.name ??
        item.Name ??
        item.roomTypeName ??
        item.RoomTypeName ??
        "";
}

function getDescription(item) {
    return item.description ??
        item.Description ??
        "";
}

function getBasePrice(item) {
    return item.basePrice ??
        item.BasePrice ??
        item.price ??
        item.Price ??
        0;
}

// ========================================
// TẢI DANH SÁCH LOẠI PHÒNG
// ========================================

async function loadRoomTypes() {
    const table = document.getElementById("roomTypeTable");

    table.innerHTML = `
        <tr>
            <td colspan="5">Đang tải dữ liệu...</td>
        </tr>
    `;

    try {
        const result = await apiRequest(ROOM_TYPE_API_URL);

        roomTypes = extractData(result);

        renderRoomTypes();
    } catch (error) {
        console.error("Lỗi tải loại phòng:", error);

        table.innerHTML = `
            <tr>
                <td colspan="5">Không tải được danh sách loại phòng.</td>
            </tr>
        `;

        alert("Không thể tải loại phòng:\n" + error.message);
    }
}

// ========================================
// HIỂN THỊ DANH SÁCH
// ========================================

function renderRoomTypes() {
    const table = document.getElementById("roomTypeTable");

    table.innerHTML = "";

    if (roomTypes.length === 0) {
        table.innerHTML = `
            <tr>
                <td colspan="5">Chưa có loại phòng nào.</td>
            </tr>
        `;
        return;
    }

    roomTypes.forEach((type, index) => {
        const row = document.createElement("tr");

        const values = [
            index + 1,
            getName(type),
            getDescription(type),
            Number(getBasePrice(type)).toLocaleString("vi-VN") + " VNĐ"
        ];

        values.forEach(value => {
            const cell = document.createElement("td");
            cell.textContent = value ?? "";
            row.appendChild(cell);
        });

        const actions = document.createElement("td");

        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.className = "btn-edit";
        editButton.textContent = "Sửa";
        editButton.addEventListener("click", () => editRoomType(getId(type)));

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "btn-delete";
        deleteButton.textContent = "Xóa";
        deleteButton.addEventListener("click", () => deleteRoomType(getId(type)));

        actions.append(editButton, deleteButton);
        row.appendChild(actions);

        table.appendChild(row);
    });
}

// ========================================
// MỞ FORM THÊM
// ========================================

function openForm() {
    editingId = null;

    document.getElementById("roomTypeForm").style.display = "block";
    document.getElementById("formTitle").textContent = "Thêm loại phòng";
    document.getElementById("formLoaiPhong").reset();
}

// ========================================
// ĐÓNG FORM
// ========================================

function closeForm() {
    document.getElementById("roomTypeForm").style.display = "none";
    document.getElementById("formLoaiPhong").reset();
    editingId = null;
}

// ========================================
// SỬA LOẠI PHÒNG
// ========================================

function editRoomType(id) {
    const type = roomTypes.find(
        item => Number(getId(item)) === Number(id)
    );

    if (!type) {
        alert("Không tìm thấy loại phòng.");
        return;
    }

    editingId = id;

    document.getElementById("roomTypeForm").style.display = "block";
    document.getElementById("formTitle").textContent = "Sửa loại phòng";

    document.getElementById("roomTypeName").value = getName(type);
    document.getElementById("basePrice").value = getBasePrice(type);
    document.getElementById("description").value = getDescription(type);
}

// ========================================
// THÊM / CẬP NHẬT LOẠI PHÒNG
// ========================================

async function saveRoomType(event) {
    event.preventDefault();

    const name = document.getElementById("roomTypeName").value.trim();
    const basePrice = Number(document.getElementById("basePrice").value);
    const description = document.getElementById("description").value.trim();

    if (!name) {
        alert("Vui lòng nhập tên loại phòng.");
        return;
    }

    if (!Number.isFinite(basePrice) || basePrice < 0) {
        alert("Giá cơ bản không hợp lệ.");
        return;
    }

    // Tên trường cần khớp với model RoomType của Backend.
    const data = {
        name: name,
        basePrice: basePrice,
        description: description
    };

    try {
        const isEditing = editingId !== null;

        const url = isEditing
            ? `${ROOM_TYPE_API_URL}/${editingId}`
            : ROOM_TYPE_API_URL;

        await apiRequest(url, {
            method: isEditing ? "PUT" : "POST",
            body: JSON.stringify(data)
        });

        alert(
            isEditing
                ? "Cập nhật loại phòng thành công!"
                : "Thêm loại phòng thành công!"
        );

        closeForm();
        await loadRoomTypes();
    } catch (error) {
        console.error("Lỗi lưu loại phòng:", error);

        alert(
            "Không thể lưu loại phòng.\n" +
            "Hãy kiểm tra endpoint và tên trường của Backend.\n" +
            error.message
        );
    }
}

// ========================================
// XÓA LOẠI PHÒNG
// ========================================

async function deleteRoomType(id) {
    const confirmed = confirm(
        "Bạn có chắc muốn xóa loại phòng này?"
    );

    if (!confirmed) return;

    try {
        await apiRequest(`${ROOM_TYPE_API_URL}/${id}`, {
            method: "DELETE"
        });

        alert("Xóa loại phòng thành công!");
        await loadRoomTypes();
    } catch (error) {
        console.error("Lỗi xóa loại phòng:", error);

        alert(
            "Không thể xóa loại phòng.\n" +
            "Loại phòng có thể đang được phòng khác sử dụng, " +
            "hoặc endpoint xóa chưa đúng.\n" +
            error.message
        );
    }
}
