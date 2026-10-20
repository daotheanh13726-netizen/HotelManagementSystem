namespace HotelManagementSystem.API.Models
{
    public class CustomerBookingDto
    {
        public DateTime CheckInDate { get; set; }

        public DateTime CheckOutDate { get; set; }

        public int NumberOfGuests { get; set; } = 1;

        public int? RoomId { get; set; }

        public string? Notes { get; set; }
    }
}
