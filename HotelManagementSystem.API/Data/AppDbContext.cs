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

        // =========================
        // CÁC BẢNG TRONG DATABASE
        // =========================

        public DbSet<RoomType> RoomTypes { get; set; }

        public DbSet<Room> Rooms { get; set; }

        public DbSet<Guest> Guests { get; set; }

        public DbSet<Reservation> Reservations { get; set; }

        public DbSet<ReservationRoom> ReservationRooms { get; set; }

        public DbSet<Role> Roles { get; set; }

        public DbSet<User> Users { get; set; }

        public DbSet<Service> Services { get; set; }

        public DbSet<PhieuTinhTien> PhieuTinhTiens { get; set; }

        public DbSet<ChiTietPhieuTinhTien> ChiTietPhieuTinhTiens { get; set; }

        public DbSet<HoaDon> HoaDons { get; set; }

        public DbSet<ThanhToan> ThanhToans { get; set; }

        // Bảng giá
        public DbSet<BangGia> BangGias { get; set; }


        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // =========================
            // LOẠI PHÒNG
            // =========================
            modelBuilder.Entity<RoomType>()
                .ToTable("LoaiPhong");


            // =========================
            // PHÒNG
            // =========================
            modelBuilder.Entity<Room>()
                .ToTable("Phong");


            // =========================
            // KHÁCH HÀNG
            // =========================
            modelBuilder.Entity<Guest>()
                .ToTable("KhachHang");


            // =========================
            // ĐẶT PHÒNG
            // =========================
            modelBuilder.Entity<Reservation>()
                .ToTable("DatPhong");


            // =========================
            // CHI TIẾT ĐẶT PHÒNG
            // =========================
            modelBuilder.Entity<ReservationRoom>()
                .ToTable("ChiTietDatPhong");


            // =========================
            // VAI TRÒ
            // =========================
            modelBuilder.Entity<Role>()
                .ToTable("VaiTro");


            // =========================
            // NGƯỜI DÙNG
            // =========================
            modelBuilder.Entity<User>()
                .ToTable("NguoiDung");


            // =========================
            // DỊCH VỤ
            // =========================
            modelBuilder.Entity<Service>()
                .ToTable("DichVu");


            // =========================
            // PHIẾU TÍNH TIỀN
            // =========================
            modelBuilder.Entity<PhieuTinhTien>()
                .ToTable("PhieuTinhTien");


            // =========================
            // CHI TIẾT PHIẾU TÍNH TIỀN
            // =========================
            modelBuilder.Entity<ChiTietPhieuTinhTien>()
                .ToTable("ChiTietPhieuTinhTien");


            // =========================
            // HÓA ĐƠN
            // =========================
            modelBuilder.Entity<HoaDon>()
                .ToTable("HoaDon");


            // =========================
            // THANH TOÁN
            // =========================
            modelBuilder.Entity<ThanhToan>()
                .ToTable("ThanhToan");


            // =========================
            // BẢNG GIÁ
            // =========================
            modelBuilder.Entity<BangGia>()
                .ToTable("BangGia");


            // =========================
            // USER -> ROLE
            // =========================
            modelBuilder.Entity<User>()
                .HasOne<Role>()
                .WithMany()
                .HasForeignKey(u => u.RoleId)
                .OnDelete(DeleteBehavior.Restrict);


            // =========================
            // RESERVATION -> GUEST
            // =========================
            modelBuilder.Entity<Reservation>()
                .HasOne<Guest>()
                .WithMany()
                .HasForeignKey(r => r.GuestId)
                .OnDelete(DeleteBehavior.Restrict);


            // =========================
            // RESERVATION ROOM -> RESERVATION
            // =========================
            modelBuilder.Entity<ReservationRoom>()
                .HasOne<Reservation>()
                .WithMany()
                .HasForeignKey(rr => rr.ReservationId)
                .OnDelete(DeleteBehavior.Cascade);


            // =========================
            // RESERVATION ROOM -> ROOM
            // =========================
            modelBuilder.Entity<ReservationRoom>()
                .HasOne<Room>()
                .WithMany()
                .HasForeignKey(rr => rr.RoomId)
                .OnDelete(DeleteBehavior.Restrict);


            // =========================
            // BẢNG GIÁ -> LOẠI PHÒNG
            // =========================
            modelBuilder.Entity<BangGia>()
                .HasOne<RoomType>()
                .WithMany()
                .HasForeignKey(bg => bg.RoomTypeId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}