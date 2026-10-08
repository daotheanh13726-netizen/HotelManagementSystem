using HotelManagementSystem.API.Data;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// =========================
// CORS
// =========================
builder.Services.AddCors(options =>
{
    options.AddPolicy("FrontendPolicy", policy =>
    {
        policy
            .AllowAnyOrigin()
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

// =========================
// DATABASE
// =========================
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("DefaultConnection")
    )
);

// =========================
// HEALTH CHECK
// =========================
builder.Services.AddHealthChecks()
    .AddDbContextCheck<AppDbContext>();

// =========================
// JWT AUTHENTICATION
// =========================
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,

            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(
                    "HotelManagementSystemSecretKey2026"
                )
            )
        };
    });

// =========================
// CONTROLLERS
// =========================
builder.Services.AddControllers();

// =========================
// SWAGGER
// =========================
builder.Services.AddEndpointsApiExplorer();

builder.Services.AddSwaggerGen(options =>
{
    // =========================
    // JWT BEARER AUTHENTICATION
    // =========================
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description =
            "Nhập JWT token theo dạng: Bearer {token}"
    });

    // =========================
    // YÊU CẦU JWT CHO SWAGGER
    // =========================
    options.AddSecurityRequirement(document =>
        new OpenApiSecurityRequirement
        {
            [new OpenApiSecuritySchemeReference(
                "Bearer",
                document
            )] = []
        });
});

var app = builder.Build();

// =========================
// SWAGGER
// =========================
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// =========================
// HTTPS
// =========================
app.UseHttpsRedirection();

// =========================
// CORS
// =========================
app.UseCors("FrontendPolicy");

// =========================
// AUTHENTICATION
// =========================
app.UseAuthentication();

// =========================
// AUTHORIZATION
// =========================
app.UseAuthorization();

// =========================
// CONTROLLERS
// =========================
app.MapControllers();

// =========================
// HEALTH CHECK
// =========================
app.MapHealthChecks("/health");

app.Run();