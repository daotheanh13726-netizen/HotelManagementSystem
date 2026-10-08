namespace HotelManagementSystem.API.Models
{
    public class ChiTietPhieuTinhTien
    {
        public int Id { get; set; }

        public int PhieuTinhTienId { get; set; }

        public int DichVuId { get; set; }

        public int SoLuong { get; set; } = 1;

        public decimal DonGia { get; set; }

        public decimal ThanhTien { get; set; }
    }
}