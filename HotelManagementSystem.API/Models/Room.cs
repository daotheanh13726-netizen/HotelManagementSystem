namespace HotelManagementSystem.API.Models
{
    public class Room
    {
        public int Id { get; set; }
        public string RoomNumber { get; set; } = string.Empty;
        public RoomStatus Status { get; set; } = RoomStatus.Trong ;
        public int RoomTypeId { get; set; }

    }
}
