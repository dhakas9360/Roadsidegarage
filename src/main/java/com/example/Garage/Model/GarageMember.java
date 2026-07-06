package com.example.Garage.Model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "garage_members")
@Data
@NoArgsConstructor
public class GarageMember {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    private Garage garage;

    // link to the underlying ROLE_GARAGE_MEMBER user account
    @Column(unique = true, nullable = false)
    private Long userId;

    private Double latitude;
    private Double longitude;

    // whether the technician is currently able to accept new jobs
    private boolean available = true;

    // count of active jobs assigned (ASSIGNED or IN_PROGRESS)
    private Integer activeJobs = 0;

    // running average rating from completed & rated jobs, used to pick assignees
    private Double rating = 0.0;
    private Integer ratingCount = 0;

    // populated on read from the linked User; not persisted
    @Transient
    private String username;
    @Transient
    private String phone;
}
