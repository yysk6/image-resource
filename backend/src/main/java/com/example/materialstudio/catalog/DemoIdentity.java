package com.example.materialstudio.catalog;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class DemoIdentity implements HandlerInterceptor {
    public static final String ATTRIBUTE = "demoUser";
    private final CatalogMapper mapper;
    public DemoIdentity(CatalogMapper mapper) { this.mapper = mapper; }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        String id = request.getHeader("X-Demo-User");
        var user = id == null || id.isBlank() ? null : mapper.user(id);
        if (user == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "请选择有效的演示用户");
        request.setAttribute(ATTRIBUTE, user);
        return true;
    }
}
