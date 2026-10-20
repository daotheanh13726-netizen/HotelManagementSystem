
"use strict";

function getLetanApiUrl() {
    if (typeof API_BASE_URL !== "undefined" && API_BASE_URL) {
        return API_BASE_URL;
    }

    return window.location.protocol.startsWith("http")
        ? `${window.location.origin}/api`
        : "http://localhost:5054/api";
}

const LETAN_API = getLetanApiUrl();

document.addEventListener("DOMContentLoaded", async () => {
    const name =
        localStorage.getItem("fullName") ||
        localStorage.getItem("username") ||
        "Lễ tân";

    const welcome =
        document.getElementById("welcomeText") ||
        document.getElementById("adminWelcome");

    if (welcome) {
        welcome.textContent = `Xin chào, ${name}`;
    }

    await loadReceptionDashboard();
});

async function letanFetch(path) {
    const token = localStorage.getItem("token");

    if (!token) {
        throw new Error("Bạn chưa đăng nhập.");
    }

    const response = await fetch(`${LETAN_API}${path}`, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json"
        }
    });

    if (!response.ok) {
        const message = await response.text();
        throw new Error(
            message || `API trả về HTTP ${response.status}: ${path}`
        );
    }

    return response.json();
}

function unwrapList(result) {
    if (Array.isArray(result)) return result;
    if (Array.isArray(result?.data)) return result.data;
    if (Array.isArray(result?.items)) return result.items;
    if (Array.isArray(result?.Data)) return result.Data;
    return [];
}

function getField(object, ...names) {
    for (const name of names) {
        if (object?.[name] !== undefined &&
            object?.[name] !== null) {
            return object[name];
        }
    }

    return null;
}

function localDateString(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function dateOnly(value) {
    if (!value) return "";

    const match = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : "";
}

function formatDate(value) {
    const date = dateOnly(value);

    if (!date) return "-";

    const [year, month, day] = date.split("-");
    return `${day}/${month}/${year}`;
}

function setReceptionValue(id, value) {
    const element = document.getElementById(id);

    if (element) {
        element.textContent = String(value);
    }
}

function getId(object) {
    return getField(object, "id", "Id");
}

function getReservationId(item) {
    return getField(item, "reservationId", "ReservationId");
}

function getRoomId(item) {
    return getField(item, "roomId", "RoomId");
}

function getGuestId(reservation) {
    return getField(reservation, "guestId", "GuestId");
}

function getStatusText(status) {
    if (status === null || status === undefined || status === "") {
        return "Chưa xác định";
    }

    // Nếu API serialize enum thành chuỗi, hiển thị tên trực tiếp.
    if (typeof status === "string" && Number.isNaN(Number(status))) {
        return status;
    }

    // Chưa có định nghĩa enum trong Models nên không tự gán
    // số trạng thái thành tên có thể sai.
    return `Trạng thái ${status}`;
}

async function loadReceptionDashboard() {
    const tbody = document.getElementById("dailyBookingTableBody");

    try {
        const [
            roomResult,
            reservationResult,
            reservationRoomResult,
            guestResult
        ] = await Promise.all([
            letanFetch("/Room?page=1&pageSize=100"),
            letanFetch("/Reservation?page=1&pageSize=100"),
            letanFetch("/ReservationRoom?page=1&pageSize=100"),
            letanFetch("/Guest?page=1&pageSize=100")
        ]);

        const rooms = unwrapList(roomResult);
        const reservations = unwrapList(reservationResult);
        const reservationRooms = unwrapList(reservationRoomResult);
        const guests = unwrapList(guestResult);

        const today = localDateString();

        const roomsById = new Map(
            rooms.map(room => [String(getId(room)), room])
        );

        const guestsById = new Map(
            guests.map(guest => [String(getId(guest)), guest])
        );

        // Ghép ReservationRoom với Reservation để lấy ngày,
        // và với Room để lấy số phòng.
        const reservationById = new Map(
            reservations.map(reservation => [
                String(getId(reservation)),
                reservation
            ])
        );

        // Tình trạng phòng chưa được đếm bằng số enum vì cần
        // xác nhận định nghĩa RoomStatus trong Models.
        setReceptionValue("emptyRoomCount", "-");

        // Controller Reservation hiện không cho thấy ngày tạo.
        // Không dùng ngày nhận phòng để giả làm ngày tạo đặt phòng.
        setReceptionValue("todayBookingCount", "-");

        // Đếm check-in/check-out thực tế từ ReservationRoom.
        const actualCheckIns = reservationRooms.filter(item =>
            dateOnly(getField(
                item,
                "checkInActual",
                "CheckInActual"
            )) === today
        );

        const actualCheckOuts = reservationRooms.filter(item =>
            dateOnly(getField(
                item,
                "checkOutActual",
                "CheckOutActual"
            )) === today
        );

        setReceptionValue("todayCheckInCount", actualCheckIns.length);
        setReceptionValue("todayCheckOutCount", actualCheckOuts.length);

        renderDailyBookings({
            reservations,
            reservationRooms,
            roomsById,
            guestsById,
            reservationById,
            today
        });
    } catch (error) {
        console.error("Không tải được dashboard lễ tân:", error);

        setReceptionValue("emptyRoomCount", "-");
        setReceptionValue("todayBookingCount", "-");
        setReceptionValue("todayCheckInCount", "-");
        setReceptionValue("todayCheckOutCount", "-");

        if (tbody) {
            tbody.replaceChildren();

            const tr = document.createElement("tr");
            const td = document.createElement("td");

            td.colSpan = 6;
            td.style.textAlign = "center";
            td.textContent =
                `Không tải được dữ liệu: ${error.message}`;

            tr.appendChild(td);
            tbody.appendChild(tr);
        }
    }
}

function renderDailyBookings({
    reservations,
    reservationRooms,
    roomsById,
    guestsById,
    reservationById,
    today
}) {
    const tbody = document.getElementById("dailyBookingTableBody");

    if (!tbody) return;

    tbody.replaceChildren();

    // Chỉ hiển thị những lượt phòng có lịch nhận hoặc trả hôm nay.
    const dailyReservationRooms = reservationRooms.filter(item => {
        const reservationId = getReservationId(item);
        const reservation = reservationById.get(String(reservationId));

        if (!reservation) return false;

        const checkInDate = dateOnly(getField(
            reservation,
            "checkInDate",
            "CheckInDate"
        ));

        const checkOutDate = dateOnly(getField(
            reservation,
            "checkOutDate",
            "CheckOutDate"
        ));

        return checkInDate === today || checkOutDate === today;
    });

    if (dailyReservationRooms.length === 0) {
        // Một số dự án có thể chưa tạo ReservationRoom cho đặt phòng.
        // Khi đó vẫn hiển thị đặt phòng có lịch hôm nay.
        const reservationsToday = reservations.filter(reservation =>
            dateOnly(getField(
                reservation,
                "checkInDate",
                "CheckInDate"
            )) === today ||
            dateOnly(getField(
                reservation,
                "checkOutDate",
                "CheckOutDate"
            )) === today
        );

        if (reservationsToday.length === 0) {
            showEmptyTable(tbody, "Không có lịch nhận/trả phòng hôm nay.");
            return;
        }

        reservationsToday.forEach(reservation => {
            appendReservationRow({
                tbody,
                reservation,
                room: null,
                guest: guestsById.get(
                    String(getGuestId(reservation))
                )
            });
        });

        return;
    }

    dailyReservationRooms.forEach(item => {
        const reservationId = getReservationId(item);
        const roomId = getRoomId(item);

        const reservation =
            reservationById.get(String(reservationId));

        const room = roomsById.get(String(roomId));

        const guest = reservation
            ? guestsById.get(String(getGuestId(reservation)))
            : null;

        if (reservation) {
            appendReservationRow({
                tbody,
                reservation,
                room,
                guest
            });
        }
    });
}

function appendReservationRow({ tbody, reservation, room, guest }) {
    const reservationCode = getField(
        reservation,
        "reservationCode",
        "ReservationCode"
    );

    const guestName = getField(guest, "fullName", "FullName");
    const guestId = getGuestId(reservation);

    const roomNumber = getField(room, "roomNumber", "RoomNumber");

    const status = getField(
        reservation,
        "status",
        "Status"
    );

    const values = [
        reservationCode ?? getId(reservation) ?? "-",
        guestName ?? (guestId != null ? `Khách #${guestId}` : "-"),
        roomNumber ?? (room ? "-" : "Chưa gán phòng"),
        formatDate(getField(
            reservation,
            "checkInDate",
            "CheckInDate"
        )),
        formatDate(getField(
            reservation,
            "checkOutDate",
            "CheckOutDate"
        )),
        getStatusText(status)
    ];

    const tr = document.createElement("tr");

    values.forEach(value => {
        const td = document.createElement("td");
        td.textContent = String(value);
        tr.appendChild(td);
    });

    tbody.appendChild(tr);
}

function showEmptyTable(tbody, message) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");

    td.colSpan = 6;
    td.style.textAlign = "center";
    td.textContent = message;

    tr.appendChild(td);
    tbody.appendChild(tr);
}
