package com.example.materialstudio.task;

import com.example.materialstudio.asset.AssetService;
import com.example.materialstudio.catalog.CatalogMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class TaskRunner {
    private static final Logger log = LoggerFactory.getLogger(TaskRunner.class);
    private final TaskMapper tasks;
    private final AssetService assets;
    private final CatalogMapper catalog;
    private final long materialDelay, generateDelay, finalizeDelay;
    private final String failStage;
    public TaskRunner(TaskMapper tasks, AssetService assets, CatalogMapper catalog,
                      @Value("${app.simulation.material-delay-ms}") long materialDelay,
                      @Value("${app.simulation.generate-delay-ms}") long generateDelay,
                      @Value("${app.simulation.finalize-delay-ms}") long finalizeDelay,
                      @Value("${app.simulation.fail-stage}") String failStage) {
        this.tasks = tasks; this.assets = assets; this.catalog = catalog;
        this.materialDelay = materialDelay; this.generateDelay = generateDelay; this.finalizeDelay = finalizeDelay; this.failStage = failStage;
    }
    public void run(String id, String userId, String templateId) {
        if (tasks.start(id) != 1) return;
        String stage = "MATERIAL_CHECK";
        try {
            if (!enter(id, stage, materialDelay)) return;
            for (String assetId : tasks.assetIds(id)) assets.content(userId, assetId);
            stage = "GENERATING";
            if (!enter(id, stage, generateDelay)) return;
            stage = "FINALIZING";
            if (!enter(id, stage, finalizeDelay)) return;
            var template = catalog.template(templateId);
            if (template == null) throw new IllegalStateException("template missing");
            tasks.succeed(id, template.coverUrl());
        } catch (Exception error) {
            if (error instanceof InterruptedException) Thread.currentThread().interrupt();
            log.error("Task {} failed in {}", id, stage, error);
            tasks.fail(id, switch (stage) { case "MATERIAL_CHECK" -> "素材检查失败，请确认图片可用"; case "GENERATING" -> "模拟生成失败"; default -> "结果整理失败"; });
        }
    }
    private boolean enter(String id, String stage, long delay) throws InterruptedException {
        if (tasks.stage(id, stage) != 1) return false;
        log.info("Task {} entered {}", id, stage);
        Thread.sleep(Math.max(0, delay));
        String configured = switch (stage) { case "MATERIAL_CHECK" -> "material-check"; case "GENERATING" -> "generate"; case "FINALIZING" -> "finalize"; default -> "none"; };
        if (configured.equalsIgnoreCase(failStage)) throw new IllegalStateException("Simulated failure");
        return true;
    }
}
