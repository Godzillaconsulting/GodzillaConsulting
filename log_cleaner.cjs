const fs = require('fs');
const path = require('path');
const os = require('os');

class LogNode {
    constructor(filePath) {
        this.filePath = filePath;
        this.next = null;
    }
}

class LinkedList {
    constructor() {
        this.head = null;
        this.tail = null;
        this.size = 0;
    }

    add(filePath) {
        const newNode = new LogNode(filePath);
        if (!this.head) {
            this.head = newNode;
            this.tail = newNode;
        } else {
            this.tail.next = newNode;
            this.tail = newNode;
        }
        this.size++;
    }

    removeOldest() {
        if (!this.head) return null;
        const removed = this.head;
        this.head = this.head.next;
        this.size--;
        if (this.size === 0) this.tail = null;
        return removed;
    }
}

const LOG_DIR = path.join(os.homedir(), '.pm2', 'logs');
const MAX_LOGS = 15;

function cleanLogs() {
    console.log('[Log Cleaner] Starting log rotation check using Linked List...');
    if (!fs.existsSync(LOG_DIR)) return;

    const files = fs.readdirSync(LOG_DIR)
        .filter(f => f.endsWith('.log'))
        .map(f => ({
            name: f,
            path: path.join(LOG_DIR, f),
            time: fs.statSync(path.join(LOG_DIR, f)).mtime.getTime()
        }))
        .sort((a, b) => a.time - b.time); // Oldest first

    if (files.length <= MAX_LOGS) {
        console.log(`[Log Cleaner] Only ${files.length} log files present. No cleanup needed.`);
        return;
    }

    const list = new LinkedList();
    const filesToDelete = files.length - MAX_LOGS;

    for (let i = 0; i < filesToDelete; i++) {
        list.add(files[i].path);
    }

    let current = list.removeOldest();
    while (current) {
        try {
            fs.unlinkSync(current.filePath);
            console.log(`[Log Cleaner] Deleted old log file: ${path.basename(current.filePath)}`);
        } catch (err) {
            console.error(`[Log Cleaner] Failed to delete ${current.filePath}:`, err.message);
        }
        current = list.removeOldest();
    }
}

setInterval(cleanLogs, 60 * 60 * 1000); // Check every hour
cleanLogs();
