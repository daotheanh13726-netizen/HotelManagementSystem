"use strict";

(function () {
    // Cấu hình danh mục menu theo từng vai trò
    const ROLE_MENUS = {
        admin: [
            { text: "Tổng quan", href: "admin.html" },
            { text: "Phòng", href: "phong.html" },
            { text: "Loại phòng", href: "loaiphong.html" },
            { text: "Bảng giá", href: "banggia.html" },
            { text: "Khách hàng", href: "khachhang.html" },
            { text: "Đặt phòng", href: "datphong.html" },
            { text: "Check-in", href: "checkin.html" },
            { text: "Check-out", href: "checkout.html" },
            { text: "Lịch phòng", href: "lichphong.html" },
            { text: "Dịch vụ", href: "dichvu.html" },
            { text: "Hóa đơn", href: "hoadon.html" },
            { text: "Báo cáo", href: "baocao.html" }
        ],
        
        letan: [
            { text: "Tổng quan", href: "letan.html" },
            { text: "Phòng", href: "phong.html" },
            { text: "Khách hàng", href: "khachhang.html" },
            { text: "Đặt phòng", href: "datphong.html" },
            { text: "Check-in", href: "checkin.html" },
            { text: "Check-out", href: "checkout.html" },
            { text: "Lịch phòng", href: "lichphong.html" },
            { text: "Dịch vụ", href: "dichvu.html" },
            { text: "Phiếu tính tiền", href: "phieutinhtien.html" },
            { text: "Hóa đơn", href: "hoadon.html" }
        ],

        ketoan: [
            { text: "Tổng quan", href: "ketoan.html" },
            { text: "Hóa đơn", href: "hoadon.html" },
            { text: "Báo cáo", href: "baocao.html" }
        ],

        khach: [
            { text: "Trang chủ", href: "khach.html" },
            { text: "Xem phòng", href: "phong.html" },
            { text: "Đặt phòng", href: "khach.html#dat-phong" },
            { text: "Dịch vụ khách sạn", href: "khach.html#dich-vu" }
        ]
    };

    function normalizeRole(role) {
        // 1. Ưu tiên kiểm tra vai trò thực tế đã xác thực trong localStorage
        if (role) {
            const r = role.trim().toLowerCase();
            if (r.includes("admin") || r.includes("quản trị") || r.includes("quantri") || r.includes("manager")) return "admin";
            if (r.includes("lễ tân") || r.includes("letan") || r.includes("receptionist")) return "letan";
            if (r.includes("kế toán") || r.includes("ketoan") || r.includes("accountant")) return "ketoan";
            if (r.includes("khách") || r.includes("khach") || r.includes("guest") || r.includes("customer")) return "khach";
        }

        // 2. Nếu chưa có thông tin đăng nhập, nhận diện theo trang tĩnh đang mở
        const path = (window.location.pathname || "").toLowerCase();
        if (path.includes("admin.html")) return "admin";
        if (path.includes("ketoan.html")) return "ketoan";
        if (path.includes("khach.html")) return "khach";
        if (path.includes("letan.html")) return "letan";

        // 3. Mặc định
        return "admin";
    }

    function initNavigation() {
        const rawRole = localStorage.getItem("roleName") || "";
        const role = normalizeRole(rawRole);
        const currentPage = (window.location.pathname.split("/").pop() || "index.html").toLowerCase();

        // Nếu khách hàng truy cập trực tiếp vào trang quản lý đặt phòng nội bộ của Lễ tân, chuyển hướng về khu vực đặt phòng của khách
        if (role === "khach" && currentPage === "datphong.html") {
            window.location.replace("khach.html#dat-phong");
            return;
        }

        const sidebar = document.querySelector(".sidebar");
        if (!sidebar) return;

        const menuList = ROLE_MENUS[role] || ROLE_MENUS.admin;

        // 1. Tìm hoặc tạo danh sách menu
        let menuUl = sidebar.querySelector("ul.menu") || sidebar.querySelector("ul");
        if (!menuUl) {
            menuUl = document.createElement("ul");
            menuUl.className = "menu";
            const header = sidebar.querySelector(".sidebar-header") || sidebar.querySelector(".logo") || sidebar.querySelector("h2");
            if (header && header.nextSibling) {
                sidebar.insertBefore(menuUl, header.nextSibling);
            } else {
                sidebar.appendChild(menuUl);
            }
        } else {
            menuUl.classList.add("menu");
        }

        // 2. Render lại danh sách menu theo quyền
        menuUl.innerHTML = menuList.map(item => {
            const isCurrent = currentPage === item.href.toLowerCase();
            return `<li class="${isCurrent ? "active" : ""}"><a href="${item.href}">${item.text}</a></li>`;
        }).join("");

        // 3. Khởi tạo sự kiện nút Đăng xuất
        const logoutBtn = document.getElementById("logoutButton");
        if (logoutBtn) {
            logoutBtn.onclick = function (e) {
                e.preventDefault();
                if (typeof logoutUser === "function") {
                    logoutUser();
                } else {
                    localStorage.clear();
                    sessionStorage.clear();
                    window.location.href = "dangnhap.html";
                }
            };
        }

        // 4. Khởi tạo sự kiện nút Quay lại
        const backBtn = document.getElementById("backButton");
        if (backBtn) {
            backBtn.onclick = function (e) {
                e.preventDefault();
                if (window.history.length > 1) {
                    window.history.back();
                } else {
                    // Mặc định quay về dashboard phù hợp với vai trò
                    const defaultRoutes = {
                        admin: "admin.html",
                        letan: "letan.html",
                        ketoan: "ketoan.html",
                        khach: "khach.html"
                    };
                    window.location.href = defaultRoutes[role] || "index.html";
                }
            };
        }

        // 5. Cập nhật lời chào tên người dùng trên Header nếu có thẻ
        const userFullName = localStorage.getItem("fullName") || localStorage.getItem("username");
        if (userFullName) {
            const welcomeSelectors = ["#welcomeText", "#adminWelcome", "#userName", ".user-name"];
            welcomeSelectors.forEach(sel => {
                const el = document.querySelector(sel);
                if (el) {
                    const roleLabel = {
                        admin: "Quản trị viên",
                        letan: "Nhân viên Lễ tân",
                        ketoan: "Nhân viên Kế toán",
                        khach: "Quý khách"
                    }[role] || "";
                    el.textContent = `Xin chào, ${userFullName}${roleLabel ? " (" + roleLabel + ")" : ""}`;
                }
            });
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initNavigation);
    } else {
        initNavigation();
    }
})();
