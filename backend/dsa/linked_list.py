"""
Singly Linked List
Used for: user booking history / recently viewed events (Module 1).
Supports O(1) insert-at-head, O(n) delete-by-match, O(n) traverse.
"""

class Node:
    __slots__ = ("data", "next")

    def __init__(self, data):
        self.data = data
        self.next = None


class LinkedList:
    def __init__(self):
        self.head = None
        self.size = 0

    def insert(self, data):
        """Insert at head - O(1). Most recent item is always first."""
        node = Node(data)
        node.next = self.head
        self.head = node
        self.size += 1
        return node.data

    def delete(self, match_fn):
        """Delete first node matching predicate - O(n)."""
        prev, curr = None, self.head
        while curr:
            if match_fn(curr.data):
                if prev:
                    prev.next = curr.next
                else:
                    self.head = curr.next
                self.size -= 1
                return curr.data
            prev, curr = curr, curr.next
        return None

    def traverse(self, limit=None):
        """Return items head-to-tail (most recent first) - O(n)."""
        result = []
        curr = self.head
        while curr:
            result.append(curr.data)
            if limit and len(result) >= limit:
                break
            curr = curr.next
        return result
