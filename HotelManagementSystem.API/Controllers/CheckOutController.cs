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
    public class CheckOutController : ControllerBase
    {
        private readonly AppDbContext _context;

        public CheckOutController(AppDbContext context)
        {
            _context = context;
        }

        // POST: api/CheckOut/1
        [HttpPost("{reservationId}")]
        public async Task<IActionResult> CheckOut(int reservationId)
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

            // 2. Kiểm tra đơn đã check-in chưa
            if (reservation.Status != ReservationStatus.DaCheckIn)
            {
                return BadRequest(new
                {
                    message = "Đơn đặt phòng chưa được check-in."
                });
            }

            // 3. Tìm phòng được gán cho đơn
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

            // 4. Kiểm tra đã check-in thực tế chưa
            if (reservationRoom.CheckInActual == null)
            {
                return BadRequest(new
                {
                    message = "Khách chưa có thời gian check-in thực tế."
                });
            }

            // 5. Tìm phòng
            var room = await _context.Rooms
                .FindAsync(reservationRoom.RoomId);

            if (room == null)
            {
                return BadRequest(new
                {
                    message = "Phòng không tồn tại."
                });
            }

            // 6. Kiểm tra phòng có đang được sử dụng không
            if (room.Status != RoomStatus.DangSuDung)
            {
                return BadRequest(new
                {
                    message = "Phòng hiện không ở trạng thái đang sử dụng."
                });
            }

            // 7. Ghi thời gian check-out thực tế
            reservationRoom.CheckOutActual = DateTime.Now;

            // 8. Đổi trạng thái phòng về trống
            room.Status = RoomStatus.Trong;

            // 9. Đổi trạng thái đơn đặt phòng thành đã check-out
            reservation.Status = ReservationStatus.DaCheckOut;

            // 10. Lưu thay đổi
            await _context.SaveChangesAsync();

            // 11. Trả kết quả
            return Ok(new
            {
                message = "Check-out thành công.",
                reservation,
                reservationRoom,
                room
            });
        }
    }
}