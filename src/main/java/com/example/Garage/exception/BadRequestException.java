package com.example.Garage.exception;

/** Business-rule validation failure that should surface as HTTP 400. */
public class BadRequestException extends RuntimeException {
    public BadRequestException(String message) {
        super(message);
    }
}
