package com.example.Garage.Dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;

@Data
@AllArgsConstructor
public class UserProfileResponse {
    private Long id;
    private String username;
    private String email;
    private String phone;
    private String nationality;
    private String residentialAddress;
    private List<String> roles;
}
