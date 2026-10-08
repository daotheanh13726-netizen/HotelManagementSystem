using HotelManagementSystem.API.Data;
using HotelManagementSystem.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HotelManagementSystem.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Admin,Lễ tân")]
    public class GuestController : ControllerBase
    {
        private readonly AppDbContext _context;

        public GuestController(AppDbContext context)
        {
            _context = context;
        }

        // =========================================================
        // GET: api/Guest
        //
        // Ví dụ:
        // api/Guest
        // api/Guest?search=Nguyen
        // api/Guest?search=090
        // api/Guest?sortBy=FullName&sortOrder=desc
        // api/Guest?page=1&pageSize=5
        // =========================================================
        [HttpGet]
        public async Task<IActionResult> GetAll(
            string? search,
            string? sortBy = "FullName",
            string? sortOrder = "asc",
            int page = 1,
            int pageSize = 10)
        {
            // =====================================================
            // KIỂM TRA TRANG
            // =====================================================
            if (page < 1)
            {
                return BadRequest(new
                {
                    message = "Số trang phải lớn hơn hoặc bằng 1."
                });
            }

            // =====================================================
            // KIỂM TRA SỐ BẢN GHI MỖI TRANG
            // =====================================================
            if (pageSize < 1 || pageSize > 100)
            {
                return BadRequest(new
                {
                    message = "pageSize phải nằm trong khoảng từ 1 đến 100."
                });
            }

            // =====================================================
            // TẠO QUERY
            // =====================================================
            IQueryable<Guest> query = _context.Guests;

            // =====================================================
            // TÌM KIẾM
            // Họ tên / Số điện thoại / Email / CCCD
            // =====================================================
            if (!string.IsNullOrWhiteSpace(search))
            {
                search = search.Trim();

                query = query.Where(g =>
                    (g.FullName ?? "").Contains(search) ||
                    (g.Phone ?? "").Contains(search) ||
                    (g.Email ?? "").Contains(search) ||
                    (g.IdentityNumber ?? "").Contains(search));
            }

            // =====================================================
            // SẮP XẾP
            // =====================================================
            bool descending =
                sortOrder?.ToLower() == "desc";

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

            // =====================================================
            // TỔNG SỐ KHÁCH HÀNG
            // =====================================================
            int totalItems = await query.CountAsync();

            // =====================================================
            // TỔNG SỐ TRANG
            // =====================================================
            int totalPages =
                (int)Math.Ceiling(
                    totalItems / (double)pageSize);

            // =====================================================
            // PHÂN TRANG
            // =====================================================
            var guests = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            // =====================================================
            // KẾT QUẢ
            // =====================================================
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
        // GET: api/Guest/1
        // =========================================================
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var guest = await _context.Guests
                .FindAsync(id);

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
        // POST: api/Guest
        // =========================================================
        [HttpPost]
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
        // PUT: api/Guest/1
        // =========================================================
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(
            int id,
            Guest guest)
        {
            var existingGuest = await _context.Guests
                .FindAsync(id);

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
        // DELETE: api/Guest/1
        // =========================================================
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var guest = await _context.Guests
                .FindAsync(id);

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