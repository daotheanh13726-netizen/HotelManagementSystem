"use strict";

function getReportApiUrl() {
    if (typeof API_BASE_URL !== "undefined" && API_BASE_URL) {
        return `${API_BASE_URL}/Report`;
    }
    if (window.location.protocol.startsWith("http")) {
        return `${window.location.origin}/api/Report`;
    }
    return "http://localhost:5054/api/Report";
}
const REPORT_API_URL = getReportApiUrl();

document.addEventListener("DOMContentLoaded", () => {
    const fullName =
        localStorage.getItem("fullName") ||
        localStorage.getItem("username") ||
        "Người dùng";

    const roleName = localStorage.getItem("roleName") || "";

    const welcomeText = document.getElementById("welcomeText");
    if (welcomeText) {
        welcomeText.textContent = roleName
            ? `Xin chào, ${fullName} (${roleName})`
            : `Xin chào, ${fullName}`;
    }

    // Mặc định chọn ngày hôm nay
    const today = getLocalDateString();
    const fromInput = document.getElementById("fromDate");
    const toInput = document.getElementById("toDate");
    if (fromInput && !fromInput.value) fromInput.value = today;
    if (toInput && !toInput.value) toInput.value = today;

    const filterForm = document.getElementById("reportFilterForm");
    if (filterForm) {
        filterForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            await loadReport();
        });
    }

    // Tự động tải báo cáo lần đầu
    loadReport();
});

function getLocalDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

async function loadReport() {
    const fromDateInput = document.getElementById("fromDate");
    const toDateInput = document.getElementById("toDate");
    const button = document.getElementById("loadReportButton");

    const fromDate = fromDateInput ? fromDateInput.value : "";
    const toDate = toDateInput ? toDateInput.value : "";

    if (!fromDate || !toDate) {
        showReportMessage("Vui lòng chọn đầy đủ ngày bắt đầu và ngày kết thúc.", true);
        return;
    }

    if (fromDate > toDate) {
        showReportMessage("Ngày bắt đầu không được lớn hơn ngày kết thúc.", true);
        return;
    }

    if (button) {
        button.disabled = true;
        button.textContent = "Đang tải...";
    }
    showReportMessage("Đang tải dữ liệu báo cáo...", false);

    try {
        const token = localStorage.getItem("token");

        if (!token) {
            throw new Error("Bạn chưa đăng nhập hoặc phiên đăng nhập đã hết hạn.");
        }

        const url = new URL(REPORT_API_URL);
        url.searchParams.set("fromDate", fromDate);
        url.searchParams.set("toDate", toDate);

        const response = await fetch(url.toString(), {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Accept": "application/json"
            }
        });

        if (response.status === 401) {
            throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        }

        if (response.status === 403) {
            throw new Error("Tài khoản không có quyền xem báo cáo.");
        }

        if (!response.ok) {
            throw new Error(
                `Không lấy được báo cáo (HTTP ${response.status}).`
            );
        }

        const result = await response.json();
        renderReport(result);

        showReportMessage("Đã tải dữ liệu báo cáo thành công.", false);
    } catch (error) {
        console.error("Lỗi tải báo cáo:", error);
        resetReport();
        showReportMessage(error.message || "Có lỗi xảy ra khi tải báo cáo.", true);
    } finally {
        if (button) {
            button.disabled = false;
            button.textContent = "Xem báo cáo";
        }
    }
}

function renderReport(result) {
    const report = result?.data ?? result?.Data ?? result;
    const rows =
        report?.details ??
        report?.Details ??
        report?.items ??
        report?.Items ??
        (Array.isArray(report) ? report : []);

    const summary =
        report?.summary ??
        report?.Summary ??
        report;

    const totalRooms = readNumber(summary, [
        "totalRoom", "totalRooms", "tongSoPhong", "TongSoPhong"
    ]);

    const occupiedRooms = readNumber(summary, [
        "occupiedRoom", "occupiedRooms", "usedRooms",
        "phongSuDung", "PhongSuDung", "phongDangSuDung"
    ]);

    const occupancyRate = readNumber(summary, [
        "occupancyRate", "congSuat", "CongSuat", "occupancyPercentage"
    ]);

    const totalRevenue = readNumber(summary, [
        "totalRevenue", "revenue", "doanhThu", "DoanhThu", "tongDoanhThu"
    ]);

    setText("totalRoom", totalRooms === null ? "0" : formatNumber(totalRooms));
    setText("occupiedRoom", occupiedRooms === null ? "0" : formatNumber(occupiedRooms));

    setText(
        "occupancyRate",
        occupancyRate === null
            ? "0%"
            : `${formatNumber(occupancyRate)}%`
    );

    setText(
        "totalRevenue",
        totalRevenue === null ? "0 đ" : formatCurrency(totalRevenue)
    );

    renderReportTable(Array.isArray(rows) ? rows : []);
}

function renderReportTable(rows) {
    const tbody = document.getElementById("reportTableBody");
    if (!tbody) return;
    tbody.replaceChildren();

    if (rows.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center; color: #6b7280; padding: 20px;">
                    Không có dữ liệu trong khoảng thời gian này.
                </td>
            </tr>`;
        return;
    }

    rows.forEach((row) => {
        const date = readValue(row, [
            "date", "reportDate", "ngay", "Ngay", "ngayBaoCao"
        ]);

        const totalRooms = readNumber(row, [
            "totalRoom", "totalRooms", "tongSoPhong", "TongSoPhong"
        ]);

        const occupiedRooms = readNumber(row, [
            "occupiedRoom", "occupiedRooms", "usedRooms",
            "phongSuDung", "PhongSuDung", "phongDangSuDung"
        ]);

        const occupancyRate = readNumber(row, [
            "occupancyRate", "congSuat", "CongSuat", "occupancyPercentage"
        ]);

        const revenue = readNumber(row, [
            "revenue", "totalRevenue", "doanhThu", "DoanhThu"
        ]);

        const tr = document.createElement("tr");

        [
            formatDate(date),
            totalRooms === null ? "0" : formatNumber(totalRooms),
            occupiedRooms === null ? "0" : formatNumber(occupiedRooms),
            occupancyRate === null ? "0%" : `${formatNumber(occupancyRate)}%`,
            revenue === null ? "0 đ" : formatCurrency(revenue)
        ].forEach((value) => {
            const td = document.createElement("td");
            td.textContent = value;
            tr.appendChild(td);
        });

        tbody.appendChild(tr);
    });
}

function readValue(object, keys) {
    if (!object || typeof object !== "object") return null;

    for (const key of keys) {
        if (object[key] !== undefined && object[key] !== null) {
            return object[key];
        }
    }

    return null;
}

function readNumber(object, keys) {
    const value = readValue(object, keys);

    if (value === null || value === "") return null;

    const number = Number(value);
    return Number.isFinite(number) ? number : null;
}

function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
}

function formatNumber(value) {
    return new Intl.NumberFormat("vi-VN", {
        maximumFractionDigits: 2
    }).format(value);
}

function formatCurrency(value) {
    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0
    }).format(value);
}

function formatDate(value) {
    if (!value) return "-";

    const text = String(value);
    const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
        return `${match[3]}/${match[2]}/${match[1]}`;
    }

    return text;
}

function resetReport() {
    setText("totalRoom", "-");
    setText("occupiedRoom", "-");
    setText("occupancyRate", "-");
    setText("totalRevenue", "-");

    const tbody = document.getElementById("reportTableBody");
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center; color: #dc2626; padding: 20px;">
                    Không thể tải dữ liệu báo cáo.
                </td>
            </tr>`;
    }
}

function showReportMessage(message, isError) {
    const element = document.getElementById("reportMessage");
    if (!element) return;

    element.textContent = message;
    element.style.color = isError ? "#dc2626" : "#16a34a";
}

window.loadReport = loadReport;
