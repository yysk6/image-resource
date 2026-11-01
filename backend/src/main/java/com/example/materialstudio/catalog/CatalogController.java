package com.example.materialstudio.catalog;

import java.util.Arrays;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api")
public class CatalogController {
    private final CatalogMapper mapper;
    public CatalogController(CatalogMapper mapper) { this.mapper = mapper; }

    public record TemplateDto(String id, String title, String category, String description, String coverUrl,
                              int requiredImageCount, List<String> acceptedMimeTypes, long maxFileSizeBytes) {
        static TemplateDto from(CatalogMapper.TemplateRow row) {
            return new TemplateDto(row.id(), row.title(), row.category(), row.description(), row.coverUrl(),
                    row.requiredImageCount(), Arrays.asList(row.acceptedMimeTypes().split(",")), row.maxFileSizeBytes());
        }
    }

    @GetMapping("/users")
    public List<CatalogMapper.DemoUser> users() { return mapper.users(); }
    @GetMapping("/categories")
    public List<String> categories() { return mapper.categories(); }
    @GetMapping("/templates")
    public List<TemplateDto> templates(@RequestParam(required = false) String category) {
        return mapper.templates(category == null || category.isBlank() ? null : category).stream().map(TemplateDto::from).toList();
    }
    @GetMapping("/templates/{id}")
    public TemplateDto template(@PathVariable String id) {
        var row = mapper.template(id);
        if (row == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "模板不存在");
        return TemplateDto.from(row);
    }
}
