namespace HotelManagementSystem.API.Models
{
    public class Guest
    {
        public int Id { get; set; }

        public string FullName { get; set; } = string.Empty;

        public string? Phone { get; set; }

        public string? Email { get; set; }

        public string? IdentityNumber { get; set; }

        public string? Address { get; set; }
    }
}