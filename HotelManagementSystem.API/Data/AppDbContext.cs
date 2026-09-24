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

        public DbSet<Reservation> Reservations { get; set; }
        public DbSet<ReservationRoom> ReservationRooms { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // Loại phòng
            modelBuilder.Entity<RoomType>()
                .ToTable("LoaiPhong");

            // Phòng
            modelBuilder.Entity<Room>()
                .ToTable("Phong");

            // Khách hàng
            modelBuilder.Entity<Guest>()
                .ToTable("KhachHang");

            // Đặt phòng
            modelBuilder.Entity<Reservation>()
                .ToTable("DatPhong");

            // Chi tiết đặt phòng
            modelBuilder.Entity<ReservationRoom>()
                .ToTable("ChiTietDatPhong");

            // Reservation -> Guest
            modelBuilder.Entity<Reservation>()
                .HasOne<Guest>()
                .WithMany()
                .HasForeignKey(r => r.GuestId)
                .OnDelete(DeleteBehavior.Restrict);

            // ReservationRoom -> Reservation
            modelBuilder.Entity<ReservationRoom>()
                .HasOne<Reservation>()
                .WithMany()
                .HasForeignKey(rr => rr.ReservationId)
                .OnDelete(DeleteBehavior.Cascade);

            // ReservationRoom -> Room
            modelBuilder.Entity<ReservationRoom>()
                .HasOne<Room>()
                .WithMany()
                .HasForeignKey(rr => rr.RoomId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}