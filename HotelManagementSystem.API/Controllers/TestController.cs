using HotelManagementSystem.API.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HotelManagementSystem.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TestController : ControllerBase
    {
        private readonly AppDbContext _context;

        public TestController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet("database")]
        public async Task<IActionResult> TestDatabase()
        {
            var count = await _context.RoomTypes.CountAsync();

            return Ok(new
            {
                message = "Kết nối database thành công",
                roomTypeCount = count
            });
        }
    }
}