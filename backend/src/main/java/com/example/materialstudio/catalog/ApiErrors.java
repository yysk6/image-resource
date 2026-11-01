package com.example.materialstudio.catalog;

import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

@RestControllerAdvice
public class ApiErrors {
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, String>> status(ResponseStatusException error) {
        String code = switch (error.getStatusCode().value()) { case 400 -> "BAD_REQUEST"; case 401 -> "UNAUTHORIZED"; case 404 -> "NOT_FOUND"; default -> "SERVER_ERROR"; };
        return ResponseEntity.status(error.getStatusCode()).body(Map.of("code", code, "message", error.getReason() == null ? "请求失败" : error.getReason()));
    }
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<Map<String, String>> tooLarge() {
        return ResponseEntity.status(413).body(Map.of("code", "FILE_TOO_LARGE", "message", "图片不能超过 5 MB"));
    }
}
