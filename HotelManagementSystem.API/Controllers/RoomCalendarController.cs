using HotelManagementSystem.API.Data;
using HotelManagementSystem.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HotelManagementSystem.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Admin,Lễ tân,Kế toán")]
    public class RoomCalendarController : ControllerBase
    {
        private readonly AppDbContext _context;

        public RoomCalendarController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/RoomCalendar
        [HttpGet]
        public async Task<IActionResult> GetRoomCalendar(
            DateTime fromDate,
            DateTime toDate)
        {
            if (fromDate.Date > toDate.Date)
            {
                return BadRequest(new
                {
                    message = "Ngày bắt đầu không được lớn hơn ngày kết thúc."
                });
            }

            var rooms = await _context.Rooms
                .OrderBy(r => r.RoomNumber)
                .ToListAsync();

            var reservations = await _context.Reservations
                .Where(r =>
                    r.Status != ReservationStatus.DaHuy &&
                    r.CheckInDate.Date <= toDate.Date &&
                    r.CheckOutDate.Date >= fromDate.Date)
                .OrderBy(r => r.CheckInDate)
                .ToListAsync();

            var reservationRooms = await _context.ReservationRooms
                .ToListAsync();

            var result = rooms.Select(room => new
            {
                roomId = room.Id,
                roomNumber = room.RoomNumber,
                roomStatus = room.Status.ToString(),

                reservations = reservations
                    .Where(reservation =>
                        reservationRooms.Any(rr =>
                            rr.ReservationId == reservation.Id &&
                            rr.RoomId == room.Id))
                    .Select(reservation => new
                    {
                        reservationId = reservation.Id,
                        reservationCode = reservation.ReservationCode,
                        guestId = reservation.GuestId,
                        checkInDate = reservation.CheckInDate,
                        checkOutDate = reservation.CheckOutDate,
                        status = reservation.Status.ToString()
                    })
                    .ToList()
            });

            return Ok(new
            {
                fromDate = fromDate.Date,
                toDate = toDate.Date,
                rooms = result
            });
        }
    }
}