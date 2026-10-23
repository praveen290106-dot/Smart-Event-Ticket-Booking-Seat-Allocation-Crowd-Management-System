"""
Queue (deque-backed, FIFO)
Used for: sold-out event waiting list (Module 2).
"""
from collections import deque


class Queue:
    def __init__(self):
        self._items = deque()

    def enqueue(self, item):
        self._items.append(item)

    def dequeue(self):
        if not self._items:
            return None
        return self._items.popleft()

    def peek(self):
        return self._items[0] if self._items else None

    def remove(self, match_fn):
        for i, item in enumerate(self._items):
            if match_fn(item):
                del self._items[i]
                return item
        return None

    def position_of(self, match_fn):
        for i, item in enumerate(self._items):
            if match_fn(item):
                return i + 1
        return None

    def to_list(self):
        return list(self._items)

    def __len__(self):
        return len(self._items)
