using HotelManagementSystem.API.Data;
using HotelManagementSystem.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HotelManagementSystem.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Admin,Kế toán")]
    public class ThanhToanController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ThanhToanController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/ThanhToan
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var thanhToans = await _context.ThanhToans
                .ToListAsync();

            return Ok(thanhToans);
        }

        // GET: api/ThanhToan/1
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var thanhToan = await _context.ThanhToans
                .FindAsync(id);

            if (thanhToan == null)
            {
                return NotFound(new
                {
                    message = "Thanh toán không tồn tại."
                });
            }

            return Ok(thanhToan);
        }

        // POST: api/ThanhToan
        [HttpPost]
        public async Task<IActionResult> Create(ThanhToan thanhToan)
        {
            var hoaDon = await _context.HoaDons
                .FindAsync(thanhToan.HoaDonId);

            if (hoaDon == null)
            {
                return BadRequest(new
                {
                    message = "Hóa đơn không tồn tại."
                });
            }

            if (thanhToan.SoTien <= 0)
            {
                return BadRequest(new
                {
                    message = "Số tiền thanh toán phải lớn hơn 0."
                });
            }

            var tongDaThanhToan = await _context.ThanhToans
                .Where(t => t.HoaDonId == thanhToan.HoaDonId)
                .SumAsync(t => (decimal?)t.SoTien) ?? 0;

            var soTienConLai = hoaDon.TongTien - tongDaThanhToan;

            if (thanhToan.SoTien > soTienConLai)
            {
                return BadRequest(new
                {
                    message = "Số tiền thanh toán vượt quá số tiền còn phải trả.",
                    soTienConLai
                });
            }

            _context.ThanhToans.Add(thanhToan);

            await _context.SaveChangesAsync();

            var tongSauThanhToan =
                tongDaThanhToan + thanhToan.SoTien;

            if (tongSauThanhToan >= hoaDon.TongTien)
            {
                hoaDon.TrangThai = "DaThanhToan";
                await _context.SaveChangesAsync();
            }

            return Ok(new
            {
                message = "Thanh toán thành công.",
                thanhToan,
                tongDaThanhToan = tongSauThanhToan,
                soTienConLai = hoaDon.TongTien - tongSauThanhToan
            });
        }

        // PUT: api/ThanhToan/1
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(
            int id,
            ThanhToan thanhToan)
        {
            var thanhToanCu = await _context.ThanhToans
                .FindAsync(id);

            if (thanhToanCu == null)
            {
                return NotFound(new
                {
                    message = "Thanh toán không tồn tại."
                });
            }

            if (thanhToan.SoTien <= 0)
            {
                return BadRequest(new
                {
                    message = "Số tiền thanh toán phải lớn hơn 0."
                });
            }

            var hoaDon = await _context.HoaDons
                .FindAsync(thanhToan.HoaDonId);

            if (hoaDon == null)
            {
                return BadRequest(new
                {
                    message = "Hóa đơn không tồn tại."
                });
            }

            thanhToanCu.HoaDonId = thanhToan.HoaDonId;
            thanhToanCu.NgayThanhToan = thanhToan.NgayThanhToan;
            thanhToanCu.SoTien = thanhToan.SoTien;
            thanhToanCu.PhuongThuc = thanhToan.PhuongThuc;
            thanhToanCu.TrangThai = thanhToan.TrangThai;

            await _context.SaveChangesAsync();

            return Ok(thanhToanCu);
        }

        // DELETE: api/ThanhToan/1
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var thanhToan = await _context.ThanhToans
                .FindAsync(id);

            if (thanhToan == null)
            {
                return NotFound(new
                {
                    message = "Thanh toán không tồn tại."
                });
            }

            _context.ThanhToans.Remove(thanhToan);

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Xóa thanh toán thành công."
            });
        }
    }
}