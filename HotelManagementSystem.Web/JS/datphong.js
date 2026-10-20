"use strict";

function getBookingApiOrigin() {
    if (typeof API_BASE_URL !== "undefined" && API_BASE_URL) {
        return API_BASE_URL;
    }
    if (window.location.protocol.startsWith("http")) {
        return `${window.location.origin}/api`;
    }
    return "http://localhost:5054/api";
}

const API_BASE = getBookingApiOrigin();
const RESERVATION_API = `${API_BASE}/Reservation`;
const GUEST_API = `${API_BASE}/Guest`;
const ROOM_API = `${API_BASE}/Room`;
const RESERVATION_ROOM_API = `${API_BASE}/ReservationRoom`;

let allBookings = [];
let allGuests = [];
let allRooms = [];
let allReservationRooms = [];
let editingBookingId = null;

const STATUS_TEXT = {
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

document.addEventListener("DOMContentLoaded", initBookingPage);

function initBookingPage() {
    const bookingForm = document.getElementById("bookingForm");
    if (bookingForm) {
        bookingForm.addEventListener("submit", saveBooking);
    }

    const searchInput = document.getElementById("searchBooking");
    if (searchInput) {
        searchInput.addEventListener("input", applyBookingFilters);
    }

    const statusFilter = document.getElementById("bookingStatus");
    if (statusFilter) {
        statusFilter.addEventListener("change", applyBookingFilters);
    }

    loadBookings();
}

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
        throw new Error("Tài khoản không có quyền thực hiện chức năng này.");
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
            `Yêu cầu thất bại (${response.status})`;

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

function formatDate(value) {
    if (!value) return "—";
    return String(value).substring(0, 10);
}

function statusLabel(value) {
    return STATUS_TEXT[value] ?? String(value ?? "Không xác định");
}

function statusClass(value) {
    const status = Number(value);
    if (status === 0 || value === "ChoXacNhan") return "booking-pending";
    if (status === 1 || value === "DaXacNhan") return "booking-confirmed";
    if (status === 2 || value === "DaHuy") return "booking-cancelled";
    if (status === 3 || value === "DaCheckIn") return "booking-checkin";
    if (status === 4 || value === "DaCheckOut") return "booking-checkout";
    return "";
}

function guestName(guestId) {
    const guest = allGuests.find(item =>
        Number(getValue(item, "id", "Id")) === Number(guestId)
    );

    return guest
        ? getValue(guest, "fullName", "FullName") || `Khách #${guestId}`
        : `Khách #${guestId ?? "?"}`;
}

function roomName(bookingId) {
    const links = allReservationRooms.filter(item =>
        Number(getValue(item, "reservationId", "ReservationId")) === Number(bookingId)
    );

    if (!links.length) return "Chưa gán phòng";

    return links.map(link => {
        const roomId = getValue(link, "roomId", "RoomId");
        const room = allRooms.find(item =>
            Number(getValue(item, "id", "Id")) === Number(roomId)
        );
        return room
            ? (getValue(room, "roomNumber", "RoomNumber") ? `Phòng ${getValue(room, "roomNumber", "RoomNumber")}` : `Phòng #${roomId}`)
            : `Phòng #${roomId}`;
    }).join(", ");
}

function populateDropdowns() {
    const customerSelect = document.getElementById("bookingCustomer");
    if (customerSelect) {
        const currentVal = customerSelect.value;
        customerSelect.innerHTML = '<option value="">-- Chọn khách hàng --</option>' +
            allGuests.map(g => {
                const id = getValue(g, "id", "Id");
                const name = getValue(g, "fullName", "FullName") || `Khách #${id}`;
                const phone = getValue(g, "phone", "Phone") || "";
                return `<option value="${id}">${escapeHtml(name)}${phone ? ` (${phone})` : ""}</option>`;
            }).join("");
        if (currentVal) customerSelect.value = currentVal;
    }

    const roomSelect = document.getElementById("bookingRoom");
    if (roomSelect) {
        const currentVal = roomSelect.value;
        roomSelect.innerHTML = '<option value="">-- Chưa gán phòng (chọn sau) --</option>' +
            allRooms.map(r => {
                const id = getValue(r, "id", "Id");
                const num = getValue(r, "roomNumber", "RoomNumber");
                const status = getValue(r, "status", "Status") || "";
                return `<option value="${id}">Phòng ${escapeHtml(num)}${status ? ` [${status}]` : ""}</option>`;
            }).join("");
        if (currentVal) roomSelect.value = currentVal;
    }
}

async function loadBookings() {
    const tbody = document.getElementById("bookingTableBody");
    if (tbody) {
        tbody.innerHTML =
            '<tr><td colspan="8" style="text-align: center; color: #6b7280;">Đang tải dữ liệu đặt phòng...</td></tr>';
    }

    try {
        const [bookingResult, guestResult, roomResult, reservationRoomResult] =
            await Promise.all([
                apiRequest(`${RESERVATION_API}?page=1&pageSize=100`),
                apiRequest(`${GUEST_API}?page=1&pageSize=100`),
                apiRequest(`${ROOM_API}?page=1&pageSize=100`),
                apiRequest(`${RESERVATION_ROOM_API}?page=1&pageSize=100`).catch(() => [])
            ]);

        allBookings = getList(bookingResult);
        allGuests = getList(guestResult);
        allRooms = getList(roomResult);
        allReservationRooms = getList(reservationRoomResult);

        populateDropdowns();
        renderBookings(allBookings);
    } catch (error) {
        console.error("Lỗi tải đặt phòng:", error);
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align:center; color:#dc2626;">
                        ${escapeHtml(error.message)}
                    </td>
                </tr>`;
        }
    }
}

function renderBookings(bookings) {
    const tbody = document.getElementById("bookingTableBody");
    if (!tbody) return;

    if (!bookings || !bookings.length) {
        tbody.innerHTML =
            '<tr><td colspan="8" style="text-align: center; color: #6b7280; padding: 20px;">Không có dữ liệu đặt phòng.</td></tr>';
        return;
    }

    tbody.innerHTML = bookings.map(booking => {
        const id = getValue(booking, "id", "Id");
        const code = getValue(booking, "reservationCode", "ReservationCode") ?? `#${id}`;
        const guestId = getValue(booking, "guestId", "GuestId");
        const status = getValue(booking, "status", "Status");

        const isCancelled = Number(status) === 2 || status === "DaHuy";
        const isCheckedOut = Number(status) === 4 || status === "DaCheckOut";
        const canCancel = !isCancelled && !isCheckedOut && Number(status) !== 3 && status !== "DaCheckIn";

        return `
            <tr>
                <td>${escapeHtml(id)}</td>
                <td><strong>${escapeHtml(code)}</strong></td>
                <td>${escapeHtml(guestName(guestId))}</td>
                <td>${escapeHtml(roomName(id))}</td>
                <td>${escapeHtml(formatDate(getValue(booking, "checkInDate", "CheckInDate")))}</td>
                <td>${escapeHtml(formatDate(getValue(booking, "checkOutDate", "CheckOutDate")))}</td>
                <td>
                    <span class="${statusClass(status)}">
                        ${escapeHtml(statusLabel(status))}
                    </span>
                </td>
                <td>
                    <button type="button"
                        class="btn-edit"
                        onclick="editBooking(${Number(id)})">
                        Sửa
                    </button>
                    ${canCancel ? `
                        <button type="button"
                            class="btn-delete"
                            onclick="cancelBooking(${Number(id)})">
                            Hủy
                        </button>` : ""}
                    <a href="phieutinhtien.html?reservationId=${Number(id)}"
                        class="btn-primary"
                        style="padding: 4px 8px; font-size: 12px; text-decoration: none; display: inline-block; border-radius: 4px; margin-left: 4px;">
                        Lập phiếu
                    </a>
                </td>
            </tr>`;
    }).join("");
}

function applyBookingFilters() {
    const searchInput = document.getElementById("searchBooking");
    const keyword = (searchInput ? searchInput.value : "").trim().toLocaleLowerCase("vi");

    const statusSelect = document.getElementById("bookingStatus");
    const selectedStatus = statusSelect ? statusSelect.value : "";

    const filtered = allBookings.filter(booking => {
        const code = String(getValue(booking, "reservationCode", "ReservationCode") ?? "").toLocaleLowerCase("vi");
        const guest = guestName(getValue(booking, "guestId", "GuestId")).toLocaleLowerCase("vi");
        const room = roomName(getValue(booking, "id", "Id")).toLocaleLowerCase("vi");

        const matchesKeyword =
            !keyword ||
            code.includes(keyword) ||
            guest.includes(keyword) ||
            room.includes(keyword);

        const rawStatus = getValue(booking, "status", "Status");
        const matchesStatus =
            selectedStatus === "" ||
            String(rawStatus) === selectedStatus ||
            statusLabel(rawStatus) === selectedStatus ||
            (selectedStatus === "0" && (rawStatus === 0 || rawStatus === "ChoXacNhan")) ||
            (selectedStatus === "1" && (rawStatus === 1 || rawStatus === "DaXacNhan")) ||
            (selectedStatus === "2" && (rawStatus === 2 || rawStatus === "DaHuy")) ||
            (selectedStatus === "3" && (rawStatus === 3 || rawStatus === "DaCheckIn")) ||
            (selectedStatus === "4" && (rawStatus === 4 || rawStatus === "DaCheckOut"));

        return matchesKeyword && matchesStatus;
    });

    renderBookings(filtered);
}

function searchBooking() {
    applyBookingFilters();
}

function filterBooking() {
    applyBookingFilters();
}

function openBookingForm() {
    editingBookingId = null;

    const form = document.getElementById("bookingForm");
    if (form) form.reset();

    const title = document.getElementById("bookingFormTitle");
    if (title) title.textContent = "Thêm đặt phòng";

    // Set default dates: check-in = today, check-out = tomorrow
    const today = new Date().toISOString().substring(0, 10);
    const tomorrow = new Date(Date.now() + 86400000).toISOString().substring(0, 10);

    const inDate = document.getElementById("checkInDate");
    const outDate = document.getElementById("checkOutDate");
    if (inDate) inDate.value = today;
    if (outDate) outDate.value = tomorrow;

    const statusSelect = document.getElementById("bookingStatusForm");
    if (statusSelect) statusSelect.value = "0";

    const modal = document.getElementById("bookingModal");
    if (modal) modal.style.display = "flex";
}

function closeBookingForm() {
    const modal = document.getElementById("bookingModal");
    if (modal) modal.style.display = "none";

    const form = document.getElementById("bookingForm");
    if (form) form.reset();

    editingBookingId = null;
}

async function editBooking(id) {
    try {
        const booking = await apiRequest(`${RESERVATION_API}/${id}`);
        if (!booking) throw new Error("Không tìm thấy thông tin đặt phòng.");

        editingBookingId = id;

        const title = document.getElementById("bookingFormTitle");
        if (title) title.textContent = "Sửa đặt phòng";

        const customerSelect = document.getElementById("bookingCustomer");
        if (customerSelect) {
            customerSelect.value = String(getValue(booking, "guestId", "GuestId") ?? "");
        }

        // Tìm phòng đã gán
        const link = allReservationRooms.find(item =>
            Number(getValue(item, "reservationId", "ReservationId")) === Number(id)
        );
        const roomSelect = document.getElementById("bookingRoom");
        if (roomSelect) {
            roomSelect.value = link ? String(getValue(link, "roomId", "RoomId")) : "";
        }

        const inDate = document.getElementById("checkInDate");
        const outDate = document.getElementById("checkOutDate");
        if (inDate) inDate.value = formatDate(getValue(booking, "checkInDate", "CheckInDate"));
        if (outDate) outDate.value = formatDate(getValue(booking, "checkOutDate", "CheckOutDate"));

        const rawStatus = getValue(booking, "status", "Status");
        const statusSelect = document.getElementById("bookingStatusForm");
        if (statusSelect) {
            let statusVal = "0";
            if (rawStatus === 1 || rawStatus === "DaXacNhan") statusVal = "1";
            else if (rawStatus === 2 || rawStatus === "DaHuy") statusVal = "2";
            else if (rawStatus === 3 || rawStatus === "DaCheckIn") statusVal = "3";
            else if (rawStatus === 4 || rawStatus === "DaCheckOut") statusVal = "4";
            statusSelect.value = statusVal;
        }

        const modal = document.getElementById("bookingModal");
        if (modal) modal.style.display = "flex";
    } catch (error) {
        alert(`Không thể tải thông tin đặt phòng: ${error.message}`);
    }
}

async function cancelBooking(id) {
    if (!confirm("Bạn có chắc chắn muốn hủy đặt phòng này?")) return;

    try {
        await apiRequest(`${RESERVATION_API}/${id}/cancel`, {
            method: "PUT"
        });

        alert("Đã hủy đặt phòng thành công.");
        await loadBookings();
    } catch (error) {
        alert(`Không thể hủy đặt phòng: ${error.message}`);
    }
}

async function saveBooking(event) {
    event.preventDefault();

    const customerSelect = document.getElementById("bookingCustomer");
    const roomSelect = document.getElementById("bookingRoom");
    const inDateInput = document.getElementById("checkInDate");
    const outDateInput = document.getElementById("checkOutDate");
    const statusSelect = document.getElementById("bookingStatusForm");

    const guestId = Number(customerSelect ? customerSelect.value : 0);
    const roomId = roomSelect && roomSelect.value ? Number(roomSelect.value) : null;
    const checkIn = inDateInput ? inDateInput.value : "";
    const checkOut = outDateInput ? outDateInput.value : "";
    const status = Number(statusSelect ? statusSelect.value : 0);

    if (!guestId || guestId <= 0) {
        alert("Vui lòng chọn khách hàng.");
        if (customerSelect) customerSelect.focus();
        return;
    }

    if (!checkIn || !checkOut) {
        alert("Vui lòng chọn ngày nhận và ngày trả phòng.");
        return;
    }

    if (checkOut <= checkIn) {
        alert("Ngày trả phòng phải sau ngày nhận phòng.");
        if (outDateInput) outDateInput.focus();
        return;
    }

    const isEditing = editingBookingId !== null;

    const payload = {
        guestId,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        status,
        numberOfGuests: 1,
        notes: ""
    };

    if (isEditing) {
        payload.id = editingBookingId;
        const currentBooking = allBookings.find(item =>
            Number(getValue(item, "id", "Id")) === editingBookingId
        );
        payload.reservationCode = getValue(currentBooking, "reservationCode", "ReservationCode") || `DP${editingBookingId}`;
    } else {
        payload.reservationCode = `DP${Date.now().toString().slice(-6)}`;
    }

    const saveBtn = document.getElementById("btnSaveBooking");
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = "Đang lưu...";
    }

    try {
        let savedReservation;

        if (isEditing) {
            savedReservation = await apiRequest(`${RESERVATION_API}/${editingBookingId}`, {
                method: "PUT",
                body: JSON.stringify(payload)
            });
        } else {
            savedReservation = await apiRequest(RESERVATION_API, {
                method: "POST",
                body: JSON.stringify(payload)
            });
        }

        const resId = isEditing
            ? editingBookingId
            : getValue(savedReservation, "id", "Id");

        // Nếu có chọn phòng, liên kết phòng với đơn đặt phòng
        if (roomId && resId) {
            try {
                // Kiểm tra xem đã có liên kết chưa
                const existingLink = allReservationRooms.find(item =>
                    Number(getValue(item, "reservationId", "ReservationId")) === Number(resId)
                );

                if (existingLink) {
                    const linkId = getValue(existingLink, "id", "Id");
                    await apiRequest(`${RESERVATION_ROOM_API}/${linkId}`, {
                        method: "PUT",
                        body: JSON.stringify({
                            id: linkId,
                            reservationId: resId,
                            roomId: roomId,
                            price: 0
                        })
                    }).catch(() => null);
                } else {
                    await apiRequest(RESERVATION_ROOM_API, {
                        method: "POST",
                        body: JSON.stringify({
                            reservationId: resId,
                            roomId: roomId,
                            price: 0
                        })
                    }).catch(() => null);
                }
            } catch (roomErr) {
                console.warn("Không thể gán phòng tự động:", roomErr);
            }
        }

        alert(isEditing ? "Cập nhật đặt phòng thành công!" : "Tạo đặt phòng mới thành công!");
        closeBookingForm();
        await loadBookings();
    } catch (error) {
        alert(`Không thể lưu đặt phòng: ${error.message}`);
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = "Lưu đặt phòng";
        }
    }
}

// Bắt sự kiện click ngoài modal để đóng
document.addEventListener("click", event => {
    const modal = document.getElementById("bookingModal");
    if (event.target === modal) {
        closeBookingForm();
    }
});

// Gán vào window để HTML onclick gọi được
window.openBookingForm = openBookingForm;
window.closeBookingForm = closeBookingForm;
window.editBooking = editBooking;
window.cancelBooking = cancelBooking;
window.searchBooking = searchBooking;
window.filterBooking = filterBooking;
