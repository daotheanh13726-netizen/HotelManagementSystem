using HotelManagementSystem.API.Data;
using HotelManagementSystem.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace HotelManagementSystem.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class GuestController : ControllerBase
    {
        private readonly AppDbContext _context;

        public GuestController(AppDbContext context)
        {
            _context = context;
        }

        // Helper trích xuất GuestId từ Claim Token hoặc truy vấn theo UserId
        private int? GetCurrentGuestId()
        {
            var guestClaim = User.FindFirst("GuestId")?.Value;
            if (int.TryParse(guestClaim, out int gId))
            {
                return gId;
            }

            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (int.TryParse(userIdClaim, out int uId))
            {
                var user = _context.Users.AsNoTracking().FirstOrDefault(u => u.Id == uId);
                return user?.GuestId;
            }

            return null;
        }

        // =========================================================
        // GET: api/Guest/me
        // Khách hàng xem hồ sơ cá nhân của chính mình (chống sửa GuestId/IDOR)
        // =========================================================
        [HttpGet("me")]
        public async Task<IActionResult> GetMyProfile()
        {
            var guestId = GetCurrentGuestId();
            if (!guestId.HasValue)
            {
                return NotFound(new
                {
                    message = "Tài khoản hiện tại chưa được liên kết với hồ sơ khách hàng."
                });
            }

            var guest = await _context.Guests.FindAsync(guestId.Value);
            if (guest == null)
            {
                return NotFound(new
                {
                    message = "Không tìm thấy hồ sơ khách hàng."
                });
            }

            return Ok(guest);
        }

        // =========================================================
        // PUT: api/Guest/me
        // Khách hàng cập nhật hồ sơ của chính mình
        // =========================================================
        [HttpPut("me")]
        public async Task<IActionResult> UpdateMyProfile([FromBody] Guest guestUpdate)
        {
            var guestId = GetCurrentGuestId();
            if (!guestId.HasValue)
            {
                return BadRequest(new
                {
                    message = "Tài khoản hiện tại chưa được liên kết với hồ sơ khách hàng."
                });
            }

            var existingGuest = await _context.Guests.FindAsync(guestId.Value);
            if (existingGuest == null)
            {
                return NotFound(new
                {
                    message = "Không tìm thấy hồ sơ khách hàng."
                });
            }

            if (string.IsNullOrWhiteSpace(guestUpdate.FullName))
            {
                return BadRequest(new
                {
                    message = "Họ tên khách hàng không được để trống."
                });
            }

            existingGuest.FullName = guestUpdate.FullName.Trim();
            existingGuest.Phone = guestUpdate.Phone?.Trim();
            existingGuest.Email = guestUpdate.Email?.Trim();
            existingGuest.IdentityNumber = guestUpdate.IdentityNumber?.Trim();
            existingGuest.Address = guestUpdate.Address?.Trim();

            // Đồng bộ sang bảng User nếu có
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (int.TryParse(userIdClaim, out int uId))
            {
                var user = await _context.Users.FindAsync(uId);
                if (user != null)
                {
                    user.FullName = existingGuest.FullName;
                    user.Email = existingGuest.Email;
                }
            }

            await _context.SaveChangesAsync();

            return Ok(existingGuest);
        }

        // =========================================================
        // GET: api/Guest (Dành cho Admin, Lễ tân)
        // =========================================================
        [HttpGet]
        [Authorize(Roles = "Admin,Lễ tân")]
        public async Task<IActionResult> GetAll(
            string? search,
            string? sortBy = "FullName",
            string? sortOrder = "asc",
            int page = 1,
            int pageSize = 10)
        {
            if (page < 1)
            {
                return BadRequest(new
                {
                    message = "Số trang phải lớn hơn hoặc bằng 1."
                });
            }

            if (pageSize < 1 || pageSize > 100)
            {
                return BadRequest(new
                {
                    message = "pageSize phải nằm trong khoảng từ 1 đến 100."
                });
            }

            IQueryable<Guest> query = _context.Guests;

            if (!string.IsNullOrWhiteSpace(search))
            {
                search = search.Trim();

                query = query.Where(g =>
                    (g.FullName ?? "").Contains(search) ||
                    (g.Phone ?? "").Contains(search) ||
                    (g.Email ?? "").Contains(search) ||
                    (g.IdentityNumber ?? "").Contains(search));
            }

            bool descending = sortOrder?.ToLower() == "desc";

            switch (sortBy?.ToLower())
            {
                case "id":
                    query = descending
                        ? query.OrderByDescending(g => g.Id)
                        : query.OrderBy(g => g.Id);
                    break;

                case "fullname":
                    query = descending
                        ? query.OrderByDescending(g => g.FullName)
                        : query.OrderBy(g => g.FullName);
                    break;

                case "phone":
                    query = descending
                        ? query.OrderByDescending(g => g.Phone)
                        : query.OrderBy(g => g.Phone);
                    break;

                case "email":
                    query = descending
                        ? query.OrderByDescending(g => g.Email)
                        : query.OrderBy(g => g.Email);
                    break;

                case "identitynumber":
                    query = descending
                        ? query.OrderByDescending(g => g.IdentityNumber)
                        : query.OrderBy(g => g.IdentityNumber);
                    break;

                default:
                    query = query.OrderBy(g => g.FullName);
                    break;
            }

            int totalItems = await query.CountAsync();
            int totalPages = (int)Math.Ceiling(totalItems / (double)pageSize);

            var guests = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return Ok(new
            {
                data = guests,
                pagination = new
                {
                    currentPage = page,
                    pageSize = pageSize,
                    totalItems = totalItems,
                    totalPages = totalPages
                }
            });
        }

        // =========================================================
        // GET: api/Guest/1 (Dành cho Admin, Lễ tân)
        // =========================================================
        [HttpGet("{id}")]
        [Authorize(Roles = "Admin,Lễ tân")]
        public async Task<IActionResult> GetById(int id)
        {
            var guest = await _context.Guests.FindAsync(id);

            if (guest == null)
            {
                return NotFound(new
                {
                    message = "Khách hàng không tồn tại."
                });
            }

            return Ok(guest);
        }

        // =========================================================
        // POST: api/Guest (Dành cho Admin, Lễ tân)
        // =========================================================
        [HttpPost]
        [Authorize(Roles = "Admin,Lễ tân")]
        public async Task<IActionResult> Create(Guest guest)
        {
            if (string.IsNullOrWhiteSpace(guest.FullName))
            {
                return BadRequest(new
                {
                    message = "Họ tên khách hàng không được để trống."
                });
            }

            _context.Guests.Add(guest);
            await _context.SaveChangesAsync();

            return Ok(guest);
        }

        // =========================================================
        // PUT: api/Guest/1 (Dành cho Admin, Lễ tân)
        // =========================================================
        [HttpPut("{id}")]
        [Authorize(Roles = "Admin,Lễ tân")]
        public async Task<IActionResult> Update(int id, Guest guest)
        {
            var existingGuest = await _context.Guests.FindAsync(id);

            if (existingGuest == null)
            {
                return NotFound(new
                {
                    message = "Khách hàng không tồn tại."
                });
            }

            if (string.IsNullOrWhiteSpace(guest.FullName))
            {
                return BadRequest(new
                {
                    message = "Họ tên khách hàng không được để trống."
                });
            }

            existingGuest.FullName = guest.FullName;
            existingGuest.Phone = guest.Phone;
            existingGuest.Email = guest.Email;
            existingGuest.IdentityNumber = guest.IdentityNumber;
            existingGuest.Address = guest.Address;

            await _context.SaveChangesAsync();

            return Ok(existingGuest);
        }

        // =========================================================
        // DELETE: api/Guest/1 (Dành cho Admin, Lễ tân)
        // =========================================================
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin,Lễ tân")]
        public async Task<IActionResult> Delete(int id)
        {
            var guest = await _context.Guests.FindAsync(id);

            if (guest == null)
            {
                return NotFound(new
                {
                    message = "Khách hàng không tồn tại."
                });
            }

            _context.Guests.Remove(guest);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Xóa khách hàng thành công"
            });
        }
    }
}
