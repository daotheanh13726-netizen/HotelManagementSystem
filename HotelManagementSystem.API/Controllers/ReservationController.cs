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
    public class ReservationController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ReservationController(AppDbContext context)
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
        // GET: api/Reservation/my-reservations
        // Khách hàng xem danh sách đặt phòng của chính mình (chống sửa GuestId/IDOR)
        // =========================================================
        [HttpGet("my-reservations")]
        public async Task<IActionResult> GetMyReservations()
        {
            var guestId = GetCurrentGuestId();
            if (!guestId.HasValue)
            {
                return BadRequest(new
                {
                    message = "Tài khoản hiện tại chưa được liên kết với hồ sơ khách hàng."
                });
            }

            // Chỉ truy vấn theo GuestId lấy từ token bảo chứng
            var reservations = await _context.Reservations
                .AsNoTracking()
                .Where(r => r.GuestId == guestId.Value)
                .OrderByDescending(r => r.BookingDate)
                .ToListAsync();

            return Ok(reservations);
        }

        // =========================================================
        // PUT: api/Reservation/my-reservations/{id}/cancel
        // Khách hàng tự hủy đơn đặt phòng của chính mình (khi còn Chờ xác nhận)
        // =========================================================
        [HttpPut("my-reservations/{id}/cancel")]
        public async Task<IActionResult> CancelMyReservation(int id)
        {
            var guestId = GetCurrentGuestId();
            if (!guestId.HasValue)
            {
                return BadRequest(new
                {
                    message = "Tài khoản chưa được liên kết với hồ sơ khách hàng."
                });
            }

            var reservation = await _context.Reservations
                .FirstOrDefaultAsync(r => r.Id == id && r.GuestId == guestId.Value);

            if (reservation == null)
            {
                return NotFound(new
                {
                    message = "Không tìm thấy đơn đặt phòng của bạn."
                });
            }

            if (reservation.Status != ReservationStatus.ChoXacNhan)
            {
                return BadRequest(new
                {
                    message = "Chỉ có thể hủy đơn đặt phòng khi đang ở trạng thái 'Chờ xác nhận'."
                });
            }

            reservation.Status = ReservationStatus.DaHuy;
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Hủy đặt phòng thành công.",
                reservation
            });
        }

        // =========================================================
        // POST: api/Reservation/book-online
        // Khách hàng tự đặt phòng trực tuyến (gán tự động GuestId của chính tài khoản)
        // Hoàn thiện: kiểm tra ngày nhận, ngày trả, tồn tại, bảo trì, trùng lịch và transaction
        // =========================================================
        [HttpPost("book-online")]
        public async Task<IActionResult> BookOnline([FromBody] CustomerBookingDto request)
        {
            var guestId = GetCurrentGuestId();
            if (!guestId.HasValue)
            {
                return BadRequest(new
                {
                    message = "Tài khoản chưa liên kết hồ sơ khách hàng để đặt phòng."
                });
            }

            // 1. Kiểm tra ngày nhận phòng
            if (request.CheckInDate.Date < DateTime.Today)
            {
                return BadRequest(new
                {
                    message = "Ngày nhận phòng không thể ở trong quá khứ."
                });
            }

            // 2. Kiểm tra ngày trả phòng phải sau ngày nhận phòng
            if (request.CheckOutDate <= request.CheckInDate)
            {
                return BadRequest(new
                {
                    message = "Ngày trả phòng phải sau ngày nhận phòng."
                });
            }

            // 3. Kiểm tra số lượng khách
            if (request.NumberOfGuests < 1)
            {
                return BadRequest(new
                {
                    message = "Số lượng khách phải lớn hơn hoặc bằng 1."
                });
            }

            // 4. Nếu có chọn phòng: kiểm tra phòng tồn tại, không bảo trì, không bị trùng lịch
            if (request.RoomId.HasValue)
            {
                var room = await _context.Rooms.FindAsync(request.RoomId.Value);
                if (room == null)
                {
                    return BadRequest(new
                    {
                        message = "Phòng được chọn không tồn tại."
                    });
                }

                if (room.Status == RoomStatus.BaoTri)
                {
                    return BadRequest(new
                    {
                        message = "Phòng hiện đang bảo trì, vui lòng chọn phòng khác."
                    });
                }

                // Kiểm tra trùng lịch với các đơn đặt phòng chưa hủy
                var isOverbooked = await _context.ReservationRooms
                    .AnyAsync(rr =>
                        rr.RoomId == request.RoomId.Value &&
                        _context.Reservations.Any(r =>
                            r.Id == rr.ReservationId &&
                            r.Status != ReservationStatus.DaHuy &&
                            r.CheckInDate < request.CheckOutDate &&
                            r.CheckOutDate > request.CheckInDate
                        )
                    );

                if (isOverbooked)
                {
                    return BadRequest(new
                    {
                        message = "Phòng đã có khách đặt trong khoảng thời gian này. Vui lòng chọn ngày hoặc phòng khác."
                    });
                }
            }

            // Tạo mã đặt phòng duy nhất: DP + timestamp
            var reservationCode = "DP" + DateTime.Now.ToString("yyMMddHHmmss");

            var reservation = new Reservation
            {
                ReservationCode = reservationCode,
                GuestId = guestId.Value,
                BookingDate = DateTime.Now,
                CheckInDate = request.CheckInDate,
                CheckOutDate = request.CheckOutDate,
                Status = ReservationStatus.ChoXacNhan,
                NumberOfGuests = request.NumberOfGuests,
                Notes = request.Notes
            };

            // 5. Sử dụng Transaction để tạo đơn và chi tiết đặt phòng nhất quán
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                _context.Reservations.Add(reservation);
                await _context.SaveChangesAsync();

                if (request.RoomId.HasValue)
                {
                    var reservationRoom = new ReservationRoom
                    {
                        ReservationId = reservation.Id,
                        RoomId = request.RoomId.Value
                    };
                    _context.ReservationRooms.Add(reservationRoom);
                    await _context.SaveChangesAsync();
                }

                await transaction.CommitAsync();

                return Ok(new
                {
                    message = "Đặt phòng trực tuyến thành công. Vui lòng chờ lễ tân xác nhận.",
                    reservation
                });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, new
                {
                    message = "Lỗi khi xử lý đặt phòng: " + ex.Message
                });
            }
        }

        // =========================================================
        // GET: api/Reservation (Dành cho Admin, Lễ tân)
        // =========================================================
        [HttpGet]
        [Authorize(Roles = "Admin,Lễ tân")]
        public async Task<IActionResult> GetAll(
            string? search,
            int? guestId,
            ReservationStatus? status,
            DateTime? fromDate,
            DateTime? toDate,
            string? sortBy = "CheckInDate",
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

            if (fromDate.HasValue && toDate.HasValue && fromDate.Value > toDate.Value)
            {
                return BadRequest(new
                {
                    message = "Ngày bắt đầu không được lớn hơn ngày kết thúc."
                });
            }

            IQueryable<Reservation> query = _context.Reservations;

            if (!string.IsNullOrWhiteSpace(search))
            {
                search = search.Trim();
                query = query.Where(r => r.ReservationCode.Contains(search));
            }

            if (guestId.HasValue)
            {
                query = query.Where(r => r.GuestId == guestId.Value);
            }

            if (status.HasValue)
            {
                query = query.Where(r => r.Status == status.Value);
            }

            if (fromDate.HasValue)
            {
                query = query.Where(r => r.CheckInDate >= fromDate.Value);
            }

            if (toDate.HasValue)
            {
                query = query.Where(r => r.CheckInDate <= toDate.Value);
            }

            bool descending = sortOrder?.ToLower() == "desc";

            switch (sortBy?.ToLower())
            {
                case "id":
                    query = descending ? query.OrderByDescending(r => r.Id) : query.OrderBy(r => r.Id);
                    break;
                case "reservationcode":
                    query = descending ? query.OrderByDescending(r => r.ReservationCode) : query.OrderBy(r => r.ReservationCode);
                    break;
                case "guestid":
                    query = descending ? query.OrderByDescending(r => r.GuestId) : query.OrderBy(r => r.GuestId);
                    break;
                case "checkindate":
                    query = descending ? query.OrderByDescending(r => r.CheckInDate) : query.OrderBy(r => r.CheckInDate);
                    break;
                case "checkoutdate":
                    query = descending ? query.OrderByDescending(r => r.CheckOutDate) : query.OrderBy(r => r.CheckOutDate);
                    break;
                case "status":
                    query = descending ? query.OrderByDescending(r => r.Status) : query.OrderBy(r => r.Status);
                    break;
                case "numberofguests":
                    query = descending ? query.OrderByDescending(r => r.NumberOfGuests) : query.OrderBy(r => r.NumberOfGuests);
                    break;
                default:
                    query = query.OrderBy(r => r.CheckInDate);
                    break;
            }

            int totalItems = await query.CountAsync();
            int totalPages = (int)Math.Ceiling(totalItems / (double)pageSize);

            var reservations = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return Ok(new
            {
                data = reservations,
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
        // GET: api/Reservation/1 (Dành cho Admin, Lễ tân)
        // =========================================================
        [HttpGet("{id}")]
        [Authorize(Roles = "Admin,Lễ tân")]
        public async Task<IActionResult> GetById(int id)
        {
            var reservation = await _context.Reservations.FindAsync(id);

            if (reservation == null)
            {
                return NotFound(new
                {
                    message = "Đơn đặt phòng không tồn tại."
                });
            }

            return Ok(reservation);
        }

        // =========================================================
        // POST: api/Reservation (Dành cho Admin, Lễ tân)
        // =========================================================
        [HttpPost]
        [Authorize(Roles = "Admin,Lễ tân")]
        public async Task<IActionResult> Create(Reservation reservation)
        {
            if (reservation.CheckOutDate <= reservation.CheckInDate)
            {
                return BadRequest(new
                {
                    message = "Ngày trả phòng phải sau ngày nhận phòng."
                });
            }

            var guestExists = await _context.Guests.AnyAsync(g => g.Id == reservation.GuestId);
            if (!guestExists)
            {
                return BadRequest(new
                {
                    message = "Khách hàng không tồn tại."
                });
            }

            _context.Reservations.Add(reservation);
            await _context.SaveChangesAsync();

            return Ok(reservation);
        }

        // =========================================================
        // PUT: api/Reservation/1 (Dành cho Admin, Lễ tân)
        // =========================================================
        [HttpPut("{id}")]
        [Authorize(Roles = "Admin,Lễ tân")]
        public async Task<IActionResult> Update(int id, Reservation reservation)
        {
            var existingReservation = await _context.Reservations.FindAsync(id);

            if (existingReservation == null)
            {
                return NotFound(new
                {
                    message = "Đơn đặt phòng không tồn tại."
                });
            }

            if (reservation.CheckOutDate <= reservation.CheckInDate)
            {
                return BadRequest(new
                {
                    message = "Ngày trả phòng phải sau ngày nhận phòng."
                });
            }

            var guestExists = await _context.Guests.AnyAsync(g => g.Id == reservation.GuestId);
            if (!guestExists)
            {
                return BadRequest(new
                {
                    message = "Khách hàng không tồn tại."
                });
            }

            existingReservation.ReservationCode = reservation.ReservationCode;
            existingReservation.GuestId = reservation.GuestId;
            existingReservation.CheckInDate = reservation.CheckInDate;
            existingReservation.CheckOutDate = reservation.CheckOutDate;
            existingReservation.Status = reservation.Status;
            existingReservation.NumberOfGuests = reservation.NumberOfGuests;
            existingReservation.Notes = reservation.Notes;

            await _context.SaveChangesAsync();

            return Ok(existingReservation);
        }

        // =========================================================
        // PUT: api/Reservation/1/cancel (Dành cho Admin, Lễ tân)
        // =========================================================
        [HttpPut("{id}/cancel")]
        [Authorize(Roles = "Admin,Lễ tân")]
        public async Task<IActionResult> Cancel(int id)
        {
            var reservation = await _context.Reservations.FindAsync(id);

            if (reservation == null)
            {
                return NotFound(new
                {
                    message = "Đơn đặt phòng không tồn tại."
                });
            }

            if (reservation.Status == ReservationStatus.DaHuy)
            {
                return BadRequest(new
                {
                    message = "Đơn đặt phòng đã được hủy."
                });
            }

            if (reservation.Status == ReservationStatus.DaCheckIn ||
                reservation.Status == ReservationStatus.DaCheckOut)
            {
                return BadRequest(new
                {
                    message = "Không thể hủy đơn đã check-in hoặc check-out."
                });
            }

            reservation.Status = ReservationStatus.DaHuy;
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Hủy đặt phòng thành công.",
                reservation
            });
        }
    }
}
