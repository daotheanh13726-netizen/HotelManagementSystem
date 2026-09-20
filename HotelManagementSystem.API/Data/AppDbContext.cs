using HotelManagementSystem.API.Models;
using Microsoft.EntityFrameworkCore;

namespace HotelManagementSystem.API.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options)
            : base(options)
        {
        }

        // Các bảng trong database
        public DbSet<RoomType> RoomTypes { get; set; }
        public DbSet<Room> Rooms { get; set; }
        public DbSet<Guest> Guests { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // Bảng loại phòng
            modelBuilder.Entity<RoomType>()
                .ToTable("LoaiPhong");

            // Bảng phòng
            modelBuilder.Entity<Room>()
                .ToTable("Phong");

            // Bảng khách hàng
            modelBuilder.Entity<Guest>()
                .ToTable("KhachHang");
        }
    }
}