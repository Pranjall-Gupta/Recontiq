package com.impact.gst.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * Generic paginated API response wrapper.
 *
 * @param <T> element type
 */
@Data
@Builder
public class PagedResponse<T> {
    private List<T> content;
    private int page;
    private int size;
    private long totalElements;
    private int totalPages;
    private boolean last;
}
