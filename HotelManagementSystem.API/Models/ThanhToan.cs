namespace HotelManagementSystem.API.Models
{
    public class ThanhToan
    {
        public int Id { get; set; }

        public int HoaDonId { get; set; }

        public DateTime NgayThanhToan { get; set; } = DateTime.Now;

        public decimal SoTien { get; set; }

        public string PhuongThuc { get; set; } = string.Empty;

        public string TrangThai { get; set; } = "DaThanhToan";
    }
}