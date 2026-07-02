package com.example.Garage.Model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "fault_types")
@Data
@NoArgsConstructor
public class FaultType {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String name; // e.g., BATTERY_ISSUE, BRAKE_PROBLEM, FLAT_TYRE

    private String description;

    public FaultType(String name, String description) {
        this.name = name;
        this.description = description;
    }
}
