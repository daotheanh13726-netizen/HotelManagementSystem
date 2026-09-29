document.getElementById("loginForm").addEventListener("submit", function (event) {

    event.preventDefault();

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();
    const role = document.getElementById("role").value;

    if (username === "") {
        alert("Vui lòng nhập tên đăng nhập.");
        return;
    }

    if (password === "") {
        alert("Vui lòng nhập mật khẩu.");
        return;
    }

    if (role === "") {
        alert("Vui lòng chọn vai trò.");
        return;
    }

    // Tạm thời kiểm tra luồng đăng nhập
    if (role === "admin") {
    window.location.href = "admin.html";
    return;
    }

    if (role === "receptionist") {
        window.location.href = "letan.html";
        return;
    }

    if (role === "accountant") {
    window.location.href = "ketoan.html";
    return;
    }

     if (role === "guest") {
    window.location.href = "khach.html";
    return;
}

});