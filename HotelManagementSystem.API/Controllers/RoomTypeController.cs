using HotelManagementSystem.API.Data;
using HotelManagementSystem.API.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HotelManagementSystem.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class RoomTypeController : ControllerBase
    {
        private readonly AppDbContext _context;

        public RoomTypeController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/RoomType
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var roomTypes = await _context.RoomTypes.ToListAsync();

            return Ok(roomTypes);
        }

        // POST: api/RoomType
        [HttpPost]
        public async Task<IActionResult> Create(RoomType roomType)
        {
            _context.RoomTypes.Add(roomType);
            await _context.SaveChangesAsync();

            return Ok(roomType);
        }

        // PUT: api/RoomType/1
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, RoomType roomType)
        {
            var existingRoomType = await _context.RoomTypes.FindAsync(id);

            if (existingRoomType == null)
            {
                return NotFound();
            }

            existingRoomType.Name = roomType.Name;
            existingRoomType.Description = roomType.Description;
            existingRoomType.BasePrice = roomType.BasePrice;

            await _context.SaveChangesAsync();

            return Ok(existingRoomType);
        }

        // DELETE: api/RoomType/1
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var roomType = await _context.RoomTypes.FindAsync(id);

            if (roomType == null)
            {
                return NotFound();
            }

            _context.RoomTypes.Remove(roomType);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Xóa loại phòng thành công"
            });
        }
    }
}