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
    }
}