package com.example.Garage.Model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "garages")
@Data
@NoArgsConstructor
public class Garage {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // the ROLE_GARAGE_OWNER user that owns this garage
    private Long ownerUserId;

    private String name;
    private String address;
    private Double latitude;
    private Double longitude;
    private Integer dailyCapacity;

    // running average of ratings earned by this garage's technicians
    private Double rating = 0.0;
    private Integer ratingCount = 0;
}
