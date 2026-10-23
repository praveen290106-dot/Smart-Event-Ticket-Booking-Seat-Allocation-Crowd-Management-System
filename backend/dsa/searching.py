"""
Binary Search - chosen searching technique (Module 5).
Requires sorted input (fed by Quick Sort). O(log n).
"""

def binary_search(sorted_arr, target, key=lambda x: x):
    lo, hi = 0, len(sorted_arr) - 1
    steps = 0
    while lo <= hi:
        steps += 1
        mid = (lo + hi) // 2
        val = key(sorted_arr[mid])
        if val == target:
            return sorted_arr[mid], steps
        elif val < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return None, steps
