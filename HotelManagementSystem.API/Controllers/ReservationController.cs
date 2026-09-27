using HotelManagementSystem.API.Data;
using HotelManagementSystem.API.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HotelManagementSystem.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ReservationController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ReservationController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/Reservation
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var reservations = await _context.Reservations.ToListAsync();

            return Ok(reservations);
        }

        // GET: api/Reservation/1
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var reservation = await _context.Reservations.FindAsync(id);

            if (reservation == null)
                return NotFound();

            return Ok(reservation);
        }

        // POST: api/Reservation
        [HttpPost]
        public async Task<IActionResult> Create(Reservation reservation)
        {
            // Kiểm tra ngày nhận/trả phòng
            if (reservation.CheckOutDate <= reservation.CheckInDate)
            {
                return BadRequest(new
                {
                    message = "Ngày trả phòng phải sau ngày nhận phòng."
                });
            }

            // Kiểm tra khách hàng có tồn tại không
            var guestExists = await _context.Guests
                .AnyAsync(g => g.Id == reservation.GuestId);

            if (!guestExists)
            {
                return BadRequest(new
                {
                    message = "Khách hàng không tồn tại."
                });
            }

            _context.Reservations.Add(reservation);

            await _context.SaveChangesAsync();

            return Ok(reservation);
        }
        // PUT: api/Reservation/1
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, Reservation reservation)
        {
            // Tìm đơn đặt phòng cần sửa
            var existingReservation = await _context.Reservations
                .FindAsync(id);

            if (existingReservation == null)
                return NotFound();

            // Kiểm tra ngày nhận/trả phòng
            if (reservation.CheckOutDate <= reservation.CheckInDate)
            {
                return BadRequest(new
                {
                    message = "Ngày trả phòng phải sau ngày nhận phòng."
                });
            }

            // Kiểm tra khách hàng có tồn tại không
            var guestExists = await _context.Guests
                .AnyAsync(g => g.Id == reservation.GuestId);

            if (!guestExists)
            {
                return BadRequest(new
                {
                    message = "Khách hàng không tồn tại."
                });
            }

            // Cập nhật thông tin
            existingReservation.ReservationCode = reservation.ReservationCode;
            existingReservation.GuestId = reservation.GuestId;
            existingReservation.CheckInDate = reservation.CheckInDate;
            existingReservation.CheckOutDate = reservation.CheckOutDate;
            existingReservation.Status = reservation.Status;
            existingReservation.NumberOfGuests = reservation.NumberOfGuests;
            existingReservation.Notes = reservation.Notes;

            await _context.SaveChangesAsync();

            return Ok(existingReservation);
        }
        // PUT: api/Reservation/1/cancel
        [HttpPut("{id}/cancel")]
        public async Task<IActionResult> Cancel(int id)
        {
            // Tìm đơn đặt phòng
            var reservation = await _context.Reservations
                .FindAsync(id);

            if (reservation == null)
                return NotFound();

            // Kiểm tra đơn đã hủy chưa
            if (reservation.Status == ReservationStatus.DaHuy)
            {
                return BadRequest(new
                {
                    message = "Đơn đặt phòng đã được hủy."
                });
            }

            // Không cho hủy đơn đã check-in hoặc đã check-out
            if (reservation.Status == ReservationStatus.DaCheckIn ||
                reservation.Status == ReservationStatus.DaCheckOut)
            {
                return BadRequest(new
                {
                    message = "Không thể hủy đơn đã check-in hoặc check-out."
                });
            }

            // Chuyển trạng thái sang Đã hủy
            reservation.Status = ReservationStatus.DaHuy;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Hủy đặt phòng thành công.",
                reservation
            });
        }
    }
}