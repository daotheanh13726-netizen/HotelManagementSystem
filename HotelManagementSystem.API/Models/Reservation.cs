namespace HotelManagementSystem.API.Models
{
    public class Reservation
    {
        public int Id { get; set; }

        public string ReservationCode { get; set; } = string.Empty;

        public int GuestId { get; set; }

        public DateTime BookingDate { get; set; } = DateTime.Now;

        public DateTime CheckInDate { get; set; }

        public DateTime CheckOutDate { get; set; }

        public ReservationStatus Status { get; set; } = ReservationStatus.ChoXacNhan;

        public int NumberOfGuests { get; set; } = 1;

        public string? Notes { get; set; }
    }
}