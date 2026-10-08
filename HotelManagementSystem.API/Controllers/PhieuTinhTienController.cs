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
    public class PhieuTinhTienController : ControllerBase
    {
        private readonly AppDbContext _context;

        public PhieuTinhTienController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/PhieuTinhTien
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var phieuTinhTiens = await _context.PhieuTinhTiens
                .ToListAsync();

            return Ok(phieuTinhTiens);
        }

        // GET: api/PhieuTinhTien/1
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var phieuTinhTien = await _context.PhieuTinhTiens
                .FindAsync(id);

            if (phieuTinhTien == null)
            {
                return NotFound(new
                {
                    message = "Phiếu tính tiền không tồn tại."
                });
            }

            return Ok(phieuTinhTien);
        }

        // POST: api/PhieuTinhTien
        [HttpPost]
        public async Task<IActionResult> Create(
            PhieuTinhTien phieuTinhTien)
        {
            var datPhongTonTai = await _context.Reservations
                .AnyAsync(dp => dp.Id == phieuTinhTien.DatPhongId);

            if (!datPhongTonTai)
            {
                return BadRequest(new
                {
                    message = "Đơn đặt phòng không tồn tại."
                });
            }

            if (phieuTinhTien.TienPhong < 0 ||
                phieuTinhTien.TienDichVu < 0)
            {
                return BadRequest(new
                {
                    message = "Số tiền không được âm."
                });
            }

            phieuTinhTien.TongTien =
                phieuTinhTien.TienPhong +
                phieuTinhTien.TienDichVu;

            _context.PhieuTinhTiens.Add(phieuTinhTien);

            await _context.SaveChangesAsync();

            return Ok(phieuTinhTien);
        }

        // =========================================================
        // TÍNH TIỀN PHÒNG THEO GIỜ / ĐÊM
        // =========================================================
        // POST:
        // api/PhieuTinhTien/calculate-room-price
        //
        // Ví dụ:
        // ?reservationId=1&loaiTinhTien=Dem
        //
        // hoặc:
        // ?reservationId=1&loaiTinhTien=Gio
        // =========================================================
        [HttpPost("calculate-room-price")]
        public async Task<IActionResult> CalculateRoomPrice(
            int reservationId,
            string loaiTinhTien)
        {
            // 1. Tìm đơn đặt phòng
            var reservation = await _context.Reservations
                .FindAsync(reservationId);

            if (reservation == null)
            {
                return NotFound(new
                {
                    message = "Đơn đặt phòng không tồn tại."
                });
            }

            // 2. Kiểm tra loại tính tiền
            if (string.IsNullOrWhiteSpace(loaiTinhTien))
            {
                return BadRequest(new
                {
                    message = "Vui lòng chọn loại tính tiền: Gio hoặc Dem."
                });
            }

            if (!loaiTinhTien.Equals("Gio",
                    StringComparison.OrdinalIgnoreCase) &&
                !loaiTinhTien.Equals("Dem",
                    StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest(new
                {
                    message = "Loại tính tiền chỉ được là Gio hoặc Dem."
                });
            }

            // 3. Tìm phòng được gán cho đơn
            var reservationRoom = await _context.ReservationRooms
                .FirstOrDefaultAsync(rr =>
                    rr.ReservationId == reservationId);

            if (reservationRoom == null)
            {
                return BadRequest(new
                {
                    message = "Đơn đặt phòng chưa được gán phòng."
                });
            }

            // 4. Tìm phòng
            var room = await _context.Rooms
                .FindAsync(reservationRoom.RoomId);

            if (room == null)
            {
                return BadRequest(new
                {
                    message = "Phòng không tồn tại."
                });
            }

            // 5. Xác định thời gian bắt đầu
            var checkIn = reservationRoom.CheckInActual
                ?? reservation.CheckInDate;

            // 6. Xác định thời gian kết thúc
            var checkOut = reservationRoom.CheckOutActual
                ?? reservation.CheckOutDate;

            if (checkOut <= checkIn)
            {
                return BadRequest(new
                {
                    message = "Thời gian check-out phải lớn hơn thời gian check-in."
                });
            }

            decimal tienPhong;

            // =====================================================
            // TÍNH THEO GIỜ
            // =====================================================
            if (loaiTinhTien.Equals(
                "Gio",
                StringComparison.OrdinalIgnoreCase))
            {
                var soGio = (checkOut - checkIn).TotalHours;

                var bangGia = await _context.BangGias
                    .Where(bg =>
                        bg.RoomTypeId == room.RoomTypeId &&
                        bg.StartDate.Date <= checkIn.Date &&
                        bg.EndDate.Date >= checkIn.Date)
                    .OrderByDescending(bg => bg.StartDate)
                    .FirstOrDefaultAsync();

                if (bangGia == null)
                {
                    return BadRequest(new
                    {
                        message =
                            "Không tìm thấy bảng giá theo giờ phù hợp."
                    });
                }

                if (bangGia.PricePerHour <= 0)
                {
                    return BadRequest(new
                    {
                        message =
                            "Bảng giá theo giờ chưa được thiết lập."
                    });
                }

                var soGioTinhTien = Math.Ceiling(soGio);

                tienPhong =
                    (decimal)soGioTinhTien *
                    bangGia.PricePerHour;
            }
            // =====================================================
            // TÍNH THEO ĐÊM
            // =====================================================
            else
            {
                var soNgay = (checkOut - checkIn).TotalDays;

                var soDem = Math.Ceiling(soNgay);

                // Tính tiền theo từng đêm để hỗ trợ
                // bảng giá theo ngày/mùa.
                tienPhong = 0;

                for (int i = 0; i < soDem; i++)
                {
                    var ngayTinhTien = checkIn.Date.AddDays(i);

                    var bangGia = await _context.BangGias
                        .Where(bg =>
                            bg.RoomTypeId == room.RoomTypeId &&
                            bg.StartDate.Date <= ngayTinhTien &&
                            bg.EndDate.Date >= ngayTinhTien)
                        .OrderByDescending(bg => bg.StartDate)
                        .FirstOrDefaultAsync();

                    if (bangGia == null)
                    {
                        return BadRequest(new
                        {
                            message =
                                $"Không tìm thấy bảng giá cho ngày {ngayTinhTien:dd/MM/yyyy}."
                        });
                    }

                    if (bangGia.PricePerNight <= 0)
                    {
                        return BadRequest(new
                        {
                            message =
                                $"Bảng giá theo đêm cho ngày {ngayTinhTien:dd/MM/yyyy} chưa được thiết lập."
                        });
                    }

                    tienPhong += bangGia.PricePerNight;
                }
            }

            // =====================================================
            // TÌM / TẠO PHIẾU TÍNH TIỀN
            // =====================================================
            var phieuTinhTien = await _context.PhieuTinhTiens
                .FirstOrDefaultAsync(p =>
                    p.DatPhongId == reservationId);

            if (phieuTinhTien == null)
            {
                phieuTinhTien = new PhieuTinhTien
                {
                    DatPhongId = reservationId,
                    NgayTao = DateTime.Now,
                    TienPhong = tienPhong,
                    TienDichVu = 0,
                    TongTien = tienPhong,
                    TrangThai = "ChuaThanhToan"
                };

                _context.PhieuTinhTiens.Add(phieuTinhTien);
            }
            else
            {
                phieuTinhTien.TienPhong = tienPhong;

                phieuTinhTien.TongTien =
                    phieuTinhTien.TienPhong +
                    phieuTinhTien.TienDichVu;
            }

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Tính tiền phòng thành công.",
                reservationId,
                roomId = room.Id,
                roomNumber = room.RoomNumber,
                loaiTinhTien,
                checkIn,
                checkOut,
                tienPhong,
                tienDichVu = phieuTinhTien.TienDichVu,
                tongTien = phieuTinhTien.TongTien,
                phieuTinhTienId = phieuTinhTien.Id
            });
        }

        // PUT: api/PhieuTinhTien/1
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(
            int id,
            PhieuTinhTien phieuTinhTien)
        {
            var phieuCu = await _context.PhieuTinhTiens
                .FindAsync(id);

            if (phieuCu == null)
            {
                return NotFound(new
                {
                    message = "Phiếu tính tiền không tồn tại."
                });
            }

            var datPhongTonTai = await _context.Reservations
                .AnyAsync(dp => dp.Id == phieuTinhTien.DatPhongId);

            if (!datPhongTonTai)
            {
                return BadRequest(new
                {
                    message = "Đơn đặt phòng không tồn tại."
                });
            }

            if (phieuTinhTien.TienPhong < 0 ||
                phieuTinhTien.TienDichVu < 0)
            {
                return BadRequest(new
                {
                    message = "Số tiền không được âm."
                });
            }

            phieuCu.DatPhongId = phieuTinhTien.DatPhongId;
            phieuCu.TienPhong = phieuTinhTien.TienPhong;
            phieuCu.TienDichVu = phieuTinhTien.TienDichVu;

            phieuCu.TongTien =
                phieuTinhTien.TienPhong +
                phieuTinhTien.TienDichVu;

            phieuCu.TrangThai = phieuTinhTien.TrangThai;

            await _context.SaveChangesAsync();

            return Ok(phieuCu);
        }

        // DELETE: api/PhieuTinhTien/1
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var phieuTinhTien = await _context.PhieuTinhTiens
                .FindAsync(id);

            if (phieuTinhTien == null)
            {
                return NotFound(new
                {
                    message = "Phiếu tính tiền không tồn tại."
                });
            }

            _context.PhieuTinhTiens.Remove(phieuTinhTien);

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Xóa phiếu tính tiền thành công."
            });
        }
    }
}