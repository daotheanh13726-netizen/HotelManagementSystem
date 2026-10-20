
"use strict";

document.addEventListener("DOMContentLoaded", function () {
    function getBillingApiOrigin() {
        if (typeof API_BASE_URL !== "undefined" && API_BASE_URL) {
            return API_BASE_URL;
        }
        if (window.location.protocol.startsWith("http")) {
            return `${window.location.origin}/api`;
        }
        return "http://localhost:5054/api";
    }

    const API_BASE = getBillingApiOrigin();
    const API_URL = `${API_BASE}/PhieuTinhTien`;
    const RESERVATION_API_URL = `${API_BASE}/Reservation`;
    const GUEST_API_URL = `${API_BASE}/Guest`;

    const form = document.getElementById("billingForm");
    const message = document.getElementById("billingMessage");
    const listMessage = document.getElementById("listMessage");
    const tableBody = document.getElementById("billingTableBody");
    const calculateBtn = document.getElementById("calculateBtn");

    const money = value =>
        new Intl.NumberFormat("vi-VN", {
            style: "currency",
            currency: "VND",
            maximumFractionDigits: 0
        }).format(Number(value || 0));

    function showMessage(element, text, success = false) {
        element.textContent = text;
        element.style.color = success ? "green" : "red";
    }

    function clearMessage(element) {
        element.textContent = "";
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

    async function apiRequest(url, options = {}) {
        const headers = typeof getAuthHeaders === "function"
            ? getAuthHeaders()
            : {};

        const response = await fetch(url, {
            ...options,
            headers: {
                ...(headers instanceof Headers
                    ? Object.fromEntries(headers.entries())
                    : headers),
                ...(options.body ? { "Content-Type": "application/json" } : {}),
                ...(options.headers || {})
            }
        });

        const text = await response.text();
        let data = null;

        try {
            data = text ? JSON.parse(text) : null;
        } catch {
            data = text;
        }

        if (!response.ok) {
            const detail = data?.message || data?.title ||
                (typeof data === "string" ? data : "");

            throw new Error(
                detail || `Lỗi HTTP ${response.status}`
            );
        }

        return data;
    }

    function formatDate(value) {
        if (!value) return "-";

        const date = new Date(value);

        return Number.isNaN(date.getTime())
            ? String(value)
            : date.toLocaleString("vi-VN");
    }

    function statusLabel(value) {
        const statuses = {
            ChuaThanhToan: "Chưa thanh toán",
            DaThanhToan: "Đã thanh toán"
        };

        return statuses[value] || value || "-";
    }


    // TẢI DANH SÁCH ĐƠN ĐẶT PHÒNG CHO DROPDOWN
    async function loadReservations() {
        const select = document.getElementById("reservationId");
        if (!select) return;

        try {
            const [reservations, guests] = await Promise.all([
                apiRequest(`${RESERVATION_API_URL}?page=1&pageSize=100`),
                apiRequest(`${GUEST_API_URL}?page=1&pageSize=100`).catch(() => [])
            ]);

            function getList(result) {
                if (Array.isArray(result)) return result;
                if (Array.isArray(result?.data)) return result.data;
                if (Array.isArray(result?.items)) return result.items;
                return [];
            }

            const resList = getList(reservations);
            const guestList = getList(guests);

            const guestMap = {};
            guestList.forEach(g => {
                const gId = g.id ?? g.Id;
                const gName = g.fullName ?? g.FullName ?? "";
                if (gId != null) guestMap[gId] = gName;
            });

            select.innerHTML = '<option value="">-- Chọn đơn đặt phòng --</option>' +
                resList.map(r => {
                    const id = r.id ?? r.Id;
                    const code = r.reservationCode ?? r.ReservationCode ?? "";
                    const status = r.status ?? r.Status;
                    const guestId = r.guestId ?? r.GuestId;
                    const gName = guestMap[guestId] || "";
                    const checkIn = r.checkInDate ?? r.CheckInDate ?? "";
                    const checkOut = r.checkOutDate ?? r.CheckOutDate ?? "";

                    const statusText = {
                        0: "Chờ xác nhận", 1: "Đã xác nhận", 2: "Đã hủy",
                        3: "Đã check-in", 4: "Đã check-out",
                        ChoXacNhan: "Chờ xác nhận", DaXacNhan: "Đã xác nhận",
                        DaHuy: "Đã hủy", DaCheckIn: "Đã check-in", DaCheckOut: "Đã check-out"
                    };

                    const sText = statusText[status] || String(status || "");
                    const dateIn = checkIn ? String(checkIn).substring(0, 10) : "";
                    const dateOut = checkOut ? String(checkOut).substring(0, 10) : "";

                    let label = `ID: ${id}`;
                    if (code) label += ` | Mã: ${code}`;
                    if (gName) label += ` | ${gName}`;
                    if (dateIn) label += ` | ${dateIn}`;
                    if (dateOut) label += ` → ${dateOut}`;
                    if (sText) label += ` [${sText}]`;

                    return `<option value="${id}">${escapeHtml(label)}</option>`;
                }).join("");

            const urlParams = new URLSearchParams(window.location.search);
            const preselectedId = urlParams.get("reservationId") || urlParams.get("id");
            if (preselectedId) {
                select.value = preselectedId;
            }

        } catch (err) {
            console.error("Không tải được danh sách đặt phòng:", err);
            select.innerHTML = '<option value="">-- Lỗi tải danh sách --</option>';
        }
    }

    // TÍNH TIỀN VÀ LƯU PHIẾU
    form.addEventListener("submit", async function (event) {
        event.preventDefault();

        clearMessage(message);

        const reservationId = Number(
            document.getElementById("reservationId").value
        );

        const calculationType =
            document.getElementById("calculationType").value;

        if (!Number.isInteger(reservationId) || reservationId <= 0) {
            showMessage(message, "Vui lòng nhập ID đặt phòng hợp lệ.");
            return;
        }

        calculateBtn.disabled = true;
        calculateBtn.textContent = "Đang tính tiền...";

        try {
            const url =
                `${API_URL}/calculate-room-price` +
                `?reservationId=${encodeURIComponent(reservationId)}` +
                `&loaiTinhTien=${encodeURIComponent(calculationType)}`;

            const result = await apiRequest(url, {
                method: "POST"
            });

            document.getElementById("resultBillId").textContent =
                result.phieuTinhTienId ?? "-";

            document.getElementById("resultRoomAmount").textContent =
                money(result.tienPhong);

            document.getElementById("resultServiceAmount").textContent =
                money(result.tienDichVu);

            document.getElementById("resultTotalAmount").textContent =
                money(result.tongTien);

            document.getElementById("resultDetails").textContent =
                `Đơn đặt phòng: ${result.reservationId ?? reservationId}` +
                ` | Phòng: ${result.roomNumber ?? "-"}` +
                ` | Check-in: ${formatDate(result.checkIn)}` +
                ` | Check-out: ${formatDate(result.checkOut)}`;

            document.getElementById("billingResult").hidden = false;

            showMessage(
                message,
                result.message || "Tính tiền và lưu phiếu thành công.",
                true
            );

            await loadBills();

        } catch (error) {
            showMessage(
                message,
                `Không thể lập phiếu tính tiền: ${error.message}`
            );
        } finally {
            calculateBtn.disabled = false;
            calculateBtn.textContent = "Tính tiền và lưu phiếu";
        }
    });

    // TẢI DANH SÁCH PHIẾU
    async function loadBills() {
        tableBody.innerHTML =
            '<tr><td colspan="7">Đang tải dữ liệu...</td></tr>';

        clearMessage(listMessage);

        try {
            const bills = await apiRequest(API_URL);

            if (!Array.isArray(bills) || bills.length === 0) {
                tableBody.innerHTML =
                    '<tr><td colspan="7">Chưa có phiếu tính tiền.</td></tr>';
                return;
            }

            tableBody.innerHTML = bills.map(bill => `
                <tr>
                    <td>${escapeHtml(bill.id)}</td>
                    <td>${escapeHtml(bill.datPhongId)}</td>
                    <td>${escapeHtml(formatDate(bill.ngayTao))}</td>
                    <td>${escapeHtml(money(bill.tienPhong))}</td>
                    <td>${escapeHtml(money(bill.tienDichVu))}</td>
                    <td>${escapeHtml(money(bill.tongTien))}</td>
                    <td>
                        <span style="display: inline-block; padding: 3px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600; ${bill.trangThai === 'DaThanhToan' ? 'background: #dcfce7; color: #15803d;' : 'background: #fef3c7; color: #b45309;'}">
                            ${escapeHtml(statusLabel(bill.trangThai))}
                        </span>
                    </td>
                </tr>
            `).join("");

        } catch (error) {
            tableBody.innerHTML =
                '<tr><td colspan="7">Không tải được dữ liệu.</td></tr>';

            showMessage(listMessage, error.message);
        }
    }

    document.getElementById("refreshBillsBtn")
        .addEventListener("click", () => {
            loadBills();
            loadReservations();
        });

    loadReservations();
    loadBills();
});
