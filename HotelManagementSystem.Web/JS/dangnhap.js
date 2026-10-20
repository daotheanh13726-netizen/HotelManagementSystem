// Tự động xác định địa chỉ API theo origin hiện tại (hỗ trợ cả chạy trực tiếp và qua Gateway)
function getAuthApiOrigin() {
    if (window.location.protocol.startsWith("http")) {
        return window.location.origin;
    }
    return "http://localhost:5054";
}

const API_ORIGIN = getAuthApiOrigin();
const AUTH_LOGIN_URL = `${API_ORIGIN}/api/Auth/login`;
const AUTH_REGISTER_URL = `${API_ORIGIN}/api/Auth/register-customer`;

// Chuyển đổi tab Đăng nhập / Đăng ký
function switchAuthTab(tab) {
    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");
    const tabLoginBtn = document.getElementById("tabLoginBtn");
    const tabRegisterBtn = document.getElementById("tabRegisterBtn");

    if (tab === "register") {
        if (loginForm) loginForm.style.display = "none";
        if (registerForm) registerForm.style.display = "block";
        if (tabLoginBtn) tabLoginBtn.classList.remove("active");
        if (tabRegisterBtn) tabRegisterBtn.classList.add("active");
        const regUser = document.getElementById("regUsername");
        if (regUser) regUser.focus();
    } else {
        if (loginForm) loginForm.style.display = "block";
        if (registerForm) registerForm.style.display = "none";
        if (tabLoginBtn) tabLoginBtn.classList.add("active");
        if (tabRegisterBtn) tabRegisterBtn.classList.remove("active");
        const user = document.getElementById("username");
        if (user) user.focus();
    }
}
window.switchAuthTab = switchAuthTab;

document.addEventListener("DOMContentLoaded", function () {
    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");

    // ==========================================
    // XỬ LÝ ĐĂNG NHẬP (GIỮ NGUYÊN CHO ADMIN, LỄ TÂN, KẾ TOÁN VÀ KHÁCH)
    // ==========================================
    if (loginForm) {
        loginForm.addEventListener("submit", async function (event) {
            event.preventDefault();

            const username = document.getElementById("username").value.trim();
            const password = document.getElementById("password").value;
            const roleElement = document.getElementById("role");

            if (!username) {
                alert("Vui lòng nhập tên đăng nhập.");
                document.getElementById("username").focus();
                return;
            }

            if (!password.trim()) {
                alert("Vui lòng nhập mật khẩu.");
                document.getElementById("password").focus();
                return;
            }

            if (roleElement && !roleElement.value) {
                alert("Vui lòng chọn vai trò.");
                roleElement.focus();
                return;
            }

            const submitButton = document.getElementById("btnLoginSubmit");
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.textContent = "Đang đăng nhập...";
            }

            try {
                const response = await fetch(AUTH_LOGIN_URL, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        username: username,
                        password: password
                    })
                });

                const result = await response.json().catch(() => ({}));

                if (!response.ok) {
                    throw new Error(
                        result.message || "Đăng nhập thất bại."
                    );
                }

                if (!result.token || !result.roleName) {
                    throw new Error(
                        "Dữ liệu đăng nhập từ máy chủ không hợp lệ."
                    );
                }

                // Lưu thông tin phiên đăng nhập để các trang sử dụng
                localStorage.setItem("token", result.token);
                localStorage.setItem("userId", String(result.userId ?? ""));
                if (result.guestId !== undefined && result.guestId !== null) {
                    localStorage.setItem("guestId", String(result.guestId));
                } else {
                    localStorage.removeItem("guestId");
                }
                localStorage.setItem("username", result.username ?? username);
                localStorage.setItem("fullName", result.fullName ?? "");
                localStorage.setItem("roleName", result.roleName);

                // Điều hướng theo vai trò thực tế từ Backend
                const role = result.roleName.trim().toLowerCase();

                switch (role) {
                    case "admin":
                        window.location.href = "admin.html";
                        break;

                    case "lễ tân":
                    case "letan":
                        window.location.href = "letan.html";
                        break;

                    case "kế toán":
                    case "ketoan":
                        window.location.href = "ketoan.html";
                        break;

                    case "khách":
                    case "khach":
                    case "guest":
                        window.location.href = "khach.html";
                        break;

                    default:
                        localStorage.removeItem("token");
                        alert(
                            "Tài khoản đăng nhập thành công nhưng vai trò chưa được cấu hình giao diện: "
                            + result.roleName
                        );
                        break;
                }
            } catch (error) {
                console.error("Lỗi đăng nhập:", error);
                alert(
                    error.message ||
                    "Không thể kết nối đến máy chủ. Hãy kiểm tra Backend đang chạy."
                );
            } finally {
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = "Đăng nhập";
                }
            }
        });
    }

    // ==========================================
    // XỬ LÝ ĐĂNG KÝ KHÁCH HÀNG
    // ==========================================
    if (registerForm) {
        registerForm.addEventListener("submit", async function (event) {
            event.preventDefault();

            const username = document.getElementById("regUsername").value.trim();
            const fullName = document.getElementById("regFullName").value.trim();
            const password = document.getElementById("regPassword").value;
            const confirmPassword = document.getElementById("regConfirmPassword").value;
            const phone = document.getElementById("regPhone").value.trim();
            const email = document.getElementById("regEmail").value.trim() || null;
            const identityNumber = document.getElementById("regIdentityNumber").value.trim() || null;
            const address = document.getElementById("regAddress").value.trim() || null;

            if (!username) {
                alert("Vui lòng nhập tên đăng nhập.");
                document.getElementById("regUsername").focus();
                return;
            }

            if (!fullName) {
                alert("Vui lòng nhập họ và tên.");
                document.getElementById("regFullName").focus();
                return;
            }

            if (!password) {
                alert("Vui lòng nhập mật khẩu.");
                document.getElementById("regPassword").focus();
                return;
            }

            if (password !== confirmPassword) {
                alert("Mật khẩu xác nhận không trùng khớp.");
                document.getElementById("regConfirmPassword").focus();
                return;
            }

            if (!phone) {
                alert("Vui lòng nhập số điện thoại.");
                document.getElementById("regPhone").focus();
                return;
            }

            const submitButton = document.getElementById("btnRegisterSubmit");
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.textContent = "Đang đăng ký...";
            }

            try {
                const response = await fetch(AUTH_REGISTER_URL, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        username,
                        password,
                        fullName,
                        phone,
                        email,
                        identityNumber,
                        address
                    })
                });

                const result = await response.json().catch(() => ({}));

                if (!response.ok) {
                    throw new Error(result.message || "Đăng ký không thành công.");
                }

                alert("Đăng ký tài khoản khách hàng thành công! Bạn có thể đăng nhập ngay bây giờ.");

                // Điền sẵn tên đăng nhập và chuyển sang tab Đăng nhập
                const loginUser = document.getElementById("username");
                if (loginUser) loginUser.value = username;

                const roleSelect = document.getElementById("role");
                if (roleSelect) roleSelect.value = "guest";

                registerForm.reset();
                switchAuthTab("login");

                const loginPass = document.getElementById("password");
                if (loginPass) loginPass.focus();
            } catch (error) {
                console.error("Lỗi đăng ký:", error);
                alert(error.message || "Đã xảy ra lỗi khi đăng ký.");
            } finally {
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = "Đăng ký tài khoản";
                }
            }
        });
    }
});
