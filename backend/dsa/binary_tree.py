"""
Binary Tree
Used for: event category hierarchy (Module 3).
Strictly binary (max 2 children per node) as required.
"""

class CategoryNode:
    def __init__(self, name, code):
        self.name = name
        self.code = code
        self.left = None
        self.right = None


def build_category_tree():
    root = CategoryNode("Events", "root")
    indoor = CategoryNode("Indoor", "indoor")
    outdoor = CategoryNode("Outdoor", "outdoor")
    root.left, root.right = indoor, outdoor

    indoor.left = CategoryNode("Concert", "concert")
    indoor.right = CategoryNode("Exhibition", "exhibition")

    outdoor.left = CategoryNode("Sports", "sports")
    outdoor.right = CategoryNode("Festival", "festival")
    return root


def inorder(node, depth=0, out=None):
    if out is None:
        out = []
    if node:
        inorder(node.left, depth + 1, out)
        out.append({"name": node.name, "code": node.code, "depth": depth})
        inorder(node.right, depth + 1, out)
    return out


def preorder(node, depth=0, out=None):
    if out is None:
        out = []
    if node:
        out.append({"name": node.name, "code": node.code, "depth": depth})
        preorder(node.left, depth + 1, out)
        preorder(node.right, depth + 1, out)
    return out


CATEGORY_TREE = build_category_tree()
CATEGORY_CODES = [n["code"] for n in preorder(CATEGORY_TREE) if n["depth"] > 0]
