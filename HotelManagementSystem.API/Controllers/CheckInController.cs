using HotelManagementSystem.API.Data;
using HotelManagementSystem.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HotelManagementSystem.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Admin,Lễ tân")]
    public class CheckInController : ControllerBase
    {
        private readonly AppDbContext _context;

        public CheckInController(AppDbContext context)
        {
            _context = context;
        }

        // =========================================================
        // POST: api/CheckIn/1
        // CHECK-IN
        // =========================================================
        [HttpPost("{reservationId}")]
        public async Task<IActionResult> CheckIn(int reservationId)
        {
            // 1. Tìm đơn đặt phòng
            var reservation = await _context.Reservations
                .FindAsync(reservationId);

            if (reservation == null)
            {
                return NotFound(new
                {
                    message = "Đơn đặt phòng không tồn tại."
                });
            }

            // 2. Kiểm tra trạng thái đơn
            if (reservation.Status == ReservationStatus.DaHuy)
            {
                return BadRequest(new
                {
                    message = "Đơn đặt phòng đã bị hủy."
                });
            }

            if (reservation.Status == ReservationStatus.DaCheckIn)
            {
                return BadRequest(new
                {
                    message = "Đơn đặt phòng đã được check-in."
                });
            }

            if (reservation.Status == ReservationStatus.DaCheckOut)
            {
                return BadRequest(new
                {
                    message = "Đơn đặt phòng đã check-out."
                });
            }

            // 3. Tìm phòng được gán
            var reservationRoom = await _context.ReservationRooms
                .FirstOrDefaultAsync(rr =>
                    rr.ReservationId == reservationId);

            if (reservationRoom == null)
            {
                return BadRequest(new
                {
                    message = "Đơn đặt phòng chưa được gán phòng."
                });
            }

            // 4. Tìm phòng
            var room = await _context.Rooms
                .FindAsync(reservationRoom.RoomId);

            if (room == null)
            {
                return BadRequest(new
                {
                    message = "Phòng không tồn tại."
                });
            }

            // 5. Phòng phải đang trống
            if (room.Status != RoomStatus.Trong)
            {
                return BadRequest(new
                {
                    message = "Phòng hiện không ở trạng thái trống."
                });
            }

            // 6. Ghi thời gian check-in
            reservationRoom.CheckInActual = DateTime.Now;

            // 7. Cập nhật phòng
            room.Status = RoomStatus.DangSuDung;

            // 8. Cập nhật đơn
            reservation.Status = ReservationStatus.DaCheckIn;

            // 9. Lưu
            await _context.SaveChangesAsync();

            // 10. Kết quả
            return Ok(new
            {
                message = "Check-in thành công.",
                reservation,
                reservationRoom,
                room
            });
        }

        // =========================================================
        // PUT: api/CheckIn/1/transfer-room
        // CHUYỂN PHÒNG
        // =========================================================
        [HttpPut("{reservationId}/transfer-room")]
        public async Task<IActionResult> TransferRoom(
            int reservationId,
            int newRoomId)
        {
            // 1. Tìm đơn đặt phòng
            var reservation = await _context.Reservations
                .FindAsync(reservationId);

            if (reservation == null)
            {
                return NotFound(new
                {
                    message = "Đơn đặt phòng không tồn tại."
                });
            }

            // 2. Chỉ cho chuyển phòng khi khách đang ở
            if (reservation.Status != ReservationStatus.DaCheckIn)
            {
                return BadRequest(new
                {
                    message =
                        "Chỉ có thể chuyển phòng cho đơn đã check-in."
                });
            }

            // 3. Tìm phòng hiện tại
            var reservationRoom = await _context.ReservationRooms
                .FirstOrDefaultAsync(rr =>
                    rr.ReservationId == reservationId);

            if (reservationRoom == null)
            {
                return BadRequest(new
                {
                    message =
                        "Đơn đặt phòng chưa được gán phòng."
                });
            }

            // 4. Không cho chuyển sang chính phòng hiện tại
            if (reservationRoom.RoomId == newRoomId)
            {
                return BadRequest(new
                {
                    message =
                        "Phòng mới phải khác phòng hiện tại."
                });
            }

            // 5. Tìm phòng cũ
            var oldRoom = await _context.Rooms
                .FindAsync(reservationRoom.RoomId);

            if (oldRoom == null)
            {
                return BadRequest(new
                {
                    message = "Phòng hiện tại không tồn tại."
                });
            }

            // 6. Tìm phòng mới
            var newRoom = await _context.Rooms
                .FindAsync(newRoomId);

            if (newRoom == null)
            {
                return BadRequest(new
                {
                    message = "Phòng mới không tồn tại."
                });
            }

            // 7. Phòng mới phải đang trống
            if (newRoom.Status != RoomStatus.Trong)
            {
                return BadRequest(new
                {
                    message =
                        "Phòng mới hiện không ở trạng thái trống."
                });
            }

            // 8. Phòng cũ trở lại trạng thái trống
            oldRoom.Status = RoomStatus.Trong;

            // 9. Gán phòng mới
            reservationRoom.RoomId = newRoomId;

            // 10. Phòng mới chuyển sang đang sử dụng
            newRoom.Status = RoomStatus.DangSuDung;

            // 11. Lưu thay đổi
            await _context.SaveChangesAsync();

            // 12. Kết quả
            return Ok(new
            {
                message = "Chuyển phòng thành công.",
                reservation,
                oldRoom,
                newRoom,
                reservationRoom
            });
        }
    }
}