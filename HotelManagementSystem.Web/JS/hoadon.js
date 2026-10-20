"use strict";

function getInvoiceApiUrl() {
    if (typeof API_BASE_URL !== "undefined" && API_BASE_URL) {
        return `${API_BASE_URL}/HoaDon`;
    }
    if (window.location.protocol.startsWith("http")) {
        return `${window.location.origin}/api/HoaDon`;
    }
    return "http://localhost:5054/api/HoaDon";
}

function getFolioApiUrl() {
    if (typeof API_BASE_URL !== "undefined" && API_BASE_URL) {
        return `${API_BASE_URL}/PhieuTinhTien`;
    }
    if (window.location.protocol.startsWith("http")) {
        return `${window.location.origin}/api/PhieuTinhTien`;
    }
    return "http://localhost:5054/api/PhieuTinhTien";
}

const INVOICE_API = getInvoiceApiUrl();
const FOLIO_API = getFolioApiUrl();

let invoices = [];
let folios = [];
let editingInvoiceId = null;

document.addEventListener("DOMContentLoaded", () => {
    const fullName =
        localStorage.getItem("fullName") ||
        localStorage.getItem("username") ||
        "Quản trị viên";

    const greeting = document.querySelector(".header-right span, #adminWelcome");
    if (greeting) {
        greeting.textContent = `Xin chào, ${fullName}`;
    }

    const form = document.getElementById("invoiceForm");
    if (form) {
        form.addEventListener("submit", saveInvoice);
    }

    const searchInput = document.getElementById("searchInvoice");
    if (searchInput) {
        searchInput.addEventListener("input", filterInvoice);
    }

    const folioSelect = document.getElementById("folioId");
    if (folioSelect) {
        folioSelect.addEventListener("change", onFolioChange);
    }

    loadData();
});

function getInvoiceToken() {
    return localStorage.getItem("token");
}

async function invoiceRequest(url, options = {}) {
    const token = getInvoiceToken();

    if (!token) {
        alert("Bạn chưa đăng nhập. Vui lòng đăng nhập lại.");
        window.location.href = "dangnhap.html";
        throw new Error("Chưa có token đăng nhập.");
    }

    const response = await fetch(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            ...(options.headers || {})
        }
    });

    if (response.status === 401) {
        throw new Error("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
    }

    if (response.status === 403) {
        throw new Error("Tài khoản không có quyền truy cập hóa đơn.");
    }

    if (response.status === 204) return null;

    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/pdf")) {
        return response.blob();
    }

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
            `Lỗi máy chủ (${response.status})`;

        throw new Error(message);
    }

    return data;
}

function money(value) {
    return Number(value || 0).toLocaleString("vi-VN") + " ₫";
}

function invoiceStatusText(status) {
    const value = String(status || "").toLowerCase();
    if (value.includes("dathanhtoan") || value.includes("đã thanh toán")) {
        return "Đã thanh toán";
    }
    return "Chưa thanh toán";
}

function escapeInvoiceHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

async function loadData() {
    await Promise.all([loadInvoices(), loadFolios()]);
}

async function loadFolios() {
    try {
        const result = await invoiceRequest(FOLIO_API);
        folios = Array.isArray(result) ? result : (result.data || []);
        populateFolioDropdown();
    } catch (err) {
        console.warn("Không tải được phiếu tính tiền:", err);
    }
}

function populateFolioDropdown() {
    const select = document.getElementById("folioId");
    if (!select) return;

    const currentVal = select.value;
    select.innerHTML = '<option value="">-- Chọn phiếu tính tiền --</option>' +
        folios.map(f => {
            const id = f.id || f.Id;
            const datPhongId = f.datPhongId || f.DatPhongId;
            const tongTien = f.tongTien || f.TongTien || 0;
            return `<option value="${id}">Phiếu #${id} (Đơn đặt #${datPhongId} - ${money(tongTien)})</option>`;
        }).join("");

    if (currentVal) select.value = currentVal;
}

function onFolioChange() {
    const select = document.getElementById("folioId");
    const summary = document.getElementById("folioSummary");
    if (!select || !summary) return;

    const folioId = Number(select.value);
    if (!folioId) {
        summary.style.display = "none";
        return;
    }

    const folio = folios.find(f => Number(f.id || f.Id) === folioId);
    if (!folio) {
        summary.style.display = "none";
        return;
    }

    const preTax = Number(folio.tongTien || folio.TongTien || 0);
    const vat = preTax * 0.1;
    const total = preTax + vat;

    const sumPreTax = document.getElementById("sumPreTax");
    const sumVat = document.getElementById("sumVat");
    const sumTotal = document.getElementById("sumTotal");

    if (sumPreTax) sumPreTax.textContent = money(preTax);
    if (sumVat) sumVat.textContent = money(vat);
    if (sumTotal) sumTotal.textContent = money(total);

    summary.style.display = "block";
}

async function loadInvoices() {
    const tbody = document.getElementById("invoiceTableBody");
    if (tbody) {
        tbody.innerHTML =
            '<tr><td colspan="8" style="text-align: center; color: #6b7280; padding: 20px;">Đang tải dữ liệu hóa đơn...</td></tr>';
    }

    try {
        const result = await invoiceRequest(INVOICE_API);
        invoices = Array.isArray(result) ? result : (result.data || []);
        renderInvoices();
    } catch (error) {
        console.error("Lỗi tải hóa đơn:", error);
        if (tbody) {
            tbody.innerHTML =
                `<tr><td colspan="8" style="text-align: center; color: #dc2626; padding: 20px;">${escapeInvoiceHtml(error.message)}</td></tr>`;
        }
    }
}

function renderInvoices() {
    const tbody = document.getElementById("invoiceTableBody");
    if (!tbody) return;

    const keyword = (
        document.getElementById("searchInvoice")?.value || ""
    ).trim().toLowerCase();

    const selectedStatus =
        document.getElementById("invoiceStatus")?.value || "";

    const filtered = invoices.filter(invoice => {
        const number = String(invoice.soHoaDon || invoice.SoHoaDon || "").toLowerCase();
        const folioId = String(invoice.phieuTinhTienId || invoice.PhieuTinhTienId || "");
        const rawStatus = invoice.trangThai || invoice.TrangThai || "";
        const statusText = invoiceStatusText(rawStatus);

        const matchKeyword =
            !keyword ||
            number.includes(keyword) ||
            folioId.includes(keyword);

        let matchStatus = true;
        if (selectedStatus === "DaThanhToan") {
            matchStatus = statusText === "Đã thanh toán";
        } else if (selectedStatus === "ChuaThanhToan") {
            matchStatus = statusText === "Chưa thanh toán";
        }

        return matchKeyword && matchStatus;
    });

    if (filtered.length === 0) {
        tbody.innerHTML =
            '<tr><td colspan="8" style="text-align: center; color: #6b7280; padding: 20px;">Không tìm thấy hóa đơn nào phù hợp.</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map(invoice => {
        const id = Number(invoice.id || invoice.Id);
        const soHD = invoice.soHoaDon || invoice.SoHoaDon || `HD#${id}`;
        const folioId = invoice.phieuTinhTienId || invoice.PhieuTinhTienId || "—";
        const preTax = invoice.tienTruocThue ?? invoice.TienTruocThue ?? 0;
        const vat = invoice.tienVAT ?? invoice.TienVAT ?? 0;
        const total = invoice.tongTien ?? invoice.TongTien ?? 0;
        const stText = invoiceStatusText(invoice.trangThai || invoice.TrangThai);

        let statusBadge = "";
        if (stText === "Đã thanh toán") {
            statusBadge = `<span style="display:inline-block; padding:3px 10px; border-radius:12px; font-size:12px; font-weight:600; background:#dcfce7; color:#15803d;">Đã thanh toán</span>`;
        } else {
            statusBadge = `<span style="display:inline-block; padding:3px 10px; border-radius:12px; font-size:12px; font-weight:600; background:#fef3c7; color:#b45309;">Chưa thanh toán</span>`;
        }

        return `
            <tr>
                <td>${id}</td>
                <td><strong style="color: #2563eb;">${escapeInvoiceHtml(soHD)}</strong></td>
                <td>Phiếu #${escapeInvoiceHtml(folioId)}</td>
                <td>${money(preTax)}</td>
                <td>${money(vat)}</td>
                <td><strong style="color: #059669; font-size: 14px;">${money(total)}</strong></td>
                <td>${statusBadge}</td>
                <td>
                    <button type="button"
                        class="btn-edit"
                        onclick="editInvoice(${id})">
                        Sửa
                    </button>
                    <button type="button"
                        class="btn-secondary"
                        style="padding: 7px 10px; font-size: 13px; margin-right: 5px;"
                        onclick="exportInvoicePdf(${id})">
                        In PDF
                    </button>
                    <button type="button"
                        class="btn-delete"
                        onclick="deleteInvoice(${id})">
                        Xóa
                    </button>
                </td>
            </tr>
        `;
    }).join("");
}

function filterInvoice() {
    renderInvoices();
}

function searchInvoice() {
    renderInvoices();
}

function openInvoiceForm() {
    editingInvoiceId = null;

    const form = document.getElementById("invoiceForm");
    if (form) form.reset();

    const title = document.getElementById("invoiceFormTitle");
    if (title) title.textContent = "Lập hóa đơn mới";

    const folioSelect = document.getElementById("folioId");
    if (folioSelect) {
        folioSelect.disabled = false;
        populateFolioDropdown();
    }

    const summary = document.getElementById("folioSummary");
    if (summary) summary.style.display = "none";

    const numInput = document.getElementById("invoiceNumber");
    if (numInput) {
        numInput.value = `HD${Date.now().toString().slice(-5)}`;
    }

    const modal = document.getElementById("invoiceModal");
    if (modal) modal.style.display = "flex";
}

function closeInvoiceForm() {
    const modal = document.getElementById("invoiceModal");
    if (modal) modal.style.display = "none";

    const form = document.getElementById("invoiceForm");
    if (form) form.reset();

    const summary = document.getElementById("folioSummary");
    if (summary) summary.style.display = "none";

    editingInvoiceId = null;
}

function editInvoice(id) {
    const invoice = invoices.find(item => Number(item.id || item.Id) === id);

    if (!invoice) {
        alert("Không tìm thấy thông tin hóa đơn.");
        return;
    }

    editingInvoiceId = id;

    const title = document.getElementById("invoiceFormTitle");
    if (title) title.textContent = "Sửa hóa đơn";

    const numInput = document.getElementById("invoiceNumber");
    if (numInput) numInput.value = invoice.soHoaDon || invoice.SoHoaDon || "";

    const statusSelect = document.getElementById("invoiceStatusForm");
    if (statusSelect) {
        const st = String(invoice.trangThai || invoice.TrangThai || "");
        statusSelect.value = st.toLowerCase().includes("dathanhtoan") ? "DaThanhToan" : "ChuaThanhToan";
    }

    const folioSelect = document.getElementById("folioId");
    if (folioSelect) {
        populateFolioDropdown();
        folioSelect.value = String(invoice.phieuTinhTienId || invoice.PhieuTinhTienId || "");
        folioSelect.disabled = true;
    }

    onFolioChange();

    const modal = document.getElementById("invoiceModal");
    if (modal) modal.style.display = "flex";
}

async function saveInvoice(event) {
    event.preventDefault();

    const numInput = document.getElementById("invoiceNumber");
    const statusSelect = document.getElementById("invoiceStatusForm");
    const folioSelect = document.getElementById("folioId");

    const soHoaDon = (numInput ? numInput.value : "").trim();
    const trangThai = statusSelect ? statusSelect.value : "ChuaThanhToan";

    if (!soHoaDon) {
        alert("Vui lòng nhập số hóa đơn.");
        if (numInput) numInput.focus();
        return;
    }

    const isEditing = editingInvoiceId !== null;
    const payload = {
        soHoaDon,
        trangThai
    };

    if (!isEditing) {
        const folioId = Number(folioSelect ? folioSelect.value : 0);
        if (!folioId || folioId <= 0) {
            alert("Vui lòng chọn phiếu tính tiền để lập hóa đơn.");
            if (folioSelect) folioSelect.focus();
            return;
        }
        payload.phieuTinhTienId = folioId;
    }

    const saveBtn = document.getElementById("btnSaveInvoice");
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = "Đang lưu...";
    }

    try {
        const url = isEditing
            ? `${INVOICE_API}/${editingInvoiceId}`
            : INVOICE_API;

        await invoiceRequest(url, {
            method: isEditing ? "PUT" : "POST",
            body: JSON.stringify(payload)
        });

        alert(isEditing
            ? "Cập nhật hóa đơn thành công!"
            : "Lập hóa đơn mới thành công!");

        closeInvoiceForm();
        await loadInvoices();
    } catch (error) {
        alert(`Không thể lưu hóa đơn: ${error.message}`);
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = "Lưu hóa đơn";
        }
    }
}

async function deleteInvoice(id) {
    if (!confirm("Bạn có chắc chắn muốn xóa hóa đơn này?")) return;

    try {
        await invoiceRequest(`${INVOICE_API}/${id}`, {
            method: "DELETE"
        });

        alert("Xóa hóa đơn thành công!");
        await loadInvoices();
    } catch (error) {
        alert(`Không thể xóa hóa đơn: ${error.message}`);
    }
}

async function exportInvoicePdf(id) {
    try {
        const blob = await invoiceRequest(`${INVOICE_API}/${id}/pdf`);

        if (!(blob instanceof Blob)) {
            throw new Error("Không nhận được file PDF từ máy chủ.");
        }

        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = objectUrl;
        link.download = `HoaDon_${id}.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();

        URL.revokeObjectURL(objectUrl);
    } catch (error) {
        alert(`Không thể in hóa đơn: ${error.message}`);
    }
}

// Bắt sự kiện click ngoài modal để đóng
document.addEventListener("click", event => {
    const modal = document.getElementById("invoiceModal");
    if (event.target === modal) {
        closeInvoiceForm();
    }
});

// Window exports
window.openInvoiceForm = openInvoiceForm;
window.closeInvoiceForm = closeInvoiceForm;
window.editInvoice = editInvoice;
window.deleteInvoice = deleteInvoice;
window.exportInvoicePdf = exportInvoicePdf;
window.searchInvoice = searchInvoice;
window.filterInvoice = filterInvoice;
window.onFolioChange = onFolioChange;
