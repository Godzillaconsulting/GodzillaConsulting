#include "godzilla_tensor_manager.h"

// --- FrameNode Implementation ---

FrameNode::FrameNode(int idx, int ch, int w, int h) 
    : frame_index(idx), channels(ch), width(w), height(h), prev(nullptr), next(nullptr) 
{
    // Initialize double pointer array
    tensor_data = new float*[channels];
    for (int i = 0; i < channels; ++i) {
        tensor_data[i] = new float[width * height];
        // Initialize to 0 to prevent raw garbage reading
        for (int j = 0; j < (width * height); ++j) {
            tensor_data[i][j] = 0.0f;
        }
    }
}

FrameNode::~FrameNode() {
    if (tensor_data != nullptr) {
        // Safe deep deallocation to prevent Row Leaks
        for (int i = 0; i < channels; ++i) {
            delete[] tensor_data[i];
        }
        delete[] tensor_data;
        tensor_data = nullptr;
    }
}


// --- VideoTimeline Implementation ---

VideoTimeline::VideoTimeline() : head(nullptr), tail(nullptr), current_frame_count(0) {
    keyframe_capacity = 10000;
    keyframe_index = new FrameNode*[keyframe_capacity];
    for(int i = 0; i < keyframe_capacity; i++) keyframe_index[i] = nullptr;
}

VideoTimeline::~VideoTimeline() {
    FrameNode* current = head;
    // Iterate securely and call each node's internal destructor
    while (current != nullptr) {
        FrameNode* next_node = current->next;
        delete current;
        current = next_node;
    }
    head = nullptr;
    tail = nullptr;
    current_frame_count = 0;
    
    if (keyframe_index != nullptr) {
        delete[] keyframe_index;
        keyframe_index = nullptr;
    }
    std::cout << "[Godzilla Core HPC] VideoTimeline safely incinerated. Matrix Ram freed.\n";
}

FrameNode* VideoTimeline::AppendEmptyFrame(int channels, int width, int height) {
    FrameNode* new_node = new FrameNode(current_frame_count, channels, width, height);
    
    if (head == nullptr) {
        head = new_node;
        tail = new_node;
    } else {
        tail->next = new_node;
        new_node->prev = tail;
        tail = new_node;
    }

    // Cache keyframes every 10 frames for O(1) jump capabilities
    if (current_frame_count % 10 == 0 && current_frame_count < keyframe_capacity) {
        keyframe_index[current_frame_count] = new_node;
    }

    current_frame_count++;
    return new_node;
}

void VideoTimeline::AppendFrameData(float** raw_tensor_ptr, int ch, int w, int h) {
    // Wrap the raw GPU pointer into a secure DLL node
    FrameNode* node = AppendEmptyFrame(ch, w, h);
    
    // Deep copy enforcement for safety on VRAM-to-RAM bridges
    for(int i=0; i<ch; i++){
        for(int j=0; j<(w*h); j++){
            node->tensor_data[i][j] = raw_tensor_ptr[i][j];
        }
    }
}

void VideoTimeline::DiscardTrailingFrames(int from_index) {
    if(head == nullptr) return;
    
    FrameNode* current = head;
    while(current != nullptr && current->frame_index != from_index) {
        current = current->next;
    }

    if (current != nullptr) {
        tail = current->prev;
        if(tail) tail->next = nullptr;
        else head = nullptr; // whole sequence nuke

        // Safe cascading destructors
        FrameNode* to_delete = current;
        while(to_delete != nullptr){
            FrameNode* next_delete = to_delete->next;
            delete to_delete;
            to_delete = next_delete;
            current_frame_count--;
        }
    }
}

int VideoTimeline::GetFrameCount() const { return current_frame_count; }

void VideoTimeline::PrintMemoryFootprint() const {
    std::cout << "\n============================================\n";
    std::cout << " Godzilla Tensor Manager :: Timeline Status \n";
    std::cout << " Active Nodes (Frames): " << current_frame_count << "\n";
    std::cout << "============================================\n";
}


// --- FFI EXPORTS (EXTERN C BLOCK) ---
void* CreateTimeline() {
    return new VideoTimeline();
}

void DestroyTimeline(void* timeline_ptr) {
    if (timeline_ptr) delete static_cast<VideoTimeline*>(timeline_ptr);
}

void AppendFrameToTimeline(void* timeline_ptr, float** raw_tensor_ptr, int channels, int width, int height) {
    if (timeline_ptr) static_cast<VideoTimeline*>(timeline_ptr)->AppendFrameData(raw_tensor_ptr, channels, width, height);
}

int GetTimelineFrameCount(void* timeline_ptr) {
    if (timeline_ptr) return static_cast<VideoTimeline*>(timeline_ptr)->GetFrameCount();
    return 0;
}
