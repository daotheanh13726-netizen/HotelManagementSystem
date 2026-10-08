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
    public class RoomController : ControllerBase
    {
        private readonly AppDbContext _context;

        public RoomController(AppDbContext context)
        {
            _context = context;
        }

        // =========================================================
        // GET: api/Room
        //
        // Ví dụ:
        // api/Room
        // api/Room?search=101
        // api/Room?status=0
        // api/Room?roomTypeId=1
        // api/Room?sortBy=RoomNumber&sortOrder=desc
        // api/Room?page=1&pageSize=5
        // =========================================================
        [HttpGet]
        public async Task<IActionResult> GetAll(
            string? search,
            RoomStatus? status,
            int? roomTypeId,
            string? sortBy = "RoomNumber",
            string? sortOrder = "asc",
            int page = 1,
            int pageSize = 10)
        {
            // Kiểm tra trang
            if (page < 1)
            {
                return BadRequest(new
                {
                    message = "Số trang phải lớn hơn hoặc bằng 1."
                });
            }

            // Kiểm tra số bản ghi mỗi trang
            if (pageSize < 1 || pageSize > 100)
            {
                return BadRequest(new
                {
                    message = "pageSize phải nằm trong khoảng từ 1 đến 100."
                });
            }

            // =====================================================
            // Tạo truy vấn
            // =====================================================
            IQueryable<Room> query = _context.Rooms;

            // =====================================================
            // TÌM KIẾM THEO SỐ PHÒNG
            // =====================================================
            if (!string.IsNullOrWhiteSpace(search))
            {
                search = search.Trim();

                query = query.Where(r =>
                    r.RoomNumber.Contains(search));
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
            // LỌC THEO LOẠI PHÒNG
            // =====================================================
            if (roomTypeId.HasValue)
            {
                query = query.Where(r =>
                    r.RoomTypeId == roomTypeId.Value);
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

                case "roomnumber":
                    query = descending
                        ? query.OrderByDescending(r => r.RoomNumber)
                        : query.OrderBy(r => r.RoomNumber);
                    break;

                case "status":
                    query = descending
                        ? query.OrderByDescending(r => r.Status)
                        : query.OrderBy(r => r.Status);
                    break;

                case "roomtypeid":
                    query = descending
                        ? query.OrderByDescending(r => r.RoomTypeId)
                        : query.OrderBy(r => r.RoomTypeId);
                    break;

                default:
                    query = query.OrderBy(r => r.RoomNumber);
                    break;
            }

            // =====================================================
            // TỔNG SỐ BẢN GHI
            // =====================================================
            int totalItems = await query.CountAsync();

            // =====================================================
            // TÍNH TỔNG SỐ TRANG
            // =====================================================
            int totalPages =
                (int)Math.Ceiling(
                    totalItems / (double)pageSize);

            // =====================================================
            // PHÂN TRANG
            // =====================================================
            var rooms = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            // =====================================================
            // KẾT QUẢ
            // =====================================================
            return Ok(new
            {
                data = rooms,
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
        // GET: api/Room/1
        // =========================================================
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var room = await _context.Rooms
                .FindAsync(id);

            if (room == null)
            {
                return NotFound(new
                {
                    message = "Phòng không tồn tại."
                });
            }

            return Ok(room);
        }

        // =========================================================
        // POST: api/Room
        // =========================================================
        [HttpPost]
        public async Task<IActionResult> Create(Room room)
        {
            // Kiểm tra loại phòng
            var roomType = await _context.RoomTypes
                .FindAsync(room.RoomTypeId);

            if (roomType == null)
            {
                return BadRequest(new
                {
                    message = "Loại phòng không tồn tại."
                });
            }

            // Kiểm tra số phòng trùng
            var existingRoom = await _context.Rooms
                .AnyAsync(r =>
                    r.RoomNumber == room.RoomNumber);

            if (existingRoom)
            {
                return BadRequest(new
                {
                    message = "Số phòng đã tồn tại."
                });
            }

            _context.Rooms.Add(room);

            await _context.SaveChangesAsync();

            return Ok(room);
        }

        // =========================================================
        // PUT: api/Room/1
        // =========================================================
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(
            int id,
            Room room)
        {
            var existingRoom = await _context.Rooms
                .FindAsync(id);

            if (existingRoom == null)
            {
                return NotFound(new
                {
                    message = "Phòng không tồn tại."
                });
            }

            // Kiểm tra loại phòng
            var roomType = await _context.RoomTypes
                .FindAsync(room.RoomTypeId);

            if (roomType == null)
            {
                return BadRequest(new
                {
                    message = "Loại phòng không tồn tại."
                });
            }

            // Kiểm tra số phòng trùng
            var duplicateRoom = await _context.Rooms
                .AnyAsync(r =>
                    r.Id != id &&
                    r.RoomNumber == room.RoomNumber);

            if (duplicateRoom)
            {
                return BadRequest(new
                {
                    message = "Số phòng đã tồn tại."
                });
            }

            existingRoom.RoomNumber = room.RoomNumber;
            existingRoom.Status = room.Status;
            existingRoom.RoomTypeId = room.RoomTypeId;

            await _context.SaveChangesAsync();

            return Ok(existingRoom);
        }

        // =========================================================
        // DELETE: api/Room/1
        // =========================================================
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var room = await _context.Rooms
                .FindAsync(id);

            if (room == null)
            {
                return NotFound(new
                {
                    message = "Phòng không tồn tại."
                });
            }

            _context.Rooms.Remove(room);

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Xóa phòng thành công."
            });
        }
    }
}