namespace HotelManagementSystem.API.Models
{
    public class CustomerRegisterRequest
    {
        public string Username { get; set; } = string.Empty;

        public string Password { get; set; } = string.Empty;

        public string FullName { get; set; } = string.Empty;

        public string? Email { get; set; }

        public string? Phone { get; set; }

        public string? IdentityNumber { get; set; }

        public string? Address { get; set; }
    }
}
