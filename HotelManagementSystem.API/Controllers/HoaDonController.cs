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
    public class HoaDonController : ControllerBase
    {
        private readonly AppDbContext _context;

        public HoaDonController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/HoaDon
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var hoaDons = await _context.HoaDons
                .ToListAsync();

            return Ok(hoaDons);
        }

        // GET: api/HoaDon/1
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var hoaDon = await _context.HoaDons
                .FindAsync(id);

            if (hoaDon == null)
            {
                return NotFound(new
                {
                    message = "Hóa đơn không tồn tại."
                });
            }

            return Ok(hoaDon);
        }

        // POST: api/HoaDon
        [HttpPost]
        public async Task<IActionResult> Create(HoaDon hoaDon)
        {
            // 1. Tìm phiếu tính tiền
            var phieuTinhTien = await _context.PhieuTinhTiens
                .FindAsync(hoaDon.PhieuTinhTienId);

            if (phieuTinhTien == null)
            {
                return BadRequest(new
                {
                    message = "Phiếu tính tiền không tồn tại."
                });
            }

            // 2. Mỗi phiếu tính tiền chỉ có một hóa đơn
            var daCoHoaDon = await _context.HoaDons
                .AnyAsync(h =>
                    h.PhieuTinhTienId == hoaDon.PhieuTinhTienId);

            if (daCoHoaDon)
            {
                return BadRequest(new
                {
                    message = "Phiếu tính tiền này đã có hóa đơn."
                });
            }

            // 3. Kiểm tra số hóa đơn
            if (string.IsNullOrWhiteSpace(hoaDon.SoHoaDon))
            {
                return BadRequest(new
                {
                    message = "Số hóa đơn không được để trống."
                });
            }

            // 4. Lấy tổng tiền từ phiếu tính tiền
            decimal tienTruocThue = phieuTinhTien.TongTien;

            if (tienTruocThue < 0)
            {
                return BadRequest(new
                {
                    message = "Tổng tiền phiếu tính tiền không hợp lệ."
                });
            }

            // 5. Tính VAT 10%
            decimal tienVAT = tienTruocThue * 0.10m;

            // 6. Tính tổng tiền sau VAT
            decimal tongTien = tienTruocThue + tienVAT;

            // 7. Gán giá trị tự động
            hoaDon.TienTruocThue = tienTruocThue;
            hoaDon.TienVAT = tienVAT;
            hoaDon.TongTien = tongTien;

            // Nếu chưa truyền trạng thái thì mặc định chưa thanh toán
            if (string.IsNullOrWhiteSpace(hoaDon.TrangThai))
            {
                hoaDon.TrangThai = "ChuaThanhToan";
            }

            _context.HoaDons.Add(hoaDon);

            await _context.SaveChangesAsync();

            return Ok(hoaDon);
        }

        // PUT: api/HoaDon/1
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(
            int id,
            HoaDon hoaDon)
        {
            var hoaDonCu = await _context.HoaDons
                .FindAsync(id);

            if (hoaDonCu == null)
            {
                return NotFound(new
                {
                    message = "Hóa đơn không tồn tại."
                });
            }

            var phieuTinhTien = await _context.PhieuTinhTiens
                .FindAsync(hoaDonCu.PhieuTinhTienId);

            if (phieuTinhTien == null)
            {
                return BadRequest(new
                {
                    message = "Phiếu tính tiền của hóa đơn không tồn tại."
                });
            }

            if (string.IsNullOrWhiteSpace(hoaDon.SoHoaDon))
            {
                return BadRequest(new
                {
                    message = "Số hóa đơn không được để trống."
                });
            }

            // Lấy lại tiền từ phiếu tính tiền
            decimal tienTruocThue = phieuTinhTien.TongTien;

            // Tính VAT 10%
            decimal tienVAT = tienTruocThue * 0.10m;

            // Tính tổng
            decimal tongTien = tienTruocThue + tienVAT;

            hoaDonCu.SoHoaDon = hoaDon.SoHoaDon;
            hoaDonCu.TienTruocThue = tienTruocThue;
            hoaDonCu.TienVAT = tienVAT;
            hoaDonCu.TongTien = tongTien;
            hoaDonCu.TrangThai = hoaDon.TrangThai;

            await _context.SaveChangesAsync();

            return Ok(hoaDonCu);
        }

        // DELETE: api/HoaDon/1
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var hoaDon = await _context.HoaDons
                .FindAsync(id);

            if (hoaDon == null)
            {
                return NotFound(new
                {
                    message = "Hóa đơn không tồn tại."
                });
            }

            _context.HoaDons.Remove(hoaDon);

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Xóa hóa đơn thành công."
            });
        }
    }
}