const ROOM_API_URL = "https://localhost:44365/api/Room";
const ROOM_TYPE_API_URL = "https://localhost:44365/api/RoomType";


// ========================================
// CHỜ HTML TẢI XONG RỒI MỚI CHẠY JAVASCRIPT
// ========================================

document.addEventListener("DOMContentLoaded", function () {

    loadRooms();

    const roomForm = document.getElementById("roomForm");

    roomForm.addEventListener("submit", async function (event) {

        event.preventDefault();

        const roomNumber = document
            .getElementById("roomNumber")
            .value
            .trim();

        const roomTypeId = Number(
            document.getElementById("roomType").value
        );

        const statusValue =
            document.getElementById("roomStatus").value;

        let status = 0;

        if (statusValue === "DangSuDung") {
            status = 1;
        }
        else if (statusValue === "BaoTri") {
            status = 2;
        }


        // Kiểm tra số phòng
        if (roomNumber === "") {
            alert("Vui lòng nhập số phòng.");
            return;
        }


        // Kiểm tra loại phòng
        if (!roomTypeId) {
            alert("Vui lòng chọn loại phòng.");
            return;
        }


        // Dữ liệu gửi Backend
        const newRoom = {
            roomNumber: roomNumber,
            roomTypeId: roomTypeId,
            status: status
        };

        console.log(
            "Dữ liệu gửi lên Backend:",
            newRoom
        );


        try {

            const response = await fetch(
                ROOM_API_URL,
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify(newRoom)
                }
            );


            if (!response.ok) {

                const errorText =
                    await response.text();

                console.error(
                    "Backend trả về:",
                    errorText
                );

                throw new Error(
                    "Không thể thêm phòng."
                );
            }


            const createdRoom =
                await response.json();

            console.log(
                "Phòng vừa thêm:",
                createdRoom
            );


            alert("Thêm phòng thành công!");


            closeRoomForm();


            roomForm.reset();


            // Tải lại danh sách phòng
            await loadRooms();

        }
        catch (error) {

            console.error(
                "Lỗi thêm phòng:",
                error
            );

            alert("Không thể thêm phòng.");
        }

    });

});


// ========================================
// LẤY DANH SÁCH PHÒNG
// ========================================

async function loadRooms() {

    try {

        const [
            roomResponse,
            roomTypeResponse
        ] = await Promise.all([

            fetch(ROOM_API_URL),

            fetch(ROOM_TYPE_API_URL)

        ]);


        if (
            !roomResponse.ok ||
            !roomTypeResponse.ok
        ) {

            throw new Error(
                "Không thể lấy dữ liệu phòng."
            );
        }


        const rooms =
            await roomResponse.json();

        const roomTypes =
            await roomTypeResponse.json();


        console.log(
            "Danh sách phòng:",
            rooms
        );

        console.log(
            "Danh sách loại phòng:",
            roomTypes
        );


        const tableBody =
            document.getElementById(
                "roomTableBody"
            );


        tableBody.innerHTML = "";


        rooms.forEach(room => {

            const roomType =
                roomTypes.find(
                    type =>
                        type.id === room.roomTypeId
                );


            let statusText =
                "Không xác định";

            let statusClass = "";


            if (room.status === 0) {

                statusText = "Trống";
                statusClass = "available";

            }
            else if (room.status === 1) {

                statusText = "Đang sử dụng";
                statusClass = "using";

            }
            else if (room.status === 2) {

                statusText = "Bảo trì";
                statusClass = "maintenance";

            }


            const row = `

                <tr>

                    <td>${room.id}</td>

                    <td>${room.roomNumber}</td>

                    <td>
                        ${
                            roomType
                                ? roomType.name
                                : "Không xác định"
                        }
                    </td>

                    <td>-</td>

                    <td>

                        <span
                            class="status ${statusClass}"
                        >
                            ${statusText}
                        </span>

                    </td>

                    <td>

                        <button
                            class="btn-edit"
                        >
                            Sửa
                        </button>

                        <button
                            class="btn-delete"
                        >
                            Xóa
                        </button>

                    </td>

                </tr>

            `;


            tableBody.innerHTML += row;

        });

    }
    catch (error) {

        console.error(
            "Lỗi:",
            error
        );

        alert(
            "Không thể kết nối đến máy chủ."
        );

    }

}