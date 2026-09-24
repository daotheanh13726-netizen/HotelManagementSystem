namespace HotelManagementSystem.API.Models
{
    public class ReservationRoom
    {
        public int Id { get; set; }

        public int ReservationId { get; set; }

        public int RoomId { get; set; }

        public DateTime? CheckInActual { get; set; }

        public DateTime? CheckOutActual { get; set; }
    }
}