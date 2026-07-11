package com.example.Garage.service;

import com.example.Garage.Dto.FaultClassifyResponse;
import com.example.Garage.Model.FaultType;
import com.example.Garage.Repository.FaultTypeRepo;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

/**
 * Classifies a customer's free-text fault description into one of the garage's configured
 * FaultType rows, using the OpenAI chat completions API with a JSON schema response format
 * so the model can only pick from the fault types that actually exist.
 */
@Service
@RequiredArgsConstructor
public class FaultClassificationService {

    private static final List<String> URGENCY_LEVELS = List.of("LOW", "MEDIUM", "HIGH", "EMERGENCY");
    private static final String OPENAI_URL = "https://api.openai.com/v1/chat/completions";

    private final FaultTypeRepo faultTypeRepo;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RestClient restClient = RestClient.create();

    @Value("${openai.api-key}")
    private String apiKey;

    @Value("${openai.model}")
    private String model;

    public FaultClassifyResponse classify(String description) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException("AI fault classification is not configured (missing OPENAI_API_KEY).");
        }

        List<FaultType> faultTypes = faultTypeRepo.findAll();
        if (faultTypes.isEmpty()) {
            throw new IllegalStateException("No fault types are configured yet.");
        }

        String faultList = faultTypes.stream()
                .map(f -> "- " + f.getName() + ": " + f.getDescription())
                .reduce((a, b) -> a + "\n" + b)
                .orElse("");

        Map<String, Object> requestBody = Map.of(
                "model", model,
                "messages", List.of(
                        Map.of("role", "system", "content",
                                "You are a vehicle fault triage assistant for a roadside garage booking app. " +
                                        "Given a customer's plain-English description of a problem, pick the single " +
                                        "best-matching fault type from the list provided, and rate how urgent it is."),
                        Map.of("role", "user", "content",
                                "Available fault types:\n" + faultList +
                                        "\n\nCustomer's description: \"" + description + "\"")
                ),
                "response_format", Map.of(
                        "type", "json_schema",
                        "json_schema", Map.of(
                                "name", "fault_classification",
                                "strict", true,
                                "schema", Map.of(
                                        "type", "object",
                                        "properties", Map.of(
                                                "faultType", Map.of(
                                                        "type", "string",
                                                        "enum", faultTypes.stream().map(FaultType::getName).toList()),
                                                "urgency", Map.of("type", "string", "enum", URGENCY_LEVELS),
                                                "explanation", Map.of("type", "string")
                                        ),
                                        "required", List.of("faultType", "urgency", "explanation"),
                                        "additionalProperties", false
                                )
                        )
                )
        );

        String rawResponse;
        try {
            rawResponse = restClient.post()
                    .uri(OPENAI_URL)
                    .header("Authorization", "Bearer " + apiKey)
                    .header("Content-Type", "application/json")
                    .body(requestBody)
                    .retrieve()
                    .body(String.class);
        } catch (Exception e) {
            throw new IllegalStateException("Could not reach the AI service: " + e.getMessage(), e);
        }

        try {
            JsonNode root = objectMapper.readTree(rawResponse);
            String content = root.path("choices").get(0).path("message").path("content").asText();
            JsonNode classification = objectMapper.readTree(content);

            String faultTypeName = classification.path("faultType").asText();
            String urgency = classification.path("urgency").asText();
            String explanation = classification.path("explanation").asText();

            FaultType matched = faultTypeRepo.findByName(faultTypeName)
                    .orElseThrow(() -> new IllegalStateException("AI suggested an unknown fault type: " + faultTypeName));

            return new FaultClassifyResponse(matched.getId(), matched.getName(), urgency, explanation);
        } catch (IllegalStateException e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalStateException("Could not interpret the AI response: " + e.getMessage(), e);
        }
    }
}
