"use strict";

function getCalendarApiUrl() {
    if (typeof API_BASE_URL !== "undefined" && API_BASE_URL) {
        return `${API_BASE_URL}/RoomCalendar`;
    }
    if (window.location.protocol.startsWith("http")) {
        return `${window.location.origin}/api/RoomCalendar`;
    }
    return "http://localhost:5054/api/RoomCalendar";
}

const CALENDAR_API = getCalendarApiUrl();

let cachedRooms = [];
let cachedRoomTypes = [];
let cachedGuests = [];
let lastCalendarData = null;

const ROOM_STATUS_LABELS = {
    0: "Trống",
    1: "Đang sử dụng",
    2: "Bảo trì",
    Trong: "Trống",
    DangSuDung: "Đang sử dụng",
    BaoTri: "Bảo trì"
};

const RESERVATION_STATUS_LABELS = {
    0: "Chờ xác nhận",
    1: "Đã xác nhận",
    2: "Đã hủy",
    3: "Đã check-in",
    4: "Đã check-out",
    ChoXacNhan: "Chờ xác nhận",
    DaXacNhan: "Đã xác nhận",
    DaHuy: "Đã hủy",
    DaCheckIn: "Đã check-in",
    DaCheckOut: "Đã check-out"
};

document.addEventListener("DOMContentLoaded", async () => {
    initDefaultDates();

    const statusFilter = document.getElementById("roomStatusFilter");
    if (statusFilter) {
        statusFilter.addEventListener("change", applyFilter);
    }

    try {
        await preloadMetadata();
        await searchRoomCalendar();
    } catch (err) {
        console.error("Lỗi khởi tạo lịch phòng:", err);
    }
});

function initDefaultDates() {
    const today = new Date();
    // Đầu tháng hiện tại
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    // Cuối tháng hiện tại
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const startInput = document.getElementById("startDate");
    const endInput = document.getElementById("endDate");

    if (startInput) startInput.value = formatDateForInput(firstDay);
    if (endInput) endInput.value = formatDateForInput(lastDay);
}

function formatDateForInput(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

function formatDisplayDate(val) {
    if (!val) return "—";
    const str = String(val);
    if (str.length >= 10) {
        const parts = str.substring(0, 10).split("-");
        if (parts.length === 3) {
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
    }
    return str;
}

function getToken() {
    return localStorage.getItem("token");
}

async function apiCalendarFetch(url) {
    const token = getToken();
    if (!token) {
        alert("Bạn chưa đăng nhập. Vui lòng đăng nhập lại.");
        window.location.href = "dangnhap.html";
        throw new Error("Chưa có token.");
    }

    const response = await fetch(url, {
        headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`
        }
    });

    if (response.status === 401) {
        throw new Error("Phiên đăng nhập hết hạn.");
    }

    if (!response.ok) {
        let msg = `Lỗi máy chủ (${response.status})`;
        try {
            const data = await response.json();
            msg = data.message || msg;
        } catch {}
        throw new Error(msg);
    }

    return response.json();
}

async function preloadMetadata() {
    const base = typeof API_BASE_URL !== "undefined" ? API_BASE_URL : `${window.location.origin}/api`;

    const [roomsRes, typesRes, guestsRes] = await Promise.all([
        apiCalendarFetch(`${base}/Room?page=1&pageSize=100`).catch(() => []),
        apiCalendarFetch(`${base}/RoomType?page=1&pageSize=100`).catch(() => []),
        apiCalendarFetch(`${base}/Guest?page=1&pageSize=100`).catch(() => [])
    ]);

    cachedRooms = Array.isArray(roomsRes) ? roomsRes : (roomsRes.data || []);
    cachedRoomTypes = Array.isArray(typesRes) ? typesRes : (typesRes.data || []);
    cachedGuests = Array.isArray(guestsRes) ? guestsRes : (guestsRes.data || []);
}

function getRoomTypeName(roomId) {
    const room = cachedRooms.find(r => (r.id || r.Id) === roomId);
    if (!room) return "Tiêu chuẩn";

    const typeId = room.roomTypeId || room.RoomTypeId;
    const type = cachedRoomTypes.find(t => (t.id || t.Id) === typeId);
    return type ? (type.name || type.typeName || "Tiêu chuẩn") : "Tiêu chuẩn";
}

function getGuestName(guestId) {
    if (!guestId) return "—";
    const guest = cachedGuests.find(g => (g.id || g.Id) === guestId);
    return guest ? (guest.fullName || guest.FullName || `Khách #${guestId}`) : `Khách #${guestId}`;
}

async function searchRoomCalendar() {
    const startInput = document.getElementById("startDate");
    const endInput = document.getElementById("endDate");

    const startDate = startInput ? startInput.value : "";
    const endDate = endInput ? endInput.value : "";

    if (!startDate || !endDate) {
        alert("Vui lòng chọn ngày bắt đầu và ngày kết thúc.");
        return;
    }

    if (endDate < startDate) {
        alert("Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu.");
        return;
    }

    const tbody = document.getElementById("roomCalendarBody");
    if (tbody) {
        tbody.innerHTML =
            '<tr><td colspan="7" style="text-align:center; color:#6b7280; padding:20px;">Đang tải dữ liệu lịch phòng...</td></tr>';
    }

    try {
        const result = await apiCalendarFetch(
            `${CALENDAR_API}?fromDate=${startDate}&toDate=${endDate}`
        );

        lastCalendarData = result;

        const msg = document.getElementById("calendarMessage");
        if (msg) {
            msg.textContent = `Lịch phòng từ ngày ${formatDisplayDate(startDate)} đến ngày ${formatDisplayDate(endDate)}`;
        }

        applyFilter();
    } catch (error) {
        console.error("Lỗi tra cứu lịch phòng:", error);
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align:center; color:#dc2626; padding:20px;">
                        ${error.message}
                    </td>
                </tr>`;
        }
    }
}

function applyFilter() {
    if (!lastCalendarData || !Array.isArray(lastCalendarData.rooms)) return;

    const filterStatus = document.getElementById("roomStatusFilter")?.value || "";

    let rooms = lastCalendarData.rooms;

    if (filterStatus) {
        rooms = rooms.filter(r => {
            const st = String(r.roomStatus || "");
            if (filterStatus === "Trong") return st === "Trong" || st === "0";
            if (filterStatus === "DangSuDung") return st === "DangSuDung" || st === "1";
            if (filterStatus === "BaoTri") return st === "BaoTri" || st === "2";
            return st === filterStatus;
        });
    }

    renderCalendar(rooms);
}

function renderCalendar(rooms) {
    const tbody = document.getElementById("roomCalendarBody");
    if (!tbody) return;

    if (!rooms.length) {
        tbody.innerHTML =
            '<tr><td colspan="7" style="text-align:center; color:#6b7280; padding:20px;">Không tìm thấy phòng nào phù hợp điều kiện lọc.</td></tr>';
        return;
    }

    const rowsHtml = [];

    rooms.forEach(room => {
        const roomNum = room.roomNumber || `Phòng #${room.roomId}`;
        const typeName = getRoomTypeName(room.roomId);
        const rawRoomStatus = room.roomStatus;
        const roomStatusText = ROOM_STATUS_LABELS[rawRoomStatus] || String(rawRoomStatus || "Trống");

        let roomStatusBadge = "";
        if (roomStatusText === "Trống") {
            roomStatusBadge = `<span style="display:inline-block; padding:3px 8px; border-radius:12px; font-size:12px; font-weight:600; background:#dcfce7; color:#15803d;">Trống</span>`;
        } else if (roomStatusText === "Đang sử dụng") {
            roomStatusBadge = `<span style="display:inline-block; padding:3px 8px; border-radius:12px; font-size:12px; font-weight:600; background:#dbeafe; color:#1d4ed8;">Đang sử dụng</span>`;
        } else {
            roomStatusBadge = `<span style="display:inline-block; padding:3px 8px; border-radius:12px; font-size:12px; font-weight:600; background:#fee2e2; color:#b91c1c;">Bảo trì</span>`;
        }

        const reservations = Array.isArray(room.reservations) ? room.reservations : [];

        if (reservations.length === 0) {
            rowsHtml.push(`
                <tr>
                    <td><strong>Phòng ${roomNum}</strong></td>
                    <td>${typeName}</td>
                    <td>${roomStatusBadge}</td>
                    <td colspan="4" style="color: #9ca3af; font-style: italic;">Chưa có đặt phòng trong khoảng thời gian này</td>
                </tr>
            `);
        } else {
            reservations.forEach((res, idx) => {
                const code = res.reservationCode || `#${res.reservationId}`;
                const guest = getGuestName(res.guestId);
                const period = `${formatDisplayDate(res.checkInDate)} → ${formatDisplayDate(res.checkOutDate)}`;
                const st = RESERVATION_STATUS_LABELS[res.status] || String(res.status || "—");

                let resBadge = "";
                if (st === "Đã check-in") {
                    resBadge = `<span style="display:inline-block; padding:3px 8px; border-radius:12px; font-size:12px; font-weight:600; background:#dbeafe; color:#1d4ed8;">Đã check-in</span>`;
                } else if (st === "Đã check-out") {
                    resBadge = `<span style="display:inline-block; padding:3px 8px; border-radius:12px; font-size:12px; font-weight:600; background:#f3f4f6; color:#4b5563;">Đã check-out</span>`;
                } else if (st === "Đã xác nhận") {
                    resBadge = `<span style="display:inline-block; padding:3px 8px; border-radius:12px; font-size:12px; font-weight:600; background:#fef3c7; color:#b45309;">Đã xác nhận</span>`;
                } else {
                    resBadge = `<span style="display:inline-block; padding:3px 8px; border-radius:12px; font-size:12px; font-weight:600; background:#fef9c3; color:#854d0e;">${st}</span>`;
                }

                if (idx === 0) {
                    rowsHtml.push(`
                        <tr>
                            <td rowspan="${reservations.length}"><strong>Phòng ${roomNum}</strong></td>
                            <td rowspan="${reservations.length}">${typeName}</td>
                            <td rowspan="${reservations.length}">${roomStatusBadge}</td>
                            <td><strong style="color:#2563eb;">${code}</strong></td>
                            <td>${guest}</td>
                            <td>${period}</td>
                            <td>${resBadge}</td>
                        </tr>
                    `);
                } else {
                    rowsHtml.push(`
                        <tr>
                            <td><strong style="color:#2563eb;">${code}</strong></td>
                            <td>${guest}</td>
                            <td>${period}</td>
                            <td>${resBadge}</td>
                        </tr>
                    `);
                }
            });
        }
    });

    tbody.innerHTML = rowsHtml.join("");
}

function resetCalendarFilter() {
    const today = new Date();
    const startInput = document.getElementById("startDate");
    const endInput = document.getElementById("endDate");
    const statusSelect = document.getElementById("roomStatusFilter");

    if (startInput) startInput.value = formatDateForInput(today);
    if (endInput) endInput.value = formatDateForInput(new Date(Date.now() + 7 * 86400000));
    if (statusSelect) statusSelect.value = "";

    searchRoomCalendar();
}

// Window exports
window.searchRoomCalendar = searchRoomCalendar;
window.resetCalendarFilter = resetCalendarFilter;
window.applyFilter = applyFilter;
