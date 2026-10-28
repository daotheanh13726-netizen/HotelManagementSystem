// Tự động xác định địa chỉ API theo origin hiện tại (hỗ trợ cả chạy trực tiếp và qua Gateway)
function getAuthApiOrigin() {
    if (window.location.protocol.startsWith("http")) {
        return window.location.origin;
    }
    return "http://localhost:5054";
}

const API_ORIGIN = getAuthApiOrigin();
const AUTH_REGISTER_URL = `${API_ORIGIN}/api/Auth/register-customer`;

document.addEventListener("DOMContentLoaded", function () {
    const registerForm = document.getElementById("registerForm");

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
                submitButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>Đang đăng ký...</span>';
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

                alert("Đăng ký tài khoản khách hàng thành công! Đang chuyển hướng đến trang đăng nhập...");

                // Lưu tạm username để tự điền ở trang đăng nhập
                sessionStorage.setItem("registeredUsername", username);

                // Chuyển hướng về trang đăng nhập
                window.location.href = "dangnhap.html";
            } catch (error) {
                console.error("Lỗi đăng ký:", error);
                alert(error.message || "Đã xảy ra lỗi khi đăng ký tài khoản.");
            } finally {
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.innerHTML = '<i class="fa-solid fa-user-plus"></i> <span>Đăng ký tài khoản</span>';
                }
            }
        });
    }
});
