namespace HotelManagementSystem.API.Models
{
    public class RoomType
    {
        public int Id {  get; set; }
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; }//loai phong
        public decimal BasePrice {  get; set; }//gia

    }
}
//Phòng này thuộc loại nào? Giá cơ bản bao nhiêu?
