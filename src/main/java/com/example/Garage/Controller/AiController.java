package com.example.Garage.Controller;

import com.example.Garage.Dto.FaultClassifyRequest;
import com.example.Garage.Dto.FaultClassifyResponse;
import com.example.Garage.service.FaultClassificationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiController {

    private final FaultClassificationService faultClassificationService;

    @PostMapping("/classify-fault")
    @PreAuthorize("hasAuthority('ROLE_USER')")
    public ResponseEntity<FaultClassifyResponse> classifyFault(@Valid @RequestBody FaultClassifyRequest request) {
        return ResponseEntity.ok(faultClassificationService.classify(request.getDescription()));
    }
}
