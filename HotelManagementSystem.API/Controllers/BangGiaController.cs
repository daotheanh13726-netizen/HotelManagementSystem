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
    public class BangGiaController : ControllerBase
    {
        private readonly AppDbContext _context;

        public BangGiaController(AppDbContext context)
        {
            _context = context;
        }

        // =========================
        // GET: api/BangGia
        // =========================
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var bangGias = await _context.BangGias
                .OrderBy(bg => bg.RoomTypeId)
                .ThenBy(bg => bg.StartDate)
                .ToListAsync();

            return Ok(bangGias);
        }

        // =========================
        // GET: api/BangGia/1
        // =========================
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var bangGia = await _context.BangGias
                .FindAsync(id);

            if (bangGia == null)
            {
                return NotFound(new
                {
                    message = "Bảng giá không tồn tại."
                });
            }

            return Ok(bangGia);
        }

        // =========================
        // POST: api/BangGia
        // =========================
        [HttpPost]
        public async Task<IActionResult> Create(BangGia bangGia)
        {
            // Kiểm tra loại phòng
            var roomType = await _context.RoomTypes
                .FindAsync(bangGia.RoomTypeId);

            if (roomType == null)
            {
                return BadRequest(new
                {
                    message = "Loại phòng không tồn tại."
                });
            }

            // Kiểm tra ngày
            if (bangGia.EndDate < bangGia.StartDate)
            {
                return BadRequest(new
                {
                    message = "Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu."
                });
            }

            // Kiểm tra giá
            if (bangGia.PricePerNight < 0)
            {
                return BadRequest(new
                {
                    message = "Giá theo đêm không được âm."
                });
            }

            if (bangGia.PricePerHour < 0)
            {
                return BadRequest(new
                {
                    message = "Giá theo giờ không được âm."
                });
            }

            // Kiểm tra tên bảng giá
            if (string.IsNullOrWhiteSpace(bangGia.RateName))
            {
                return BadRequest(new
                {
                    message = "Tên bảng giá không được để trống."
                });
            }

            // Kiểm tra trùng khoảng thời gian
            var biTrung = await _context.BangGias
                .AnyAsync(bg =>
                    bg.RoomTypeId == bangGia.RoomTypeId &&
                    bangGia.StartDate <= bg.EndDate &&
                    bangGia.EndDate >= bg.StartDate);

            if (biTrung)
            {
                return BadRequest(new
                {
                    message = "Khoảng thời gian của bảng giá bị trùng với bảng giá đã tồn tại."
                });
            }

            _context.BangGias.Add(bangGia);

            await _context.SaveChangesAsync();

            return CreatedAtAction(
                nameof(GetById),
                new { id = bangGia.Id },
                bangGia
            );
        }

        // =========================
        // PUT: api/BangGia/1
        // =========================
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(
            int id,
            BangGia bangGia)
        {
            var bangGiaCu = await _context.BangGias
                .FindAsync(id);

            if (bangGiaCu == null)
            {
                return NotFound(new
                {
                    message = "Bảng giá không tồn tại."
                });
            }

            // Kiểm tra loại phòng
            var roomType = await _context.RoomTypes
                .FindAsync(bangGia.RoomTypeId);

            if (roomType == null)
            {
                return BadRequest(new
                {
                    message = "Loại phòng không tồn tại."
                });
            }

            // Kiểm tra ngày
            if (bangGia.EndDate < bangGia.StartDate)
            {
                return BadRequest(new
                {
                    message = "Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu."
                });
            }

            // Kiểm tra giá
            if (bangGia.PricePerNight < 0)
            {
                return BadRequest(new
                {
                    message = "Giá theo đêm không được âm."
                });
            }

            if (bangGia.PricePerHour < 0)
            {
                return BadRequest(new
                {
                    message = "Giá theo giờ không được âm."
                });
            }

            // Kiểm tra tên bảng giá
            if (string.IsNullOrWhiteSpace(bangGia.RateName))
            {
                return BadRequest(new
                {
                    message = "Tên bảng giá không được để trống."
                });
            }

            // Kiểm tra trùng khoảng thời gian
            // Không tính chính bảng giá đang sửa
            var biTrung = await _context.BangGias
                .AnyAsync(bg =>
                    bg.Id != id &&
                    bg.RoomTypeId == bangGia.RoomTypeId &&
                    bangGia.StartDate <= bg.EndDate &&
                    bangGia.EndDate >= bg.StartDate);

            if (biTrung)
            {
                return BadRequest(new
                {
                    message = "Khoảng thời gian của bảng giá bị trùng với bảng giá đã tồn tại."
                });
            }

            bangGiaCu.RoomTypeId = bangGia.RoomTypeId;
            bangGiaCu.RateName = bangGia.RateName;
            bangGiaCu.StartDate = bangGia.StartDate;
            bangGiaCu.EndDate = bangGia.EndDate;
            bangGiaCu.PricePerNight = bangGia.PricePerNight;
            bangGiaCu.PricePerHour = bangGia.PricePerHour;

            await _context.SaveChangesAsync();

            return Ok(bangGiaCu);
        }

        // =========================
        // DELETE: api/BangGia/1
        // =========================
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var bangGia = await _context.BangGias
                .FindAsync(id);

            if (bangGia == null)
            {
                return NotFound(new
                {
                    message = "Bảng giá không tồn tại."
                });
            }

            _context.BangGias.Remove(bangGia);

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Xóa bảng giá thành công."
            });
        }
    }
}