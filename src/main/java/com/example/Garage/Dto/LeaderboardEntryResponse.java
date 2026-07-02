package com.example.Garage.Dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class LeaderboardEntryResponse {
    private int rank;
    private Long technicianId;
    private Long technicianUserId;
    private double averageRating;
    private int jobsRatedThisMonth;
}
