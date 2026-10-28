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
    const SERVICE_API_URL = `${API_BASE}/Service`;
    const CHI_TIET_API_URL = `${API_BASE}/ChiTietPhieuTinhTien`;
    const RESERVATION_API_URL = `${API_BASE}/Reservation`;
    const GUEST_API_URL = `${API_BASE}/Guest`;

    // Elements cho Lập phiếu phòng
    const form = document.getElementById("billingForm");
    const message = document.getElementById("billingMessage");
    const listMessage = document.getElementById("listMessage");
    const tableBody = document.getElementById("billingTableBody");
    const calculateBtn = document.getElementById("calculateBtn");

    // Elements cho Quản lý dịch vụ theo phiếu
    const selectedBillSelect = document.getElementById("selectedBillId");
    const reloadBillDetailsBtn = document.getElementById("reloadBillDetailsBtn");
    const billSummaryBox = document.getElementById("billSummaryBox");
    const summaryBillTitle = document.getElementById("summaryBillTitle");
    const summaryBillStatus = document.getElementById("summaryBillStatus");
    const summaryRoomPrice = document.getElementById("summaryRoomPrice");
    const summaryServicePrice = document.getElementById("summaryServicePrice");
    const summaryTotalPrice = document.getElementById("summaryTotalPrice");
    const billLockNotice = document.getElementById("billLockNotice");

    const addServiceForm = document.getElementById("addServiceForm");
    const serviceSelect = document.getElementById("serviceSelect");
    const serviceUnitPriceDisplay = document.getElementById("serviceUnitPriceDisplay");
    const serviceQuantityInput = document.getElementById("serviceQuantity");
    const serviceSubtotalDisplay = document.getElementById("serviceSubtotalDisplay");
    const btnAddServiceSubmit = document.getElementById("btnAddServiceSubmit");
    const serviceMessage = document.getElementById("serviceMessage");
    const billDetailsTableBody = document.getElementById("billDetailsTableBody");

    // Bộ nhớ đệm dữ liệu
    let cachedServices = [];
    let cachedBills = [];
    let currentActiveBill = null;

    const money = value =>
        new Intl.NumberFormat("vi-VN", {
            style: "currency",
            currency: "VND",
            maximumFractionDigits: 0
        }).format(Number(value || 0));

    function showMessage(element, text, success = false) {
        if (!element) return;
        element.textContent = text;
        element.style.color = success ? "#15803d" : "#b91c1c";
        element.style.fontWeight = "600";
    }

    function clearMessage(element) {
        if (!element) return;
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

    // ========================================================
    // 1. TẢI DANH MỤC DỊCH VỤ TỪ API SERVICE
    // ========================================================
    async function loadServices() {
        try {
            const data = await apiRequest(SERVICE_API_URL);
            cachedServices = Array.isArray(data) ? data : [];

            if (!serviceSelect) return;

            const activeServices = cachedServices.filter(s => s.isActive !== false && s.IsActive !== false);

            if (activeServices.length === 0) {
                serviceSelect.innerHTML = '<option value="">-- Khách sạn chưa có dịch vụ hoạt động --</option>';
                return;
            }

            serviceSelect.innerHTML = '<option value="">-- Chọn dịch vụ --</option>' +
                activeServices.map(s => {
                    const id = s.id ?? s.Id;
                    const name = s.name ?? s.Name;
                    const price = s.price ?? s.Price;
                    const unit = s.unit ?? s.Unit ?? "";
                    const unitText = unit ? ` / ${unit}` : "";
                    return `<option value="${id}" data-price="${price}">${escapeHtml(name)} (${money(price)}${escapeHtml(unitText)})</option>`;
                }).join("");

        } catch (error) {
            console.error("Lỗi tải danh mục dịch vụ:", error);
            if (serviceSelect) {
                serviceSelect.innerHTML = '<option value="">-- Lỗi tải danh mục dịch vụ --</option>';
            }
        }
    }

    // Cập nhật giá và thành tiền tạm tính khi chọn dịch vụ / đổi số lượng
    function updateServiceSubtotal() {
        const selectedOption = serviceSelect.options[serviceSelect.selectedIndex];
        const price = Number(selectedOption?.getAttribute("data-price") || 0);
        const qty = Number(serviceQuantityInput.value || 1);

        serviceUnitPriceDisplay.value = price > 0 ? money(price) : "0 đ";
        serviceSubtotalDisplay.value = (price * qty) > 0 ? money(price * qty) : "0 đ";
    }

    if (serviceSelect) {
        serviceSelect.addEventListener("change", updateServiceSubtotal);
    }
    if (serviceQuantityInput) {
        serviceQuantityInput.addEventListener("input", updateServiceSubtotal);
    }

    // ========================================================
    // 2. TẢI VÀ CHỌN PHIẾU TÍNH TIỀN CHO KHU VỰC DỊCH VỤ
    // ========================================================
    function populateBillDropdown(bills, keepSelectedId = null) {
        if (!selectedBillSelect) return;

        const currentVal = keepSelectedId || selectedBillSelect.value;

        if (!Array.isArray(bills) || bills.length === 0) {
            selectedBillSelect.innerHTML = '<option value="">-- Chưa có phiếu tính tiền nào --</option>';
            billSummaryBox.style.display = "none";
            addServiceForm.style.display = "none";
            return;
        }

        selectedBillSelect.innerHTML = '<option value="">-- Chọn phiếu tính tiền để thêm/xem dịch vụ --</option>' +
            bills.map(b => {
                const id = b.id ?? b.Id;
                const rId = b.datPhongId ?? b.DatPhongId;
                const total = b.tongTien ?? b.TongTien;
                const status = b.trangThai ?? b.TrangThai;
                const isPaid = status === "DaThanhToan";
                const badge = isPaid ? "[Đã thanh toán]" : "[Chưa thanh toán]";
                return `<option value="${id}">Phiếu #${id} | Đặt phòng: ${rId} | Tổng: ${money(total)} ${badge}</option>`;
            }).join("");

        if (currentVal && bills.some(b => (b.id ?? b.Id) == currentVal)) {
            selectedBillSelect.value = currentVal;
            onSelectBillChange();
        }
    }

    async function onSelectBillChange() {
        clearMessage(serviceMessage);
        const billId = Number(selectedBillSelect.value);

        if (!billId) {
            currentActiveBill = null;
            billSummaryBox.style.display = "none";
            addServiceForm.style.display = "none";
            billDetailsTableBody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; color: #64748b; padding: 20px;">
                        Vui lòng chọn một phiếu tính tiền ở trên để xem chi tiết dịch vụ.
                    </td>
                </tr>
            `;
            return;
        }

        await loadBillDetails(billId);
    }

    if (selectedBillSelect) {
        selectedBillSelect.addEventListener("change", onSelectBillChange);
    }

    if (reloadBillDetailsBtn) {
        reloadBillDetailsBtn.addEventListener("click", () => {
            const billId = Number(selectedBillSelect.value);
            if (billId) {
                loadBillDetails(billId);
            } else {
                showMessage(serviceMessage, "Vui lòng chọn một phiếu tính tiền.");
            }
        });
    }

    // Tải thông tin phiếu và danh sách chi tiết dịch vụ của phiếu đó
    async function loadBillDetails(billId) {
        try {
            // Lấy dữ liệu mới nhất của phiếu từ API
            const bill = await apiRequest(`${API_URL}/${billId}`);
            currentActiveBill = bill;

            // Cập nhật khung tóm tắt phiếu
            billSummaryBox.style.display = "block";
            summaryBillTitle.textContent = `Phiếu tính tiền #${bill.id} (Đặt phòng #${bill.datPhongId})`;

            const isPaid = bill.trangThai === "DaThanhToan";
            summaryBillStatus.innerHTML = `
                <span class="badge-status ${isPaid ? 'badge-paid' : 'badge-unpaid'}">
                    ${escapeHtml(statusLabel(bill.trangThai))}
                </span>
            `;

            summaryRoomPrice.textContent = money(bill.tienPhong);
            summaryServicePrice.textContent = money(bill.tienDichVu);
            summaryTotalPrice.textContent = money(bill.tongTien);

            // Kiểm tra trạng thái khóa (nếu đã thanh toán thì không cho thêm hoặc xóa)
            if (isPaid) {
                addServiceForm.style.display = "none";
                billLockNotice.style.display = "block";
            } else {
                addServiceForm.style.display = "block";
                billLockNotice.style.display = "none";
            }

            // Lấy danh sách chi tiết dịch vụ của phiếu từ Backend
            billDetailsTableBody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; color: #64748b; padding: 15px;">
                        Đang tải chi tiết dịch vụ...
                    </td>
                </tr>
            `;

            const details = await apiRequest(`${CHI_TIET_API_URL}?phieuTinhTienId=${billId}`);
            renderBillDetailsTable(details, isPaid);

        } catch (error) {
            console.error("Lỗi khi tải chi tiết phiếu tính tiền:", error);
            showMessage(serviceMessage, `Lỗi tải chi tiết phiếu: ${error.message}`);
        }
    }

    // Hiển thị bảng chi tiết dịch vụ đã ghi nhận
    function renderBillDetailsTable(details, isPaid) {
        if (!Array.isArray(details) || details.length === 0) {
            billDetailsTableBody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; color: #64748b; padding: 20px;">
                        Phiếu tính tiền này chưa có dịch vụ nào được ghi nhận.
                    </td>
                </tr>
            `;
            return;
        }

        let totalServiceAmount = 0;

        const rowsHtml = details.map((item, index) => {
            const id = item.id ?? item.Id;
            const name = item.tenDichVu ?? item.TenDichVu ?? "Dịch vụ";
            const unit = item.donViTinh ?? item.DonViTinh ?? "";
            const qty = Number(item.soLuong ?? item.SoLuong ?? 1);
            const price = Number(item.donGia ?? item.DonGia ?? 0);
            const lineTotal = Number(item.thanhTien ?? item.ThanhTien ?? (qty * price));

            totalServiceAmount += lineTotal;

            const actionCell = isPaid
                ? `<span style="color: #94a3b8; font-size: 12px;">Đã khóa</span>`
                : `<button type="button" class="btn-danger-sm" onclick="window.removeServiceItem(${id})">Xóa</button>`;

            return `
                <tr>
                    <td style="text-align: center;">${index + 1}</td>
                    <td><strong>${escapeHtml(name)}</strong></td>
                    <td>${escapeHtml(unit || "-")}</td>
                    <td style="text-align: right; font-weight: 600;">${qty}</td>
                    <td style="text-align: right;">${escapeHtml(money(price))}</td>
                    <td style="text-align: right; font-weight: 700; color: #d97706;">${escapeHtml(money(lineTotal))}</td>
                    <td style="text-align: center;">${actionCell}</td>
                </tr>
            `;
        }).join("");

        const footerHtml = `
            <tr style="background: #f8fafc; font-weight: 700;">
                <td colspan="5" style="text-align: right; padding-right: 15px;">Tổng cộng tiền dịch vụ:</td>
                <td style="text-align: right; color: #d97706; font-size: 15px;">${escapeHtml(money(totalServiceAmount))}</td>
                <td></td>
            </tr>
        `;

        billDetailsTableBody.innerHTML = rowsHtml + footerHtml;
    }

    // ========================================================
    // 3. THỰC HIỆN THÊM DỊCH VỤ VÀO PHIẾU TÍNH TIỀN
    // ========================================================
    if (addServiceForm) {
        addServiceForm.addEventListener("submit", async function (e) {
            e.preventDefault();
            clearMessage(serviceMessage);

            if (!currentActiveBill) {
                showMessage(serviceMessage, "Vui lòng chọn phiếu tính tiền trước.");
                return;
            }

            if (currentActiveBill.trangThai === "DaThanhToan") {
                showMessage(serviceMessage, "Phiếu tính tiền đã thanh toán, không thể thêm dịch vụ.");
                return;
            }

            const billId = Number(selectedBillSelect.value);
            const serviceId = Number(serviceSelect.value);
            const qty = Number(serviceQuantityInput.value);

            if (!serviceId) {
                showMessage(serviceMessage, "Vui lòng chọn một dịch vụ từ danh sách.");
                return;
            }

            if (!Number.isInteger(qty) || qty <= 0) {
                showMessage(serviceMessage, "Số lượng dịch vụ phải là số nguyên lớn hơn 0.");
                return;
            }

            btnAddServiceSubmit.disabled = true;
            btnAddServiceSubmit.textContent = "Đang xử lý...";

            try {
                // Gọi API POST /api/ChiTietPhieuTinhTien (Backend tự tính đơn giá từ DB)
                const payload = {
                    phieuTinhTienId: billId,
                    dichVuId: serviceId,
                    soLuong: qty
                };

                const result = await apiRequest(CHI_TIET_API_URL, {
                    method: "POST",
                    body: JSON.stringify(payload)
                });

                showMessage(
                    serviceMessage,
                    result.message || "Thêm dịch vụ vào phiếu tính tiền thành công.",
                    true
                );

                // Reset form nhập
                serviceSelect.value = "";
                serviceQuantityInput.value = 1;
                updateServiceSubtotal();

                // Tải lại chi tiết phiếu tính tiền và danh sách các phiếu từ Backend
                await loadBillDetails(billId);
                await loadBills();

            } catch (err) {
                console.error("Lỗi thêm dịch vụ:", err);
                showMessage(serviceMessage, `Không thể thêm dịch vụ: ${err.message}`);
            } finally {
                btnAddServiceSubmit.disabled = false;
                btnAddServiceSubmit.textContent = "+ Thêm dịch vụ vào phiếu";
            }
        });
    }

    // ========================================================
    // 4. THỰC HIỆN XÓA DỊCH VỤ KHỎI PHIẾU TÍNH TIỀN
    // ========================================================
    window.removeServiceItem = async function (detailId) {
        if (!detailId) return;

        if (!currentActiveBill) {
            showMessage(serviceMessage, "Không xác định được phiếu tính tiền.");
            return;
        }

        if (currentActiveBill.trangThai === "DaThanhToan") {
            showMessage(serviceMessage, "Phiếu tính tiền đã thanh toán, không thể xóa dịch vụ.");
            return;
        }

        const confirmDelete = confirm("Bạn có chắc chắn muốn xóa dịch vụ này khỏi phiếu tính tiền?");
        if (!confirmDelete) return;

        clearMessage(serviceMessage);

        try {
            const billId = Number(selectedBillSelect.value);

            const result = await apiRequest(`${CHI_TIET_API_URL}/${detailId}`, {
                method: "DELETE"
            });

            showMessage(
                serviceMessage,
                result.message || "Xóa chi tiết dịch vụ thành công.",
                true
            );

            // Tải lại chi tiết phiếu tính tiền và danh sách phiếu
            await loadBillDetails(billId);
            await loadBills();

        } catch (err) {
            console.error("Lỗi xóa dịch vụ:", err);
            showMessage(serviceMessage, `Không thể xóa dịch vụ: ${err.message}`);
        }
    };

    // Hàm toàn cục khi bấm "Chọn phiếu" ở bảng danh sách
    window.selectBill = function (billId) {
        if (!selectedBillSelect) return;
        selectedBillSelect.value = billId;
        onSelectBillChange();

        // Cuộn màn hình tới khu vực dịch vụ
        const target = document.getElementById("serviceSection");
        if (target) {
            target.scrollIntoView({ behavior: "smooth" });
        }
    };

    // ========================================================
    // 5. TẢI DANH SÁCH ĐƠN ĐẶT PHÒNG CHO DROPDOWN
    // ========================================================
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

    // ========================================================
    // 6. TÍNH TIỀN PHÒNG VÀ LƯU PHIẾU
    // ========================================================
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

            // Tải lại danh sách phiếu và tự động chọn phiếu vừa tạo vào khu vực thêm dịch vụ
            await loadBills();
            if (result.phieuTinhTienId) {
                window.selectBill(result.phieuTinhTienId);
            }

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

    // ========================================================
    // 7. TẢI TOÀN BỘ DANH SÁCH PHIẾU TÍNH TIỀN
    // ========================================================
    async function loadBills() {
        tableBody.innerHTML =
            '<tr><td colspan="8">Đang tải dữ liệu...</td></tr>';

        clearMessage(listMessage);

        try {
            const bills = await apiRequest(API_URL);
            cachedBills = Array.isArray(bills) ? bills : [];

            // Cập nhật dropdown chọn phiếu
            const currentSelected = selectedBillSelect ? selectedBillSelect.value : null;
            populateBillDropdown(cachedBills, currentSelected);

            if (cachedBills.length === 0) {
                tableBody.innerHTML =
                    '<tr><td colspan="8" style="text-align: center; color: #64748b; padding: 20px;">Chưa có phiếu tính tiền nào.</td></tr>';
                return;
            }

            tableBody.innerHTML = cachedBills.map(bill => {
                const id = bill.id ?? bill.Id;
                const rId = bill.datPhongId ?? bill.DatPhongId;
                const date = bill.ngayTao ?? bill.NgayTao;
                const roomAmt = bill.tienPhong ?? bill.TienPhong;
                const srvAmt = bill.tienDichVu ?? bill.TienDichVu;
                const totalAmt = bill.tongTien ?? bill.TongTien;
                const status = bill.trangThai ?? bill.TrangThai;
                const isPaid = status === "DaThanhToan";

                return `
                    <tr>
                        <td style="font-weight: 700;">#${escapeHtml(id)}</td>
                        <td>Đơn #${escapeHtml(rId)}</td>
                        <td>${escapeHtml(formatDate(date))}</td>
                        <td style="font-weight: 600;">${escapeHtml(money(roomAmt))}</td>
                        <td style="color: #d97706; font-weight: 600;">${escapeHtml(money(srvAmt))}</td>
                        <td style="font-weight: 700; color: #15803d;">${escapeHtml(money(totalAmt))}</td>
                        <td>
                            <span class="badge-status ${isPaid ? 'badge-paid' : 'badge-unpaid'}">
                                ${escapeHtml(statusLabel(status))}
                            </span>
                        </td>
                        <td style="text-align: center;">
                            <button type="button" class="btn btn-secondary btn-sm" onclick="window.selectBill(${id})">
                                Chọn phiếu
                            </button>
                        </td>
                    </tr>
                `;
            }).join("");

        } catch (error) {
            tableBody.innerHTML =
                '<tr><td colspan="8">Không tải được dữ liệu.</td></tr>';

            showMessage(listMessage, error.message);
        }
    }

    document.getElementById("refreshBillsBtn")
        .addEventListener("click", () => {
            loadBills();
            loadReservations();
            loadServices();
        });

    // Khởi tạo
    loadReservations();
    loadServices();
    loadBills();
});
