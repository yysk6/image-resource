package com.example.materialstudio.task;

import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TaskRecords {
    private final TaskMapper mapper;
    public TaskRecords(TaskMapper mapper) { this.mapper = mapper; }
    @Transactional
    public String create(String userId, String templateId, List<String> assetIds) {
        String id = UUID.randomUUID().toString();
        mapper.insert(id, userId, templateId);
        for (int i = 0; i < assetIds.size(); i++) mapper.link(id, assetIds.get(i), i);
        return id;
    }
}
