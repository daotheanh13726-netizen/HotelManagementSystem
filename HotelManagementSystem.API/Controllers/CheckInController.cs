using HotelManagementSystem.API.Data;
using HotelManagementSystem.API.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HotelManagementSystem.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CheckInController : ControllerBase
    {
        private readonly AppDbContext _context;

        public CheckInController(AppDbContext context)
        {
            _context = context;
        }

        // POST: api/CheckIn/1
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

            // 2. Kiểm tra trạng thái đơn đặt phòng
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

            // 3. Tìm phòng được gán cho đơn đặt phòng
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

            // 4. Tìm thông tin phòng
            var room = await _context.Rooms
                .FindAsync(reservationRoom.RoomId);

            if (room == null)
            {
                return BadRequest(new
                {
                    message = "Phòng không tồn tại."
                });
            }

            // 5. Kiểm tra phòng có đang trống không
            if (room.Status != RoomStatus.Trong)
            {
                return BadRequest(new
                {
                    message = "Phòng hiện không ở trạng thái trống."
                });
            }

            // 6. Ghi thời gian check-in thực tế
            reservationRoom.CheckInActual = DateTime.Now;

            // 7. Cập nhật trạng thái phòng
            room.Status = RoomStatus.DangSuDung;

            // 8. Cập nhật trạng thái đơn đặt phòng
            reservation.Status = ReservationStatus.DaCheckIn;

            // 9. Lưu thay đổi vào Database
            await _context.SaveChangesAsync();

            // 10. Trả kết quả
            return Ok(new
            {
                message = "Check-in thành công.",
                reservation,
                reservationRoom,
                room
            });
        }
    }
}