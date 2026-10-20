"use strict";

document.addEventListener("DOMContentLoaded", async () => {
    // 1. Kiểm tra trạng thái đăng nhập
    const token = getToken();
    if (!token) {
        alert("Vui lòng đăng nhập tài khoản khách hàng để tiếp tục.");
        window.location.href = "dangnhap.html";
        return;
    }

    // 2. Tải thông tin hồ sơ cá nhân của khách hàng
    await loadMyProfile();

    // 3. Tải danh sách đặt phòng của chính khách hàng
    await loadMyReservations();

    // 4. Tải danh sách phòng trống để khách xem và đặt
    await loadAvailableRooms();

    // 5. Gắn sự kiện submit cho form hồ sơ cá nhân
    const profileForm = document.getElementById("profileForm");
    if (profileForm) {
        profileForm.addEventListener("submit", updateMyProfile);
    }

    // 6. Gắn sự kiện submit cho modal đặt phòng trực tuyến
    const onlineBookingForm = document.getElementById("onlineBookingForm");
    if (onlineBookingForm) {
        onlineBookingForm.addEventListener("submit", submitOnlineBooking);
    }
});

// ==========================================
// 1. HỒ SƠ CÁ NHÂN CỦA KHÁCH HÀNG (GET & PUT /api/Guest/me)
// ==========================================
async function loadMyProfile() {
    try {
        const guest = await apiFetch("/Guest/me");
        if (!guest) return;

        const nameInput = document.getElementById("profileFullName");
        const phoneInput = document.getElementById("profilePhone");
        const emailInput = document.getElementById("profileEmail");
        const idInput = document.getElementById("profileIdentityNumber");
        const addressInput = document.getElementById("profileAddress");

        if (nameInput) nameInput.value = guest.fullName || guest.FullName || "";
        if (phoneInput) phoneInput.value = guest.phone || guest.Phone || "";
        if (emailInput) emailInput.value = guest.email || guest.Email || "";
        if (idInput) idInput.value = guest.identityNumber || guest.IdentityNumber || "";
        if (addressInput) addressInput.value = guest.address || guest.Address || "";

        const displayName = guest.fullName || guest.FullName || localStorage.getItem("fullName") || "Quý khách";
        const titleEl = document.getElementById("customerWelcomeTitle");
        if (titleEl) {
            titleEl.textContent = `Xin chào, ${displayName}`;
        }
    } catch (err) {
        console.warn("Không thể tải thông tin hồ sơ cá nhân:", err);
    }
}

async function updateMyProfile(e) {
    e.preventDefault();

    const fullName = document.getElementById("profileFullName").value.trim();
    const phone = document.getElementById("profilePhone").value.trim();
    const email = document.getElementById("profileEmail").value.trim() || null;
    const identityNumber = document.getElementById("profileIdentityNumber").value.trim() || null;
    const address = document.getElementById("profileAddress").value.trim() || null;

    if (!fullName) {
        alert("Họ và tên không được để trống.");
        return;
    }
    if (!phone) {
        alert("Số điện thoại không được để trống.");
        return;
    }

    const btn = document.getElementById("btnUpdateProfile");
    if (btn) {
        btn.disabled = true;
        btn.textContent = "Đang lưu...";
    }

    try {
        const result = await apiFetch("/Guest/me", {
            method: "PUT",
            body: JSON.stringify({
                fullName,
                phone,
                email,
                identityNumber,
                address
            })
        });

        alert("Cập nhật thông tin cá nhân thành công!");
        localStorage.setItem("fullName", fullName);

        const titleEl = document.getElementById("customerWelcomeTitle");
        if (titleEl) titleEl.textContent = `Xin chào, ${fullName}`;
    } catch (err) {
        console.error("Lỗi cập nhật hồ sơ:", err);
        alert(err.message || "Không thể cập nhật hồ sơ cá nhân.");
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = "Lưu thông tin cá nhân";
        }
    }
}

// ==========================================
// 2. DANH SÁCH ĐẶT PHÒNG CỦA TÔI (GET /api/Reservation/my-reservations)
// ==========================================
async function loadMyReservations() {
    const tbody = document.getElementById("myReservationTableBody");
    if (!tbody) return;

    try {
        const res = await apiFetch("/Reservation/my-reservations");
        const reservations = Array.isArray(res) ? res : (res?.data || []);

        renderMyReservations(reservations);
        updateBookingCards(reservations);
    } catch (err) {
        console.error("Lỗi khi tải danh sách đặt phòng của tôi:", err);
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 1.5rem; color: #ef4444;">Không thể tải danh sách đặt phòng: ${escapeHtml(err.message)}</td></tr>`;
    }
}

function renderMyReservations(reservations) {
    const tbody = document.getElementById("myReservationTableBody");
    if (!tbody) return;

    tbody.innerHTML = "";

    if (!reservations || reservations.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 2rem; color: #94a3b8;">Bạn chưa có đơn đặt phòng nào. Hãy chọn phòng bên dưới để đặt!</td></tr>`;
        return;
    }

    const statusMap = {
        0: { text: "Chờ xác nhận", css: "status-choxacnhan" },
        1: { text: "Đã xác nhận", css: "status-daxacnhan" },
        2: { text: "Đã hủy", css: "status-dahuy" },
        3: { text: "Đang lưu trú", css: "status-dacheckin" },
        4: { text: "Đã trả phòng", css: "status-dacheckout" }
    };

    reservations.forEach(r => {
        const tr = document.createElement("tr");

        const code = r.reservationCode || r.ReservationCode || `#${r.id || r.Id}`;
        const bookingDate = formatDate(r.bookingDate || r.BookingDate);
        const checkIn = formatDate(r.checkInDate || r.CheckInDate);
        const checkOut = formatDate(r.checkOutDate || r.CheckOutDate);
        const guests = r.numberOfGuests || r.NumberOfGuests || 1;
        const notes = r.notes || r.Notes || "—";

        const rawStatus = r.status !== undefined ? r.status : r.Status;
        const stInfo = statusMap[rawStatus] || { text: String(rawStatus), css: "" };

        const isCancelable = rawStatus === 0 || rawStatus === "ChoXacNhan";
        const resId = r.id || r.Id;

        tr.innerHTML = `
            <td><strong>${escapeHtml(code)}</strong></td>
            <td>${bookingDate}</td>
            <td>${checkIn}</td>
            <td>${checkOut}</td>
            <td>${guests} người</td>
            <td>${escapeHtml(notes)}</td>
            <td><span class="booking-status-badge ${stInfo.css}">${escapeHtml(stInfo.text)}</span></td>
            <td>
                ${isCancelable ? `<button type="button" class="btn-delete" style="padding: 4px 8px; font-size: 12px; background: #fee2e2; color: #b91c1c; border: 1px solid #fecaca; border-radius: 4px; cursor: pointer;" onclick="cancelMyReservation(${resId})">Hủy đơn</button>` : `<span style="color: #94a3b8; font-size: 13px;">—</span>`}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function cancelMyReservation(reservationId) {
    if (!confirm("Bạn có chắc chắn muốn hủy đơn đặt phòng này không?")) {
        return;
    }

    try {
        await apiFetch(`/Reservation/my-reservations/${reservationId}/cancel`, {
            method: "PUT"
        });

        alert("Hủy đặt phòng thành công!");
        await loadMyReservations();
    } catch (err) {
        console.error("Lỗi hủy đặt phòng:", err);
        alert(err.message || "Không thể hủy đơn đặt phòng.");
    }
}
window.cancelMyReservation = cancelMyReservation;

function updateBookingCards(reservations) {
    if (!Array.isArray(reservations)) return;

    let pending = 0;
    let confirmed = 0;
    let staying = 0;
    let total = reservations.length;

    reservations.forEach(r => {
        const st = r.status !== undefined ? r.status : r.Status;
        if (st === 0 || st === "ChoXacNhan") pending++;
        else if (st === 1 || st === "DaXacNhan") confirmed++;
        else if (st === 3 || st === "DaCheckIn") staying++;
    });

    const pendingEl = document.getElementById("pendingBookingCount");
    const confirmedEl = document.getElementById("confirmedBookingCount");
    const stayingEl = document.getElementById("stayingBookingCount");
    const historyEl = document.getElementById("bookingHistoryCount");

    if (pendingEl) pendingEl.textContent = pending;
    if (confirmedEl) confirmedEl.textContent = confirmed;
    if (stayingEl) stayingEl.textContent = staying;
    if (historyEl) historyEl.textContent = total;
}

// ==========================================
// 3. DANH SÁCH PHÒNG TRỐNG VÀ ĐẶT TRỰC TUYẾN
// ==========================================
async function loadAvailableRooms() {
    const tbody = document.getElementById("availableRoomTableBody");
    if (!tbody) return;

    try {
        // Tải danh mục loại phòng
        let roomTypesMap = {};
        try {
            const types = await apiFetch("/RoomType");
            const typeList = Array.isArray(types) ? types : (types?.data || []);
            typeList.forEach(t => {
                const id = t.id || t.Id;
                const name = t.name || t.Name;
                if (id) roomTypesMap[id] = name;
            });
        } catch (e) {
            console.warn("Không tải được loại phòng:", e);
        }

        // Tải danh sách phòng
        const roomsRes = await apiFetch("/Room?page=1&pageSize=100");
        const rooms = Array.isArray(roomsRes) ? roomsRes : (roomsRes?.data || []);

        renderAvailableRooms(rooms, roomTypesMap);
    } catch (err) {
        console.error("Lỗi khi tải phòng trống:", err);
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 1.5rem; color: #ef4444;">Không thể tải danh sách phòng: ${escapeHtml(err.message)}</td></tr>`;
    }
}

function renderAvailableRooms(rooms, roomTypesMap) {
    const tbody = document.getElementById("availableRoomTableBody");
    if (!tbody) return;

    tbody.innerHTML = "";

    // Lọc các phòng trống (status = 0 hoặc 'Trong')
    const available = rooms.filter(r => {
        const st = r.status !== undefined ? r.status : r.Status;
        return st === 0 || String(st).toLowerCase() === "trong" || String(st).toLowerCase() === "trống";
    });

    if (available.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 2rem; color: #94a3b8;">Hiện không còn phòng trống sẵn sàng để đặt trực tuyến.</td></tr>`;
        return;
    }

    available.forEach(room => {
        const tr = document.createElement("tr");

        const roomId = room.id || room.Id;
        const roomNumber = room.roomNumber || room.RoomNumber || roomId;
        const roomTypeId = room.roomTypeId || room.RoomTypeId;
        const roomType = roomTypesMap[roomTypeId] || "Tiêu chuẩn";

        tr.innerHTML = `
            <td><strong>Phòng ${escapeHtml(roomNumber)}</strong></td>
            <td>${escapeHtml(roomType)}</td>
            <td>Liên hệ lễ tân</td>
            <td><span style="color: #059669; font-weight: 600; background: #ecfdf5; padding: 0.25rem 0.6rem; border-radius: 4px;">Có thể đặt</span></td>
            <td>
                <button type="button" 
                   onclick="openBookingModal(${roomId}, '${escapeHtml(roomNumber)}')"
                   style="background: #2563eb; color: #fff; border: none; padding: 0.4rem 0.9rem; border-radius: 6px; font-size: 0.88rem; font-weight: 500; cursor: pointer;">
                    Đặt ngay
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Modal đặt phòng trực tuyến
function openBookingModal(roomId, roomNumber) {
    const modal = document.getElementById("bookingModal");
    const modalTitle = document.getElementById("modalRoomTitle");
    const roomIdInput = document.getElementById("modalRoomId");

    if (modalTitle) modalTitle.textContent = `Đặt trực tuyến - Phòng ${roomNumber}`;
    if (roomIdInput) roomIdInput.value = roomId;

    // Gán ngày mặc định: check-in = ngày mai, check-out = ngày kia
    const tomorrow = new Date(Date.now() + 86400000).toISOString().substring(0, 10);
    const dayAfter = new Date(Date.now() + 172800000).toISOString().substring(0, 10);

    const checkInEl = document.getElementById("bookCheckIn");
    const checkOutEl = document.getElementById("bookCheckOut");

    if (checkInEl) {
        checkInEl.min = new Date().toISOString().substring(0, 10);
        checkInEl.value = tomorrow;
    }
    if (checkOutEl) {
        checkOutEl.min = tomorrow;
        checkOutEl.value = dayAfter;
    }

    if (modal) modal.classList.add("active");
}
window.openBookingModal = openBookingModal;

function closeBookingModal() {
    const modal = document.getElementById("bookingModal");
    if (modal) modal.classList.remove("active");
}
window.closeBookingModal = closeBookingModal;

async function submitOnlineBooking(e) {
    e.preventDefault();

    const roomIdVal = document.getElementById("modalRoomId").value;
    const checkIn = document.getElementById("bookCheckIn").value;
    const checkOut = document.getElementById("bookCheckOut").value;
    const guests = parseInt(document.getElementById("bookGuests").value, 10) || 1;
    const notes = document.getElementById("bookNotes").value.trim() || null;

    if (!checkIn || !checkOut) {
        alert("Vui lòng chọn ngày nhận và ngày trả phòng.");
        return;
    }

    if (new Date(checkOut) <= new Date(checkIn)) {
        alert("Ngày trả phòng phải sau ngày nhận phòng.");
        return;
    }

    const btn = document.getElementById("btnSubmitBooking");
    if (btn) {
        btn.disabled = true;
        btn.textContent = "Đang đặt phòng...";
    }

    try {
        const payload = {
            checkInDate: checkIn,
            checkOutDate: checkOut,
            numberOfGuests: guests,
            roomId: roomIdVal ? parseInt(roomIdVal, 10) : null,
            notes: notes
        };

        const res = await apiFetch("/Reservation/book-online", {
            method: "POST",
            body: JSON.stringify(payload)
        });

        alert(res?.message || "Đặt phòng trực tuyến thành công! Lễ tân sẽ liên hệ xác nhận đơn.");
        closeBookingModal();

        // Tải lại danh sách đặt phòng và phòng trống
        await loadMyReservations();
        await loadAvailableRooms();
    } catch (err) {
        console.error("Lỗi đặt phòng trực tuyến:", err);
        alert(err.message || "Không thể thực hiện đặt phòng trực tuyến.");
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = "Xác nhận đặt phòng";
        }
    }
}

// Hàm tiện ích
function formatDate(val) {
    if (!val) return "—";
    return String(val).substring(0, 10);
}

function escapeHtml(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
