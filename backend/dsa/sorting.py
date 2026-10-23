"""
Quick Sort - chosen sorting technique (Module 5).
Used to rank events (by popularity/date) and seats (by price).
Average O(n log n), worst case O(n^2) on already-sorted input,
mitigated here by picking a middle pivot.
"""

def quick_sort(arr, key=lambda x: x, reverse=False):
    if len(arr) <= 1:
        return list(arr)
    pivot = arr[len(arr) // 2]
    pivot_key = key(pivot)
    left = [x for x in arr if key(x) < pivot_key]
    mid = [x for x in arr if key(x) == pivot_key]
    right = [x for x in arr if key(x) > pivot_key]
    result = quick_sort(left, key) + mid + quick_sort(right, key)
    return list(reversed(result)) if reverse else result
