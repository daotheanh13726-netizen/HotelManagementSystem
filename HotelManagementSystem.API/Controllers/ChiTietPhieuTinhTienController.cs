using HotelManagementSystem.API.Data;
using HotelManagementSystem.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HotelManagementSystem.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Admin,Kế toán,Lễ tân")]
    public class ChiTietPhieuTinhTienController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ChiTietPhieuTinhTienController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/ChiTietPhieuTinhTien?phieuTinhTienId=1
        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] int? phieuTinhTienId)
        {
            var query = _context.ChiTietPhieuTinhTiens.AsQueryable();

            if (phieuTinhTienId.HasValue && phieuTinhTienId.Value > 0)
            {
                query = query.Where(ct => ct.PhieuTinhTienId == phieuTinhTienId.Value);
            }

            var danhSach = await (from ct in query
                                  join dv in _context.Services on ct.DichVuId equals dv.Id into dvGroup
                                  from dv in dvGroup.DefaultIfEmpty()
                                  select new
                                  {
                                      id = ct.Id,
                                      phieuTinhTienId = ct.PhieuTinhTienId,
                                      dichVuId = ct.DichVuId,
                                      tenDichVu = dv != null ? dv.Name : "Dịch vụ không xác định",
                                      donViTinh = dv != null ? dv.Unit : "",
                                      soLuong = ct.SoLuong,
                                      donGia = ct.DonGia,
                                      thanhTien = ct.ThanhTien
                                  }).ToListAsync();

            return Ok(danhSach);
        }

        // GET: api/ChiTietPhieuTinhTien/1
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var chiTiet = await (from ct in _context.ChiTietPhieuTinhTiens
                                 where ct.Id == id
                                 join dv in _context.Services on ct.DichVuId equals dv.Id into dvGroup
                                 from dv in dvGroup.DefaultIfEmpty()
                                 select new
                                 {
                                     id = ct.Id,
                                     phieuTinhTienId = ct.PhieuTinhTienId,
                                     dichVuId = ct.DichVuId,
                                     tenDichVu = dv != null ? dv.Name : "Dịch vụ không xác định",
                                     donViTinh = dv != null ? dv.Unit : "",
                                     soLuong = ct.SoLuong,
                                     donGia = ct.DonGia,
                                     thanhTien = ct.ThanhTien
                                 }).FirstOrDefaultAsync();

            if (chiTiet == null)
            {
                return NotFound(new
                {
                    message = "Chi tiết phiếu tính tiền không tồn tại."
                });
            }

            return Ok(chiTiet);
        }

        // POST: api/ChiTietPhieuTinhTien
        [HttpPost]
        public async Task<IActionResult> Create(ChiTietPhieuTinhTien chiTiet)
        {
            // Kiểm tra phiếu tính tiền
            var phieu = await _context.PhieuTinhTiens
                .FirstOrDefaultAsync(p => p.Id == chiTiet.PhieuTinhTienId);

            if (phieu == null)
            {
                return BadRequest(new
                {
                    message = "Phiếu tính tiền không tồn tại."
                });
            }

            // Kiểm tra trạng thái phiếu tính tiền
            if (phieu.TrangThai == "DaThanhToan")
            {
                return BadRequest(new
                {
                    message = "Phiếu tính tiền đã thanh toán, không thể thêm dịch vụ mới."
                });
            }

            // Kiểm tra hóa đơn liên kết đã thanh toán chưa
            var hoaDonDaThanhToan = await _context.HoaDons
                .AnyAsync(h => h.PhieuTinhTienId == phieu.Id && h.TrangThai == "DaThanhToan");

            if (hoaDonDaThanhToan)
            {
                return BadRequest(new
                {
                    message = "Phiếu tính tiền đã có hóa đơn thanh toán, không thể thêm dịch vụ."
                });
            }

            // Kiểm tra dịch vụ
            var dichVu = await _context.Services
                .FirstOrDefaultAsync(d => d.Id == chiTiet.DichVuId);

            if (dichVu == null)
            {
                return BadRequest(new
                {
                    message = "Dịch vụ không tồn tại."
                });
            }

            // Kiểm tra dịch vụ đang hoạt động
            if (!dichVu.IsActive)
            {
                return BadRequest(new
                {
                    message = "Dịch vụ hiện không hoạt động."
                });
            }

            // Kiểm tra số lượng
            if (chiTiet.SoLuong <= 0)
            {
                return BadRequest(new
                {
                    message = "Số lượng phải lớn hơn 0."
                });
            }

            // Nếu phiếu đã có dịch vụ này, cộng dồn số lượng
            var chiTietDaCo = await _context.ChiTietPhieuTinhTiens
                .FirstOrDefaultAsync(ct => ct.PhieuTinhTienId == chiTiet.PhieuTinhTienId && ct.DichVuId == chiTiet.DichVuId);

            if (chiTietDaCo != null)
            {
                chiTietDaCo.SoLuong += chiTiet.SoLuong;
                chiTietDaCo.DonGia = dichVu.Price;
                chiTietDaCo.ThanhTien = chiTietDaCo.SoLuong * chiTietDaCo.DonGia;

                await _context.SaveChangesAsync();
                await CapNhatTongTien(chiTiet.PhieuTinhTienId);

                return Ok(new
                {
                    message = "Cập nhật số lượng dịch vụ thành công.",
                    data = chiTietDaCo
                });
            }

            // Lấy giá hiện tại của dịch vụ từ Database
            chiTiet.DonGia = dichVu.Price;

            // Tính thành tiền
            chiTiet.ThanhTien = chiTiet.SoLuong * chiTiet.DonGia;

            // Thêm chi tiết
            _context.ChiTietPhieuTinhTiens.Add(chiTiet);
            await _context.SaveChangesAsync();

            // Cập nhật lại tổng tiền của phiếu
            await CapNhatTongTien(chiTiet.PhieuTinhTienId);

            return Ok(new
            {
                message = "Thêm dịch vụ vào phiếu tính tiền thành công.",
                data = chiTiet
            });
        }

        // PUT: api/ChiTietPhieuTinhTien/1
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(
            int id,
            ChiTietPhieuTinhTien chiTiet)
        {
            var chiTietCu = await _context.ChiTietPhieuTinhTiens
                .FindAsync(id);

            if (chiTietCu == null)
            {
                return NotFound(new
                {
                    message = "Chi tiết phiếu tính tiền không tồn tại."
                });
            }

            // Kiểm tra trạng thái phiếu cũ
            var phieuCu = await _context.PhieuTinhTiens
                .FirstOrDefaultAsync(p => p.Id == chiTietCu.PhieuTinhTienId);

            if (phieuCu != null && phieuCu.TrangThai == "DaThanhToan")
            {
                return BadRequest(new
                {
                    message = "Phiếu tính tiền đã thanh toán, không thể chỉnh sửa dịch vụ."
                });
            }

            // Lưu lại phiếu cũ
            var phieuCuId = chiTietCu.PhieuTinhTienId;

            // Kiểm tra phiếu mới
            var phieuMoi = await _context.PhieuTinhTiens
                .FirstOrDefaultAsync(p => p.Id == chiTiet.PhieuTinhTienId);

            if (phieuMoi == null)
            {
                return BadRequest(new
                {
                    message = "Phiếu tính tiền mới không tồn tại."
                });
            }

            if (phieuMoi.TrangThai == "DaThanhToan")
            {
                return BadRequest(new
                {
                    message = "Phiếu tính tiền mới đã thanh toán, không thể chuyển dịch vụ sang."
                });
            }

            // Kiểm tra dịch vụ
            var dichVu = await _context.Services
                .FirstOrDefaultAsync(d => d.Id == chiTiet.DichVuId);

            if (dichVu == null)
            {
                return BadRequest(new
                {
                    message = "Dịch vụ không tồn tại."
                });
            }

            // Kiểm tra dịch vụ đang hoạt động
            if (!dichVu.IsActive)
            {
                return BadRequest(new
                {
                    message = "Dịch vụ hiện không hoạt động."
                });
            }

            // Kiểm tra số lượng
            if (chiTiet.SoLuong <= 0)
            {
                return BadRequest(new
                {
                    message = "Số lượng phải lớn hơn 0."
                });
            }

            // Cập nhật thông tin chi tiết
            chiTietCu.PhieuTinhTienId = chiTiet.PhieuTinhTienId;
            chiTietCu.DichVuId = chiTiet.DichVuId;
            chiTietCu.SoLuong = chiTiet.SoLuong;

            // Lấy giá hiện tại của dịch vụ từ Database
            chiTietCu.DonGia = dichVu.Price;

            // Tính lại thành tiền
            chiTietCu.ThanhTien =
                chiTietCu.SoLuong * chiTietCu.DonGia;

            await _context.SaveChangesAsync();

            // Cập nhật phiếu mới
            await CapNhatTongTien(phieuMoi.Id);

            // Nếu chuyển chi tiết từ phiếu cũ sang phiếu mới
            // thì phải cập nhật lại cả phiếu cũ
            if (phieuCuId != phieuMoi.Id)
            {
                await CapNhatTongTien(phieuCuId);
            }

            return Ok(chiTietCu);
        }

        // DELETE: api/ChiTietPhieuTinhTien/1
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var chiTiet = await _context.ChiTietPhieuTinhTiens
                .FindAsync(id);

            if (chiTiet == null)
            {
                return NotFound(new
                {
                    message = "Chi tiết phiếu tính tiền không tồn tại."
                });
            }

            // Kiểm tra trạng thái phiếu
            var phieu = await _context.PhieuTinhTiens
                .FirstOrDefaultAsync(p => p.Id == chiTiet.PhieuTinhTienId);

            if (phieu != null && phieu.TrangThai == "DaThanhToan")
            {
                return BadRequest(new
                {
                    message = "Phiếu tính tiền đã thanh toán, không thể xóa dịch vụ."
                });
            }

            var hoaDonDaThanhToan = phieu != null && await _context.HoaDons
                .AnyAsync(h => h.PhieuTinhTienId == phieu.Id && h.TrangThai == "DaThanhToan");

            if (hoaDonDaThanhToan)
            {
                return BadRequest(new
                {
                    message = "Phiếu tính tiền đã có hóa đơn thanh toán, không thể xóa dịch vụ."
                });
            }

            var phieuId = chiTiet.PhieuTinhTienId;

            // Xóa chi tiết
            _context.ChiTietPhieuTinhTiens.Remove(chiTiet);

            await _context.SaveChangesAsync();

            // Cập nhật lại tổng tiền
            await CapNhatTongTien(phieuId);

            return Ok(new
            {
                message = "Xóa chi tiết dịch vụ thành công."
            });
        }

        // =========================================================
        // Cập nhật tiền dịch vụ và tổng tiền của phiếu tính tiền
        // =========================================================
        private async Task CapNhatTongTien(int phieuTinhTienId)
        {
            var phieu = await _context.PhieuTinhTiens
                .FirstOrDefaultAsync(p => p.Id == phieuTinhTienId);

            if (phieu == null)
            {
                return;
            }

            // Tính tổng tiền của tất cả dịch vụ trong phiếu
            var tongTienDichVu = await _context.ChiTietPhieuTinhTiens
                .Where(ct => ct.PhieuTinhTienId == phieuTinhTienId)
                .SumAsync(ct => ct.ThanhTien);

            // Cập nhật tiền dịch vụ
            phieu.TienDichVu = tongTienDichVu;

            // Cập nhật tổng tiền
            phieu.TongTien =
                phieu.TienPhong +
                tongTienDichVu;

            // Đánh dấu entity cần cập nhật
            _context.PhieuTinhTiens.Update(phieu);

            // Lưu xuống database
            await _context.SaveChangesAsync();
        }
    }
}
