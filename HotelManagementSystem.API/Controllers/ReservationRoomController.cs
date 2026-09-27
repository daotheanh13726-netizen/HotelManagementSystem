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
        public async Task<IActionResult> Update(int id, ReservationRoom reservationRoom)
        {
            var existingReservationRoom = await _context.ReservationRooms
                .FindAsync(id);

            if (existingReservationRoom == null)
                return NotFound();

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

            existingReservationRoom.ReservationId = reservationRoom.ReservationId;
            existingReservationRoom.RoomId = reservationRoom.RoomId;
            existingReservationRoom.CheckInActual = reservationRoom.CheckInActual;
            existingReservationRoom.CheckOutActual = reservationRoom.CheckOutActual;

            await _context.SaveChangesAsync();

            return Ok(existingReservationRoom);
        }
    }
}