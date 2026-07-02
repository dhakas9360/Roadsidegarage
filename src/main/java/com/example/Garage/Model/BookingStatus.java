package com.example.Garage.Model;

public enum BookingStatus {
    PENDING,       // created, no technician assigned yet
    UNASSIGNED,    // no technician was available at the garage when placed
    ASSIGNED,      // technician auto-assigned, not yet started
    IN_PROGRESS,   // technician accepted and is working the job
    COMPLETED,     // technician marked the fault fixed, awaiting rating
    RATED,         // user rated the completed job
    CANCELLED
}
