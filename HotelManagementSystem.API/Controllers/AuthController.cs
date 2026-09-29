using HotelManagementSystem.API.Data;
using HotelManagementSystem.API.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HotelManagementSystem.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly PasswordHasher<User> _passwordHasher;

        public AuthController(AppDbContext context)
        {
            _context = context;
            _passwordHasher = new PasswordHasher<User>();
        }
        [HttpPost("register")]
        public async Task<IActionResult> Register(RegisterRequest request)
        {
            // Kiểm tra username đã tồn tại chưa
            var existingUser = await _context.Users
                .FirstOrDefaultAsync(u => u.Username == request.Username);

            if (existingUser != null)
            {
                return BadRequest(new
                {
                    message = "Tên đăng nhập đã tồn tại."
                });
            }

            // Kiểm tra Role có tồn tại không
            var roleExists = await _context.Roles
                .AnyAsync(r => r.Id == request.RoleId);

            if (!roleExists)
            {
                return BadRequest(new
                {
                    message = "Vai trò không tồn tại."
                });
            }

            // Tạo User mới
            var user = new User
            {
                Username = request.Username,
                FullName = request.FullName,
                Email = request.Email,
                RoleId = request.RoleId,
                IsActive = true,
                CreatedAt = DateTime.Now
            };

            // Hash mật khẩu
            user.PasswordHash = _passwordHasher.HashPassword(
                user,
                request.Password
            );

            // Lưu vào database
            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Đăng ký tài khoản thành công.",
                userId = user.Id,
                username = user.Username,
                roleId = user.RoleId
            });
        }
    }
}