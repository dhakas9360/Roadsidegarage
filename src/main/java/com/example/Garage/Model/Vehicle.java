package com.example.Garage.Model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "vehicles")
@Data
@NoArgsConstructor
public class Vehicle {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // owner of the vehicle (a ROLE_USER account)
    private Long userId;

    @ManyToOne
    private VehicleType vehicleType;

    private String model;

    @Column(name = "manufacture_year") // "year" is a reserved word in H2
    private Integer year;

    private String licensePlate;
}
