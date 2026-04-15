package com.example.demo.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.resource.PathResourceResolver;

import java.io.IOException;

/**
 * Serves the React SPA from classpath:/static/ and falls back to index.html
 * for any path that isn't an actual file (enabling React Router client-side navigation).
 *
 * This replaces the SpaController @GetMapping approach, which suffered from a pattern
 * priority problem: @Controller handlers always beat the ResourceHttpRequestHandler, so
 * /assets/file.css was intercepted and forwarded to index.html instead of being served.
 *
 * Resource handlers run AFTER @RestController mappings, so /api/** is never affected.
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/**")
                .addResourceLocations("classpath:/static/")
                .resourceChain(true)
                .addResolver(new PathResourceResolver() {
                    @Override
                    protected Resource getResource(String resourcePath, Resource location) throws IOException {
                        Resource resource = location.createRelative(resourcePath);
                        if (resource.exists() && resource.isReadable()) {
                            return resource;
                        }
                        // API paths that have no file → return null so NoResourceFoundException
                        // is thrown and GlobalExceptionHandler returns a 404 JSON response.
                        if (resourcePath.startsWith("api")) {
                            return null;
                        }
                        // SPA fallback: all other unmatched paths load index.html so
                        // React Router can handle client-side navigation.
                        Resource indexHtml = location.createRelative("index.html");
                        return indexHtml.exists() ? indexHtml : null;
                    }
                });
    }
}
