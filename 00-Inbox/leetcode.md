Интересные задачки
https://leetcode.com/problems/construct-binary-tree-from-preorder-and-inorder-traversal/submissions/1986916249
```python
from collections import deque
from typing import List, Optional

class Tree:
def __init__(self, root=None):
self.root = root

class TreeNode:

def __init__(self, val=0, left=None, right=None):

self.val = val

self.left = left

self.right = right

  

@staticmethod

def TreeFromList(array: List[Optional[int]]) -> Optional[TreeNode]:

if not array:

return None

  

root = Tree.TreeNode(array[0])

queue = deque([root])

i = 1

  

while queue and i < len(array):

node = queue.popleft()

  

if i < len(array) and array[i] is not None:

node.left = Tree.TreeNode(array[i])

queue.append(node.left)

i += 1

  

if i < len(array) and array[i] is not None:

node.right = Tree.TreeNode(array[i])

queue.append(node.right)

i += 1

  

return root

  

def preorder_traversal(self) -> list:

result = []

def traverse(node):

if node:

result.append(node.val)

traverse(node.left)

traverse(node.right)

traverse(self.root)

return result

  

def inorder_traversal(self) -> list:

result = []

def traverse(node):

if node:

traverse(node.left)

result.append(node.val)

traverse(node.right)

traverse(self.root)

return result

  

def dfs_traversal(self) -> list:

if not self.root:

return []

result = []

stack = [self.root]

while stack:

current = stack.pop()

result.append(current.val)

if current.right:

stack.append(current.right)

if current.left:

stack.append(current.left)

return result

  

def bfs_traversal(self) -> list:

if not self.root:

return []

result = []

queue = deque([self.root])

while queue:

current = queue.popleft()

result.append(current.val)

if current.left:

queue.append(current.left)

if current.right:

queue.append(current.right)

return result

  

class TreeNode:

def __init__(self, val=0, left=None, right=None):

self.val = val

self.left = left

self.right = right

  

def bfs_traversal(self) -> list:

result = []

queue = deque([self])

while queue:

current = queue.popleft()

result.append(current.val)

if current.left:

queue.append(current.left)

if current.right:

queue.append(current.right)

return result

  

class Solution:

def buildTree(self, preorder: List[int], inorder: List[int]) -> Optional[TreeNode]:

inorder_map = {val: i for i, val in enumerate(inorder)}

  

def helper(pre_left, pre_right, in_left, in_right) -> Optional[TreeNode]:

if pre_left >= pre_right:

return None

  

root_val = preorder[pre_left]

root = TreeNode(root_val)

  

mid = inorder_map[root_val]

left_size = mid - in_left

# Mb better to use like [a, b)

root.left = helper(

pre_left + 1,

pre_left + 1 + left_size,

in_left,

mid

)

root.right = helper(

pre_left + 1 + left_size,

pre_right,

mid + 1,

in_right

)

return root

return helper(0, len(preorder), 0, len(inorder))

  
  

if __name__ == "__main__":

tree = Tree()

tree.root = Tree.TreeFromList([1, 2, 4, 5, 3, 6, 7])

  

another_tree = Solution().buildTree(tree.preorder_traversal(), tree.inorder_traversal())

print(another_tree.bfs_traversal())
```