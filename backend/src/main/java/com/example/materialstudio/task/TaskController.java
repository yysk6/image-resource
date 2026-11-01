package com.example.materialstudio.task;

import com.example.materialstudio.asset.AssetService;
import com.example.materialstudio.catalog.CatalogMapper;
import com.example.materialstudio.catalog.DemoIdentity;
import jakarta.servlet.http.HttpServletRequest;
import java.time.ZoneOffset;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.task.TaskRejectedException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/tasks")
public class TaskController {
    private static final Logger log = LoggerFactory.getLogger(TaskController.class);
    private final CatalogMapper catalog;
    private final AssetService assets;
    private final TaskRecords records;
    private final TaskMapper tasks;
    private final TaskRunner runner;
    private final ThreadPoolTaskExecutor executor;
    public TaskController(CatalogMapper catalog, AssetService assets, TaskRecords records, TaskMapper tasks, TaskRunner runner,
                          @Qualifier("creationExecutor") ThreadPoolTaskExecutor executor) {
        this.catalog = catalog; this.assets = assets; this.records = records; this.tasks = tasks; this.runner = runner; this.executor = executor;
    }
    public record CreateRequest(String templateId, List<String> assetIds) {}
    public record TaskResponse(String id, String templateId, String templateTitle, String status, String currentStage,
                               String resultUrl, String failureReason, String createdAt, String startedAt, String finishedAt) {}
    private String user(HttpServletRequest request) { return ((CatalogMapper.DemoUser) request.getAttribute(DemoIdentity.ATTRIBUTE)).id(); }
    @PostMapping
    public ResponseEntity<Map<String, String>> create(@RequestBody CreateRequest input, HttpServletRequest request) {
        String userId = user(request);
        if (input == null || input.templateId() == null || input.templateId().isBlank() || input.assetIds() == null || input.assetIds().stream().anyMatch(id -> id == null || id.isBlank())) throw bad("请提供模板和素材");
        var template = catalog.template(input.templateId());
        if (template == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "模板不存在");
        var ids = input.assetIds();
        if (ids.size() != template.requiredImageCount() || new HashSet<>(ids).size() != ids.size()) throw bad("素材数量不符合要求或包含重复图片");
        var accepted = Arrays.asList(template.acceptedMimeTypes().split(","));
        for (String id : ids) {
            var asset = assets.owned(userId, id);
            if (!accepted.contains(asset.mimeType()) || asset.sizeBytes() > template.maxFileSizeBytes()) throw bad("图片类型或大小不符合模板要求");
            try { assets.content(userId, id); } catch (ResponseStatusException e) { throw bad("素材文件不可用，请重新上传"); }
        }
        String id = records.create(userId, template.id(), ids);
        try { executor.execute(() -> runner.run(id, userId, template.id())); }
        catch (TaskRejectedException e) {
            try { if (tasks.reject(id, "系统繁忙，请稍后重新提交") != 1) throw new IllegalStateException("Task rejection was not saved"); }
            catch (RuntimeException failure) { log.error("Could not record rejected task {}", id, failure); throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "暂时无法受理任务"); }
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of("code", "BUSY", "message", "系统繁忙，请稍后重新提交", "taskId", id, "status", "FAILED"));
        }
        return ResponseEntity.accepted().body(Map.of("taskId", id, "status", "PENDING"));
    }
    @GetMapping("/{id}")
    public TaskResponse get(@PathVariable String id, HttpServletRequest request) {
        var task = tasks.findOwned(id, user(request));
        if (task == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "任务不存在");
        return response(task);
    }
    @GetMapping
    public List<TaskResponse> history(HttpServletRequest request) {
        String userId = user(request);
        try { return tasks.findAllOwned(userId).stream().map(TaskController::response).toList(); }
        catch (RuntimeException error) { log.error("Could not read task history for user {}", userId, error); throw error; }
    }
    private static TaskResponse response(TaskMapper.Task task) {
        return new TaskResponse(task.id(), task.templateId(), task.templateTitle(), task.status(), task.currentStage(), task.resultUrl(), task.failureReason(),
                task.createdAt().atOffset(ZoneOffset.UTC).toString(), task.startedAt() == null ? null : task.startedAt().atOffset(ZoneOffset.UTC).toString(), task.finishedAt() == null ? null : task.finishedAt().atOffset(ZoneOffset.UTC).toString());
    }
    private static ResponseStatusException bad(String message) { return new ResponseStatusException(HttpStatus.BAD_REQUEST, message); }
}
