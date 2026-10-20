using HotelManagementSystem.API.Data;
using HotelManagementSystem.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HotelManagementSystem.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class RoomController : ControllerBase
    {
        private readonly AppDbContext _context;

        public RoomController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/Room
        // Khách có thể xem danh sách phòng.
        [HttpGet]
        [AllowAnonymous]
        public async Task<IActionResult> GetAll(
            string? search,
            RoomStatus? status,
            int? roomTypeId,
            string? sortBy = "RoomNumber",
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

            IQueryable<Room> query = _context.Rooms.AsNoTracking();

            if (!string.IsNullOrWhiteSpace(search))
            {
                search = search.Trim();

                query = query.Where(r =>
                    r.RoomNumber.Contains(search));
            }

            if (status.HasValue)
            {
                query = query.Where(r =>
                    r.Status == status.Value);
            }

            if (roomTypeId.HasValue)
            {
                query = query.Where(r =>
                    r.RoomTypeId == roomTypeId.Value);
            }

            bool descending = sortOrder?.ToLower() == "desc";

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

            int totalItems = await query.CountAsync();
            int totalPages = (int)Math.Ceiling(totalItems / (double)pageSize);

            var rooms = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

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

        // GET: api/Room/1
        // Xem chi tiết phòng
        [HttpGet("{id}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetById(int id)
        {
            var room = await _context.Rooms
                .AsNoTracking()
                .FirstOrDefaultAsync(r => r.Id == id);

            if (room == null)
            {
                return NotFound(new
                {
                    message = "Phòng không tồn tại."
                });
            }

            return Ok(room);
        }

        // POST: api/Room
        [HttpPost]
        [Authorize(Roles = "Admin,Lễ tân")]
        public async Task<IActionResult> Create(Room room)
        {
            if (string.IsNullOrWhiteSpace(room.RoomNumber))
            {
                return BadRequest(new
                {
                    message = "Số phòng không được để trống."
                });
            }

            room.RoomNumber = room.RoomNumber.Trim();

            var roomTypeExists = await _context.RoomTypes
                .AnyAsync(t => t.Id == room.RoomTypeId);

            if (!roomTypeExists)
            {
                return BadRequest(new
                {
                    message = "Loại phòng không tồn tại."
                });
            }

            bool duplicate = await _context.Rooms
                .AnyAsync(r => r.RoomNumber == room.RoomNumber);

            if (duplicate)
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

        // PUT: api/Room/1
        [HttpPut("{id}")]
        [Authorize(Roles = "Admin,Lễ tân")]
        public async Task<IActionResult> Update(
            int id,
            Room room)
        {
            var existingRoom = await _context.Rooms.FindAsync(id);

            if (existingRoom == null)
            {
                return NotFound(new
                {
                    message = "Phòng không tồn tại."
                });
            }

            if (string.IsNullOrWhiteSpace(room.RoomNumber))
            {
                return BadRequest(new
                {
                    message = "Số phòng không được để trống."
                });
            }

            string roomNumber = room.RoomNumber.Trim();

            bool roomTypeExists = await _context.RoomTypes
                .AnyAsync(t => t.Id == room.RoomTypeId);

            if (!roomTypeExists)
            {
                return BadRequest(new
                {
                    message = "Loại phòng không tồn tại."
                });
            }

            bool duplicate = await _context.Rooms
                .AnyAsync(r =>
                    r.Id != id &&
                    r.RoomNumber == roomNumber);

            if (duplicate)
            {
                return BadRequest(new
                {
                    message = "Số phòng đã tồn tại."
                });
            }

            existingRoom.RoomNumber = roomNumber;
            existingRoom.Status = room.Status;
            existingRoom.RoomTypeId = room.RoomTypeId;

            await _context.SaveChangesAsync();

            return Ok(existingRoom);
        }

        // DELETE: api/Room/1
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin,Lễ tân")]
        public async Task<IActionResult> Delete(int id)
        {
            var room = await _context.Rooms.FindAsync(id);

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
