package com.example.Garage.Dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class UpdateProfileRequest {
    @NotBlank
    @Email
    private String email;

    @NotBlank
    @Pattern(regexp = "^[+]?[0-9]{7,15}$", message = "Enter a valid phone number")
    private String phone;

    private String nationality;

    private String residentialAddress;
}
