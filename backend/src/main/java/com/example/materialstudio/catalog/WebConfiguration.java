package com.example.materialstudio.catalog;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfiguration implements WebMvcConfigurer {
    private final DemoIdentity identity;
    public WebConfiguration(DemoIdentity identity) { this.identity = identity; }
    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(identity).addPathPatterns("/api/me", "/api/assets", "/api/assets/**", "/api/tasks", "/api/tasks/**");
    }

    @RestController
    static class MeController {
        @GetMapping("/api/me")
        CatalogMapper.DemoUser me(HttpServletRequest request) {
            return (CatalogMapper.DemoUser) request.getAttribute(DemoIdentity.ATTRIBUTE);
        }
    }
}
