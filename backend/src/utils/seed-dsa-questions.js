/**
 * PRAGATI — DSA Aptitude Questions Seeder
 * Seeds 50 DSA questions across 10 subtopics into MongoDB.
 */
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
try { dns.setServers(['8.8.8.8','1.1.1.1']); } catch {}
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const mongoose = require('mongoose');
const { AptitudeQuestion } = require('../models');

const dsaQuestions = [
  // 1. Arrays
  {
    topic: 'DSA Aptitude', subtopic: 'Arrays', difficulty: 'Medium',
    companies: ['Capgemini'], year: '2025',
    question: 'What is the maximum number of elements that can be stored in a 3D array declared as int arr[3][4][5] in C?',
    options: ['A) 12', 'B) 20', 'C) 60', 'D) 120'],
    answer: 'C) 60',
    explanation: 'The total number of elements in a multi-dimensional array is the product of its dimensions: 3 × 4 × 5 = 60.'
  },
  {
    topic: 'DSA Aptitude', subtopic: 'Arrays', difficulty: 'Medium',
    companies: ['Wipro'], year: '2025',
    question: 'In an array-based implementation of a binary tree, if a node is stored at index i (1-based indexing), what is the index of its right child?',
    options: ['A) 2i', 'B) 2i + 1', 'C) 2i - 1', 'D) i + 2'],
    answer: 'B) 2i + 1',
    explanation: 'For a 1-based array implementation of a binary tree, the left child of a node at index i is located at 2i, and the right child is at 2i + 1.'
  },
  {
    topic: 'DSA Aptitude', subtopic: 'Arrays', difficulty: 'Easy',
    companies: ['TCS NQT', 'TCS'], year: '2025',
    question: 'Which of the following operations on a static, unsorted array of size n has a worst-case time complexity of O(1)?',
    options: ['A) Inserting an element at the beginning', 'B) Deleting an element from the middle', 'C) Accessing an element given its index', 'D) Searching for an element by its value'],
    answer: 'C) Accessing an element given its index',
    explanation: 'Arrays provide random access via base address arithmetic, allowing lookup by index in constant O(1) time. Shifting elements for insertion or deletion takes linear O(n) time.'
  },
  {
    topic: 'DSA Aptitude', subtopic: 'Arrays', difficulty: 'Medium',
    companies: ['Infosys'], year: '2025',
    question: "What is the time complexity of Kadane's algorithm used to find the maximum subarray sum?",
    options: ['A) O(1)', 'B) O(log n)', 'C) O(n)', 'D) O(n²)'],
    answer: 'C) O(n)',
    explanation: "Kadane's algorithm scans the array exactly once, keeping track of the maximum contiguous sum ending at each position, executing in linear time."
  },
  {
    topic: 'DSA Aptitude', subtopic: 'Arrays', difficulty: 'Easy',
    companies: ['Cognizant'], year: '2026',
    question: 'If the memory address of the first element arr[0] of an integer array (4 bytes per integer) is 2000, what will be the address of arr[5]?',
    options: ['A) 2005', 'B) 2010', 'C) 2020', 'D) 2040'],
    answer: 'C) 2020',
    explanation: 'The address calculation formula is: Base Address + (Index × Size of element). Here, 2000 + (5 × 4) = 2020.'
  },

  // 2. Linked Lists
  {
    topic: 'DSA Aptitude', subtopic: 'Linked Lists', difficulty: 'Easy',
    companies: ['Accenture'], year: '2025',
    question: 'What is the worst-case time complexity to search for an element in a singly linked list containing n nodes?',
    options: ['A) O(1)', 'B) O(log n)', 'C) O(n)', 'D) O(n log n)'],
    answer: 'C) O(n)',
    explanation: 'Unlike arrays, linked lists do not support random access. To locate an element, you must traverse nodes from head to tail sequentially.'
  },
  {
    topic: 'DSA Aptitude', subtopic: 'Linked Lists', difficulty: 'Easy',
    companies: ['HCL'], year: '2025',
    question: 'Which linked list variant eliminates the need to look for a NULL pointer during standard forward traversals?',
    options: ['A) Singly Linked List', 'B) Doubly Linked List', 'C) Circular Linked List', 'D) Balanced Linked List'],
    answer: 'C) Circular Linked List',
    explanation: "In a circular linked list, the final node's next pointer links back to the head node instead of pointing to NULL."
  },
  {
    topic: 'DSA Aptitude', subtopic: 'Linked Lists', difficulty: 'Medium',
    companies: ['Tech Mahindra'], year: '2025',
    question: 'What is the structural trade-off of using a Doubly Linked List instead of a Singly Linked List?',
    options: ['A) Slower element access', 'B) Increased memory overhead per node', 'C) Restricted backward deletion', 'D) Loss of structural flexibility'],
    answer: 'B) Increased memory overhead per node',
    explanation: 'Each node in a doubly linked list must allocate extra pointer storage to house both the next and prev reference addresses.'
  },
  {
    topic: 'DSA Aptitude', subtopic: 'Linked Lists', difficulty: 'Medium',
    companies: ['Deloitte'], year: '2026',
    question: 'Which algorithm is commonly applied to safely identify cycles or loops inside a singly linked list architecture?',
    options: ["A) Kadane's Algorithm", "B) Floyd's Cycle-Finding (Tortoise and Hare)", "C) Dijkstra's Search", "D) Kruskal's Sorting"],
    answer: "B) Floyd's Cycle-Finding (Tortoise and Hare)",
    explanation: 'This technique moves two pointers at different speeds (one step vs. two steps). If a cycle exists, they will eventually meet.'
  },
  {
    topic: 'DSA Aptitude', subtopic: 'Linked Lists', difficulty: 'Easy',
    companies: ['LTIMindtree'], year: '2025',
    question: 'What is the time complexity to insert a new node at the beginning of a singly linked list when given only the head pointer?',
    options: ['A) O(1)', 'B) O(log n)', 'C) O(n)', 'D) O(1) or O(n) depending on elements'],
    answer: 'A) O(1)',
    explanation: "Inserting at the head requires updating the new node's pointer to point to the current head and moving the head pointer to the new node, which is a constant-time operation."
  },

  // 3. Stacks & Queues
  {
    topic: 'DSA Aptitude', subtopic: 'Stacks & Queues', difficulty: 'Easy',
    companies: ['TCS'], year: '2025',
    question: 'Which linear data structure enforces a First-In, First-Out (FIFO) access policy?',
    options: ['A) Stack', 'B) Queue', 'C) Binary Tree', 'D) Max-Heap'],
    answer: 'B) Queue',
    explanation: 'Queues process data entries on a first-come, first-served basis, inserting elements at the rear and removing them from the front.'
  },
  {
    topic: 'DSA Aptitude', subtopic: 'Stacks & Queues', difficulty: 'Medium',
    companies: ['Virtusa'], year: '2025',
    question: 'Which data structure can be used to convert any recursive algorithm into an iterative one?',
    options: ['A) Queue', 'B) Stack', 'C) Hash Map', 'D) Graph'],
    answer: 'B) Stack',
    explanation: 'Recursion relies on the system call stack. You can rewrite any recursive function iteratively by managing your own stack data structure explicitly.'
  },
  {
    topic: 'DSA Aptitude', subtopic: 'Stacks & Queues', difficulty: 'Medium',
    companies: ['Cognizant'], year: '2026',
    question: 'What is the minimum number of queues required to implement a single fully functional stack structure?',
    options: ['A) 1', 'B) 2', 'C) 3', 'D) 4'],
    answer: 'B) 2',
    explanation: 'Implementing a stack using queues requires two queues to manipulate data entry flow and simulate Last-In, First-Out (LIFO) behavior.'
  },
  {
    topic: 'DSA Aptitude', subtopic: 'Stacks & Queues', difficulty: 'Medium',
    companies: ['DXC Technology', 'DXC'], year: '2025',
    question: 'What data structure is used to evaluate an arithmetic expression written in postfix notation?',
    options: ['A) Queue', 'B) Tree', 'C) Stack', 'D) Graph'],
    answer: 'C) Stack',
    explanation: 'A stack processes operands in LIFO order, pushing incoming numbers and popping them whenever an operator is encountered.'
  },
  {
    topic: 'DSA Aptitude', subtopic: 'Stacks & Queues', difficulty: 'Medium',
    companies: ['Wipro'], year: '2025',
    question: 'In a circular queue implementation using an array of size N, what is the formula to calculate the next insertion position for the rear pointer?',
    options: ['A) rear + 1', 'B) (rear + 1) / N', 'C) (rear + 1) % N', 'D) rear % N'],
    answer: 'C) (rear + 1) % N',
    explanation: 'The modulo operator wraps the pointer back to index 0 when it increments past the final boundary of the array.'
  },

  // 4. Trees
  {
    topic: 'DSA Aptitude', subtopic: 'Trees', difficulty: 'Hard',
    companies: ['Infosys'], year: '2025',
    question: 'What is the maximum number of nodes possible in a binary tree of height h (where height of root is 0)?',
    options: ['A) 2^h', 'B) 2^(h+1)', 'C) 2^(h+1) - 1', 'D) 2^h - 1'],
    answer: 'C) 2^(h+1) - 1',
    explanation: 'A full binary tree of height h contains a maximum of 2^0 + 2^1 + ... + 2^h = 2^(h+1) - 1 nodes.'
  },
  {
    topic: 'DSA Aptitude', subtopic: 'Trees', difficulty: 'Medium',
    companies: ['Capgemini'], year: '2025',
    question: 'Which traversal of a Binary Search Tree (BST) visits nodes in ascending order?',
    options: ['A) Pre-order', 'B) Post-order', 'C) In-order', 'D) Level-order'],
    answer: 'C) In-order',
    explanation: 'An in-order traversal visits the left subtree, the root, and then the right subtree, which processes a BST\'s elements in sorted order.'
  },
  {
    topic: 'DSA Aptitude', subtopic: 'Trees', difficulty: 'Hard',
    companies: ['Accenture'], year: '2025',
    question: 'What is the maximum allowable balance factor difference between the left and right subtrees of any node in an AVL tree?',
    options: ['A) 0', 'B) 1', 'C) 2', 'D) 3'],
    answer: 'B) 1',
    explanation: 'AVL trees are self-balancing binary search trees that maintain a balance factor of -1, 0, or +1 at every node.'
  },
  {
    topic: 'DSA Aptitude', subtopic: 'Trees', difficulty: 'Medium',
    companies: ['Tech Mahindra'], year: '2026',
    question: 'What is the minimum number of structural links or edges inside a tree containing exactly N unique nodes?',
    options: ['A) N', 'B) N - 1', 'C) N + 1', 'D) log N'],
    answer: 'B) N - 1',
    explanation: 'By definition, a tree is a connected, acyclic graph. Any valid tree containing N nodes will have exactly N - 1 edges.'
  },
  {
    topic: 'DSA Aptitude', subtopic: 'Trees', difficulty: 'Easy',
    companies: ['HCL'], year: '2025',
    question: 'Which tree traversal visits the root node last, after exploring both its left and right child subtrees?',
    options: ['A) Pre-order', 'B) In-order', 'C) Post-order', 'D) Breadth-First'],
    answer: 'C) Post-order',
    explanation: 'Post-order traversal follows the sequence: Left Subtree → Right Subtree → Root Node.'
  },

  // 5. Graphs
  {
    topic: 'DSA Aptitude', subtopic: 'Graphs', difficulty: 'Medium',
    companies: ['TCS NQT', 'TCS'], year: '2025',
    question: 'Which graph representation method is most memory-efficient for storage when dealing with highly sparse graphs?',
    options: ['A) Adjacency Matrix', 'B) Adjacency List', 'C) Incidence Matrix', 'D) 2D Pointer Grid'],
    answer: 'B) Adjacency List',
    explanation: 'An adjacency list only stores existing edges, saving space compared to an adjacency matrix, which allocates an O(V²) grid regardless of edge count.'
  },
  {
    topic: 'DSA Aptitude', subtopic: 'Graphs', difficulty: 'Medium',
    companies: ['LTIMindtree'], year: '2025',
    question: 'What queue-based graph traversal technique is used to find the shortest path in an unweighted graph?',
    options: ['A) Depth-First Search (DFS)', 'B) Breadth-First Search (BFS)', 'C) Best-First Search', 'D) A* Algorithm'],
    answer: 'B) Breadth-First Search (BFS)',
    explanation: 'BFS explores nodes layer-by-layer, expanding outward from the starting vertex. This guarantees finding the shortest path in unweighted networks.'
  },
  {
    topic: 'DSA Aptitude', subtopic: 'Graphs', difficulty: 'Hard',
    companies: ['Cognizant'], year: '2025',
    question: 'Which algorithmic approach cannot correctly resolve shortest paths if the target graph has negative edge weights?',
    options: ['A) Bellman-Ford', "B) Dijkstra's Algorithm", 'C) Floyd-Warshall', "D) Prim's Algorithm"],
    answer: "B) Dijkstra's Algorithm",
    explanation: "Dijkstra's algorithm uses a greedy approach that assumes path lengths increase monotonically, which fails when negative edges are present."
  },
  {
    topic: 'DSA Aptitude', subtopic: 'Graphs', difficulty: 'Easy',
    companies: ['Wipro'], year: '2026',
    question: 'What property defines a directed graph that has no cycles?',
    options: ['A) Complete Graph', 'B) Bipartite Graph', 'C) Directed Acyclic Graph (DAG)', 'D) Connected Component'],
    answer: 'C) Directed Acyclic Graph (DAG)',
    explanation: 'A directed graph with clear edge orientations and no paths that loop back to a starting vertex is known as a DAG.'
  },
  {
    topic: 'DSA Aptitude', subtopic: 'Graphs', difficulty: 'Hard',
    companies: ['Deloitte'], year: '2025',
    question: 'Which sorting application finds a linear ordering of vertices in a DAG such that for every directed edge u -> v, vertex u comes before v?',
    options: ['A) Radix Sort', 'B) Topological Sort', "C) Kruskal's Sort", 'D) Quick Sort'],
    answer: 'B) Topological Sort',
    explanation: "Topological sorting orders a DAG's vertices linearly based on their directional dependencies, which is useful for task scheduling."
  },

  // 6. Dynamic Programming
  {
    topic: 'DSA Aptitude', subtopic: 'Dynamic Programming', difficulty: 'Medium',
    companies: ['Infosys'], year: '2025',
    question: 'What is the primary operational difference between Memoization and Tabulation strategies in Dynamic Programming?',
    options: ['A) Memoization is Top-Down; Tabulation is Bottom-Up', 'B) Memoization is Bottom-Up; Tabulation is Top-Down', 'C) Memoization uses loops; Tabulation uses recursion', 'D) Memoization avoids memory grids entirely'],
    answer: 'A) Memoization is Top-Down; Tabulation is Bottom-Up',
    explanation: 'Memoization extends a recursive top-down approach by caching function results. Tabulation builds a bottom-up table using iterative loops.'
  },
  {
    topic: 'DSA Aptitude', subtopic: 'Dynamic Programming', difficulty: 'Medium',
    companies: ['Accenture'], year: '2025',
    question: 'Which characteristic must a problem display to be eligible for an optimal solution using Dynamic Programming?',
    options: ['A) Linear constraints and strict sorting', 'B) Overlapping subproblems and optimal substructure', 'C) Exponential data growth limits', 'D) Greedy choice property'],
    answer: 'B) Overlapping subproblems and optimal substructure',
    explanation: 'DP works by combining optimal solutions to subproblems (optimal substructure) and caching results so repetitive sub-tasks aren\'t recomputed (overlapping subproblems).'
  },
  {
    topic: 'DSA Aptitude', subtopic: 'Dynamic Programming', difficulty: 'Hard',
    companies: ['Capgemini'], year: '2026',
    question: 'What is the worst-case time complexity to solve the 0/1 Knapsack Problem with N items and a maximum weight capacity of W using DP?',
    options: ['A) O(N)', 'B) O(W)', 'C) O(2^N)', 'D) O(N × W)'],
    answer: 'D) O(N × W)',
    explanation: 'The DP table tracks states for every item against every weight unit up to W, yielding a runtime complexity of O(N × W).'
  },
  {
    topic: 'DSA Aptitude', subtopic: 'Dynamic Programming', difficulty: 'Easy',
    companies: ['TCS'], year: '2025',
    question: 'What is the time complexity of finding the nth Fibonacci number when using an optimized Dynamic Programming approach?',
    options: ['A) O(1)', 'B) O(n)', 'C) O(n²)', 'D) O(2^n)'],
    answer: 'B) O(n)',
    explanation: 'Unlike the naive recursive approach that takes O(2^n) time, DP computes each Fibonacci state exactly once in linear time.'
  },
  {
    topic: 'DSA Aptitude', subtopic: 'Dynamic Programming', difficulty: 'Medium',
    companies: ['HCL'], year: '2025',
    question: 'Which problem cannot be solved using a greedy approach, requiring Dynamic Programming to guarantee an optimal solution?',
    options: ['A) Fractional Knapsack', 'B) Huffman Coding', 'C) 0/1 Knapsack', "D) Prim's MST"],
    answer: 'C) 0/1 Knapsack',
    explanation: 'The 0/1 Knapsack problem requires a binary choice (take an item or leave it), which can cause greedy strategies based on value-to-weight ratios to fail.'
  },

  // 7. Sorting
  {
    topic: 'DSA Aptitude', subtopic: 'Sorting', difficulty: 'Hard',
    companies: ['Cognizant'], year: '2025',
    question: 'Which sorting algorithm yields the best worst-case performance guarantee of O(n log n) using minimal extra space (O(1))?',
    options: ['A) Insertion Sort', 'B) Merge Sort', 'C) Quick Sort', 'D) Heap Sort'],
    answer: 'D) Heap Sort',
    explanation: 'Heap sort constructs a heap tree in place, guaranteeing a worst-case time complexity of O(n log n) without allocating the extra memory arrays required by Merge Sort.'
  },
  {
    topic: 'DSA Aptitude', subtopic: 'Sorting', difficulty: 'Medium',
    companies: ['Wipro'], year: '2025',
    question: 'What structural condition can degrade Quick Sort\'s performance to its worst-case runtime of O(n²)?',
    options: ['A) The input array elements are distributed randomly', 'B) The pivot is chosen to be the minimum or maximum element in an already sorted array', 'C) The array size is a power of two', 'D) The elements are all floating-point numbers'],
    answer: 'B) The pivot is chosen to be the minimum or maximum element in an already sorted array',
    explanation: 'Selecting an extreme element as the pivot creates highly unbalanced partitions, reducing the algorithm\'s performance to O(n²).'
  },
  {
    topic: 'DSA Aptitude', subtopic: 'Sorting', difficulty: 'Medium',
    companies: ['Tech Mahindra'], year: '2026',
    question: 'Which sorting algorithm is considered stable because it preserves the relative order of duplicate elements?',
    options: ['A) Quick Sort', 'B) Merge Sort', 'C) Heap Sort', 'D) Selection Sort'],
    answer: 'B) Merge Sort',
    explanation: 'Merge Sort maintains the original order of equal elements during its merge step, making it a stable sorting algorithm.'
  },
  {
    topic: 'DSA Aptitude', subtopic: 'Sorting', difficulty: 'Easy',
    companies: ['LTIMindtree'], year: '2025',
    question: 'Which sorting algorithm iteratively builds a sorted section by picking elements from an unsorted portion and placing them into their correct relative positions?',
    options: ['A) Bubble Sort', 'B) Insertion Sort', 'C) Selection Sort', 'D) Radix Sort'],
    answer: 'B) Insertion Sort',
    explanation: 'Insertion sort works similarly to sorting playing cards in your hand, shifting larger elements to insert a new item into its proper position.'
  },
  {
    topic: 'DSA Aptitude', subtopic: 'Sorting', difficulty: 'Easy',
    companies: ['DXC Technology', 'DXC'], year: '2025',
    question: 'What is the absolute best-case time complexity of an optimized Bubble Sort algorithm running on an already sorted array?',
    options: ['A) O(1)', 'B) O(n)', 'C) O(n log n)', 'D) O(n²)'],
    answer: 'B) O(n)',
    explanation: 'An optimized bubble sort can use a flag to stop early if a full pass completes without any swaps, reducing its best-case runtime to linear time.'
  },

  // 8. Searching
  {
    topic: 'DSA Aptitude', subtopic: 'Searching', difficulty: 'Easy',
    companies: ['TCS'], year: '2025',
    question: 'What prerequisite condition must be met before performing a Binary Search on an array?',
    options: ['A) The array size must be an even number', 'B) The array elements must be sorted', 'C) The array must not contain duplicate values', 'D) The array must be dynamically allocated'],
    answer: 'B) The array elements must be sorted',
    explanation: 'Binary search works by comparing the target value to the middle element and discarding half the search space, which requires the array to be sorted.'
  },
  {
    topic: 'DSA Aptitude', subtopic: 'Searching', difficulty: 'Medium',
    companies: ['Infosys'], year: '2025',
    question: 'How many comparisons are required in the worst-case scenario to find an element in an array of size 64 using Binary Search?',
    options: ['A) 6', 'B) 7', 'C) 32', 'D) 64'],
    answer: 'B) 7',
    explanation: 'The worst-case comparison count is ⌊log₂ n⌋ + 1. For n = 64, log₂ 64 = 6, so 6 + 1 = 7 comparisons.'
  },
  {
    topic: 'DSA Aptitude', subtopic: 'Searching', difficulty: 'Hard',
    companies: ['Accenture'], year: '2026',
    question: 'Which search algorithm calculates a dynamic probe position based on the numerical value of the target key, outperforming binary search on uniformly distributed sorted arrays?',
    options: ['A) Linear Search', 'B) Interpolation Search', 'C) Ternary Search', 'D) Exponential Search'],
    answer: 'B) Interpolation Search',
    explanation: 'Interpolation search uses a mathematical formula to estimate the target\'s position, achieving an average time complexity of O(log (log n)) on uniformly distributed data.'
  },
  {
    topic: 'DSA Aptitude', subtopic: 'Searching', difficulty: 'Easy',
    companies: ['Capgemini'], year: '2025',
    question: 'What is the worst-case time complexity of searching for a value inside an un-indexed Linear Search array setup?',
    options: ['A) O(1)', 'B) O(log n)', 'C) O(n)', 'D) O(n²)'],
    answer: 'C) O(n)',
    explanation: 'In the worst-case scenario, a linear search must inspect every element from the first to the last position, taking O(n) time.'
  },
  {
    topic: 'DSA Aptitude', subtopic: 'Searching', difficulty: 'Medium',
    companies: ['Deloitte'], year: '2025',
    question: 'If you divide an array into three equal parts instead of two during a search, what is this algorithm called?',
    options: ['A) Binary Search', 'B) Ternary Search', 'C) Cubic Search', 'D) Fibonacci Search'],
    answer: 'B) Ternary Search',
    explanation: 'Ternary search uses two midpoints to divide the search space into three equal parts, resulting in a logarithmic time complexity with a base of 3.'
  },

  // 9. Recursion
  {
    topic: 'DSA Aptitude', subtopic: 'Recursion', difficulty: 'Easy',
    companies: ['Wipro'], year: '2025',
    question: 'What runtime exception happens if a recursive function lacks a valid base case or fails to reach it?',
    options: ['A) NullPointerException', 'B) StackOverflowError', 'C) OutOfMemoryError', 'D) ArithmeticException'],
    answer: 'B) StackOverflowError',
    explanation: 'Infinite recursion exhausts the memory allocated for the system call stack, triggering a stack overflow error.'
  },
  {
    topic: 'DSA Aptitude', subtopic: 'Recursion', difficulty: 'Medium',
    companies: ['Cognizant'], year: '2025',
    question: 'What is a recursive function called when the recursive call is the last statement executed in the function?',
    options: ['A) Head Recursion', 'B) Tail Recursion', 'C) Linear Recursion', 'D) Nested Recursion'],
    answer: 'B) Tail Recursion',
    explanation: 'Tail recursion allows compilers to optimize performance by reusing the current stack frame instead of allocating a new one.'
  },
  {
    topic: 'DSA Aptitude', subtopic: 'Recursion', difficulty: 'Hard',
    companies: ['Tech Mahindra'], year: '2025',
    question: 'What is the recurrence relation for the classic Tower of Hanoi problem with n disks?',
    options: ['A) T(n) = T(n-1) + 1', 'B) T(n) = 2T(n-1) + 1', 'C) T(n) = T(n/2) + 1', 'D) T(n) = 2T(n/2) + n'],
    answer: 'B) T(n) = 2T(n-1) + 1',
    explanation: 'Moving n disks requires moving n-1 disks to an auxiliary rod, moving the largest disk once, and then moving the n-1 disks to the destination rod, which translates to T(n) = 2T(n-1) + 1.'
  },
  {
    topic: 'DSA Aptitude', subtopic: 'Recursion', difficulty: 'Medium',
    companies: ['HCL'], year: '2026',
    question: 'How much space does a recursive function take on the system stack if it has a recursion depth of n?',
    options: ['A) O(1)', 'B) O(log n)', 'C) O(n)', 'D) O(n²)'],
    answer: 'C) O(n)',
    explanation: 'Each active recursive call pushes a new frame onto the stack, resulting in a memory footprint that scales linearly with the recursion depth.'
  },
  {
    topic: 'DSA Aptitude', subtopic: 'Recursion', difficulty: 'Medium',
    companies: ['LTIMindtree'], year: '2025',
    question: 'What is the value returned by the function call solve(3)?\nint solve(int n) {\n    if (n <= 1) return 1;\n    return n + solve(n - 1);\n}',
    options: ['A) 3', 'B) 4', 'C) 6', 'D) 7'],
    answer: 'C) 6',
    explanation: 'Tracing the execution path: solve(3) returns 3 + solve(2). solve(2) returns 2 + solve(1). solve(1) returns 1. Combining these values gives 3 + 2 + 1 = 6.'
  },

  // 10. Hashing
  {
    topic: 'DSA Aptitude', subtopic: 'Hashing', difficulty: 'Easy',
    companies: ['TCS'], year: '2025',
    question: 'What is a collision in a hash table?',
    options: ['A) The hash table runs out of memory slots', 'B) Two different keys produce the exact same index from the hash function', 'C) A key matches multiple values simultaneously', 'D) The hash function returns an out-of-bounds index'],
    answer: 'B) Two different keys produce the exact same index from the hash function',
    explanation: 'A collision happens when a hash function maps two distinct keys to the same storage index in the array.'
  },
  {
    topic: 'DSA Aptitude', subtopic: 'Hashing', difficulty: 'Medium',
    companies: ['Infosys'], year: '2026',
    question: 'Which collision resolution technique stores colliding elements in a linked list attached to the corresponding hash bucket?',
    options: ['A) Linear Probing', 'B) Quadratic Probing', 'C) Chaining (Open Chaining)', 'D) Double Hashing'],
    answer: 'C) Chaining (Open Chaining)',
    explanation: 'Chaining handles collisions by linking items that share the same hash index into a separate list structure.'
  },
  {
    topic: 'DSA Aptitude', subtopic: 'Hashing', difficulty: 'Easy',
    companies: ['Accenture'], year: '2025',
    question: 'What is the average-case time complexity to look up an element in a well-distributed hash table?',
    options: ['A) O(1)', 'B) O(log n)', 'C) O(n)', 'D) O(n log n)'],
    answer: 'A) O(1)',
    explanation: 'A well-designed hash table maps keys to their indices directly, allowing operations to execute in constant time on average.'
  },
  {
    topic: 'DSA Aptitude', subtopic: 'Hashing', difficulty: 'Medium',
    companies: ['Capgemini'], year: '2025',
    question: 'What collision resolution strategy looks for the next available empty slot in the array sequentially when an index is occupied?',
    options: ['A) Chaining', 'B) Linear Probing', 'C) Quadratic Probing', 'D) Double Hashing'],
    answer: 'B) Linear Probing',
    explanation: 'Linear probing is an open-addressing technique that steps through the array sequentially (i+1, i+2, ...) to find the next open position.'
  },
  {
    topic: 'DSA Aptitude', subtopic: 'Hashing', difficulty: 'Medium',
    companies: ['Deloitte'], year: '2026',
    question: 'What metric determines when a hash table should be resized and rehashed to maintain optimal performance?',
    options: ['A) Hash Index', 'B) Load Factor', 'C) Collision Array Count', 'D) Matrix Scale Value'],
    answer: 'B) Load Factor',
    explanation: 'The load factor is calculated as (Number of occupied slots) / (Total table capacity). When it crosses a certain threshold (e.g., 0.75), the table expands to prevent performance drops from increased collisions.'
  }
];

async function seedDSA() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) { console.error('❌ MONGO_URI not set'); process.exit(1); }
  await mongoose.connect(uri);
  console.log('✅ Connected to MongoDB');

  let inserted = 0, skipped = 0;
  for (const q of dsaQuestions) {
    const existing = await AptitudeQuestion.findOne({
      question: { $regex: new RegExp(q.question.slice(0, 50).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }
    });
    if (existing) {
      skipped++;
    } else {
      await AptitudeQuestion.create({
        ...q,
        source: 'DSA-SPEC'
      });
      inserted++;
    }
  }

  const count = await AptitudeQuestion.countDocuments({ topic: 'DSA Aptitude' });
  console.log(`✅ DSA Seeding Complete: Inserted=${inserted}, Skipped=${skipped}, Total DSA Questions=${count}`);
  await mongoose.disconnect();
}

seedDSA().catch(e => { console.error('❌ Error seeding DSA:', e.message); process.exit(1); });
