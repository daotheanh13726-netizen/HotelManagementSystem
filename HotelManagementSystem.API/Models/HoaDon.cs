namespace HotelManagementSystem.API.Models
{
    public class HoaDon
    {
        public int Id { get; set; }

        public int PhieuTinhTienId { get; set; }

        public string SoHoaDon { get; set; } = string.Empty;

        public DateTime NgayLap { get; set; } = DateTime.Now;

        public decimal TienTruocThue { get; set; }

        public decimal TienVAT { get; set; }

        public decimal TongTien { get; set; }

        public string TrangThai { get; set; } = "ChuaThanhToan";
    }
}