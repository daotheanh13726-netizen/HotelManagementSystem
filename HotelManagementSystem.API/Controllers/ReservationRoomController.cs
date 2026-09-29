using HotelManagementSystem.API.Data;
using HotelManagementSystem.API.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HotelManagementSystem.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ReservationRoomController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ReservationRoomController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/ReservationRoom
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var reservationRooms = await _context.ReservationRooms
                .ToListAsync();

            return Ok(reservationRooms);
        }

        // GET: api/ReservationRoom/1
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var reservationRoom = await _context.ReservationRooms
                .FindAsync(id);

            if (reservationRoom == null)
                return NotFound();

            return Ok(reservationRoom);
        }

        // POST: api/ReservationRoom
        [HttpPost]
        public async Task<IActionResult> Create(ReservationRoom reservationRoom)
        {
            // Kiểm tra đơn đặt phòng có tồn tại không
            var reservationExists = await _context.Reservations
                .AnyAsync(r => r.Id == reservationRoom.ReservationId);

            if (!reservationExists)
            {
                return BadRequest(new
                {
                    message = "Đơn đặt phòng không tồn tại."
                });
            }

            // Kiểm tra phòng có tồn tại không
            var roomExists = await _context.Rooms
                .AnyAsync(r => r.Id == reservationRoom.RoomId);

            if (!roomExists)
            {
                return BadRequest(new
                {
                    message = "Phòng không tồn tại."
                });
            }

            // Lấy thông tin đơn đặt phòng hiện tại
            var reservation = await _context.Reservations
                .FindAsync(reservationRoom.ReservationId);

            if (reservation == null)
            {
                return BadRequest(new
                {
                    message = "Đơn đặt phòng không tồn tại."
                });
            }

            // Kiểm tra phòng đã bị đặt trùng trong khoảng thời gian này chưa
            var roomIsOverbooked = await _context.ReservationRooms
                .AnyAsync(rr =>
                    rr.RoomId == reservationRoom.RoomId &&
                    rr.ReservationId != reservationRoom.ReservationId &&
                    _context.Reservations.Any(r =>
                        r.Id == rr.ReservationId &&
                        r.Status != ReservationStatus.DaHuy &&
                        r.CheckInDate < reservation.CheckOutDate &&
                        r.CheckOutDate > reservation.CheckInDate
                    )
                );

            if (roomIsOverbooked)
            {
                return BadRequest(new
                {
                    message = "Phòng đã được đặt."
                });
            }

            // Kiểm tra phòng đã được gán vào đơn này chưa
            var alreadyAssigned = await _context.ReservationRooms
                .AnyAsync(rr =>
                    rr.ReservationId == reservationRoom.ReservationId &&
                    rr.RoomId == reservationRoom.RoomId);

            if (alreadyAssigned)
            {
                return BadRequest(new
                {
                    message = "Phòng này đã được gán cho đơn đặt phòng."
                });
            }

            _context.ReservationRooms.Add(reservationRoom);

            await _context.SaveChangesAsync();

            return Ok(reservationRoom);
        }

        // PUT: api/ReservationRoom/1
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(
            int id,
            ReservationRoom reservationRoom)
        {
            // Tìm chi tiết đặt phòng cần sửa
            var existingReservationRoom = await _context.ReservationRooms
                .FindAsync(id);

            if (existingReservationRoom == null)
                return NotFound();

            // ReservationId của bản ghi hiện tại không được thay đổi
            var reservation = await _context.Reservations
                .FindAsync(existingReservationRoom.ReservationId);

            if (reservation == null)
            {
                return BadRequest(new
                {
                    message = "Đơn đặt phòng không tồn tại."
                });
            }

            // Kiểm tra phòng mới có tồn tại không
            var roomExists = await _context.Rooms
                .AnyAsync(r => r.Id == reservationRoom.RoomId);

            if (!roomExists)
            {
                return BadRequest(new
                {
                    message = "Phòng không tồn tại."
                });
            }

            // Kiểm tra phòng mới có bị đặt trùng với đơn khác không
            var roomIsOverbooked = await _context.ReservationRooms
                .AnyAsync(rr =>
                    rr.RoomId == reservationRoom.RoomId &&
                    rr.Id != id &&
                    rr.ReservationId != existingReservationRoom.ReservationId &&
                    _context.Reservations.Any(r =>
                        r.Id == rr.ReservationId &&
                        r.Status != ReservationStatus.DaHuy &&
                        r.CheckInDate < reservation.CheckOutDate &&
                        r.CheckOutDate > reservation.CheckInDate
                    )
                );

            if (roomIsOverbooked)
            {
                return BadRequest(new
                {
                    message = "Phòng đã được đặt trong khoảng thời gian này."
                });
            }

            // Kiểm tra phòng mới đã được gán cho chính đơn này chưa
            var alreadyAssigned = await _context.ReservationRooms
                .AnyAsync(rr =>
                    rr.Id != id &&
                    rr.ReservationId == existingReservationRoom.ReservationId &&
                    rr.RoomId == reservationRoom.RoomId);

            if (alreadyAssigned)
            {
                return BadRequest(new
                {
                    message = "Phòng này đã được gán cho đơn đặt phòng."
                });
            }

            // Chỉ cập nhật phòng và thời gian check-in/check-out thực tế
            // Không thay đổi ReservationId
            existingReservationRoom.RoomId = reservationRoom.RoomId;
            existingReservationRoom.CheckInActual = reservationRoom.CheckInActual;
            existingReservationRoom.CheckOutActual = reservationRoom.CheckOutActual;

            await _context.SaveChangesAsync();

            return Ok(existingReservationRoom);
        }
    }
}