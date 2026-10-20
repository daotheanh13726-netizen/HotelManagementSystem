using HotelManagementSystem.API.Data;
using HotelManagementSystem.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace HotelManagementSystem.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Admin,Kế toán,Lễ tân")]
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

        // GET: api/HoaDon/1/pdf
        [HttpGet("{id}/pdf")]
        public async Task<IActionResult> ExportPdf(int id)
        {
            // 1. Tìm hóa đơn
            var hoaDon = await _context.HoaDons
                .FirstOrDefaultAsync(h => h.Id == id);

            if (hoaDon == null)
            {
                return NotFound(new
                {
                    message = "Hóa đơn không tồn tại."
                });
            }

            // 2. Tìm phiếu tính tiền
            var phieuTinhTien = await _context.PhieuTinhTiens
                .FirstOrDefaultAsync(p =>
                    p.Id == hoaDon.PhieuTinhTienId);

            if (phieuTinhTien == null)
            {
                return NotFound(new
                {
                    message = "Phiếu tính tiền của hóa đơn không tồn tại."
                });
            }

            // 3. Lấy chi tiết dịch vụ
            var chiTietDichVu = await _context.ChiTietPhieuTinhTiens
                .Where(ct =>
                    ct.PhieuTinhTienId == phieuTinhTien.Id)
                .ToListAsync();

            // 4. Lấy danh sách ID dịch vụ
            var dichVuIds = chiTietDichVu
                .Select(ct => ct.DichVuId)
                .Distinct()
                .ToList();

            // 5. Lấy toàn bộ dịch vụ trước khi tạo PDF
            var dichVus = await _context.Services
                .Where(d => dichVuIds.Contains(d.Id))
                .ToListAsync();

            // 6. Tạo file PDF
            var pdf = Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Size(PageSizes.A4);

                    page.Margin(40);

                    page.DefaultTextStyle(style =>
                        style.FontSize(11));

                    // =========================
                    // HEADER
                    // =========================
                    page.Header()
                        .Column(column =>
                        {
                            column.Item()
                                .AlignCenter()
                                .Text("HÓA ĐƠN THANH TOÁN")
                                .Bold()
                                .FontSize(20);

                            column.Item()
                                .PaddingTop(5)
                                .AlignCenter()
                                .Text(
                                    $"Số hóa đơn: {hoaDon.SoHoaDon}")
                                .FontSize(12);
                        });

                    // =========================
                    // CONTENT
                    // =========================
                    page.Content()
                        .PaddingTop(20)
                        .Column(column =>
                        {
                            column.Spacing(10);

                            // Ngày lập
                            column.Item()
                                .Text(
                                    $"Ngày lập: {hoaDon.NgayLap:dd/MM/yyyy HH:mm}");

                            // Trạng thái
                            column.Item()
                                .Text(
                                    $"Trạng thái: {hoaDon.TrangThai}");

                            // =========================
                            // THÔNG TIN TIỀN
                            // =========================
                            column.Item()
                                .PaddingTop(10)
                                .Text("THÔNG TIN THANH TOÁN")
                                .Bold()
                                .FontSize(14);

                            column.Item()
                                .Table(table =>
                                {
                                    table.ColumnsDefinition(columns =>
                                    {
                                        columns.RelativeColumn(3);
                                        columns.RelativeColumn(2);
                                    });

                                    // Header
                                    table.Header(header =>
                                    {
                                        header.Cell()
                                            .BorderBottom(1)
                                            .Padding(5)
                                            .Text("Nội dung")
                                            .Bold();

                                        header.Cell()
                                            .BorderBottom(1)
                                            .Padding(5)
                                            .AlignRight()
                                            .Text("Số tiền")
                                            .Bold();
                                    });

                                    // Tiền phòng
                                    table.Cell()
                                        .Padding(5)
                                        .Text("Tiền phòng");

                                    table.Cell()
                                        .Padding(5)
                                        .AlignRight()
                                        .Text(
                                            $"{phieuTinhTien.TienPhong:N0} VNĐ");

                                    // Tiền dịch vụ
                                    table.Cell()
                                        .Padding(5)
                                        .Text("Tiền dịch vụ");

                                    table.Cell()
                                        .Padding(5)
                                        .AlignRight()
                                        .Text(
                                            $"{phieuTinhTien.TienDichVu:N0} VNĐ");

                                    // Tiền trước thuế
                                    table.Cell()
                                        .Padding(5)
                                        .Text("Tiền trước thuế");

                                    table.Cell()
                                        .Padding(5)
                                        .AlignRight()
                                        .Text(
                                            $"{hoaDon.TienTruocThue:N0} VNĐ");

                                    // VAT
                                    table.Cell()
                                        .Padding(5)
                                        .Text("VAT 10%");

                                    table.Cell()
                                        .Padding(5)
                                        .AlignRight()
                                        .Text(
                                            $"{hoaDon.TienVAT:N0} VNĐ");

                                    // Tổng
                                    table.Cell()
                                        .BorderTop(1)
                                        .Padding(5)
                                        .Text("TỔNG THANH TOÁN")
                                        .Bold();

                                    table.Cell()
                                        .BorderTop(1)
                                        .Padding(5)
                                        .AlignRight()
                                        .Text(
                                            $"{hoaDon.TongTien:N0} VNĐ")
                                        .Bold();
                                });

                            // =========================
                            // CHI TIẾT DỊCH VỤ
                            // =========================
                            if (chiTietDichVu.Any())
                            {
                                column.Item()
                                    .PaddingTop(15)
                                    .Text("CHI TIẾT DỊCH VỤ")
                                    .Bold()
                                    .FontSize(14);

                                column.Item()
                                    .Table(table =>
                                    {
                                        table.ColumnsDefinition(columns =>
                                        {
                                            columns.ConstantColumn(40);
                                            columns.RelativeColumn(3);
                                            columns.RelativeColumn(1);
                                            columns.RelativeColumn(2);
                                            columns.RelativeColumn(2);
                                        });

                                        // Header
                                        table.Header(header =>
                                        {
                                            header.Cell()
                                                .Padding(5)
                                                .Text("STT")
                                                .Bold();

                                            header.Cell()
                                                .Padding(5)
                                                .Text("Dịch vụ")
                                                .Bold();

                                            header.Cell()
                                                .Padding(5)
                                                .AlignRight()
                                                .Text("SL")
                                                .Bold();

                                            header.Cell()
                                                .Padding(5)
                                                .AlignRight()
                                                .Text("Đơn giá")
                                                .Bold();

                                            header.Cell()
                                                .Padding(5)
                                                .AlignRight()
                                                .Text("Thành tiền")
                                                .Bold();
                                        });

                                        int stt = 1;

                                        foreach (var chiTiet in chiTietDichVu)
                                        {
                                            var dichVu = dichVus
                                                .FirstOrDefault(d =>
                                                    d.Id == chiTiet.DichVuId);

                                            var tenDichVu =
                                                dichVu?.Name
                                                ?? "Dịch vụ không xác định";

                                            table.Cell()
                                                .Padding(5)
                                                .Text(stt.ToString());

                                            table.Cell()
                                                .Padding(5)
                                                .Text(tenDichVu);

                                            table.Cell()
                                                .Padding(5)
                                                .AlignRight()
                                                .Text(
                                                    chiTiet.SoLuong
                                                        .ToString());

                                            table.Cell()
                                                .Padding(5)
                                                .AlignRight()
                                                .Text(
                                                    $"{chiTiet.DonGia:N0}");

                                            table.Cell()
                                                .Padding(5)
                                                .AlignRight()
                                                .Text(
                                                    $"{chiTiet.ThanhTien:N0}");

                                            stt++;
                                        }
                                    });
                            }

                            // =========================
                            // FOOTER CONTENT
                            // =========================
                            column.Item()
                                .PaddingTop(30)
                                .AlignCenter()
                                .Text(
                                    "Cảm ơn quý khách đã sử dụng dịch vụ.")
                                .Italic();
                        });

                    // =========================
                    // PAGE FOOTER
                    // =========================
                    page.Footer()
                        .AlignCenter()
                        .Text("Hệ thống quản lý khách sạn");
                });
            }).GeneratePdf();

            // 7. Trả file PDF
            var fileName =
                $"HoaDon_{hoaDon.SoHoaDon}.pdf";

            return File(
                pdf,
                "application/pdf",
                fileName);
        }
    }
}