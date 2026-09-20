using HotelManagementSystem.API.Data;
using HotelManagementSystem.API.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HotelManagementSystem.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class GuestController : ControllerBase
    {
        private readonly AppDbContext _context;

        public GuestController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/Guest
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var guests = await _context.Guests.ToListAsync();

            return Ok(guests);
        }

        // GET: api/Guest/1
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var guest = await _context.Guests.FindAsync(id);

            if (guest == null)
                return NotFound();

            return Ok(guest);
        }

        // POST: api/Guest
        [HttpPost]
        public async Task<IActionResult> Create(Guest guest)
        {
            _context.Guests.Add(guest);

            await _context.SaveChangesAsync();

            return Ok(guest);
        }

        // PUT: api/Guest/1
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, Guest guest)
        {
            var existingGuest = await _context.Guests.FindAsync(id);

            if (existingGuest == null)
                return NotFound();

            existingGuest.FullName = guest.FullName;
            existingGuest.Phone = guest.Phone;
            existingGuest.Email = guest.Email;
            existingGuest.IdentityNumber = guest.IdentityNumber;
            existingGuest.Address = guest.Address;

            await _context.SaveChangesAsync();

            return Ok(existingGuest);
        }

        // DELETE: api/Guest/1
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var guest = await _context.Guests.FindAsync(id);

            if (guest == null)
                return NotFound();

            _context.Guests.Remove(guest);

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Xóa khách hàng thành công"
            });
        }
    }
}