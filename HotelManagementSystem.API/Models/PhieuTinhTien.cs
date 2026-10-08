namespace HotelManagementSystem.API.Models
{
    public class PhieuTinhTien
    {
        public int Id { get; set; }

        public int DatPhongId { get; set; }

        public DateTime NgayTao { get; set; } = DateTime.Now;

        public decimal TienPhong { get; set; }

        public decimal TienDichVu { get; set; }

        public decimal TongTien { get; set; }

        public string TrangThai { get; set; } = "ChuaThanhToan";
    }
}