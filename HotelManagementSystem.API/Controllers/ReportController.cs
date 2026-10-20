using HotelManagementSystem.API.Data;
using HotelManagementSystem.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HotelManagementSystem.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Admin,Lễ tân,Kế toán")]
    public class ReportController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ReportController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/Report?fromDate=2026-10-01&toDate=2026-10-20
        // GET: api/Report/occupancy?fromDate=2026-10-01&toDate=2026-10-20
        [HttpGet]
        [HttpGet("occupancy")]
        public async Task<IActionResult> GetReport(
            DateTime fromDate,
            DateTime toDate)
        {
            if (fromDate.Date > toDate.Date)
            {
                return BadRequest(new
                {
                    message = "Ngày bắt đầu không được lớn hơn ngày kết thúc."
                });
            }

            var start = fromDate.Date;
            var end = toDate.Date;

            // 1. Tổng số phòng hiện có
            var totalRooms = await _context.Rooms.CountAsync();

            // 2. Lấy tất cả thông tin gán phòng
            var reservationRooms = await _context.ReservationRooms
                .Where(rr => rr.CheckInActual.HasValue && rr.CheckOutActual.HasValue)
                .ToListAsync();

            // 3. Lấy tất cả các khoản thanh toán trong khoảng thời gian [start, end]
            var payments = await _context.ThanhToans
                .Where(t => t.TrangThai == "DaThanhToan" &&
                            t.NgayThanhToan >= start &&
                            t.NgayThanhToan < end.AddDays(1))
                .ToListAsync();

            var totalRevenue = payments.Sum(p => p.SoTien);

            // Các phòng có sử dụng trong khoảng thời gian
            var occupiedRoomIds = reservationRooms
                .Where(rr => rr.CheckInActual.Value.Date <= end &&
                             rr.CheckOutActual.Value.Date >= start)
                .Select(rr => rr.RoomId)
                .Distinct()
                .ToList();

            var occupiedRooms = occupiedRoomIds.Count;
            var emptyRooms = Math.Max(0, totalRooms - occupiedRooms);
            var occupancyRate = totalRooms > 0
                ? Math.Round((decimal)occupiedRooms / totalRooms * 100, 2)
                : 0;

            // 4. Chi tiết từng ngày trong khoảng thời gian
            var details = new List<object>();
            var dayCount = (end - start).Days + 1;
            var maxDays = Math.Min(dayCount, 90);

            for (int i = 0; i < maxDays; i++)
            {
                var currentDay = start.AddDays(i);

                var dayOccupiedRoomIds = reservationRooms
                    .Where(rr => rr.CheckInActual.Value.Date <= currentDay &&
                                 rr.CheckOutActual.Value.Date >= currentDay)
                    .Select(rr => rr.RoomId)
                    .Distinct()
                    .ToList();

                var dayOccupiedCount = dayOccupiedRoomIds.Count;
                var dayOccupancyRate = totalRooms > 0
                    ? Math.Round((decimal)dayOccupiedCount / totalRooms * 100, 2)
                    : 0;

                var dayRevenue = payments
                    .Where(p => p.NgayThanhToan.Date == currentDay)
                    .Sum(p => p.SoTien);

                details.Add(new
                {
                    date = currentDay.ToString("yyyy-MM-dd"),
                    totalRooms,
                    occupiedRooms = dayOccupiedCount,
                    occupancyRate = dayOccupancyRate,
                    revenue = dayRevenue
                });
            }

            return Ok(new
            {
                fromDate = start,
                toDate = end,
                totalRooms,
                occupiedRooms,
                emptyRooms,
                occupancyRate,
                totalRevenue,
                summary = new
                {
                    totalRooms,
                    occupiedRooms,
                    emptyRooms,
                    occupancyRate,
                    totalRevenue
                },
                details
            });
        }
    }
}
