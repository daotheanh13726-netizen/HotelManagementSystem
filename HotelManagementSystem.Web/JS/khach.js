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

    // 5. Tải danh mục dịch vụ của khách sạn
    await loadHotelServices();

    // 6. Gắn sự kiện submit cho form hồ sơ cá nhân
    const profileForm = document.getElementById("profileForm");
    if (profileForm) {
        profileForm.addEventListener("submit", updateMyProfile);
    }

    // 7. Gắn sự kiện submit cho modal đặt phòng trực tuyến
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
        const payload = {
            fullName: fullName,
            phone: phone,
            email: email,
            identityNumber: identityNumber,
            address: address
        };

        const res = await apiFetch("/Guest/me", {
            method: "PUT",
            body: JSON.stringify(payload)
        });

        alert(res?.message || "Cập nhật thông tin hồ sơ cá nhân thành công!");
        localStorage.setItem("fullName", fullName);

        const titleEl = document.getElementById("customerWelcomeTitle");
        if (titleEl) {
            titleEl.textContent = `Xin chào, ${fullName}`;
        }
    } catch (err) {
        console.error("Lỗi khi cập nhật hồ sơ:", err);
        alert(err.message || "Không thể cập nhật hồ sơ. Vui lòng kiểm tra lại thông tin.");
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = "Lưu thông tin cá nhân";
        }
    }
}

// ==========================================
// 2. DANH SÁCH ĐẶT PHÒNG CỦA TÔI (/api/Reservation/my-reservations)
// ==========================================
async function loadMyReservations() {
    const tbody = document.getElementById("myReservationTableBody");
    if (!tbody) return;

    try {
        const reservations = await apiFetch("/Reservation/my-reservations");
        renderMyReservations(reservations || []);
    } catch (err) {
        console.error("Lỗi khi tải danh sách đặt phòng:", err);
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 2rem; color: #ef4444;">Không thể tải danh sách đặt phòng: ${escapeHtml(err.message)}</td></tr>`;
    }
}

function renderMyReservations(reservations) {
    const tbody = document.getElementById("myReservationTableBody");
    if (!tbody) return;

    tbody.innerHTML = "";

    // Cập nhật thống kê
    let pending = 0;
    let confirmed = 0;
    let staying = 0;
    const total = reservations.length;

    reservations.forEach(r => {
        const st = r.status !== undefined ? r.status : r.Status;
        if (st === 0 || st === "ChoXacNhan") pending++;
        else if (st === 1 || st === "DaXacNhan") confirmed++;
        else if (st === 3 || st === "DaCheckIn") staying++;
    });

    const pendingEl = document.getElementById("pendingBookingCount");
    const confirmedEl = document.getElementById("confirmedBookingCount");
    const stayingEl = document.getElementById("stayingBookingCount");
    const totalEl = document.getElementById("bookingHistoryCount");

    if (pendingEl) pendingEl.textContent = pending;
    if (confirmedEl) confirmedEl.textContent = confirmed;
    if (stayingEl) stayingEl.textContent = staying;
    if (totalEl) totalEl.textContent = total;

    if (reservations.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 2.5rem; color: #94a3b8;">Quý khách chưa có đơn đặt phòng nào. Hãy chọn phòng ở bảng bên dưới để đặt phòng ngay!</td></tr>`;
        return;
    }

    reservations.forEach(r => {
        const tr = document.createElement("tr");

        const code = r.reservationCode || r.ReservationCode || `DP${r.id || r.Id}`;
        const checkIn = formatDate(r.checkInDate || r.CheckInDate);
        const checkOut = formatDate(r.checkOutDate || r.CheckOutDate);
        const guests = r.numberOfGuests || r.NumberOfGuests || 1;
        const totalAmount = r.totalAmount || r.TotalAmount || 0;
        const soHoaDon = r.soHoaDon || r.SoHoaDon || "";

        // Tên các phòng đã gán
        let roomDisplay = "Chưa gán phòng";
        const rooms = r.rooms || r.Rooms;
        if (Array.isArray(rooms) && rooms.length > 0) {
            roomDisplay = rooms.map(rm => rm.roomNumber ? `P.${rm.roomNumber}` : (rm.RoomNumber ? `P.${rm.RoomNumber}` : `#${rm.roomId || rm.RoomId}`)).join(", ");
        } else {
            // Fallback: API trả về roomNumber dạng string đơn
            const rn = r.roomNumber || r.RoomNumber;
            if (rn && rn !== "Chưa gán phòng") {
                roomDisplay = `P.${rn}`;
            }
        }

        // Định dạng trạng thái đơn
        const rawStatus = r.status !== undefined ? r.status : r.Status;
        const statusMap = {
            0: { text: "Chờ xác nhận", css: "status-choxacnhan" },
            1: { text: "Đã xác nhận", css: "status-daxacnhan" },
            2: { text: "Đã hủy", css: "status-dahuy" },
            3: { text: "Đang lưu trú", css: "status-dacheckin" },
            4: { text: "Đã trả phòng", css: "status-dacheckout" },
            "ChoXacNhan": { text: "Chờ xác nhận", css: "status-choxacnhan" },
            "DaXacNhan": { text: "Đã xác nhận", css: "status-daxacnhan" },
            "DaHuy": { text: "Đã hủy", css: "status-dahuy" },
            "DaCheckIn": { text: "Đang lưu trú", css: "status-dacheckin" },
            "DaCheckOut": { text: "Đã trả phòng", css: "status-dacheckout" }
        };
        const stInfo = statusMap[rawStatus] || { text: String(rawStatus), css: "status-choxacnhan" };

        const isCancelable = rawStatus === 0 || rawStatus === "ChoXacNhan";
        const isCancelled = rawStatus === 2 || rawStatus === "DaHuy";

        // Trạng thái thanh toán
        const isPaid = r.isPaid === true || r.paymentStatus === "DaThanhToan" || r.PaymentStatus === "DaThanhToan";
        const resId = r.id || r.Id;

        let paymentBadge = "";
        if (isPaid) {
            paymentBadge = `<span class="payment-status-badge status-paid"><i class="fa-solid fa-circle-check"></i> Đã thanh toán</span>`;
        } else if (!isCancelled) {
            paymentBadge = `<span class="payment-status-badge status-unpaid"><i class="fa-solid fa-clock"></i> Chưa thanh toán</span>`;
        } else {
            paymentBadge = `<span class="payment-status-badge" style="background:#f1f5f9; color:#64748b;">Đã hủy</span>`;
        }

        // Cột Thao tác
        let actionContent = "";
        if (!isPaid && !isCancelled) {
            const btnLabel = soHoaDon ? "Thanh toán hóa đơn" : "Thanh toán";
            actionContent += `
                <button type="button" class="btn-pay" onclick="openPaymentModal(${resId}, '${escapeHtml(code)}', '${escapeHtml(roomDisplay)}', '${checkIn}', '${checkOut}', ${totalAmount}, '${escapeHtml(soHoaDon || '')}')">
                    <i class="fa-solid fa-credit-card"></i> ${btnLabel}
                </button>
            `;
        } else if (isPaid) {
            actionContent += `<span style="color: #16a34a; font-weight: 700; font-size: 13px;"><i class="fa-solid fa-check-circle"></i> Đã hoàn tất</span>`;
        } else {
            actionContent += `<span style="color: #94a3b8; font-size: 13px;">—</span>`;
        }

        if (isCancelable && !isPaid) {
            actionContent += `
                <button type="button" class="btn-delete" style="padding: 5px 9px; font-size: 12px; background: #fee2e2; color: #b91c1c; border: 1px solid #fecaca; border-radius: 6px; cursor: pointer; margin-left: 6px;" onclick="cancelMyReservation(${resId})">
                    Hủy
                </button>
            `;
        }

        let amountDisplay = `<strong style="color: #2563eb; font-size: 14px;">${formatCurrency(totalAmount)}</strong>`;
        if (soHoaDon) {
            amountDisplay += `<div style="font-size: 11.5px; color: #64748b; font-weight: 600; margin-top: 2px;"><i class="fa-solid fa-file-invoice" style="margin-right: 3px;"></i>${escapeHtml(soHoaDon)}</div>`;
        }

        tr.innerHTML = `
            <td><strong>${escapeHtml(code)}</strong></td>
            <td><span style="font-weight: 600; color: #1e293b;">${escapeHtml(roomDisplay)}</span></td>
            <td>${checkIn}</td>
            <td>${checkOut}</td>
            <td>${guests} người</td>
            <td>${amountDisplay}</td>
            <td>
                <div><span class="booking-status-badge ${stInfo.css}">${escapeHtml(stInfo.text)}</span></div>
                <div style="margin-top: 4px;">${paymentBadge}</div>
            </td>
            <td>${actionContent}</td>
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
        console.error("Lỗi khi hủy đặt phòng:", err);
        alert(err.message || "Không thể hủy đặt phòng này. Chỉ các đơn chờ xác nhận mới có thể hủy.");
    }
}
window.cancelMyReservation = cancelMyReservation;

// ==========================================
// 3. DANH SÁCH PHÒNG CÓ THỂ ĐẶT
// ==========================================
async function loadAvailableRooms() {
    const tbody = document.getElementById("availableRoomTableBody");
    if (!tbody) return;

    try {
        // Tải loại phòng
        const roomTypesMap = {};
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

// ==========================================
// 4. DANH MỤC DỊCH VỤ KHÁCH SẠN
// ==========================================
let cachedHotelServices = [];

async function loadHotelServices() {
    const tbody = document.getElementById("hotelServiceTableBody");
    const modalServiceList = document.getElementById("bookingServiceList");

    try {
        const services = await apiFetch("/Service");
        cachedHotelServices = Array.isArray(services) ? services : [];

        // 1. Render ra bảng dịch vụ
        if (tbody) {
            const activeServices = cachedHotelServices.filter(s => s.isActive !== false && s.IsActive !== false);
            if (activeServices.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 2rem; color: #94a3b8;">Khách sạn hiện chưa có dịch vụ nào đang hoạt động.</td></tr>`;
            } else {
                tbody.innerHTML = activeServices.map((s, index) => {
                    const id = s.id || s.Id;
                    const name = s.name || s.Name || "";
                    const unit = s.unit || s.Unit || "Lần";
                    const price = s.price !== undefined ? s.price : s.Price;
                    const desc = s.description || s.Description || "Dịch vụ khách sạn";
                    return `
                        <tr>
                            <td style="text-align: center; font-weight: 600;">${index + 1}</td>
                            <td><strong style="color: #1e293b;">${escapeHtml(name)}</strong></td>
                            <td><span style="display:inline-block; padding: 2px 8px; background: #f1f5f9; border-radius: 4px; font-size: 13px;">${escapeHtml(unit)}</span></td>
                            <td style="text-align: right; font-weight: 700; color: #d97706;">${formatCurrency(price)}</td>
                            <td style="color: #475569;">${escapeHtml(desc)}</td>
                            <td style="text-align: center;">
                                <span style="color: #15803d; background: #dcfce7; font-weight: 600; padding: 3px 8px; border-radius: 4px; font-size: 12px;">Sẵn sàng phục vụ</span>
                            </td>
                        </tr>
                    `;
                }).join("");
            }
        }

        // 2. Render ra danh sách lựa chọn trong modal đặt phòng
        if (modalServiceList) {
            const activeServices = cachedHotelServices.filter(s => s.isActive !== false && s.IsActive !== false);
            if (activeServices.length === 0) {
                modalServiceList.innerHTML = `<span style="color: #64748b; font-size: 13px;">Không có dịch vụ tùy chọn nào.</span>`;
            } else {
                modalServiceList.innerHTML = activeServices.map(s => {
                    const id = s.id || s.Id;
                    const name = s.name || s.Name || "";
                    const unit = s.unit || s.Unit || "";
                    const price = s.price !== undefined ? s.price : s.Price;
                    return `
                        <label style="display: flex; align-items: center; justify-content: space-between; font-size: 13px; cursor: pointer; padding: 5px 8px; border-radius: 4px; background: #fff; border: 1px solid #e2e8f0;">
                            <span style="display: flex; align-items: center; gap: 8px;">
                                <input type="checkbox" class="booking-service-chk" value="${id}" data-name="${escapeHtml(name)}" data-price="${price}">
                                <span>${escapeHtml(name)} <small style="color: #64748b;">(${escapeHtml(unit)})</small></span>
                            </span>
                            <span style="font-weight: 600; color: #d97706;">${formatCurrency(price)}</span>
                        </label>
                    `;
                }).join("");
            }
        }

    } catch (err) {
        console.error("Lỗi khi tải danh mục dịch vụ:", err);
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 1.5rem; color: #ef4444;">Không thể tải danh mục dịch vụ: ${escapeHtml(err.message)}</td></tr>`;
        }
    }
}

// Modal đặt phòng trực tuyến
function openBookingModal(roomId, roomNumber) {
    const modal = document.getElementById("bookingModal");
    const modalTitle = document.getElementById("modalRoomTitle");
    const roomIdInput = document.getElementById("modalRoomId");

    if (modalTitle) modalTitle.textContent = `Đặt trực tuyến - Phòng ${roomNumber}`;
    if (roomIdInput) roomIdInput.value = roomId;

    // Reset các checkbox dịch vụ
    document.querySelectorAll(".booking-service-chk").forEach(chk => chk.checked = false);

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

    // Thu thập các dịch vụ khách đã chọn trong modal
    const selectedServiceNames = [];
    document.querySelectorAll(".booking-service-chk:checked").forEach(chk => {
        const sName = chk.getAttribute("data-name");
        if (sName) selectedServiceNames.push(sName);
    });

    let finalNotes = notes || "";
    if (selectedServiceNames.length > 0) {
        const serviceRequestText = `[Khách yêu cầu dịch vụ: ${selectedServiceNames.join(", ")}]`;
        finalNotes = finalNotes ? `${finalNotes} | ${serviceRequestText}` : serviceRequestText;
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
            notes: finalNotes || null
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

function formatCurrency(amount) {
    if (!amount && amount !== 0) return "—";
    return Number(amount).toLocaleString("vi-VN") + " đ";
}

// ==========================================
// 5. CHỨC NĂNG THANH TOÁN PHÍA KHÁCH HÀNG
// ==========================================
let currentPayingReservationId = null;

function openPaymentModal(reservationId, code, roomInfo, checkIn, checkOut, amount, soHoaDon) {
    currentPayingReservationId = reservationId;

    const codeEl = document.getElementById("payModalCode");
    const roomEl = document.getElementById("payModalRoom");
    const datesEl = document.getElementById("payModalDates");
    const amountEl = document.getElementById("payModalAmount");
    const invoiceRow = document.getElementById("payModalInvoiceRow");
    const invoiceCodeEl = document.getElementById("payModalInvoiceCode");
    const transferNoteEl = document.getElementById("payModalTransferNote");

    if (codeEl) codeEl.textContent = code || `#${reservationId}`;
    if (roomEl) roomEl.textContent = roomInfo || "Chưa gán phòng";
    if (datesEl) datesEl.textContent = `${checkIn} → ${checkOut}`;
    if (amountEl) amountEl.textContent = formatCurrency(amount);

    const refCode = soHoaDon || code || `DP${reservationId}`;
    if (transferNoteEl) {
        transferNoteEl.textContent = `Thanh toan ${refCode}`;
    }

    if (invoiceRow && invoiceCodeEl) {
        if (soHoaDon) {
            invoiceCodeEl.textContent = soHoaDon;
            invoiceRow.style.display = "flex";
        } else {
            invoiceRow.style.display = "none";
        }
    }

    const modal = document.getElementById("paymentModal");
    if (modal) {
        modal.classList.add("active");
    }
}
window.openPaymentModal = openPaymentModal;

function closePaymentModal() {
    const modal = document.getElementById("paymentModal");
    if (modal) {
        modal.classList.remove("active");
    }
    currentPayingReservationId = null;
}
window.closePaymentModal = closePaymentModal;

async function confirmPayment() {
    if (!currentPayingReservationId) {
        alert("Không tìm thấy thông tin đơn đặt phòng cần thanh toán.");
        return;
    }

    const paymentMethod = "Chuyển khoản ngân hàng";

    const btn = document.getElementById("btnConfirmPaySubmit");
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang xử lý thanh toán...';
    }

    try {
        const res = await apiFetch(`/Reservation/my-reservations/${currentPayingReservationId}/pay`, {
            method: "POST",
            body: JSON.stringify({
                paymentMethod: paymentMethod
            })
        });

        closePaymentModal();
        alert(res?.message || "Xác nhận thanh toán đơn đặt phòng thành công! Cảm ơn Quý khách.");

        // Tải lại danh sách đơn đặt phòng để cập nhật trạng thái ngay lập tức
        await loadMyReservations();
    } catch (err) {
        console.error("Lỗi xác nhận thanh toán:", err);
        alert(err.message || "Không thể thực hiện thanh toán. Vui lòng thử lại sau.");
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-check"></i> Xác nhận thanh toán';
        }
    }
}
window.confirmPayment = confirmPayment;
