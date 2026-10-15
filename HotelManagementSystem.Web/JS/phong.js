
"use strict";

const ROOM_API_URL = "https://localhost:44365/api/Room";
const ROOM_TYPE_API_URL = "https://localhost:44365/api/RoomType";

let rooms = [];
let roomTypes = [];
let editingRoomId = null;

// ========================================
// KHỞI TẠO
// ========================================

document.addEventListener("DOMContentLoaded", async function () {
    const roomForm = document.getElementById("roomForm");

    roomForm.addEventListener("submit", saveRoom);

    document.getElementById("filterStatus")
        .addEventListener("change", renderRooms);

    await loadRoomTypes();
    await loadRooms();
});

// ========================================
// HEADERS VÀ GỌI API
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
        throw new Error(
            "Phiên đăng nhập hết hạn hoặc chưa đăng nhập."
        );
    }

    if (response.status === 403) {
        throw new Error(
            "Tài khoản không có quyền thực hiện thao tác này."
        );
    }

    if (!response.ok) {
        const message = await response.text();

        throw new Error(
            message || `Lỗi API: ${response.status}`
        );
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

// API có thể trả về mảng trực tiếp hoặc object chứa data
function extractData(result) {
    if (Array.isArray(result)) {
        return result;
    }

    if (result && Array.isArray(result.data)) {
        return result.data;
    }

    return [];
}

// ========================================
// TẢI LOẠI PHÒNG
// ========================================

async function loadRoomTypes() {
    const select = document.getElementById("roomType");

    try {
        const result = await apiRequest(ROOM_TYPE_API_URL);

        roomTypes = extractData(result);

        select.innerHTML = "";

        const defaultOption = document.createElement("option");
        defaultOption.value = "";
        defaultOption.textContent = "Chọn loại phòng";
        select.appendChild(defaultOption);

        roomTypes.forEach(type => {
            const option = document.createElement("option");

            option.value = type.id ?? type.Id;
            option.textContent =
                type.name ??
                type.Name ??
                type.roomTypeName ??
                type.RoomTypeName ??
                `Loại phòng ${option.value}`;

            select.appendChild(option);
        });
    } catch (error) {
        console.error("Lỗi tải loại phòng:", error);

        alert(
            "Không tải được danh sách loại phòng: " +
            error.message
        );
    }
}

// ========================================
// TẢI DANH SÁCH PHÒNG
// ========================================

async function loadRooms() {
    const tableBody = document.getElementById("roomTableBody");

    tableBody.innerHTML = `
        <tr>
            <td colspan="6">Đang tải dữ liệu...</td>
        </tr>
    `;

    try {
        const result = await apiRequest(
            `${ROOM_API_URL}?page=1&pageSize=100&sortBy=RoomNumber&sortOrder=asc`
        );

        rooms = extractData(result);

        renderRooms();
    } catch (error) {
        console.error("Lỗi tải phòng:", error);

        tableBody.innerHTML = `
            <tr>
                <td colspan="6">Không tải được danh sách phòng.</td>
            </tr>
        `;

        alert("Không tải được danh sách phòng: " + error.message);
    }
}

// ========================================
// HIỂN THỊ DANH SÁCH
// ========================================

function getRoomTypeName(roomTypeId) {
    const type = roomTypes.find(item =>
        Number(item.id ?? item.Id) === Number(roomTypeId)
    );

    if (!type) {
        return "Không xác định";
    }

    return type.name ??
        type.Name ??
        type.roomTypeName ??
        type.RoomTypeName ??
        "Không xác định";
}

function getRoomStatus(status) {
    const value = Number(status);

    if (value === 0) {
        return { text: "Trống", css: "available" };
    }

    if (value === 1) {
        return { text: "Đang sử dụng", css: "using" };
    }

    if (value === 2) {
        return { text: "Bảo trì", css: "maintenance" };
    }

    return { text: "Không xác định", css: "" };
}

function renderRooms() {
    const tableBody = document.getElementById("roomTableBody");
    const keyword = document.getElementById("searchRoom")
        .value.trim().toLowerCase();

    const statusFilter = document.getElementById("filterStatus").value;

    const filteredRooms = rooms.filter(room => {
        const roomNumber = String(
            room.roomNumber ?? room.RoomNumber ?? ""
        ).toLowerCase();

        const matchesKeyword = roomNumber.includes(keyword);

        const matchesStatus =
            statusFilter === "" ||
            Number(room.status ?? room.Status) ===
                ({
                    Trong: 0,
                    DangSuDung: 1,
                    BaoTri: 2
                }[statusFilter]);

        return matchesKeyword && matchesStatus;
    });

    tableBody.innerHTML = "";

    if (filteredRooms.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6">Không có phòng phù hợp.</td>
            </tr>
        `;
        return;
    }

    filteredRooms.forEach(room => {
        const id = room.id ?? room.Id;
        const roomNumber = room.roomNumber ?? room.RoomNumber ?? "";
        const roomTypeId = room.roomTypeId ?? room.RoomTypeId;
        const status = getRoomStatus(room.status ?? room.Status);

        const row = document.createElement("tr");

        const values = [
            id,
            roomNumber,
            getRoomTypeName(roomTypeId),
            "-", // API hiện tại chưa trả về tầng
        ];

        values.forEach(value => {
            const cell = document.createElement("td");
            cell.textContent = value ?? "";
            row.appendChild(cell);
        });

        const statusCell = document.createElement("td");
        const statusSpan = document.createElement("span");

        statusSpan.className = `status ${status.css}`;
        statusSpan.textContent = status.text;
        statusCell.appendChild(statusSpan);
        row.appendChild(statusCell);

        const actionCell = document.createElement("td");

        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.className = "btn-edit";
        editButton.textContent = "Sửa";
        editButton.addEventListener("click", () => editRoom(id));

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "btn-delete";
        deleteButton.textContent = "Xóa";
        deleteButton.addEventListener("click", () => deleteRoom(id));

        actionCell.append(editButton, deleteButton);
        row.appendChild(actionCell);

        tableBody.appendChild(row);
    });
}

// ========================================
// THÊM / SỬA PHÒNG
// ========================================

async function saveRoom(event) {
    event.preventDefault();

    const roomNumber = document.getElementById("roomNumber")
        .value.trim();

    const roomTypeId = Number(
        document.getElementById("roomType").value
    );

    const statusValue = document.getElementById("roomStatus").value;

    const status = {
        Trong: 0,
        DangSuDung: 1,
        BaoTri: 2
    }[statusValue];

    if (!roomNumber) {
        alert("Vui lòng nhập số phòng.");
        return;
    }

    if (!roomTypeId) {
        alert("Vui lòng chọn loại phòng.");
        return;
    }

    const roomData = {
        roomNumber,
        roomTypeId,
        status
    };

    try {
        const isEditing = editingRoomId !== null;

        const url = isEditing
            ? `${ROOM_API_URL}/${editingRoomId}`
            : ROOM_API_URL;

        await apiRequest(url, {
            method: isEditing ? "PUT" : "POST",
            body: JSON.stringify(roomData)
        });

        alert(isEditing
            ? "Cập nhật phòng thành công!"
            : "Thêm phòng thành công!");

        closeRoomForm();
        document.getElementById("roomForm").reset();

        editingRoomId = null;

        await loadRooms();
    } catch (error) {
        console.error("Lỗi lưu phòng:", error);

        alert(
            "Không thể lưu phòng. Kiểm tra endpoint API và dữ liệu gửi lên.\n" +
            error.message
        );
    }
}

// ========================================
// MỞ FORM SỬA
// ========================================

function editRoom(id) {
    const room = rooms.find(item =>
        Number(item.id ?? item.Id) === Number(id)
    );

    if (!room) {
        alert("Không tìm thấy phòng.");
        return;
    }

    editingRoomId = id;

    document.getElementById("roomNumber").value =
        room.roomNumber ?? room.RoomNumber ?? "";

    document.getElementById("roomType").value =
        room.roomTypeId ?? room.RoomTypeId ?? "";

    const status = Number(room.status ?? room.Status);

    document.getElementById("roomStatus").value = ({
        0: "Trong",
        1: "DangSuDung",
        2: "BaoTri"
    })[status] ?? "Trong";

    document.querySelector("#roomModal h2").textContent =
        "Cập nhật phòng";

    document.querySelector(
        '#roomForm button[type="submit"]'
    ).textContent = "Lưu thay đổi";

    openRoomForm();
}

// ========================================
// XÓA PHÒNG
// ========================================

async function deleteRoom(id) {
    const confirmed = confirm(
        "Bạn có chắc muốn xóa phòng này không?"
    );

    if (!confirmed) {
        return;
    }

    try {
        await apiRequest(`${ROOM_API_URL}/${id}`, {
            method: "DELETE"
        });

        alert("Xóa phòng thành công!");

        await loadRooms();
    } catch (error) {
        console.error("Lỗi xóa phòng:", error);

        alert(
            "Không thể xóa phòng. Có thể endpoint chưa hỗ trợ " +
            "hoặc phòng đang được sử dụng.\n" +
            error.message
        );
    }
}

// ========================================
// MỞ / ĐÓNG FORM
// ========================================

function openRoomForm() {
    document.getElementById("roomModal").style.display = "flex";
}

function closeRoomForm() {
    document.getElementById("roomModal").style.display = "none";

    editingRoomId = null;

    document.getElementById("roomForm").reset();

    document.querySelector("#roomModal h2").textContent =
        "Thêm phòng";

    document.querySelector(
        '#roomForm button[type="submit"]'
    ).textContent = "Lưu phòng";
}

// ========================================
// TÌM KIẾM
// ========================================

function searchRoom() {
    renderRooms();
}
