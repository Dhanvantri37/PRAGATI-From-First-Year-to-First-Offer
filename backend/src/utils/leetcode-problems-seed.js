/**
 * PRAGATI — Real LeetCode Problems Seed (75 Problems)
 * Run: node src/utils/leetcode-problems-seed.js
 *
 * MongoDB connection priority:
 *   1. MONGODB_URI env var (set in .env or docker-compose)
 *   2. MONGO_USER + MONGO_PASS env vars → builds URI automatically
 *   3. localhost fallback (no auth) for local dev
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');

// ── Smart connection builder ───────────────────────────────────────────────
function buildMongoURI() {
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI;
  const user = process.env.MONGO_USER || 'pragati';
  const pass = process.env.MONGO_PASS || 'pragati_secret';
  const host = process.env.MONGO_HOST || 'localhost';
  const port = process.env.MONGO_PORT || '27017';
  const db   = process.env.MONGO_DB   || 'pragati';
  if (user && pass) {
    return `mongodb://${user}:${pass}@${host}:${port}/${db}?authSource=admin`;
  }
  return `mongodb://${host}:${port}/${db}`;
}

// ── Dynamic schema (avoids requiring full models/index.js with all deps) ────
const problemSchema = new mongoose.Schema({
  title: String, source: String, problemId: String, url: String,
  difficulty: String, topic: String, tags: [String],
  description: String, constraints: String, companies: [String],
  assignedDate: { type: Date, default: Date.now },
}, { timestamps: true });

// Use existing model if already registered (safe for re-runs)
const Problem = mongoose.models.Problem || mongoose.model('Problem', problemSchema);

// ── Problem data ──────────────────────────────────────────────────────────
const LEETCODE_PROBLEMS = [
  // ARRAYS
  { title:'Two Sum', source:'LeetCode', problemId:'1', url:'https://leetcode.com/problems/two-sum/', difficulty:'Easy', topic:'Arrays', tags:['Hash Table','Array'], description:'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.', constraints:'2 ≤ nums.length ≤ 10⁴; -10⁹ ≤ nums[i] ≤ 10⁹', companies:['Google','Amazon','Facebook','Microsoft','Adobe'] },
  { title:'Best Time to Buy and Sell Stock', source:'LeetCode', problemId:'121', url:'https://leetcode.com/problems/best-time-to-buy-and-sell-stock/', difficulty:'Easy', topic:'Arrays', tags:['Array','Dynamic Programming','Greedy'], description:'Find the maximum profit from one stock transaction.', constraints:'1 ≤ prices.length ≤ 10⁵; 0 ≤ prices[i] ≤ 10⁴', companies:['Amazon','Facebook','Microsoft','Goldman Sachs','TCS'] },
  { title:'Contains Duplicate', source:'LeetCode', problemId:'217', url:'https://leetcode.com/problems/contains-duplicate/', difficulty:'Easy', topic:'Arrays', tags:['Array','Hash Table','Sorting'], description:'Return true if any value appears at least twice in the array.', constraints:'1 ≤ nums.length ≤ 10⁵', companies:['Amazon','Yahoo','Adobe'] },
  { title:'Product of Array Except Self', source:'LeetCode', problemId:'238', url:'https://leetcode.com/problems/product-of-array-except-self/', difficulty:'Medium', topic:'Arrays', tags:['Array','Prefix Sum'], description:'Return array where answer[i] is product of all elements except nums[i]. O(n) without division.', constraints:'2 ≤ nums.length ≤ 10⁵', companies:['Amazon','Facebook','Microsoft','Apple'] },
  { title:'Maximum Subarray', source:'LeetCode', problemId:'53', url:'https://leetcode.com/problems/maximum-subarray/', difficulty:'Medium', topic:'Arrays', tags:['Array','Dynamic Programming'], description:'Find the subarray with the largest sum. (Kadane\'s Algorithm)', constraints:'1 ≤ nums.length ≤ 10⁵; -10⁴ ≤ nums[i] ≤ 10⁴', companies:['LinkedIn','Apple','Amazon','Accenture','Infosys'] },
  { title:'3Sum', source:'LeetCode', problemId:'15', url:'https://leetcode.com/problems/3sum/', difficulty:'Medium', topic:'Arrays', tags:['Array','Two Pointers','Sorting'], description:'Return all unique triplets that sum to zero.', constraints:'3 ≤ nums.length ≤ 3000; -10⁵ ≤ nums[i] ≤ 10⁵', companies:['Amazon','Facebook','Adobe','Bloomberg','TCS Digital'] },
  { title:'Container With Most Water', source:'LeetCode', problemId:'11', url:'https://leetcode.com/problems/container-with-most-water/', difficulty:'Medium', topic:'Arrays', tags:['Array','Two Pointers','Greedy'], description:'Find two lines that form a container with the most water.', constraints:'n == height.length; 2 ≤ n ≤ 10⁵', companies:['Google','Amazon','Uber','Flipkart'] },
  { title:'Merge Intervals', source:'LeetCode', problemId:'56', url:'https://leetcode.com/problems/merge-intervals/', difficulty:'Medium', topic:'Arrays', tags:['Array','Sorting'], description:'Merge all overlapping intervals.', constraints:'1 ≤ intervals.length ≤ 10⁴', companies:['LinkedIn','Google','Facebook','Microsoft','Amazon'] },
  { title:'Trapping Rain Water', source:'LeetCode', problemId:'42', url:'https://leetcode.com/problems/trapping-rain-water/', difficulty:'Hard', topic:'Arrays', tags:['Array','Two Pointers','Dynamic Programming','Stack'], description:'Compute how much water can be trapped after raining.', constraints:'n == height.length; 1 ≤ n ≤ 2×10⁴', companies:['Amazon','Facebook','Google','Uber','TCS Digital','Flipkart'] },
  { title:'Rotate Array', source:'LeetCode', problemId:'189', url:'https://leetcode.com/problems/rotate-array/', difficulty:'Medium', topic:'Arrays', tags:['Array','Two Pointers','Math'], description:'Rotate the array to the right by k steps.', constraints:'1 ≤ nums.length ≤ 10⁵; 0 ≤ k ≤ 10⁵', companies:['Microsoft','Amazon','Bloomberg','Infosys','Wipro'] },
  { title:'Sort Colors', source:'LeetCode', problemId:'75', url:'https://leetcode.com/problems/sort-colors/', difficulty:'Medium', topic:'Arrays', tags:['Array','Two Pointers','Sorting'], description:'Sort array of 0s, 1s, 2s in-place. Dutch National Flag algorithm.', constraints:'n == nums.length; 1 ≤ n ≤ 300', companies:['Microsoft','Amazon','Adobe','Qualcomm'] },
  { title:'Move Zeroes', source:'LeetCode', problemId:'283', url:'https://leetcode.com/problems/move-zeroes/', difficulty:'Easy', topic:'Arrays', tags:['Array','Two Pointers'], description:'Move all 0s to end while maintaining relative order of non-zeros.', constraints:'1 ≤ nums.length ≤ 10⁴', companies:['Facebook','Apple','Adobe','Wipro'] },
  { title:'Majority Element', source:'LeetCode', problemId:'169', url:'https://leetcode.com/problems/majority-element/', difficulty:'Easy', topic:'Arrays', tags:['Array','Hash Table','Sorting','Divide and Conquer'], description:'Return element appearing more than ⌊n/2⌋ times. Boyer-Moore algorithm.', constraints:'n == nums.length; 1 ≤ n ≤ 5×10⁴', companies:['Amazon','Adobe','Microsoft','Infosys'] },
  { title:'Find Minimum in Rotated Sorted Array', source:'LeetCode', problemId:'153', url:'https://leetcode.com/problems/find-minimum-in-rotated-sorted-array/', difficulty:'Medium', topic:'Arrays', tags:['Array','Binary Search'], description:'Find minimum element in rotated sorted array in O(log n).', constraints:'n == nums.length; 1 ≤ n ≤ 5000', companies:['Microsoft','Amazon','Adobe','Flipkart'] },
  { title:'Search in Rotated Sorted Array', source:'LeetCode', problemId:'33', url:'https://leetcode.com/problems/search-in-rotated-sorted-array/', difficulty:'Medium', topic:'Arrays', tags:['Array','Binary Search'], description:'Search target in rotated sorted array in O(log n).', constraints:'1 ≤ nums.length ≤ 5000', companies:['Facebook','Amazon','Microsoft','Bloomberg'] },
  { title:'Spiral Matrix', source:'LeetCode', problemId:'54', url:'https://leetcode.com/problems/spiral-matrix/', difficulty:'Medium', topic:'Arrays', tags:['Array','Matrix','Simulation'], description:'Return all elements of matrix in spiral order.', constraints:'1 ≤ m, n ≤ 10', companies:['Microsoft','Amazon','Samsung','Adobe','Infosys'] },

  // STRINGS
  { title:'Valid Anagram', source:'LeetCode', problemId:'242', url:'https://leetcode.com/problems/valid-anagram/', difficulty:'Easy', topic:'Strings', tags:['Hash Table','String','Sorting'], description:'Return true if t is an anagram of s.', constraints:'1 ≤ s.length, t.length ≤ 5×10⁴', companies:['Amazon','Bloomberg','Microsoft','Snapchat','TCS'] },
  { title:'Valid Palindrome', source:'LeetCode', problemId:'125', url:'https://leetcode.com/problems/valid-palindrome/', difficulty:'Easy', topic:'Strings', tags:['Two Pointers','String'], description:'Check if string is palindrome after removing non-alphanumeric chars.', constraints:'1 ≤ s.length ≤ 2×10⁵', companies:['Facebook','Microsoft','Apple','Uber','Wipro'] },
  { title:'Longest Substring Without Repeating Characters', source:'LeetCode', problemId:'3', url:'https://leetcode.com/problems/longest-substring-without-repeating-characters/', difficulty:'Medium', topic:'Strings', tags:['Hash Table','String','Sliding Window'], description:'Find length of longest substring without duplicate characters.', constraints:'0 ≤ s.length ≤ 5×10⁴', companies:['Amazon','Bloomberg','Google','Facebook','Infosys','TCS'] },
  { title:'Group Anagrams', source:'LeetCode', problemId:'49', url:'https://leetcode.com/problems/group-anagrams/', difficulty:'Medium', topic:'Strings', tags:['Array','Hash Table','String','Sorting'], description:'Group the anagrams together from the input array of strings.', constraints:'1 ≤ strs.length ≤ 10⁴', companies:['Amazon','Facebook','Google','Uber','Flipkart'] },
  { title:'Longest Palindromic Substring', source:'LeetCode', problemId:'5', url:'https://leetcode.com/problems/longest-palindromic-substring/', difficulty:'Medium', topic:'Strings', tags:['String','Dynamic Programming'], description:'Return the longest palindromic substring.', constraints:'1 ≤ s.length ≤ 1000', companies:['Amazon','Microsoft','Qualcomm','Adobe','Accenture'] },
  { title:'Minimum Window Substring', source:'LeetCode', problemId:'76', url:'https://leetcode.com/problems/minimum-window-substring/', difficulty:'Hard', topic:'Strings', tags:['Hash Table','String','Sliding Window'], description:'Find minimum window in s that contains all characters in t.', constraints:'1 ≤ m, n ≤ 10⁵', companies:['Facebook','Amazon','LinkedIn','Uber','Snapchat'] },
  { title:'String to Integer (atoi)', source:'LeetCode', problemId:'8', url:'https://leetcode.com/problems/string-to-integer-atoi/', difficulty:'Medium', topic:'Strings', tags:['String'], description:'Convert string to 32-bit signed integer handling all edge cases.', constraints:'0 ≤ s.length ≤ 200', companies:['Amazon','Bloomberg','Microsoft','Apple','TCS'] },

  // LINKED LIST
  { title:'Reverse Linked List', source:'LeetCode', problemId:'206', url:'https://leetcode.com/problems/reverse-linked-list/', difficulty:'Easy', topic:'Linked List', tags:['Linked List','Recursion'], description:'Reverse a singly linked list iteratively and recursively.', constraints:'The number of nodes in [0, 5000]; -5000 ≤ Node.val ≤ 5000', companies:['Amazon','Microsoft','Facebook','Apple','Adobe','Wipro','TCS'] },
  { title:'Merge Two Sorted Lists', source:'LeetCode', problemId:'21', url:'https://leetcode.com/problems/merge-two-sorted-lists/', difficulty:'Easy', topic:'Linked List', tags:['Linked List','Recursion'], description:'Merge two sorted linked lists into one sorted list.', constraints:'Number of nodes in both lists in [0, 50]', companies:['Amazon','Microsoft','Adobe','Facebook','Infosys'] },
  { title:'Linked List Cycle', source:'LeetCode', problemId:'141', url:'https://leetcode.com/problems/linked-list-cycle/', difficulty:'Easy', topic:'Linked List', tags:['Hash Table','Linked List','Two Pointers'], description:'Detect if linked list has a cycle. Floyd\'s Tortoise and Hare.', constraints:'Number of nodes in [0, 10⁴]', companies:['Amazon','Bloomberg','Microsoft','Apple','Wipro','TCS'] },
  { title:'Remove Nth Node From End of List', source:'LeetCode', problemId:'19', url:'https://leetcode.com/problems/remove-nth-node-from-end-of-list/', difficulty:'Medium', topic:'Linked List', tags:['Linked List','Two Pointers'], description:'Remove nth node from end of list in one pass.', constraints:'1 ≤ sz ≤ 30; 1 ≤ n ≤ sz', companies:['Facebook','Amazon','Microsoft','Bloomberg'] },
  { title:'LRU Cache', source:'LeetCode', problemId:'146', url:'https://leetcode.com/problems/lru-cache/', difficulty:'Medium', topic:'Linked List', tags:['Hash Table','Linked List','Design','Doubly-Linked List'], description:'Design LRU cache with O(1) get and put operations.', constraints:'1 ≤ capacity ≤ 3000; at most 2×10⁵ calls', companies:['Amazon','Google','Facebook','Microsoft','Uber'] },
  { title:'Merge K Sorted Lists', source:'LeetCode', problemId:'23', url:'https://leetcode.com/problems/merge-k-sorted-lists/', difficulty:'Hard', topic:'Linked List', tags:['Linked List','Divide and Conquer','Heap (Priority Queue)','Merge Sort'], description:'Merge k sorted linked lists into one sorted list.', constraints:'k == lists.length; 0 ≤ k ≤ 10⁴', companies:['Google','Amazon','Facebook','Microsoft','Uber','TCS Digital'] },

  // TREES
  { title:'Invert Binary Tree', source:'LeetCode', problemId:'226', url:'https://leetcode.com/problems/invert-binary-tree/', difficulty:'Easy', topic:'Trees', tags:['Tree','DFS','BFS','Binary Tree'], description:'Invert a binary tree and return its root.', constraints:'Number of nodes in [0, 100]', companies:['Google','Amazon','Microsoft','Facebook','Infosys'] },
  { title:'Maximum Depth of Binary Tree', source:'LeetCode', problemId:'104', url:'https://leetcode.com/problems/maximum-depth-of-binary-tree/', difficulty:'Easy', topic:'Trees', tags:['Tree','DFS','BFS','Binary Tree'], description:'Return maximum depth of binary tree.', constraints:'Number of nodes in [0, 10⁴]', companies:['LinkedIn','Amazon','Apple','Yahoo','Wipro','TCS'] },
  { title:'Symmetric Tree', source:'LeetCode', problemId:'101', url:'https://leetcode.com/problems/symmetric-tree/', difficulty:'Easy', topic:'Trees', tags:['Tree','DFS','BFS','Binary Tree'], description:'Check if binary tree is symmetric around its center.', constraints:'Number of nodes in [1, 1000]', companies:['LinkedIn','Microsoft','Amazon','Bloomberg'] },
  { title:'Binary Tree Level Order Traversal', source:'LeetCode', problemId:'102', url:'https://leetcode.com/problems/binary-tree-level-order-traversal/', difficulty:'Medium', topic:'Trees', tags:['Tree','BFS','Binary Tree'], description:'Return level order traversal of binary tree nodes.', constraints:'Number of nodes in [0, 2000]', companies:['Amazon','Facebook','Microsoft','Bloomberg','Oracle','Infosys'] },
  { title:'Validate Binary Search Tree', source:'LeetCode', problemId:'98', url:'https://leetcode.com/problems/validate-binary-search-tree/', difficulty:'Medium', topic:'Trees', tags:['Tree','DFS','Binary Search Tree','Binary Tree'], description:'Determine if binary tree is a valid BST.', constraints:'Number of nodes in [1, 10⁴]', companies:['Amazon','Bloomberg','Facebook','Microsoft','Adobe'] },
  { title:'Kth Smallest Element in a BST', source:'LeetCode', problemId:'230', url:'https://leetcode.com/problems/kth-smallest-element-in-a-bst/', difficulty:'Medium', topic:'Trees', tags:['Tree','DFS','Binary Search Tree','Binary Tree'], description:'Return kth smallest value in BST.', constraints:'1 ≤ k ≤ n ≤ 10⁴', companies:['Amazon','Bloomberg','Google','Microsoft','Flipkart'] },
  { title:'Lowest Common Ancestor of BST', source:'LeetCode', problemId:'235', url:'https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-search-tree/', difficulty:'Medium', topic:'Trees', tags:['Tree','DFS','Binary Search Tree','Binary Tree'], description:'Find lowest common ancestor of two nodes in BST.', constraints:'Number of nodes in [2, 10⁵]', companies:['Amazon','Facebook','Microsoft','LinkedIn','Adobe'] },
  { title:'Binary Tree Maximum Path Sum', source:'LeetCode', problemId:'124', url:'https://leetcode.com/problems/binary-tree-maximum-path-sum/', difficulty:'Hard', topic:'Trees', tags:['Dynamic Programming','Tree','DFS','Binary Tree'], description:'Return maximum path sum in binary tree.', constraints:'Number of nodes in [1, 3×10⁴]; -1000 ≤ Node.val ≤ 1000', companies:['Amazon','Facebook','Google','Microsoft'] },
  { title:'Serialize and Deserialize Binary Tree', source:'LeetCode', problemId:'297', url:'https://leetcode.com/problems/serialize-and-deserialize-binary-tree/', difficulty:'Hard', topic:'Trees', tags:['String','Tree','DFS','BFS','Design','Binary Tree'], description:'Design algorithm to serialize and deserialize a binary tree.', constraints:'Number of nodes in [0, 10⁴]', companies:['Facebook','Amazon','Google','Microsoft','LinkedIn'] },

  // DYNAMIC PROGRAMMING
  { title:'Climbing Stairs', source:'LeetCode', problemId:'70', url:'https://leetcode.com/problems/climbing-stairs/', difficulty:'Easy', topic:'Dynamic Programming', tags:['Math','Dynamic Programming','Memoization'], description:'Count distinct ways to climb n stairs taking 1 or 2 steps.', constraints:'1 ≤ n ≤ 45', companies:['Amazon','Adobe','Apple','Uber','Accenture','TCS'] },
  { title:'House Robber', source:'LeetCode', problemId:'198', url:'https://leetcode.com/problems/house-robber/', difficulty:'Medium', topic:'Dynamic Programming', tags:['Array','Dynamic Programming'], description:'Find maximum money to rob without robbing adjacent houses.', constraints:'1 ≤ nums.length ≤ 100; 0 ≤ nums[i] ≤ 400', companies:['Amazon','Microsoft','Adobe','Uber','Flipkart'] },
  { title:'Coin Change', source:'LeetCode', problemId:'322', url:'https://leetcode.com/problems/coin-change/', difficulty:'Medium', topic:'Dynamic Programming', tags:['Array','Dynamic Programming','BFS'], description:'Return fewest number of coins needed to make amount.', constraints:'1 ≤ coins.length ≤ 12; 0 ≤ amount ≤ 10⁴', companies:['Amazon','Microsoft','Google','Goldman Sachs','Flipkart'] },
  { title:'Longest Increasing Subsequence', source:'LeetCode', problemId:'300', url:'https://leetcode.com/problems/longest-increasing-subsequence/', difficulty:'Medium', topic:'Dynamic Programming', tags:['Array','Binary Search','Dynamic Programming'], description:'Return length of longest strictly increasing subsequence.', constraints:'1 ≤ nums.length ≤ 2500', companies:['Amazon','Microsoft','Google','Adobe','TCS Digital'] },
  { title:'Unique Paths', source:'LeetCode', problemId:'62', url:'https://leetcode.com/problems/unique-paths/', difficulty:'Medium', topic:'Dynamic Programming', tags:['Math','Dynamic Programming','Combinatorics'], description:'Count unique paths from top-left to bottom-right of m×n grid.', constraints:'1 ≤ m, n ≤ 100', companies:['Amazon','Bloomberg','Accenture','Adobe','Infosys'] },
  { title:'Jump Game', source:'LeetCode', problemId:'55', url:'https://leetcode.com/problems/jump-game/', difficulty:'Medium', topic:'Dynamic Programming', tags:['Array','Dynamic Programming','Greedy'], description:'Determine if you can reach the last index from the first.', constraints:'1 ≤ nums.length ≤ 10⁴', companies:['Amazon','Microsoft','Bloomberg','Adobe'] },
  { title:'Word Break', source:'LeetCode', problemId:'139', url:'https://leetcode.com/problems/word-break/', difficulty:'Medium', topic:'Dynamic Programming', tags:['Array','Hash Table','String','Dynamic Programming','Trie'], description:'Determine if string can be segmented using dictionary words.', constraints:'1 ≤ s.length ≤ 300; 1 ≤ wordDict.length ≤ 1000', companies:['Amazon','Bloomberg','Facebook','Google','Microsoft','Uber'] },
  { title:'Edit Distance', source:'LeetCode', problemId:'72', url:'https://leetcode.com/problems/edit-distance/', difficulty:'Hard', topic:'Dynamic Programming', tags:['String','Dynamic Programming'], description:'Minimum operations to convert word1 to word2 (insert/delete/replace).', constraints:'0 ≤ word1.length, word2.length ≤ 500', companies:['Google','Facebook','Amazon','Microsoft','Uber'] },
  { title:'Longest Common Subsequence', source:'LeetCode', problemId:'1143', url:'https://leetcode.com/problems/longest-common-subsequence/', difficulty:'Medium', topic:'Dynamic Programming', tags:['String','Dynamic Programming'], description:'Return length of longest common subsequence of two strings.', constraints:'1 ≤ text1.length, text2.length ≤ 1000', companies:['Amazon','Google','Microsoft','Bloomberg','Adobe'] },
  { title:'0/1 Knapsack (Partition Equal Subset Sum)', source:'LeetCode', problemId:'416', url:'https://leetcode.com/problems/partition-equal-subset-sum/', difficulty:'Medium', topic:'Dynamic Programming', tags:['Array','Dynamic Programming'], description:'Partition array into two equal-sum subsets. Classic 0/1 Knapsack.', constraints:'1 ≤ nums.length ≤ 200; 1 ≤ nums[i] ≤ 100', companies:['Amazon','Microsoft','Facebook','Goldman Sachs','Infosys'] },

  // GRAPHS
  { title:'Number of Islands', source:'LeetCode', problemId:'200', url:'https://leetcode.com/problems/number-of-islands/', difficulty:'Medium', topic:'Graphs', tags:['Array','DFS','BFS','Union Find','Matrix'], description:'Count number of islands in 2D binary grid using DFS/BFS.', constraints:'1 ≤ m, n ≤ 300', companies:['Amazon','Facebook','Google','Microsoft','Bloomberg','Flipkart'] },
  { title:'Clone Graph', source:'LeetCode', problemId:'133', url:'https://leetcode.com/problems/clone-graph/', difficulty:'Medium', topic:'Graphs', tags:['Hash Table','DFS','BFS','Graph'], description:'Return deep copy (clone) of a connected undirected graph.', constraints:'1 ≤ n ≤ 100; Node.val unique', companies:['Facebook','Amazon','Google'] },
  { title:'Course Schedule', source:'LeetCode', problemId:'207', url:'https://leetcode.com/problems/course-schedule/', difficulty:'Medium', topic:'Graphs', tags:['DFS','BFS','Graph','Topological Sort'], description:'Detect cycle in directed graph to determine if courses can be finished.', constraints:'1 ≤ numCourses ≤ 2000; 0 ≤ prerequisites.length ≤ 5000', companies:['Amazon','Facebook','Google','Microsoft','Ola','Swiggy'] },
  { title:'Word Ladder', source:'LeetCode', problemId:'127', url:'https://leetcode.com/problems/word-ladder/', difficulty:'Hard', topic:'Graphs', tags:['Hash Table','String','BFS'], description:'Return shortest transformation sequence length from beginWord to endWord.', constraints:'1 ≤ beginWord.length ≤ 10; 1 ≤ wordList.length ≤ 5000', companies:['Amazon','Facebook','LinkedIn','Microsoft','Google','Uber'] },
  { title:'Pacific Atlantic Water Flow', source:'LeetCode', problemId:'417', url:'https://leetcode.com/problems/pacific-atlantic-water-flow/', difficulty:'Medium', topic:'Graphs', tags:['Array','DFS','BFS','Matrix'], description:'Return cells from which water can flow to both oceans.', constraints:'1 ≤ m, n ≤ 200', companies:['Google','Amazon'] },

  // BINARY SEARCH
  { title:'Binary Search', source:'LeetCode', problemId:'704', url:'https://leetcode.com/problems/binary-search/', difficulty:'Easy', topic:'Binary Search', tags:['Array','Binary Search'], description:'Search target in sorted array. Return index or -1.', constraints:'1 ≤ nums.length ≤ 10⁴; sorted ascending', companies:['Microsoft','Amazon','Adobe','Wipro','TCS'] },
  { title:'Search a 2D Matrix', source:'LeetCode', problemId:'74', url:'https://leetcode.com/problems/search-a-2d-matrix/', difficulty:'Medium', topic:'Binary Search', tags:['Array','Binary Search','Matrix'], description:'Search target in sorted matrix in O(log(m*n)).', constraints:'1 ≤ m, n ≤ 100', companies:['Microsoft','Amazon','Adobe','Qualcomm'] },
  { title:'Find Peak Element', source:'LeetCode', problemId:'162', url:'https://leetcode.com/problems/find-peak-element/', difficulty:'Medium', topic:'Binary Search', tags:['Array','Binary Search'], description:'Find peak element index in O(log n).', constraints:'1 ≤ nums.length ≤ 1000', companies:['Google','Facebook','Microsoft','Amazon'] },
  { title:'Koko Eating Bananas', source:'LeetCode', problemId:'875', url:'https://leetcode.com/problems/koko-eating-bananas/', difficulty:'Medium', topic:'Binary Search', tags:['Array','Binary Search'], description:'Find minimum eating speed to finish all bananas within h hours.', constraints:'1 ≤ piles.length ≤ 10⁴; piles.length ≤ h ≤ 10⁹', companies:['Facebook','Amazon','Google'] },
  { title:'Median of Two Sorted Arrays', source:'LeetCode', problemId:'4', url:'https://leetcode.com/problems/median-of-two-sorted-arrays/', difficulty:'Hard', topic:'Binary Search', tags:['Array','Binary Search','Divide and Conquer'], description:'Return median of two sorted arrays in O(log(m+n)).', constraints:'0 ≤ m, n ≤ 1000', companies:['Google','Amazon','Microsoft','Apple','Goldman Sachs'] },

  // STACK & QUEUE
  { title:'Valid Parentheses', source:'LeetCode', problemId:'20', url:'https://leetcode.com/problems/valid-parentheses/', difficulty:'Easy', topic:'Stack & Queue', tags:['String','Stack'], description:'Determine if brackets in string are valid and close in correct order.', constraints:'1 ≤ s.length ≤ 10⁴', companies:['Amazon','Facebook','Google','Microsoft','Accenture','Wipro','TCS','Infosys'] },
  { title:'Min Stack', source:'LeetCode', problemId:'155', url:'https://leetcode.com/problems/min-stack/', difficulty:'Medium', topic:'Stack & Queue', tags:['Stack','Design'], description:'Design stack with O(1) push, pop, top, and getMin.', constraints:'-2³¹ ≤ val ≤ 2³¹-1; at most 3×10⁴ calls', companies:['Amazon','Bloomberg','Google','Uber','Microsoft'] },
  { title:'Daily Temperatures', source:'LeetCode', problemId:'739', url:'https://leetcode.com/problems/daily-temperatures/', difficulty:'Medium', topic:'Stack & Queue', tags:['Array','Stack','Monotonic Stack'], description:'Return days to wait for warmer temperature after each day.', constraints:'1 ≤ temperatures.length ≤ 10⁵', companies:['Amazon','Goldman Sachs','Google','Facebook'] },
  { title:'Largest Rectangle in Histogram', source:'LeetCode', problemId:'84', url:'https://leetcode.com/problems/largest-rectangle-in-histogram/', difficulty:'Hard', topic:'Stack & Queue', tags:['Array','Stack','Monotonic Stack'], description:'Return area of largest rectangle in histogram.', constraints:'1 ≤ heights.length ≤ 10⁵', companies:['Amazon','Facebook','Google','Microsoft','Goldman Sachs'] },

  // BACKTRACKING
  { title:'Subsets', source:'LeetCode', problemId:'78', url:'https://leetcode.com/problems/subsets/', difficulty:'Medium', topic:'Backtracking', tags:['Array','Backtracking','Bit Manipulation'], description:'Return all possible subsets (power set) of the array.', constraints:'1 ≤ nums.length ≤ 10; all numbers unique', companies:['Facebook','Amazon','Microsoft','Bloomberg','Adobe'] },
  { title:'Combination Sum', source:'LeetCode', problemId:'39', url:'https://leetcode.com/problems/combination-sum/', difficulty:'Medium', topic:'Backtracking', tags:['Array','Backtracking'], description:'Return all unique combinations summing to target (reuse allowed).', constraints:'1 ≤ candidates.length ≤ 30; 1 ≤ target ≤ 40', companies:['Amazon','Microsoft','Adobe','Google'] },
  { title:'Permutations', source:'LeetCode', problemId:'46', url:'https://leetcode.com/problems/permutations/', difficulty:'Medium', topic:'Backtracking', tags:['Array','Backtracking'], description:'Return all possible permutations of distinct integers.', constraints:'1 ≤ nums.length ≤ 6; all integers unique', companies:['Microsoft','Amazon','Facebook','Linkedin','Adobe'] },
  { title:'Word Search', source:'LeetCode', problemId:'79', url:'https://leetcode.com/problems/word-search/', difficulty:'Medium', topic:'Backtracking', tags:['Array','String','Backtracking','Matrix'], description:'Check if word exists in grid using adjacent cells.', constraints:'1 ≤ m, n ≤ 6; 1 ≤ word.length ≤ 15', companies:['Microsoft','Amazon','Bloomberg','Google'] },
  { title:'N-Queens', source:'LeetCode', problemId:'51', url:'https://leetcode.com/problems/n-queens/', difficulty:'Hard', topic:'Backtracking', tags:['Array','Backtracking'], description:'Return all distinct solutions to the n-queens puzzle.', constraints:'1 ≤ n ≤ 9', companies:['Amazon','Microsoft','Google','Uber','Apple'] },

  // BIT MANIPULATION
  { title:'Single Number', source:'LeetCode', problemId:'136', url:'https://leetcode.com/problems/single-number/', difficulty:'Easy', topic:'Bit Manipulation', tags:['Array','Bit Manipulation'], description:'Find the element that appears once (all others appear twice). Use XOR.', constraints:'1 ≤ nums.length ≤ 3×10⁴', companies:['Airbnb','Amazon','Adobe','Qualcomm','Wipro','HCL'] },
  { title:'Number of 1 Bits', source:'LeetCode', problemId:'191', url:'https://leetcode.com/problems/number-of-1-bits/', difficulty:'Easy', topic:'Bit Manipulation', tags:['Divide and Conquer','Bit Manipulation'], description:'Return number of set bits in binary representation (Hamming weight).', constraints:'1 ≤ n ≤ 2³¹-1', companies:['Microsoft','Apple','Qualcomm','Adobe','TCS'] },
  { title:'Counting Bits', source:'LeetCode', problemId:'338', url:'https://leetcode.com/problems/counting-bits/', difficulty:'Easy', topic:'Bit Manipulation', tags:['Dynamic Programming','Bit Manipulation'], description:'Return array where ans[i] is number of 1s in binary of i.', constraints:'0 ≤ n ≤ 10⁵', companies:['Facebook','Microsoft','Amazon'] },

  // MATH
  { title:'Reverse Integer', source:'LeetCode', problemId:'7', url:'https://leetcode.com/problems/reverse-integer/', difficulty:'Medium', topic:'Math', tags:['Math'], description:'Return integer with digits reversed; return 0 on overflow.', constraints:'-2³¹ ≤ x ≤ 2³¹-1', companies:['Bloomberg','Apple','Amazon','Microsoft','TCS','Wipro'] },
  { title:'Happy Number', source:'LeetCode', problemId:'202', url:'https://leetcode.com/problems/happy-number/', difficulty:'Easy', topic:'Math', tags:['Hash Table','Math','Two Pointers'], description:'Determine if n is happy by repeatedly summing squares of digits.', constraints:'1 ≤ n ≤ 2³¹-1', companies:['Amazon','Adobe','Bloomberg','Microsoft','Infosys'] },
  { title:'Power of Two', source:'LeetCode', problemId:'231', url:'https://leetcode.com/problems/power-of-two/', difficulty:'Easy', topic:'Math', tags:['Math','Bit Manipulation','Recursion'], description:'Return true if n is a power of two.', constraints:'-2³¹ ≤ n ≤ 2³¹-1', companies:['Adobe','Qualcomm','Google','Amazon'] },

  // GREEDY
  { title:'Meeting Rooms II', source:'LeetCode', problemId:'253', url:'https://leetcode.com/problems/meeting-rooms-ii/', difficulty:'Medium', topic:'Greedy', tags:['Array','Two Pointers','Greedy','Sorting','Heap'], description:'Return minimum conference rooms required for all meetings.', constraints:'1 ≤ intervals.length ≤ 10⁴', companies:['Facebook','Google','Amazon','Microsoft','Uber','Ola'] },
  { title:'Gas Station', source:'LeetCode', problemId:'134', url:'https://leetcode.com/problems/gas-station/', difficulty:'Medium', topic:'Greedy', tags:['Array','Greedy'], description:'Find starting gas station to complete circular route, or return -1.', constraints:'n == gas.length == cost.length; 1 ≤ n ≤ 10⁵', companies:['Amazon','Microsoft','Goldman Sachs'] },
  { title:'Task Scheduler', source:'LeetCode', problemId:'621', url:'https://leetcode.com/problems/task-scheduler/', difficulty:'Medium', topic:'Greedy', tags:['Array','Hash Table','Greedy','Sorting','Heap','Counting'], description:'Return least intervals to finish all tasks with cooldown n.', constraints:'1 ≤ task.length ≤ 10⁴; 0 ≤ n ≤ 100', companies:['Amazon','Facebook','Google'] },
];

// ── Seed function ─────────────────────────────────────────────────────────
async function seedProblems() {
  const uri = buildMongoURI();
  console.log(`\n🔌 Connecting to MongoDB...`);
  console.log(`   URI: ${uri.replace(/:([^@]+)@/, ':****@')}`); // mask password

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000, // fail fast (10s) instead of hanging
      connectTimeoutMS:         10000,
    });
    console.log('✅ MongoDB connected\n');
  } catch (err) {
    console.error('❌ Could not connect to MongoDB:', err.message);
    console.error('\n💡 Troubleshooting:');
    console.error('   1. Is MongoDB running?  →  docker-compose up mongo');
    console.error('   2. Check your .env file has MONGODB_URI set correctly');
    console.error('   3. If running locally without auth, set: MONGODB_URI=mongodb://localhost:27017/pragati');
    process.exit(1);
  }

  // Remove old placeholder problems
  const del = await Problem.deleteMany({ title: { $regex: /^(Array|String|Recursion|DP|Graph|Tree) Problem \d+$/ } });
  if (del.deletedCount > 0) console.log(`🗑️  Removed ${del.deletedCount} placeholder problems`);

  let added = 0, updated = 0;
  for (const p of LEETCODE_PROBLEMS) {
    const existing = await Problem.findOne({ source: 'LeetCode', problemId: p.problemId });
    if (!existing) {
      await Problem.create(p);
      added++;
    } else {
      await Problem.findByIdAndUpdate(existing._id, {
        url: p.url, description: p.description, constraints: p.constraints,
        tags: p.tags, companies: p.companies, topic: p.topic,
      });
      updated++;
    }
  }

  const total = await Problem.countDocuments();
  console.log(`✅ ${added} problems added, ${updated} updated`);
  console.log(`📊 Total problems in DB: ${total}`);
  console.log('\n🎉 Seeding complete!\n');
  await mongoose.disconnect();
  process.exit(0);
}

seedProblems();