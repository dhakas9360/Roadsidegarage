package com.example.Garage.exception;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.NoHandlerFoundException;
import org.springframework.web.servlet.resource.NoResourceFoundException;
import java.time.format.DateTimeParseException;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

import java.util.HashMap;
import java.util.Map;

@ControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<?> handleValidationExceptions(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getFieldErrors().forEach(error -> errors.put(error.getField(), error.getDefaultMessage()));
        return ResponseEntity.badRequest().body(errors);
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<?> handleBadCredentials(BadCredentialsException ex) {
        return error(HttpStatus.UNAUTHORIZED, "Invalid username or password");
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<?> handleAccessDenied(AccessDeniedException ex) {
        return error(HttpStatus.FORBIDDEN, "You are not allowed to perform this action");
    }

    @ExceptionHandler(ForbiddenActionException.class)
    public ResponseEntity<?> handleForbidden(ForbiddenActionException ex) {
        return error(HttpStatus.FORBIDDEN, ex.getMessage());
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<?> handleNotFound(ResourceNotFoundException ex) {
        return error(HttpStatus.NOT_FOUND, ex.getMessage());
    }

    @ExceptionHandler(InvalidStateTransitionException.class)
    public ResponseEntity<?> handleInvalidState(InvalidStateTransitionException ex) {
        return error(HttpStatus.CONFLICT, ex.getMessage());
    }

    @ExceptionHandler(GarageFullException.class)
    public ResponseEntity<?> handleGarageFull(GarageFullException ex) {
        return error(HttpStatus.CONFLICT, ex.getMessage());
    }

    /** Malformed JSON, unparseable dates/numbers, missing or mistyped query params -> 400, not 500. */
    @ExceptionHandler({HttpMessageNotReadableException.class, MissingServletRequestParameterException.class,
            MethodArgumentTypeMismatchException.class, DateTimeParseException.class, BadRequestException.class})
    public ResponseEntity<?> handleBadRequest(Exception ex) {
        String message = switch (ex) {
            case HttpMessageNotReadableException e -> "Malformed request body";
            case MissingServletRequestParameterException e -> "Missing required parameter '" + e.getParameterName() + "'";
            case MethodArgumentTypeMismatchException e -> "Invalid value for parameter '" + e.getName() + "'";
            case DateTimeParseException e -> "Invalid date: '" + e.getParsedString() + "'";
            default -> ex.getMessage();
        };
        return error(HttpStatus.BAD_REQUEST, message);
    }

    /** Unknown URL / missing static file (e.g. a browser's automatic /favicon.ico request) is a plain 404, not a server error. */
    @ExceptionHandler({NoResourceFoundException.class, NoHandlerFoundException.class})
    public ResponseEntity<?> handleNoResource(Exception ex) {
        return error(HttpStatus.NOT_FOUND, "Not found");
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<?> handleGeneric(Exception ex) {
        // don't leak internal exception messages (SQL, stack details) to clients
        log.error("Unhandled exception", ex);
        return error(HttpStatus.INTERNAL_SERVER_ERROR, "Something went wrong on our side. Please try again.");
    }

    private ResponseEntity<?> error(HttpStatus status, String message) {
        Map<String, String> body = new HashMap<>();
        body.put("error", message);
        return ResponseEntity.status(status).body(body);
    }
}
