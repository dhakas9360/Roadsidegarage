package com.example.Garage.Dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class FaultClassifyResponse {
    private Long faultTypeId;
    private String faultTypeName;
    private String urgency;
    private String explanation;
}
