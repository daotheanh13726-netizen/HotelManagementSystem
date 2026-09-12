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

        public DbSet<RoomType> RoomTypes { get; set; }
        public DbSet<Room> Rooms { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<RoomType>()
                .ToTable("LoaiPhong");

            modelBuilder.Entity<Room>()
                .ToTable("Phong");
        }
    }
}