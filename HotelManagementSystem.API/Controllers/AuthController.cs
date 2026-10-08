using HotelManagementSystem.API.Data;
using HotelManagementSystem.API.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

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

        // =========================
        // ĐĂNG KÝ
        // POST: /api/Auth/register
        // =========================
        [HttpPost("register")]
        public async Task<IActionResult> Register(RegisterRequest request)
        {
            var existingUser = await _context.Users
                .FirstOrDefaultAsync(u => u.Username == request.Username);

            if (existingUser != null)
            {
                return BadRequest(new
                {
                    message = "Tên đăng nhập đã tồn tại."
                });
            }

            var roleExists = await _context.Roles
                .AnyAsync(r => r.Id == request.RoleId);

            if (!roleExists)
            {
                return BadRequest(new
                {
                    message = "Vai trò không tồn tại."
                });
            }

            var user = new User
            {
                Username = request.Username,
                FullName = request.FullName,
                Email = request.Email,
                RoleId = request.RoleId,
                IsActive = true,
                CreatedAt = DateTime.Now
            };

            user.PasswordHash = _passwordHasher.HashPassword(
                user,
                request.Password
            );

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

        // =========================
        // ĐĂNG NHẬP
        // POST: /api/Auth/login
        // =========================
        [HttpPost("login")]
        public async Task<IActionResult> Login(LoginRequest request)
        {
            // 1. Tìm tài khoản
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Username == request.Username);

            if (user == null)
            {
                return BadRequest(new
                {
                    message = "Tên đăng nhập hoặc mật khẩu không đúng."
                });
            }

            // 2. Kiểm tra tài khoản
            if (!user.IsActive)
            {
                return BadRequest(new
                {
                    message = "Tài khoản đã bị khóa."
                });
            }

            // 3. Kiểm tra mật khẩu
            var passwordResult = _passwordHasher.VerifyHashedPassword(
                user,
                user.PasswordHash,
                request.Password
            );

            if (passwordResult == PasswordVerificationResult.Failed)
            {
                return BadRequest(new
                {
                    message = "Tên đăng nhập hoặc mật khẩu không đúng."
                });
            }

            // 4. Lấy Role
            var role = await _context.Roles
                .FirstOrDefaultAsync(r => r.Id == user.RoleId);

            if (role == null)
            {
                return BadRequest(new
                {
                    message = "Tài khoản chưa được gán vai trò."
                });
            }

            // 5. Tạo các thông tin bên trong JWT
            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Name, user.Username),
                new Claim(ClaimTypes.Role, role.Name),
                new Claim("FullName", user.FullName)
            };

            // 6. Secret key
            var key = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(
                    "HotelManagementSystemSecretKey2026"
                )
            );

            var credentials = new SigningCredentials(
                key,
                SecurityAlgorithms.HmacSha256
            );

            // 7. Tạo JWT
            var token = new JwtSecurityToken(
                claims: claims,
                expires: DateTime.UtcNow.AddHours(2),
                signingCredentials: credentials
            );

            var tokenString = new JwtSecurityTokenHandler()
                .WriteToken(token);

            // 8. Trả kết quả
            return Ok(new
            {
                message = "Đăng nhập thành công.",
                userId = user.Id,
                username = user.Username,
                fullName = user.FullName,
                roleId = user.RoleId,
                roleName = role.Name,
                token = tokenString
            });
        }
    }
}