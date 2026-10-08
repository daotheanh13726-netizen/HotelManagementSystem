namespace HotelManagementSystem.API.Models
{
    public class BangGia
    {
        public int Id { get; set; }

        public int RoomTypeId { get; set; }

        public string RateName { get; set; } = string.Empty;

        public DateTime StartDate { get; set; }

        public DateTime EndDate { get; set; }

        public decimal PricePerNight { get; set; }

        public decimal PricePerHour { get; set; }
    }
}