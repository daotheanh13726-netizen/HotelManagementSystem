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

        // GET: api/Report/occupancy
        [HttpGet("occupancy")]
        public async Task<IActionResult> GetOccupancyReport(
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

            // Lấy tổng số phòng hiện có
            var totalRooms = await _context.Rooms.CountAsync();

            if (totalRooms == 0)
            {
                return Ok(new
                {
                    fromDate = fromDate.Date,
                    toDate = toDate.Date,
                    totalRooms = 0,
                    occupiedRooms = 0,
                    occupancyRate = 0
                });
            }

            // Lấy các phòng đã được sử dụng trong khoảng thời gian báo cáo.
            //
            // Một phòng được tính là có sử dụng nếu khoảng thời gian
            // check-in/check-out thực tế giao với khoảng thời gian báo cáo.
            var occupiedRoomIds = await _context.ReservationRooms
                .Where(rr =>
                    rr.CheckInActual.HasValue &&
                    rr.CheckOutActual.HasValue &&
                    rr.CheckInActual.Value.Date <= toDate.Date &&
                    rr.CheckOutActual.Value.Date >= fromDate.Date)
                .Select(rr => rr.RoomId)
                .Distinct()
                .ToListAsync();

            var occupiedRooms = occupiedRoomIds.Count;

            var emptyRooms = totalRooms - occupiedRooms;

            var occupancyRate =
                Math.Round(
                    (decimal)occupiedRooms / totalRooms * 100,
                    2
                );

            return Ok(new
            {
                fromDate = fromDate.Date,
                toDate = toDate.Date,
                totalRooms,
                occupiedRooms,
                emptyRooms,
                occupancyRate
            });
        }
    }
}