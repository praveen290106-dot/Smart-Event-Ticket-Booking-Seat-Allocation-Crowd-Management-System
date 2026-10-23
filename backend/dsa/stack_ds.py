"""
Stack (array-backed, LIFO)
Used for: undo last booking/cancellation (Module 2).
"""

class Stack:
    def __init__(self, max_size=25):
        self._items = []
        self.max_size = max_size

    def push(self, item):
        self._items.append(item)
        if len(self._items) > self.max_size:
            self._items.pop(0)

    def pop(self):
        if not self._items:
            return None
        return self._items.pop()

    def peek(self):
        return self._items[-1] if self._items else None

    def is_empty(self):
        return len(self._items) == 0

    def to_list(self):
        """Most recent action first."""
        return list(reversed(self._items))
