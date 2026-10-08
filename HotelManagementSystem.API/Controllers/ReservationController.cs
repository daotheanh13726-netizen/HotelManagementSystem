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
    public class ReservationController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ReservationController(AppDbContext context)
        {
            _context = context;
        }

        // =========================================================
        // GET: api/Reservation
        //
        // Ví dụ:
        // api/Reservation
        // api/Reservation?search=DP001
        // api/Reservation?guestId=1
        // api/Reservation?status=0
        // api/Reservation?fromDate=2026-09-01
        // api/Reservation?toDate=2026-09-30
        // api/Reservation?sortBy=CheckInDate&sortOrder=desc
        // api/Reservation?page=1&pageSize=5
        // =========================================================
        [HttpGet]
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
            // KIỂM TRA PAGE SIZE
            // =====================================================
            if (pageSize < 1 || pageSize > 100)
            {
                return BadRequest(new
                {
                    message = "pageSize phải nằm trong khoảng từ 1 đến 100."
                });
            }

            // =====================================================
            // KIỂM TRA KHOẢNG NGÀY
            // =====================================================
            if (fromDate.HasValue &&
                toDate.HasValue &&
                fromDate.Value > toDate.Value)
            {
                return BadRequest(new
                {
                    message = "Ngày bắt đầu không được lớn hơn ngày kết thúc."
                });
            }

            // =====================================================
            // TẠO QUERY
            // =====================================================
            IQueryable<Reservation> query =
                _context.Reservations;

            // =====================================================
            // TÌM KIẾM THEO MÃ ĐẶT PHÒNG
            // =====================================================
            if (!string.IsNullOrWhiteSpace(search))
            {
                search = search.Trim();

                query = query.Where(r =>
                    r.ReservationCode.Contains(search));
            }

            // =====================================================
            // LỌC THEO KHÁCH HÀNG
            // =====================================================
            if (guestId.HasValue)
            {
                query = query.Where(r =>
                    r.GuestId == guestId.Value);
            }

            // =====================================================
            // LỌC THEO TRẠNG THÁI
            // =====================================================
            if (status.HasValue)
            {
                query = query.Where(r =>
                    r.Status == status.Value);
            }

            // =====================================================
            // LỌC TỪ NGÀY
            // =====================================================
            if (fromDate.HasValue)
            {
                query = query.Where(r =>
                    r.CheckInDate >= fromDate.Value);
            }

            // =====================================================
            // LỌC ĐẾN NGÀY
            // =====================================================
            if (toDate.HasValue)
            {
                query = query.Where(r =>
                    r.CheckInDate <= toDate.Value);
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
                        ? query.OrderByDescending(r => r.Id)
                        : query.OrderBy(r => r.Id);
                    break;

                case "reservationcode":
                    query = descending
                        ? query.OrderByDescending(r => r.ReservationCode)
                        : query.OrderBy(r => r.ReservationCode);
                    break;

                case "guestid":
                    query = descending
                        ? query.OrderByDescending(r => r.GuestId)
                        : query.OrderBy(r => r.GuestId);
                    break;

                case "checkindate":
                    query = descending
                        ? query.OrderByDescending(r => r.CheckInDate)
                        : query.OrderBy(r => r.CheckInDate);
                    break;

                case "checkoutdate":
                    query = descending
                        ? query.OrderByDescending(r => r.CheckOutDate)
                        : query.OrderBy(r => r.CheckOutDate);
                    break;

                case "status":
                    query = descending
                        ? query.OrderByDescending(r => r.Status)
                        : query.OrderBy(r => r.Status);
                    break;

                case "numberofguests":
                    query = descending
                        ? query.OrderByDescending(r => r.NumberOfGuests)
                        : query.OrderBy(r => r.NumberOfGuests);
                    break;

                default:
                    query = query.OrderBy(r => r.CheckInDate);
                    break;
            }

            // =====================================================
            // TỔNG SỐ ĐƠN
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
            var reservations = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            // =====================================================
            // KẾT QUẢ
            // =====================================================
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
        // GET: api/Reservation/1
        // =========================================================
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var reservation = await _context.Reservations
                .FindAsync(id);

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
        // POST: api/Reservation
        // =========================================================
        [HttpPost]
        public async Task<IActionResult> Create(
            Reservation reservation)
        {
            // Kiểm tra ngày nhận/trả phòng
            if (reservation.CheckOutDate <=
                reservation.CheckInDate)
            {
                return BadRequest(new
                {
                    message =
                        "Ngày trả phòng phải sau ngày nhận phòng."
                });
            }

            // Kiểm tra khách hàng
            var guestExists = await _context.Guests
                .AnyAsync(g =>
                    g.Id == reservation.GuestId);

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
        // PUT: api/Reservation/1
        // =========================================================
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(
            int id,
            Reservation reservation)
        {
            // Tìm đơn đặt phòng
            var existingReservation =
                await _context.Reservations
                    .FindAsync(id);

            if (existingReservation == null)
            {
                return NotFound(new
                {
                    message = "Đơn đặt phòng không tồn tại."
                });
            }

            // Kiểm tra ngày
            if (reservation.CheckOutDate <=
                reservation.CheckInDate)
            {
                return BadRequest(new
                {
                    message =
                        "Ngày trả phòng phải sau ngày nhận phòng."
                });
            }

            // Kiểm tra khách hàng
            var guestExists = await _context.Guests
                .AnyAsync(g =>
                    g.Id == reservation.GuestId);

            if (!guestExists)
            {
                return BadRequest(new
                {
                    message = "Khách hàng không tồn tại."
                });
            }

            // Cập nhật thông tin
            existingReservation.ReservationCode =
                reservation.ReservationCode;

            existingReservation.GuestId =
                reservation.GuestId;

            existingReservation.CheckInDate =
                reservation.CheckInDate;

            existingReservation.CheckOutDate =
                reservation.CheckOutDate;

            existingReservation.Status =
                reservation.Status;

            existingReservation.NumberOfGuests =
                reservation.NumberOfGuests;

            existingReservation.Notes =
                reservation.Notes;

            await _context.SaveChangesAsync();

            return Ok(existingReservation);
        }

        // =========================================================
        // PUT: api/Reservation/1/cancel
        // =========================================================
        [HttpPut("{id}/cancel")]
        public async Task<IActionResult> Cancel(int id)
        {
            // Tìm đơn đặt phòng
            var reservation =
                await _context.Reservations
                    .FindAsync(id);

            if (reservation == null)
            {
                return NotFound(new
                {
                    message = "Đơn đặt phòng không tồn tại."
                });
            }

            // Kiểm tra đơn đã hủy
            if (reservation.Status ==
                ReservationStatus.DaHuy)
            {
                return BadRequest(new
                {
                    message =
                        "Đơn đặt phòng đã được hủy."
                });
            }

            // Không cho hủy đã check-in/check-out
            if (reservation.Status ==
                    ReservationStatus.DaCheckIn ||
                reservation.Status ==
                    ReservationStatus.DaCheckOut)
            {
                return BadRequest(new
                {
                    message =
                        "Không thể hủy đơn đã check-in hoặc check-out."
                });
            }

            // Chuyển trạng thái
            reservation.Status =
                ReservationStatus.DaHuy;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message =
                    "Hủy đặt phòng thành công.",
                reservation
            });
        }
    }
}