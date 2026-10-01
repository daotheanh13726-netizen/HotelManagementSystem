namespace HotelManagementSystem.API.Models
{
    public class Service
    {
        public int Id { get; set; }

        public string Name { get; set; } = string.Empty;

        public string? Unit { get; set; }

        public decimal Price { get; set; }

        public bool IsActive { get; set; } = true;

        public string? Description { get; set; }
    }
}