package com.example.materialstudio.catalog;

import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
public class ApiErrors {
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, String>> status(ResponseStatusException error) {
        String code = error.getStatusCode().value() == 404 ? "NOT_FOUND" : "UNAUTHORIZED";
        return ResponseEntity.status(error.getStatusCode()).body(Map.of("code", code, "message", error.getReason() == null ? "请求失败" : error.getReason()));
    }
}
