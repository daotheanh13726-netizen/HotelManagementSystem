"use strict";

document.addEventListener("DOMContentLoaded", async () => {
    // 1. Kiểm tra xác thực
    const token = getToken();
    const roleName = localStorage.getItem("roleName") || "";

    // Cập nhật tên người dùng trên Header
    const userRoleSpan = document.querySelector(".header-right span");
    const fullName = localStorage.getItem("fullName") || localStorage.getItem("username");
    if (userRoleSpan && fullName) {
        userRoleSpan.textContent = `Xin chào, ${fullName} (${roleName || "Quản trị viên"})`;
    }

    // 2. Tải dữ liệu Dashboard qua Gateway Admin API
    await loadDashboardStats();
});

async function loadDashboardStats() {
    try {
        // Gọi Gateway Admin API: /api/admin/Room
        const rooms = await apiFetchAdmin("/Room").catch(() => []);
        if (Array.isArray(rooms)) {
            const totalRooms = rooms.length;
            const occupiedRooms = rooms.filter(r => 
                (r.statusName && (r.statusName.toLowerCase().includes("sử dụng") || r.statusName.toLowerCase().includes("occupied"))) ||
                (r.status && (String(r.status).toLowerCase().includes("sử dụng") || String(r.status).toLowerCase().includes("occupied")))
            ).length;

            const totalEl = document.getElementById("totalRoomCount");
            const occupiedEl = document.getElementById("occupiedRoomCount");
            if (totalEl) totalEl.textContent = totalRooms;
            if (occupiedEl) occupiedEl.textContent = occupiedRooms;
        }

        // Gọi Gateway Admin API: /api/admin/Reservation
        const reservations = await apiFetchAdmin("/Reservation?page=1&pageSize=100").catch(() => []);
        const resList = Array.isArray(reservations) ? reservations : (reservations.items || []);
        const todayStr = new Date().toISOString().slice(0, 10);
        
        const todayBookings = resList.filter(r => {
            const dateStr = (r.reservationDate || r.createdAt || "").slice(0, 10);
            return dateStr === todayStr;
        });

        const todayEl = document.getElementById("todayBookingCount");
        if (todayEl) todayEl.textContent = todayBookings.length || (resList.length > 0 ? resList.length : 0);

        // Gọi Gateway Admin API: /api/admin/HoaDon
        const invoices = await apiFetchAdmin("/HoaDon?page=1&pageSize=100").catch(() => []);
        const invoiceList = Array.isArray(invoices) ? invoices : (invoices.items || []);
        
        let totalRevenue = 0;
        invoiceList.forEach(inv => {
            const amount = Number(inv.tongTien || inv.totalAmount || inv.finalAmount || 0);
            totalRevenue += isNaN(amount) ? 0 : amount;
        });

        const revEl = document.getElementById("revenueCount");
        if (revEl) {
            revEl.textContent = totalRevenue > 0
                ? new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(totalRevenue)
                : "0 đ";
        }

        // Hiển thị hoạt động gần đây
        renderActivities(resList, invoiceList);

    } catch (err) {
        console.warn("Không thể tải toàn bộ dữ liệu thống kê qua Gateway:", err);
    }
}

function renderActivities(reservations, invoices) {
    const tbody = document.getElementById("activityTableBody");
    if (!tbody) return;

    tbody.innerHTML = "";

    const activities = [];

    if (Array.isArray(reservations)) {
        reservations.slice(0, 5).forEach(r => {
            activities.push({
                time: (r.reservationDate || r.createdAt || new Date().toISOString()).slice(0, 16).replace("T", " "),
                user: r.guestName || r.customerName || "Khách hàng",
                content: `Đặt phòng #${r.id || r.reservationId || ""} - Trạng thái: ${r.statusName || "Mới"}`
            });
        });
    }

    if (Array.isArray(invoices)) {
        invoices.slice(0, 5).forEach(inv => {
            activities.push({
                time: (inv.ngayLap || inv.createdAt || new Date().toISOString()).slice(0, 16).replace("T", " "),
                user: inv.nhanVienLap || "Thu ngân",
                content: `Xuất hóa đơn #${inv.id || inv.maHoaDon || ""} - Tổng: ${new Intl.NumberFormat("vi-VN").format(inv.tongTien || 0)} đ`
            });
        });
    }

    if (activities.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:#94a3b8; padding: 1.5rem;">Chưa có hoạt động gần đây</td></tr>`;
        return;
    }

    // Sắp xếp thời gian giảm dần
    activities.sort((a, b) => b.time.localeCompare(a.time));

    activities.slice(0, 6).forEach(act => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${act.time}</td>
            <td><strong>${escapeHtml(act.user)}</strong></td>
            <td>${escapeHtml(act.content)}</td>
        `;
        tbody.appendChild(tr);
    });
}

function escapeHtml(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}
