
"use strict";

function getKetoanApiUrl() {
    if (typeof API_BASE_URL !== "undefined" && API_BASE_URL) {
        return API_BASE_URL;
    }
    if (window.location.protocol.startsWith("http")) {
        return `${window.location.origin}/api`;
    }
    return "http://localhost:5054/api";
}

const KETOAN_API = getKetoanApiUrl();

document.addEventListener("DOMContentLoaded", async () => {
    const name = localStorage.getItem("fullName")
        || localStorage.getItem("username")
        || "Kế toán";

    const welcome = document.getElementById("welcomeText");
    if (welcome) welcome.textContent = `Xin chào, ${name}`;

    await loadAccountingDashboard();
});

async function ketoanFetch(path) {
    const token = localStorage.getItem("token");
    if (!token) throw new Error("Bạn chưa đăng nhập.");

    const response = await fetch(`${KETOAN_API}${path}`, {
        headers: {
            "Authorization": `Bearer ${token}`,
            "Accept": "application/json"
        }
    });

    if (!response.ok) {
        throw new Error(`API trả về HTTP ${response.status}: ${path}`);
    }

    return response.json();
}

function invoiceList(result) {
    if (Array.isArray(result)) return result;
    if (Array.isArray(result?.data)) return result.data;
    if (Array.isArray(result?.items)) return result.items;
    if (Array.isArray(result?.Data)) return result.Data;
    return [];
}

function ketoanDate(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

function invoiceDate(invoice) {
    return String(
        invoice.ngayLap ||
        invoice.createdAt ||
        invoice.invoiceDate ||
        invoice.NgayLap ||
        ""
    ).slice(0, 10);
}

function invoiceAmount(invoice) {
    return Number(
        invoice.tongTien ??
        invoice.totalAmount ??
        invoice.finalAmount ??
        invoice.TongTien ??
        0
    ) || 0;
}

function invoiceStatus(invoice) {
    return String(
        invoice.trangThai ||
        invoice.statusName ||
        invoice.status ||
        invoice.TrangThai ||
        ""
    ).toLowerCase();
}

function isPaid(invoice) {
    const status = invoiceStatus(invoice);
    return status.includes("đã thanh toán") ||
        status.includes("da thanh toan") ||
        status === "paid" ||
        status === "1";
}

function setAccountingValue(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
}

function formatVND(value) {
    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0
    }).format(value);
}

function formatInvoiceDate(value) {
    if (!value) return "-";
    const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
    return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

async function loadAccountingDashboard() {
    const tbody = document.getElementById("recentInvoiceTableBody");

    try {
        const result = await ketoanFetch("/HoaDon?page=1&pageSize=100");
        const invoices = invoiceList(result);
        const today = ketoanDate();

        const todayInvoices = invoices.filter(i => invoiceDate(i) === today);
        const paidInvoices = invoices.filter(isPaid);
        const unpaidInvoices = invoices.filter(i => !isPaid(i));

        const revenueToday = todayInvoices
            .filter(isPaid)
            .reduce((sum, invoice) => sum + invoiceAmount(invoice), 0);

        setAccountingValue("todayInvoiceCount", todayInvoices.length);
        setAccountingValue("paidInvoiceCount", paidInvoices.length);
        setAccountingValue("unpaidInvoiceCount", unpaidInvoices.length);
        setAccountingValue("todayRevenue", formatVND(revenueToday));

        renderRecentInvoices(invoices);
    } catch (error) {
        console.error("Không tải được dashboard kế toán:", error);

        setAccountingValue("todayInvoiceCount", "-");
        setAccountingValue("paidInvoiceCount", "-");
        setAccountingValue("unpaidInvoiceCount", "-");
        setAccountingValue("todayRevenue", "-");

        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align:center">
                        Không tải được hóa đơn. Kiểm tra đăng nhập,
                        Gateway và quyền truy cập API.
                    </td>
                </tr>`;
        }
    }
}

function renderRecentInvoices(invoices) {
    const tbody = document.getElementById("recentInvoiceTableBody");
    if (!tbody) return;

    tbody.replaceChildren();

    const recent = [...invoices]
        .sort((a, b) => invoiceDate(b).localeCompare(invoiceDate(a)))
        .slice(0, 10);

    if (recent.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center">
                    Chưa có hóa đơn.
                </td>
            </tr>`;
        return;
    }

    recent.forEach(invoice => {
        const code = invoice.maHoaDon ||
            invoice.invoiceCode ||
            invoice.id ||
            invoice.Id ||
            "-";

        const guest = invoice.tenKhachHang ||
            invoice.guestName ||
            invoice.customerName ||
            "-";

        const status = invoiceStatus(invoice);
        const statusText = status
            ? (isPaid(invoice) ? "Đã thanh toán" : status)
            : "Chưa xác định";

        const values = [
            code,
            guest,
            formatVND(invoiceAmount(invoice)),
            formatInvoiceDate(invoiceDate(invoice)),
            statusText
        ];

        const tr = document.createElement("tr");

        values.forEach(value => {
            const td = document.createElement("td");
            td.textContent = String(value);
            tr.appendChild(td);
        });

        tbody.appendChild(tr);
    });
}