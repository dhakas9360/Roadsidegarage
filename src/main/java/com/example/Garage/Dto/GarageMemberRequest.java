package com.example.Garage.Dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class GarageMemberRequest {
    @NotNull
    private Long garageId;

    @NotNull
    private Long userId; // must be an existing ROLE_GARAGE_MEMBER account

    private Double latitude;
    private Double longitude;
}
