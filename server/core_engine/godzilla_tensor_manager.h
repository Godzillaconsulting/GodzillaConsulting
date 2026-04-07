#ifndef GODZILLA_TENSOR_MANAGER_H
#define GODZILLA_TENSOR_MANAGER_H

#include <iostream>

#ifdef _WIN32
  #define DLL_EXPORT __declspec(dllexport)
#else
  #define DLL_EXPORT
#endif

// Base struct for a Video frame tensor
struct FrameNode {
    int frame_index;
    int channels;
    int width;
    int height;
    float** tensor_data; // Double pointer for high-dimension mat processing
    
    FrameNode* prev;     // Doubly linked previous frame
    FrameNode* next;     // Doubly linked next frame

    FrameNode(int idx, int ch, int w, int h);
    ~FrameNode();
};

class VideoTimeline {
private:
    FrameNode* head;
    FrameNode* tail;
    int current_frame_count;

    // Optional fast-seek array for keyframing
    FrameNode** keyframe_index;
    int keyframe_capacity;

public:
    VideoTimeline();
    ~VideoTimeline();

    // Core functionality avoiding Memory Leaks
    FrameNode* AppendEmptyFrame(int channels, int width, int height);
    void AppendFrameData(float** raw_tensor_ptr, int channels, int width, int height);
    void DiscardTrailingFrames(int from_index);
    int GetFrameCount() const;
    
    // Memory Diagnostic
    void PrintMemoryFootprint() const;
};

// C-Wrapper for FFI Interoperability (Python/Nodejs Bridge)
extern "C" {
    DLL_EXPORT void* CreateTimeline();
    DLL_EXPORT void DestroyTimeline(void* timeline_ptr);
    DLL_EXPORT void AppendFrameToTimeline(void* timeline_ptr, float** raw_tensor_ptr, int channels, int width, int height);
    DLL_EXPORT int GetTimelineFrameCount(void* timeline_ptr);
}

#endif // GODZILLA_TENSOR_MANAGER_H
