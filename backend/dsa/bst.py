"""
Binary Search Tree
Used for: indexing Event ID / Seat ID / Booking ID for O(log n) average
insert and lookup (Module 3).
"""

class BSTNode:
    __slots__ = ("key", "data", "left", "right")

    def __init__(self, key, data):
        self.key = key
        self.data = data
        self.left = None
        self.right = None


class BST:
    def __init__(self):
        self.root = None
        self.size = 0

    def insert(self, key, data):
        self.root = self._insert(self.root, key, data)

    def _insert(self, node, key, data):
        if node is None:
            self.size += 1
            return BSTNode(key, data)
        if key < node.key:
            node.left = self._insert(node.left, key, data)
        elif key > node.key:
            node.right = self._insert(node.right, key, data)
        else:
            node.data = data
        return node

    def search(self, key):
        """O(log n) average, O(n) worst case."""
        node = self.root
        while node:
            if key == node.key:
                return node.data
            node = node.left if key < node.key else node.right
        return None

    def inorder(self):
        """Returns items sorted by key ascending - O(n)."""
        result = []

        def _walk(node):
            if node:
                _walk(node.left)
                result.append(node.data)
                _walk(node.right)

        _walk(self.root)
        return result
