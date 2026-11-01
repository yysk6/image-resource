package com.example.materialstudio.asset;

import com.example.materialstudio.catalog.CatalogMapper;
import com.example.materialstudio.catalog.DemoIdentity;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/assets")
public class AssetController {
    private final AssetService service;
    public AssetController(AssetService service) { this.service = service; }
    record UploadResponse(String id, String mimeType, long sizeBytes, String previewUrl) {}
    private String user(HttpServletRequest request) { return ((CatalogMapper.DemoUser) request.getAttribute(DemoIdentity.ATTRIBUTE)).id(); }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<UploadResponse> upload(@RequestParam("file") MultipartFile file, HttpServletRequest request) {
        var asset = service.upload(user(request), file);
        return ResponseEntity.status(201).body(new UploadResponse(asset.id(), asset.mimeType(), asset.sizeBytes(), "/api/assets/" + asset.id() + "/content"));
    }
    @GetMapping("/{id}/content")
    public ResponseEntity<ByteArrayResource> content(@PathVariable String id, HttpServletRequest request) {
        String userId = user(request);
        var asset = service.owned(userId, id);
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(asset.mimeType())).header("Cache-Control", "private, no-store")
                .body(new ByteArrayResource(service.content(userId, id)));
    }
}
