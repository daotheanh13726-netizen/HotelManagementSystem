"use strict";

function getBangGiaApiOrigin() {
    if (typeof API_BASE_URL !== "undefined" && API_BASE_URL) {
        return API_BASE_URL;
    }
    if (window.location.protocol.startsWith("http")) {
        return `${window.location.origin}/api`;
    }
    return "http://localhost:5054/api";
}

const API_BASE = getBangGiaApiOrigin();
const BANGGIA_API = `${API_BASE}/BangGia`;
const ROOMTYPE_API = `${API_BASE}/RoomType`;

let allRates = [];
let allRoomTypes = [];
let editingRateId = null;

document.addEventListener("DOMContentLoaded", initBangGiaPage);

function initBangGiaPage() {
    const searchInput = document.getElementById("searchRate");
    if (searchInput) {
        searchInput.addEventListener("input", filterRates);
    }

    loadData();
}

async function apiRequest(url, options = {}) {
    const token = typeof getToken === "function" ? getToken() : localStorage.getItem("token");

    const headers = {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers
    };

    const response = await fetch(url, { ...options, headers });

    if (response.status === 204) return null;

    const text = await response.text();
    let data = null;
    try {
        data = text ? JSON.parse(text) : null;
    } catch {
        data = text;
    }

    if (!response.ok) {
        const message = data?.message || data?.title || `Lỗi HTTP ${response.status}`;
        throw new Error(message);
    }

    return data;
}

function money(value) {
    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0
    }).format(Number(value || 0));
}

function formatDate(value) {
    if (!value) return "—";
    return String(value).substring(0, 10);
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

function getList(result) {
    if (Array.isArray(result)) return result;
    if (Array.isArray(result?.data)) return result.data;
    if (Array.isArray(result?.items)) return result.items;
    return [];
}

async function loadData() {
    const tbody = document.getElementById("rateTableBody");
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#6b7280;">Đang tải dữ liệu bảng giá...</td></tr>';
    }

    try {
        const [rates, roomTypes] = await Promise.all([
            apiRequest(BANGGIA_API),
            apiRequest(ROOMTYPE_API)
        ]);

        allRates = getList(rates);
        allRoomTypes = getList(roomTypes);

        populateRoomTypeSelect();
        renderRates(allRates);
    } catch (err) {
        console.error("Lỗi tải bảng giá:", err);
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#dc2626;">Lỗi tải dữ liệu: ${escapeHtml(err.message)}</td></tr>`;
        }
    }
}

function populateRoomTypeSelect() {
    const select = document.getElementById("roomType");
    if (!select) return;

    select.innerHTML = '<option value="">Chọn loại phòng</option>' +
        allRoomTypes.map(rt => {
            const id = rt.id ?? rt.Id;
            const name = rt.name ?? rt.Name;
            return `<option value="${id}">${escapeHtml(name)}</option>`;
        }).join("");
}

function getRoomTypeName(roomTypeId) {
    const rt = allRoomTypes.find(item => Number(item.id ?? item.Id) === Number(roomTypeId));
    return rt ? (rt.name ?? rt.Name) : `Loại #${roomTypeId}`;
}

function renderRates(rates) {
    const tbody = document.getElementById("rateTableBody");
    if (!tbody) return;

    if (!rates || !rates.length) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#6b7280; padding:20px;">Chưa có bảng giá nào.</td></tr>';
        return;
    }

    tbody.innerHTML = rates.map(rate => {
        const id = rate.id ?? rate.Id;
        const roomTypeId = rate.roomTypeId ?? rate.RoomTypeId;
        const rateName = rate.rateName ?? rate.RateName ?? "";
        const startDate = rate.startDate ?? rate.StartDate;
        const endDate = rate.endDate ?? rate.EndDate;
        const nightPrice = rate.pricePerNight ?? rate.PricePerNight;
        const hourPrice = rate.pricePerHour ?? rate.PricePerHour;

        return `
            <tr>
                <td><strong>${escapeHtml(getRoomTypeName(roomTypeId))}</strong></td>
                <td>${escapeHtml(rateName)}</td>
                <td>${escapeHtml(formatDate(startDate))}</td>
                <td>${escapeHtml(formatDate(endDate))}</td>
                <td>${escapeHtml(money(nightPrice))}</td>
                <td>${escapeHtml(money(hourPrice))}</td>
                <td>
                    <button type="button" class="btn-edit" onclick="editRate(${Number(id)})">Sửa</button>
                    <button type="button" class="btn-delete" onclick="deleteRate(${Number(id)})">Xóa</button>
                </td>
            </tr>
        `;
    }).join("");
}

function filterRates() {
    const keyword = (document.getElementById("searchRate")?.value || "").trim().toLowerCase();

    const filtered = allRates.filter(rate => {
        const name = getRoomTypeName(rate.roomTypeId ?? rate.RoomTypeId).toLowerCase();
        const season = String(rate.rateName ?? rate.RateName ?? "").toLowerCase();
        return !keyword || name.includes(keyword) || season.includes(keyword);
    });

    renderRates(filtered);
}

function openRateForm() {
    editingRateId = null;
    const formSection = document.getElementById("rateFormSection");
    if (!formSection) return;

    document.getElementById("roomType").value = "";
    document.getElementById("seasonName").value = "";
    document.getElementById("startDate").value = "";
    document.getElementById("endDate").value = "";
    document.getElementById("nightPrice").value = "";
    document.getElementById("hourPrice").value = "";

    formSection.style.display = "block";
    formSection.scrollIntoView({ behavior: "smooth" });
}

function closeRateForm() {
    const formSection = document.getElementById("rateFormSection");
    if (formSection) formSection.style.display = "none";
    editingRateId = null;
}

function editRate(id) {
    const rate = allRates.find(r => Number(r.id ?? r.Id) === Number(id));
    if (!rate) return;

    editingRateId = id;
    const formSection = document.getElementById("rateFormSection");
    if (!formSection) return;

    document.getElementById("roomType").value = String(rate.roomTypeId ?? rate.RoomTypeId);
    document.getElementById("seasonName").value = rate.rateName ?? rate.RateName ?? "";
    document.getElementById("startDate").value = formatDate(rate.startDate ?? rate.StartDate);
    document.getElementById("endDate").value = formatDate(rate.endDate ?? rate.EndDate);
    document.getElementById("nightPrice").value = rate.pricePerNight ?? rate.PricePerNight ?? 0;
    document.getElementById("hourPrice").value = rate.pricePerHour ?? rate.PricePerHour ?? 0;

    formSection.style.display = "block";
    formSection.scrollIntoView({ behavior: "smooth" });
}

async function deleteRate(id) {
    if (!confirm("Bạn có chắc chắn muốn xóa bảng giá này?")) return;

    try {
        await apiRequest(`${BANGGIA_API}/${id}`, { method: "DELETE" });
        alert("Đã xóa bảng giá thành công.");
        await loadData();
    } catch (err) {
        alert(`Không thể xóa bảng giá: ${err.message}`);
    }
}

async function saveRate() {
    const roomType = document.getElementById("roomType")?.value;
    const seasonName = document.getElementById("seasonName")?.value.trim();
    const startDate = document.getElementById("startDate")?.value;
    const endDate = document.getElementById("endDate")?.value;
    const nightPrice = document.getElementById("nightPrice")?.value;
    const hourPrice = document.getElementById("hourPrice")?.value;

    if (!roomType) {
        alert("Vui lòng chọn loại phòng.");
        return;
    }
    if (!seasonName) {
        alert("Vui lòng nhập tên mùa.");
        return;
    }
    if (!startDate) {
        alert("Vui lòng chọn ngày bắt đầu.");
        return;
    }
    if (!endDate) {
        alert("Vui lòng chọn ngày kết thúc.");
        return;
    }
    if (endDate < startDate) {
        alert("Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu.");
        return;
    }
    if (nightPrice === "" || Number(nightPrice) < 0) {
        alert("Vui lòng nhập giá theo đêm hợp lệ.");
        return;
    }
    if (hourPrice === "" || Number(hourPrice) < 0) {
        alert("Vui lòng nhập giá theo giờ hợp lệ.");
        return;
    }

    const payload = {
        roomTypeId: Number(roomType),
        rateName: seasonName,
        startDate: startDate,
        endDate: endDate,
        pricePerNight: Number(nightPrice),
        pricePerHour: Number(hourPrice)
    };

    try {
        if (editingRateId) {
            payload.id = editingRateId;
            await apiRequest(`${BANGGIA_API}/${editingRateId}`, {
                method: "PUT",
                body: JSON.stringify(payload)
            });
            alert("Cập nhật bảng giá thành công!");
        } else {
            await apiRequest(BANGGIA_API, {
                method: "POST",
                body: JSON.stringify(payload)
            });
            alert("Thêm bảng giá thành công!");
        }

        closeRateForm();
        await loadData();
    } catch (err) {
        alert(`Không thể lưu bảng giá: ${err.message}`);
    }
}

// Gán hàm vào window để gọi từ onclick trong HTML
window.openRateForm = openRateForm;
window.closeRateForm = closeRateForm;
window.editRate = editRate;
window.deleteRate = deleteRate;
window.saveRate = saveRate;
window.filterRates = filterRates;
