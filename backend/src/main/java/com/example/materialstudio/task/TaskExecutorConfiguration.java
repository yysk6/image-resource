package com.example.materialstudio.task;

import java.util.concurrent.ThreadPoolExecutor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

@Configuration
public class TaskExecutorConfiguration {
    @Bean("creationExecutor")
    ThreadPoolTaskExecutor creationExecutor(@Value("${app.executor.threads}") int threads, @Value("${app.executor.queue-capacity}") int capacity) {
        if (threads < 1 || capacity < 0) throw new IllegalArgumentException("Invalid task executor configuration");
        var executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(threads); executor.setMaxPoolSize(threads); executor.setQueueCapacity(capacity);
        executor.setThreadNamePrefix("creation-"); executor.setRejectedExecutionHandler(new ThreadPoolExecutor.AbortPolicy());
        executor.setWaitForTasksToCompleteOnShutdown(true); executor.setAwaitTerminationSeconds(15);
        return executor;
    }
}
