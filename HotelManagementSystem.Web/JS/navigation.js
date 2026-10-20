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
            { text: "Đặt phòng", href: "khach.html#dat-phong" }
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
            const baseHref = item.href.split("#")[0].toLowerCase();
            const isActive = baseHref === currentPage;
            return `<li class="${isActive ? "active" : ""}"><a href="${item.href}">${item.text}</a></li>`;
        }).join("");

        // 3. Đảm bảo nút Quay lại & Đăng xuất
        let actions = sidebar.querySelector(".sidebar-actions");
        if (!actions) {
            actions = document.createElement("div");
            actions.className = "sidebar-actions";
            actions.innerHTML = `
                <button type="button" id="backButton">← Quay lại</button>
                <button type="button" id="logoutButton">Đăng xuất</button>
            `;
            sidebar.appendChild(actions);
        }

        // Sự kiện nút Quay lại
        const backBtn = document.getElementById("backButton");
        if (backBtn && !backBtn.dataset.listenerAttached) {
            backBtn.dataset.listenerAttached = "true";
            backBtn.addEventListener("click", () => {
                const previousPage = document.referrer;
                if (previousPage) {
                    try {
                        const previousUrl = new URL(previousPage);
                        if (previousUrl.origin === window.location.origin &&
                            previousUrl.href !== window.location.href) {
                            window.history.back();
                            return;
                        }
                    } catch {}
                }

                const homePages = {
                    admin: "admin.html",
                    letan: "letan.html",
                    ketoan: "ketoan.html",
                    khach: "khach.html"
                };
                window.location.href = homePages[role] || "admin.html";
            });
        }

        // Sự kiện Đăng xuất
        const handleLogout = (e) => {
            if (e) e.preventDefault();
            if (!confirm("Bạn có chắc muốn đăng xuất không?")) return;

            ["token", "userId", "guestId", "username", "fullName", "roleName"].forEach(key => localStorage.removeItem(key));
            window.location.href = "dangnhap.html";
        };

        const logoutBtn = document.getElementById("logoutButton");
        if (logoutBtn && !logoutBtn.dataset.listenerAttached) {
            logoutBtn.dataset.listenerAttached = "true";
            logoutBtn.addEventListener("click", handleLogout);
        }

        const logoutLink = document.getElementById("logoutLink");
        if (logoutLink && !logoutLink.dataset.listenerAttached) {
            logoutLink.dataset.listenerAttached = "true";
            logoutLink.addEventListener("click", handleLogout);
        }

        // Cập nhật tên người dùng trên Header nếu có thẻ hiển thị
        const fullName = localStorage.getItem("fullName") || localStorage.getItem("username");
        const welcomeEl = document.getElementById("adminWelcome") || 
                          document.getElementById("welcomeText") || 
                          document.querySelector(".header-right span");
        if (welcomeEl && fullName && (!welcomeEl.textContent || welcomeEl.textContent.trim().toLowerCase().startsWith("xin chào"))) {
            const roleDisplay = rawRole ? ` (${rawRole})` : "";
            welcomeEl.textContent = `Xin chào, ${fullName}${roleDisplay}`;
        }

        console.log(`[Navigation] Vai trò: ${role} | Số mục menu: ${menuList.length} | Trang: ${currentPage}`);
    }

    window.initNavigation = initNavigation;

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initNavigation);
    } else {
        initNavigation();
    }

    // Đảm bảo chạy lại cả khi trình duyệt back/forward (bfcache)
    window.addEventListener("pageshow", initNavigation);
})();
