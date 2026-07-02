package com.example.Garage.Model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "garage_service_prices", uniqueConstraints = @UniqueConstraint(columnNames = {"garage_id", "fault_type_id", "vehicle_type_id"}))
@Data
@NoArgsConstructor
public class GarageServicePrice {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    private Garage garage;

    @ManyToOne
    private FaultType faultType;

    @ManyToOne
    private VehicleType vehicleType;

    private Double price;
}
