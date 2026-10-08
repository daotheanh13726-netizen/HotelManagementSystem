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
    public class ServiceController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ServiceController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/Service
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var services = await _context.Services
                .ToListAsync();

            return Ok(services);
        }

        // GET: api/Service/1
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var service = await _context.Services
                .FindAsync(id);

            if (service == null)
            {
                return NotFound(new
                {
                    message = "Dịch vụ không tồn tại."
                });
            }

            return Ok(service);
        }

        // POST: api/Service
        [HttpPost]
        public async Task<IActionResult> Create(Service service)
        {
            if (service.Price < 0)
            {
                return BadRequest(new
                {
                    message = "Giá dịch vụ không được âm."
                });
            }

            _context.Services.Add(service);

            await _context.SaveChangesAsync();

            return Ok(service);
        }

        // PUT: api/Service/1
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(
            int id,
            Service service)
        {
            var existingService = await _context.Services
                .FindAsync(id);

            if (existingService == null)
            {
                return NotFound(new
                {
                    message = "Dịch vụ không tồn tại."
                });
            }

            if (service.Price < 0)
            {
                return BadRequest(new
                {
                    message = "Giá dịch vụ không được âm."
                });
            }

            existingService.Name = service.Name;
            existingService.Unit = service.Unit;
            existingService.Price = service.Price;
            existingService.IsActive = service.IsActive;
            existingService.Description = service.Description;

            await _context.SaveChangesAsync();

            return Ok(existingService);
        }

        // DELETE: api/Service/1
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var service = await _context.Services
                .FindAsync(id);

            if (service == null)
            {
                return NotFound(new
                {
                    message = "Dịch vụ không tồn tại."
                });
            }

            _context.Services.Remove(service);

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Xóa dịch vụ thành công."
            });
        }
    }
}