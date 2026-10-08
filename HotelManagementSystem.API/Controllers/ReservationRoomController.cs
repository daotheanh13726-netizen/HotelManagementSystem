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
    public class ReservationRoomController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ReservationRoomController(AppDbContext context)
        {
            _context = context;
        }

        // =========================================================
        // GET: api/ReservationRoom
        //
        // Ví dụ:
        // api/ReservationRoom
        // api/ReservationRoom?reservationId=1
        // api/ReservationRoom?roomId=6
        // api/ReservationRoom?page=1&pageSize=5
        // api/ReservationRoom?sortBy=RoomId&sortOrder=desc
        // =========================================================
        [HttpGet]
        public async Task<IActionResult> GetAll(
            int? reservationId,
            int? roomId,
            string? sortBy = "Id",
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
            // TẠO QUERY
            // =====================================================
            IQueryable<ReservationRoom> query =
                _context.ReservationRooms;

            // =====================================================
            // LỌC THEO ĐƠN ĐẶT PHÒNG
            // =====================================================
            if (reservationId.HasValue)
            {
                query = query.Where(rr =>
                    rr.ReservationId == reservationId.Value);
            }

            // =====================================================
            // LỌC THEO PHÒNG
            // =====================================================
            if (roomId.HasValue)
            {
                query = query.Where(rr =>
                    rr.RoomId == roomId.Value);
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
                        ? query.OrderByDescending(rr => rr.Id)
                        : query.OrderBy(rr => rr.Id);
                    break;

                case "reservationid":
                    query = descending
                        ? query.OrderByDescending(rr => rr.ReservationId)
                        : query.OrderBy(rr => rr.ReservationId);
                    break;

                case "roomid":
                    query = descending
                        ? query.OrderByDescending(rr => rr.RoomId)
                        : query.OrderBy(rr => rr.RoomId);
                    break;

                case "checkinactual":
                    query = descending
                        ? query.OrderByDescending(rr => rr.CheckInActual)
                        : query.OrderBy(rr => rr.CheckInActual);
                    break;

                case "checkoutactual":
                    query = descending
                        ? query.OrderByDescending(rr => rr.CheckOutActual)
                        : query.OrderBy(rr => rr.CheckOutActual);
                    break;

                default:
                    query = query.OrderBy(rr => rr.Id);
                    break;
            }

            // =====================================================
            // TỔNG SỐ BẢN GHI
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
            var reservationRooms = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            // =====================================================
            // KẾT QUẢ
            // =====================================================
            return Ok(new
            {
                data = reservationRooms,
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
        // GET: api/ReservationRoom/1
        // =========================================================
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var reservationRoom =
                await _context.ReservationRooms
                    .FindAsync(id);

            if (reservationRoom == null)
            {
                return NotFound(new
                {
                    message = "Chi tiết đặt phòng không tồn tại."
                });
            }

            return Ok(reservationRoom);
        }

        // =========================================================
        // POST: api/ReservationRoom
        // =========================================================
        [HttpPost]
        public async Task<IActionResult> Create(
            ReservationRoom reservationRoom)
        {
            // =====================================================
            // KIỂM TRA ĐƠN ĐẶT PHÒNG
            // =====================================================
            var reservation =
                await _context.Reservations
                    .FindAsync(reservationRoom.ReservationId);

            if (reservation == null)
            {
                return BadRequest(new
                {
                    message = "Đơn đặt phòng không tồn tại."
                });
            }

            // =====================================================
            // KIỂM TRA PHÒNG
            // =====================================================
            var roomExists = await _context.Rooms
                .AnyAsync(r =>
                    r.Id == reservationRoom.RoomId);

            if (!roomExists)
            {
                return BadRequest(new
                {
                    message = "Phòng không tồn tại."
                });
            }

            // =====================================================
            // KIỂM TRA OVERBOOKING
            //
            // Hai khoảng thời gian bị trùng khi:
            //
            // CheckIn của đơn A < CheckOut của đơn B
            // VÀ
            // CheckOut của đơn A > CheckIn của đơn B
            // =====================================================
            var roomIsOverbooked =
                await _context.ReservationRooms
                    .AnyAsync(rr =>
                        rr.RoomId == reservationRoom.RoomId &&
                        rr.ReservationId !=
                            reservationRoom.ReservationId &&
                        _context.Reservations.Any(r =>
                            r.Id == rr.ReservationId &&
                            r.Status !=
                                ReservationStatus.DaHuy &&
                            r.CheckInDate <
                                reservation.CheckOutDate &&
                            r.CheckOutDate >
                                reservation.CheckInDate
                        )
                    );

            if (roomIsOverbooked)
            {
                return BadRequest(new
                {
                    message = "Phòng đã được đặt."
                });
            }

            // =====================================================
            // KIỂM TRA PHÒNG ĐÃ GÁN CHO ĐƠN NÀY CHƯA
            // =====================================================
            var alreadyAssigned =
                await _context.ReservationRooms
                    .AnyAsync(rr =>
                        rr.ReservationId ==
                            reservationRoom.ReservationId &&
                        rr.RoomId ==
                            reservationRoom.RoomId);

            if (alreadyAssigned)
            {
                return BadRequest(new
                {
                    message =
                        "Phòng này đã được gán cho đơn đặt phòng."
                });
            }

            // =====================================================
            // THÊM
            // =====================================================
            _context.ReservationRooms.Add(reservationRoom);

            await _context.SaveChangesAsync();

            return Ok(reservationRoom);
        }

        // =========================================================
        // PUT: api/ReservationRoom/1
        // =========================================================
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(
            int id,
            ReservationRoom reservationRoom)
        {
            // =====================================================
            // TÌM BẢN GHI
            // =====================================================
            var existingReservationRoom =
                await _context.ReservationRooms
                    .FindAsync(id);

            if (existingReservationRoom == null)
            {
                return NotFound(new
                {
                    message =
                        "Chi tiết đặt phòng không tồn tại."
                });
            }

            // =====================================================
            // KHÔNG CHO THAY ĐỔI RESERVATION ID
            // =====================================================
            var reservation =
                await _context.Reservations
                    .FindAsync(
                        existingReservationRoom.ReservationId);

            if (reservation == null)
            {
                return BadRequest(new
                {
                    message =
                        "Đơn đặt phòng không tồn tại."
                });
            }

            // =====================================================
            // KIỂM TRA PHÒNG MỚI
            // =====================================================
            var roomExists = await _context.Rooms
                .AnyAsync(r =>
                    r.Id == reservationRoom.RoomId);

            if (!roomExists)
            {
                return BadRequest(new
                {
                    message = "Phòng không tồn tại."
                });
            }

            // =====================================================
            // KIỂM TRA OVERBOOKING
            // =====================================================
            var roomIsOverbooked =
                await _context.ReservationRooms
                    .AnyAsync(rr =>
                        rr.RoomId ==
                            reservationRoom.RoomId &&
                        rr.Id != id &&
                        rr.ReservationId !=
                            existingReservationRoom.ReservationId &&
                        _context.Reservations.Any(r =>
                            r.Id == rr.ReservationId &&
                            r.Status !=
                                ReservationStatus.DaHuy &&
                            r.CheckInDate <
                                reservation.CheckOutDate &&
                            r.CheckOutDate >
                                reservation.CheckInDate
                        )
                    );

            if (roomIsOverbooked)
            {
                return BadRequest(new
                {
                    message =
                        "Phòng đã được đặt trong khoảng thời gian này."
                });
            }

            // =====================================================
            // KIỂM TRA PHÒNG ĐÃ GÁN CHO ĐƠN NÀY CHƯA
            // =====================================================
            var alreadyAssigned =
                await _context.ReservationRooms
                    .AnyAsync(rr =>
                        rr.Id != id &&
                        rr.ReservationId ==
                            existingReservationRoom.ReservationId &&
                        rr.RoomId ==
                            reservationRoom.RoomId);

            if (alreadyAssigned)
            {
                return BadRequest(new
                {
                    message =
                        "Phòng này đã được gán cho đơn đặt phòng."
                });
            }

            // =====================================================
            // CẬP NHẬT
            //
            // Không thay đổi ReservationId
            // =====================================================
            existingReservationRoom.RoomId =
                reservationRoom.RoomId;

            existingReservationRoom.CheckInActual =
                reservationRoom.CheckInActual;

            existingReservationRoom.CheckOutActual =
                reservationRoom.CheckOutActual;

            await _context.SaveChangesAsync();

            return Ok(existingReservationRoom);
        }
    }
}