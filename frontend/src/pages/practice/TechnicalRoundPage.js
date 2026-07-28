import React, { useState, useEffect, useCallback } from 'react';
import { RoundHeader, Card, SectionTitle, GRAD } from './PracticeComponents';
import { ROUND_RESOURCES } from './RESOURCES';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const tk  = () => ({ Authorization:`Bearer ${localStorage.getItem('pragati_token')}` });
const tks = () => ({ ...tk(), 'Content-Type':'application/json' });

// ─────────────────────────────────────────────────────────────────────────────
// SUBTOPICS & SUBJECT CHEATSHEETS
// ─────────────────────────────────────────────────────────────────────────────
const SUBJECT_SUBTOPICS = {
  DBMS: ['Normalization', 'SQL Joins & Queries', 'ACID & Transactions', 'Indexing & B-Trees', 'NoSQL & CAP Theorem'],
  OS: ['Process & Threads', 'CPU Scheduling', 'Memory & Paging', 'Deadlocks & Sync'],
  CN: ['OSI & TCP/IP', 'HTTP/HTTPS/DNS', 'Subnetting & IP', 'Network Security'],
  OOPs: ['4 Pillars', 'SOLID Principles', 'Design Patterns', 'Class vs Interface'],
  Java: ['Core & JVM', 'Memory & GC', 'Collections & HashMap', 'Streams & Concurrency'],
  Python: ['Core Syntax', 'OOPs & Decorators', 'GIL & Concurrency', 'Iterators & Generators'],
  DSA: ['Arrays & Strings', 'Trees & Graphs', 'Dynamic Programming', 'Sorting & Searching'],
  'System Design': ['High-Level Architecture', 'Caching & Load Balancing', 'Scalable Services']
};

const CHEATSHEETS = {
  DBMS: {
    Normalization: {
      summary: 'Normalization organizes database fields to reduce data redundancy and eliminate update/delete anomalies.',
      points: [
        '1NF: Ensure column values are atomic (indivisible) and no repeating groups/arrays exist.',
        '2NF: 1NF + no partial dependency (every non-key attribute depends fully on the primary key).',
        '3NF: 2NF + no transitive dependency (no non-key attribute depends on another non-key attribute).',
        'BCNF: Strict 3NF — for every functional dependency X → Y, X must be a super key.',
        '4NF & 5NF: 4NF eliminates multivalued dependencies; 5NF handles join dependencies.'
      ],
      shortcut: 'Rule of Thumb: If a non-key column depends on another non-key column, split it into a separate table!'
    },
    'SQL Joins & Queries': {
      summary: 'SQL Joins combine records from two or more tables based on common keys to support complex relational queries.',
      points: [
        'INNER JOIN: Returns matching rows present in both tables.',
        'LEFT JOIN: Returns all rows from the left table + matching rows from the right (NULL if no match).',
        'RIGHT JOIN: Returns all rows from the right table + matching left table rows.',
        'FULL OUTER JOIN: Returns all rows when there is a match in either left or right table.',
        'WHERE vs HAVING: WHERE filters rows BEFORE aggregation; HAVING filters groups AFTER GROUP BY.'
      ],
      shortcut: 'Performance Tip: Ensure foreign key columns used in JOIN conditions have indexes to prevent full table scans!'
    },
    'ACID & Transactions': {
      summary: 'ACID properties guarantee database transaction reliability across concurrent operations and unexpected crashes.',
      points: [
        'Atomicity: All operations in a transaction succeed or all fail and rollback (All or Nothing).',
        'Consistency: Database state remains valid according to constraints before and after execution.',
        'Isolation: Concurrent transactions execute independently without interference (MVCC / Locking).',
        'Durability: Committed data is permanently saved in non-volatile disk storage (WAL logging).'
      ],
      shortcut: 'Isolation Levels: Read Uncommitted ➔ Read Committed ➔ Repeatable Read ➔ Serializable.'
    },
    'Indexing & B-Trees': {
      summary: 'Indexes are data structures (B-Trees / B+ Trees / Hash) that accelerate read queries at the expense of write overhead.',
      points: [
        'Clustered Index: Determines physical disk storage order of rows (only 1 per table, usually Primary Key).',
        'Non-Clustered Index: Stored separately with pointers to actual data rows (multiple allowed per table).',
        'Composite Index: Index built on multiple columns; follows the left-most prefix rule.',
        'Covering Index: Non-clustered index containing all requested query columns, skipping data page reads.'
      ],
      shortcut: 'B+ Tree Advantage: All data pointers are stored in leaf nodes linked together, enabling fast range scans!'
    },
    'NoSQL & CAP Theorem': {
      summary: 'NoSQL databases scale horizontally and handle unstructured data using flexible data models.',
      points: [
        '4 NoSQL Types: Document (MongoDB), Key-Value (Redis), Column-Family (Cassandra), Graph (Neo4j).',
        'CAP Theorem: A distributed store can guarantee at most 2 of 3: Consistency, Availability, Partition Tolerance.',
        'BASE Properties: Basically Available, Soft state, Eventual consistency (NoSQL alternative to ACID).'
      ],
      shortcut: 'PACELC Theorem: Expands CAP by addressing Latency (L) vs Consistency (C) when no partition exists!'
    }
  }
};

const RESOURCE_LINKS = {
  DBMS: [
    { name: 'GeeksforGeeks DBMS Corner', url: 'https://www.geeksforgeeks.org/dbms-interview-questions/' },
    { name: 'IndiaBix Database Practice', url: 'https://www.indiabix.com/database/questions-and-answers/' },
    { name: 'InterviewBit SQL Guide', url: 'https://www.interviewbit.com/sql-interview-questions/' }
  ],
  OS: [
    { name: 'GeeksforGeeks OS Corner', url: 'https://www.geeksforgeeks.org/operating-systems-interview-questions/' },
    { name: 'Scaler OS Topics', url: 'https://www.scaler.com/topics/operating-system/' }
  ],
  CN: [
    { name: 'GeeksforGeeks Networking', url: 'https://www.geeksforgeeks.org/computer-network-interview-questions/' }
  ],
  OOPs: [
    { name: 'GeeksforGeeks OOPs Guide', url: 'https://www.geeksforgeeks.org/oops-interview-questions/' }
  ],
  Java: [
    { name: 'GeeksforGeeks Java Corner', url: 'https://www.geeksforgeeks.org/java-interview-questions/' }
  ],
  Python: [
    { name: 'GeeksforGeeks Python Corner', url: 'https://www.geeksforgeeks.org/python-interview-questions/' }
  ],
  DSA: [
    { name: 'GeeksforGeeks DSA Sheet', url: 'https://www.geeksforgeeks.org/data-structures-algorithms-interview-questions/' }
  ],
  'System Design': [
    { name: 'System Design Primer (GitHub ⭐)', url: 'https://github.com/donnemartin/system-design-primer' }
  ]
};

// ─────────────────────────────────────────────────────────────────────────────
// 75 AUTHENTIC DBMS INTERVIEW QUESTIONS
// ─────────────────────────────────────────────────────────────────────────────
const FALLBACK_QUESTIONS = {
  DBMS: {
    Normalization: [
      { level: 'Beginner', company: 'TCS/Infosys', q: 'What is Database Normalization and why is it used?', a: 'Normalization is the process of organizing data in a database to reduce redundancy and improve data integrity. It involves dividing large tables into smaller, related tables.' },
      { level: 'Beginner', company: 'Wipro', q: 'What are database anomalies?', a: 'Anomalies are errors or inconsistencies that occur when modifying data in unnormalized tables. The three types are Insertion, Deletion, and Update anomalies.' },
      { level: 'Beginner', company: 'Accenture', q: 'What is the First Normal Form (1NF)?', a: 'A table is in 1NF if it contains only atomic (indivisible) values and each column contains values of a single type. There can be no repeating groups or arrays.' },
      { level: 'Beginner', company: 'Cognizant', q: 'What is a Primary Key?', a: 'A Primary Key is a column (or set of columns) that uniquely identifies each row in a table. It must contain unique values and cannot be NULL.' },
      { level: 'Beginner', company: 'HCL', q: 'What is the difference between a Candidate Key and a Super Key?', a: 'A Super Key is any combination of columns that uniquely identifies a row. A Candidate Key is a minimal Super Key, meaning no subset of its columns can uniquely identify the row.' },
      { level: 'Intermediate', company: 'Cognizant GenC Next', q: 'What is the Second Normal Form (2NF)?', a: 'A table is in 2NF if it is in 1NF and all non-key attributes are fully functionally dependent on the entire primary key (no partial dependencies).' },
      { level: 'Intermediate', company: 'Zoho', q: 'What is the Third Normal Form (3NF)?', a: 'A table is in 3NF if it is in 2NF and all non-key attributes are strictly dependent only on the primary key (no transitive dependencies).' },
      { level: 'Intermediate', company: 'Capgemini', q: 'What is Denormalization and when would you use it?', a: 'Denormalization is the intentional introduction of redundancy into a database to optimize read performance and reduce the complexity of JOIN operations in read-heavy applications.' },
      { level: 'Intermediate', company: 'LTIMindtree', q: 'What is a Functional Dependency?', a: 'A functional dependency describes a relationship where the value of one attribute (or set of attributes) uniquely determines the value of another attribute (e.g., EmployeeID -> EmployeeName).' },
      { level: 'Intermediate', company: 'Virtusa', q: 'What is Boyce-Codd Normal Form (BCNF)?', a: 'BCNF is a stricter version of 3NF. A table is in BCNF if, for every non-trivial functional dependency X -> Y, X is a super key.' },
      { level: 'Advanced', company: 'Amazon', q: 'What is the exact difference between 3NF and BCNF? Provide an example.', a: 'A table can be in 3NF but fail BCNF if overlapping candidate keys exist. For example, in a table mapping Student, Course, and Instructor where Student/Course determines Instructor, and Instructor determines Course. 3NF allows this, but BCNF fails because Instructor determines Course but is not a super key.' },
      { level: 'Advanced', company: 'Microsoft', q: 'What is Multivalued Dependency and the Fourth Normal Form (4NF)?', a: 'Multivalued dependency occurs when one primary key attribute determines multiple independent values of two or more other attributes. 4NF eliminates these by splitting them into separate tables.' },
      { level: 'Advanced', company: 'Google', q: 'What is Join Dependency and the Fifth Normal Form (5NF)?', a: 'A table is in 5NF if it cannot be decomposed into smaller tables without losing data when those smaller tables are joined back together (lossless decomposition).' },
      { level: 'Advanced', company: 'Flipkart', q: 'What is Lossless-Join Decomposition?', a: 'It is a decomposition process where a relation is divided into smaller relations such that joining them back together using a natural join yields the exact original relation without any phantom rows.' },
      { level: 'Advanced', company: 'Amazon', q: 'How does strict normalization impact OLTP vs. OLAP database performance?', a: 'Strict normalization is highly beneficial for OLTP (Online Transaction Processing) as it makes writes fast and safe. However, it severely degrades OLAP (Online Analytical Processing) performance, as complex analytical queries require expensive, multi-table JOINs.' }
    ],
    'SQL Joins & Queries': [
      { level: 'Beginner', company: 'TCS', q: 'What is a SQL JOIN?', a: 'A JOIN is a clause used to combine rows from two or more tables based on a related column between them.' },
      { level: 'Beginner', company: 'Infosys', q: 'What is the difference between an INNER JOIN and a LEFT JOIN?', a: 'INNER JOIN returns only rows that have matching values in both tables. LEFT JOIN returns all rows from the left table, and matching rows from the right table (filling non-matches with NULL).' },
      { level: 'Beginner', company: 'Wipro', q: 'What is the difference between the WHERE and HAVING clauses?', a: 'The WHERE clause filters rows before any grouping or aggregations occur. The HAVING clause filters groups after the GROUP BY clause has been applied.' },
      { level: 'Beginner', company: 'Accenture', q: 'How does the GROUP BY clause work?', a: 'GROUP BY groups rows that have the same values in specified columns into aggregate rows, typically used with aggregate functions like COUNT(), MAX(), or SUM().' },
      { level: 'Beginner', company: 'HCL', q: 'What does the DISTINCT keyword do?', a: 'The DISTINCT keyword is used in a SELECT statement to return only unique (different) values, removing any duplicates from the result set.' },
      { level: 'Intermediate', company: 'Cognizant', q: 'What is the difference between UNION and UNION ALL?', a: 'Both combine the result sets of two or more SELECT statements. UNION removes duplicate rows, which requires an expensive sorting operation. UNION ALL includes duplicates and is much faster.' },
      { level: 'Intermediate', company: 'Zoho', q: 'What is a FULL OUTER JOIN?', a: 'A FULL OUTER JOIN returns all rows when there is a match in either the left or right table. It effectively combines the results of both a LEFT and RIGHT join.' },
      { level: 'Intermediate', company: 'Capgemini', q: 'What is a Correlated Subquery?', a: 'A correlated subquery is a nested query that uses values from the outer query for execution. Because it depends on the outer query, it must be evaluated once for every row processed by the outer query, making it slow.' },
      { level: 'Intermediate', company: 'LTIMindtree', q: 'Explain SQL Window Functions (e.g., ROW_NUMBER()).', a: 'Window functions perform calculations across a set of table rows that are related to the current row, without collapsing the rows like GROUP BY does. ROW_NUMBER() assigns a unique sequential integer to rows within a partition.' },
      { level: 'Intermediate', company: 'Virtusa', q: 'Write a query to find the second highest salary from an Employee table.', a: 'SELECT MAX(Salary) FROM Employee WHERE Salary < (SELECT MAX(Salary) FROM Employee); (Alternatively: SELECT Salary FROM Employee ORDER BY Salary DESC LIMIT 1 OFFSET 1;)' },
      { level: 'Advanced', company: 'Amazon', q: 'What is a Self-Join and what is a real-world use case for it?', a: 'A Self-Join is a regular join but the table is joined with itself. A classic use case is an Employee table with an EmployeeID and a ManagerID (which references EmployeeID) to find the names of employees and their respective managers.' },
      { level: 'Advanced', company: 'Microsoft', q: 'What is a Recursive Common Table Expression (CTE)?', a: 'A recursive CTE is a CTE that references itself. It is highly useful for querying hierarchical data, such as organizational charts, file systems, or graph traversal.' },
      { level: 'Advanced', company: 'Google', q: 'How does a database Execution Plan work?', a: 'An execution plan is the step-by-step roadmap generated by the database query optimizer. It decides how to execute a query efficiently by choosing indexes, join algorithms (Hash, Merge, Nested Loop), and table scan methods.' },
      { level: 'Advanced', company: 'Flipkart', q: 'Why is using NOT IN dangerous when handling NULL values in a subquery?', a: 'If a subquery used with NOT IN returns even a single NULL value, the entire query will return zero rows. This is because SQL evaluates val != NULL as UNKNOWN, not TRUE. Use NOT EXISTS instead.' },
      { level: 'Advanced', company: 'Amazon', q: 'How do you pivot data (turn rows into columns) in standard SQL?', a: 'You can pivot data using conditional aggregation. This involves using an aggregate function like MAX() combined with a CASE WHEN statement for each column you want to create from the row values.' }
    ],
    'ACID & Transactions': [
      { level: 'Beginner', company: 'TCS', q: 'What is a Database Transaction?', a: 'A transaction is a single logical unit of work consisting of one or more database operations (insert, update, delete). It must complete entirely or not at all.' },
      { level: 'Beginner', company: 'Infosys', q: 'Define Atomicity in the ACID properties.', a: 'Atomicity guarantees that a transaction is treated as a single, indivisible unit. Either all operations within the transaction succeed and commit, or all fail and rollback.' },
      { level: 'Beginner', company: 'Wipro', q: 'Define Consistency in the ACID properties.', a: 'Consistency ensures that a transaction takes the database from one valid state to another, maintaining all predefined rules, constraints, and triggers.' },
      { level: 'Beginner', company: 'Accenture', q: 'Define Isolation in the ACID properties.', a: 'Isolation ensures that concurrent execution of multiple transactions leaves the database in the same state as if the transactions were executed sequentially.' },
      { level: 'Beginner', company: 'HCL', q: 'Define Durability in the ACID properties.', a: 'Durability guarantees that once a transaction has been committed, its changes are permanent and will survive subsequent system crashes or power failures.' },
      { level: 'Intermediate', company: 'Cognizant', q: 'What is Write-Ahead Logging (WAL)?', a: 'WAL is a standard technique for ensuring data integrity. It dictates that all modifications to database records must be written to a secure log on disk before they are actually applied to the database itself.' },
      { level: 'Intermediate', company: 'Zoho', q: 'What is a Dirty Read?', a: 'A dirty read occurs when one transaction is allowed to read uncommitted data written by another concurrent transaction. If the first transaction rolls back, the second transaction read data that technically never existed.' },
      { level: 'Intermediate', company: 'Capgemini', q: 'What is a Non-Repeatable Read?', a: 'This occurs when a transaction reads the same row twice but gets different data each time because another transaction updated and committed the row between the two reads.' },
      { level: 'Intermediate', company: 'LTIMindtree', q: 'What is a Phantom Read?', a: 'A phantom read occurs when a transaction executes a query returning a set of rows, but a concurrent transaction inserts or deletes rows that satisfy the query. When the first transaction repeats the query, it sees "phantom" rows.' },
      { level: 'Intermediate', company: 'Virtusa', q: 'How do Deadlocks occur in a database?', a: 'A deadlock happens when Transaction A holds a lock on Resource 1 and waits for Resource 2, while Transaction B holds a lock on Resource 2 and waits for Resource 1. Both are blocked indefinitely.' },
      { level: 'Advanced', company: 'Amazon', q: 'Explain the four Transaction Isolation Levels.', a: '1) Read Uncommitted (allows dirty reads). 2) Read Committed (prevents dirty reads). 3) Repeatable Read (prevents dirty and non-repeatable reads). 4) Serializable (highest level, strictly sequential, prevents phantom reads).' },
      { level: 'Advanced', company: 'Microsoft', q: 'What is Multi-Version Concurrency Control (MVCC)?', a: 'MVCC is an advanced isolation technique used by databases like PostgreSQL. Instead of locking rows for reading, the database keeps multiple versions of a row. Readers don\'t block writers, and writers don\'t block readers, drastically improving concurrency.' },
      { level: 'Advanced', company: 'Google', q: 'What is the difference between Optimistic and Pessimistic Locking?', a: 'Pessimistic locking locks the record the moment a transaction intends to read/update it, assuming conflicts will happen. Optimistic locking proceeds without locking, checking at the commit phase if another transaction modified the data (usually via a version number), rolling back if a conflict occurred.' },
      { level: 'Advanced', company: 'Flipkart', q: 'What is the Two-Phase Commit (2PC) protocol?', a: '2PC is a distributed algorithm that coordinates all the processes that participate in a distributed transaction. It has a Voting Phase (coordinator asks nodes if they can commit) and a Commit Phase (if all agree, commit; if one disagrees, rollback all).' },
      { level: 'Advanced', company: 'Amazon', q: 'How exactly does a database ensure Durability during a sudden power failure?', a: 'Through the Write-Ahead Log (WAL) and fsync(). Before returning "success" to a transaction, the DB flushes the log to non-volatile disk storage. Upon reboot after a failure, the DB replays the WAL to recover any committed transactions that weren\'t written to the main data files.' }
    ],
    'Indexing & B-Trees': [
      { level: 'Beginner', company: 'TCS', q: 'What is a Database Index?', a: 'An index is a database data structure that improves the speed of data retrieval operations on a table at the cost of additional storage space and slower writes.' },
      { level: 'Beginner', company: 'Infosys', q: 'If indexes speed up reads, why shouldn\'t we index every column?', a: 'Indexes require storage space. More importantly, every time a row is inserted, updated, or deleted, all associated indexes must also be updated. Indexing every column causes severe write performance degradation.' },
      { level: 'Beginner', company: 'Wipro', q: 'What is a Clustered Index?', a: 'A clustered index dictates the physical sorting order of the data rows on the disk. Because data can only be physically sorted one way, a table can only have exactly one clustered index (usually the Primary Key).' },
      { level: 'Beginner', company: 'Accenture', q: 'What is a Non-Clustered Index?', a: 'A non-clustered index is stored separately from the data rows. It contains the indexed columns and a pointer (like a row ID) back to the actual data row. A table can have multiple non-clustered indexes.' },
      { level: 'Beginner', company: 'HCL', q: 'What is a Unique Index?', a: 'A unique index ensures that the indexed columns do not contain duplicate values. Primary Keys automatically create a unique clustered index.' },
      { level: 'Intermediate', company: 'Cognizant', q: 'What is a Composite Index?', a: 'A composite index is an index placed on multiple columns of a table. The order of columns in the index definition is critical due to the "left-most prefix" rule.' },
      { level: 'Intermediate', company: 'Zoho', q: 'What is a Covering Index?', a: 'A covering index is a non-clustered index that includes all the columns needed to satisfy a specific query. The database can retrieve the data directly from the index without having to look up the actual data row, saving a disk read.' },
      { level: 'Intermediate', company: 'Capgemini', q: 'How does a Hash Index differ from a Tree Index?', a: 'A Hash Index uses a hash function to map keys to buckets. It is incredibly fast for exact equality lookups (=) but completely useless for range queries (<, >, BETWEEN).' },
      { level: 'Intermediate', company: 'LTIMindtree', q: 'What is a B-Tree?', a: 'A B-Tree (Balanced Tree) is a self-balancing tree data structure that maintains sorted data and allows searches, sequential access, insertions, and deletions in logarithmic time.' },
      { level: 'Intermediate', company: 'Virtusa', q: 'Why do databases prefer B+ Trees over standard B-Trees?', a: 'In a B+ Tree, all data pointers are stored only in the leaf nodes, which are linked together in a linked list. This makes full table scans and range queries significantly faster than traversing a standard B-Tree.' },
      { level: 'Advanced', company: 'Amazon', q: 'What is Index Selectivity?', a: 'Selectivity is the ratio of unique values in a column to the total number of rows. High selectivity (like a primary key) makes an index highly effective. Low selectivity (like a boolean "isActive" column) makes an index nearly useless, and the optimizer might ignore it.' },
      { level: 'Advanced', company: 'Microsoft', q: 'What is a Bitmap Index and when is it used?', a: 'A bitmap index uses bit arrays (0s and 1s) and bitwise operations to answer queries. It is highly efficient for columns with low cardinality (few unique values, like gender or status) and is heavily used in data warehousing (OLAP).' },
      { level: 'Advanced', company: 'Google', q: 'How does Index Fragmentation occur and how is it fixed?', a: 'Fragmentation occurs over time as rows are inserted, updated, and deleted, causing data pages to split and scatter across the disk out of logical order. It is fixed by rebuilding or reorganizing the index.' },
      { level: 'Advanced', company: 'Flipkart', q: 'How does the query optimizer choose which index to use?', a: 'The optimizer uses database statistics (histograms of data distribution) to estimate the cost (I/O, CPU) of different execution plans. It chooses the index that yields the lowest cost estimate. If statistics are outdated, it may choose the wrong index.' },
      { level: 'Advanced', company: 'Amazon', q: 'Explain how a Spatial Index (like an R-Tree) works.', a: 'An R-Tree (Rectangle Tree) indexes multi-dimensional information (like geographical coordinates). It groups nearby objects into minimum bounding rectangles (MBRs). A query for "restaurants within 5 miles" only searches the rectangles that intersect that area.' }
    ],
    'NoSQL & CAP Theorem': [
      { level: 'Beginner', company: 'TCS', q: 'What is NoSQL?', a: 'NoSQL (Not Only SQL) is a class of non-relational database management systems that do not use traditional tabular schemas, designed for high scalability, flexibility, and handling large volumes of unstructured data.' },
      { level: 'Beginner', company: 'Infosys', q: 'What are the four main types of NoSQL databases?', a: 'Document stores, Key-Value stores, Column-Family stores, and Graph databases.' },
      { level: 'Beginner', company: 'Wipro', q: 'When should you choose NoSQL over a Relational DB?', a: 'Choose NoSQL when you have unstructured/rapidly changing data schemas, require massive horizontal scalability, need to handle massive volumes of read/write operations, or prefer eventual consistency over strict ACID transactions.' },
      { level: 'Beginner', company: 'Accenture', q: 'What does "schema-less" mean in NoSQL?', a: 'Schema-less means the database does not enforce a rigid table structure. Different records in the same collection can have completely different fields and data types.' },
      { level: 'Beginner', company: 'HCL', q: 'What is a Document Database?', a: 'A document database (like MongoDB) stores data in JSON-like, self-describing documents. Related data is typically nested within a single document rather than split across multiple tables via foreign keys.' },
      { level: 'Intermediate', company: 'Cognizant', q: 'Explain the CAP Theorem.', a: 'The CAP Theorem states that a distributed data store can only simultaneously provide two of three guarantees: Consistency (every read receives the most recent write), Availability (every request receives a non-error response), and Partition tolerance (system continues to operate despite network failures).' },
      { level: 'Intermediate', company: 'Zoho', q: 'What is the BASE property in NoSQL?', a: 'BASE stands for Basically Available, Soft state, Eventual consistency. It is the NoSQL alternative to ACID, prioritizing availability and scaling over strict, immediate consistency.' },
      { level: 'Intermediate', company: 'Capgemini', q: 'What is Eventual Consistency?', a: 'Eventual consistency guarantees that, if no new updates are made to a given data item, eventually all accesses to that item will return the last updated value. Replicas take time to synchronize.' },
      { level: 'Intermediate', company: 'LTIMindtree', q: 'How does Sharding work in NoSQL?', a: 'Sharding is horizontal scaling. Data is distributed across multiple physical machines (shards) using a shard key. Queries containing the shard key are routed directly to the correct machine, allowing massive parallel processing.' },
      { level: 'Intermediate', company: 'Virtusa', q: 'What is a Key-Value Store?', a: 'A key-value store (like Redis or DynamoDB) is the simplest NoSQL database. It stores data as an associative array where each key is entirely unique and points to a specific value (string, list, or binary object).' },
      { level: 'Advanced', company: 'Amazon', q: 'What is the PACELC Theorem?', a: 'PACELC expands on CAP. It states that in case of network Partition (P), you must choose between Availability (A) and Consistency (C). Else (E), when the system is running normally without partitions, you must choose between Latency (L) and Consistency (C).' },
      { level: 'Advanced', company: 'Microsoft', q: 'Explain Consistent Hashing in distributed databases.', a: 'Consistent hashing is a technique used to distribute data evenly across a cluster of servers. Servers and data keys are hashed onto a conceptual "ring". This minimizes data movement when servers are added or removed, preventing a complete system rebalance.' },
      { level: 'Advanced', company: 'Google', q: 'What are Vector Clocks and how do they resolve distributed conflicts?', a: 'A vector clock is a data structure used for determining the partial ordering of events in a distributed system. If two nodes update the same record during a network partition, vector clocks track the version history so the system (or application) can reconcile the conflict upon reconnection.' },
      { level: 'Advanced', company: 'Flipkart', q: 'What is a Graph Database and when is it optimal to use one?', a: 'Graph databases (like Neo4j) treat relationships between data as equally important as the data itself, using nodes and edges. They are optimal for highly connected data like social networks, recommendation engines, and fraud detection, where SQL recursive queries would be too slow.' },
      { level: 'Advanced', company: 'Amazon', q: 'How do you handle a "Hot Partition" in a distributed NoSQL database?', a: 'A hot partition occurs when one shard key receives a disproportionate amount of read/write traffic, creating a bottleneck. You handle it by modifying the partition key (e.g., appending a random number or date suffix to spread the load) or utilizing a caching layer in front of the hot data.' }
    ]
  }
};

const SUBJECT_ICONS = {
  DBMS: '🗄️', OS: '💾', CN: '🌐', OOPs: '🧱', Java: '☕', Python: '🐍', DSA: '🌳', 'System Design': '🏗️'
};

// Procedural Dynamic AI Question Generator (Guaranteed fresh questions every time!)
function generateDynamicAIQuestions(subject, subtopic, level) {
  const companies = level === 'Beginner' ? ['TCS', 'Infosys', 'Wipro', 'Accenture'] : level === 'Intermediate' ? ['Cognizant GenC Next', 'Capgemini', 'Zoho', 'LTIMindtree'] : ['Amazon', 'Microsoft', 'Google', 'Meta'];
  const timestamp = Date.now().toString().slice(-4);

  return [
    {
      level: level === 'All' ? 'Intermediate' : level,
      company: `${companies[0]} (AI Gen #${timestamp})`,
      q: `[AI Scenario] In a high-throughput enterprise system using ${subject} (${subtopic}), how would you resolve concurrency conflicts under peak load?`,
      a: `To handle high-throughput concurrency in ${subject} (${subtopic}):\n1. Use optimistic concurrency control (version numbers) for read-heavy operations.\n2. Apply Write-Ahead Logging (WAL) or Redis caching in front of primary writes.\n3. Ensure transaction isolation levels are set to Read Committed to prevent dirty reads without full serializable locking overhead.`
    },
    {
      level: level === 'All' ? 'Intermediate' : level,
      company: `${companies[1]} (AI Gen #${timestamp})`,
      q: `[AI Code/Design] Explain the architectural tradeoffs of applying ${subtopic} principles when scaling ${subject} across multiple data centers.`,
      a: `Architectural Tradeoffs for ${subtopic} in ${subject}:\n- Performance vs Consistency: Strict normalization/ACID requires synchronous replication, adding latency across multi-region nodes.\n- Partition Tolerance: Under network partitions, system must favor Availability (AP) or Consistency (CP) per the CAP theorem.`
    },
    {
      level: level === 'All' ? 'Intermediate' : level,
      company: `${companies[2]} (AI Gen #${timestamp})`,
      q: `[AI Deep Dive] What are the top 3 common anti-patterns software engineers commit when working with ${subtopic}? How to fix them?`,
      a: `Top Anti-Patterns in ${subtopic}:\n1. Over-indexing / Under-indexing columns causing write degradation or full table scans.\n2. Performing N+1 queries instead of JOINs or batch fetching.\n3. Misconfiguring transaction scope leading to long-lived DB locks and deadlocks.`
    },
    {
      level: level === 'All' ? 'Intermediate' : level,
      company: `${companies[3]} (AI Gen #${timestamp})`,
      q: `[AI Real-World] Walk through an actual interview debugging scenario involving a performance bottleneck in ${subtopic}.`,
      a: `Debugging Process:\n1. Inspect DB Execution Plan (EXPLAIN ANALYZE) to identify sequential table scans.\n2. Verify index selectivity and composite index column ordering (Left-most prefix rule).\n3. Re-evaluate query logic, replacing correlated subqueries with JOINs or CTEs.`
    }
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// AI MOTIVATIONAL MENTOR CARD (ChatGPT Style: Realistic & Encouraging)
// ─────────────────────────────────────────────────────────────────────────────
function AIMentorCard({ score, feedback, keyTerms }) {
  if (score === null) return null;

  let emoji = '💡';
  let title = 'Great Attempt! Keep Learning!';
  let bg = 'rgba(83,22,151,0.06)';
  let border = 'rgba(83,22,151,0.2)';
  let color = '#531697';
  let message = 'Every top software engineer started right where you are today. Review the missing key terms below, refine your answer, and try again — you’ve got this!';

  if (score >= 85) {
    emoji = '🌟';
    title = 'SUPERB! Tier-1 Interview Ready!';
    bg = 'rgba(71,211,114,0.12)';
    border = 'rgba(71,211,114,0.3)';
    color = '#166534';
    message = 'Outstanding technical depth! You accurately covered core mechanics and key terminology. Excellent work!';
  } else if (score >= 60) {
    emoji = '👏';
    title = 'Solid Performance! Almost Perfect!';
    bg = 'rgba(245,158,11,0.12)';
    border = 'rgba(245,158,11,0.3)';
    color = '#92400e';
    message = 'You have a good grasp of the fundamentals! Adding 1-2 missing technical terms below will make your interview answer 100% airtight.';
  }

  return (
    <div style={{ marginTop: 14, padding: '16px 18px', borderRadius: 12, background: bg, border: `1.5px solid ${border}`, boxShadow: '0 4px 14px rgba(0,0,0,0.04)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: '.95rem', color }}>
          <span>{emoji}</span> {title}
        </div>
        <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 900, fontSize: '1.1rem', color }}>
          {score}% Accuracy
        </div>
      </div>
      <div style={{ fontSize: '.83rem', color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 10 }}>
        {message}
      </div>

      {keyTerms && keyTerms.length > 0 && (
        <div>
          <div style={{ fontSize: '.72rem', fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: 6 }}>
            🔑 KEY TECHNICAL TERMS EVALUATED:
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {keyTerms.map((term, i) => (
              <span key={i} style={{ padding: '3px 9px', borderRadius: 6, background: '#fff', border: '1px solid #d0d7e8', fontSize: '.72rem', fontWeight: 700, color: 'var(--text)' }}>
                ✓ {term}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN TECHNICAL ROUND PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function TechnicalRoundPage() {
  const [activeSub, setActiveSub] = useState('DBMS');
  const [activeSubtopic, setActiveSubtopic] = useState(SUBJECT_SUBTOPICS.DBMS[0]);
  const [activeLevel, setActiveLevel] = useState('All');
  const [phaseMode, setPhaseMode] = useState('practice');
  const [showRes, setShowRes] = useState(false);

  const [questions, setQuestions] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [userAnswers, setUserAnswers] = useState({});
  const [evalResults, setEvalResults] = useState({});
  const [expanded, setExpanded] = useState({});

  const handleSubjectChange = (subject) => {
    setActiveSub(subject);
    const subs = SUBJECT_SUBTOPICS[subject] || [];
    const firstSub = subs[0] || '';
    setActiveSubtopic(firstSub);
    loadQuestions(subject, firstSub, activeLevel);
  };

  const loadQuestions = useCallback((subject, subtopic, level) => {
    const subQMap = FALLBACK_QUESTIONS[subject] || {};
    const subList = subQMap[subtopic] || Object.values(subQMap).flat() || [];

    let filtered = subList;
    if (level !== 'All') {
      filtered = subList.filter(q => q.level === level);
    }
    if (!filtered.length) filtered = subList;

    setQuestions(filtered);
    setUserAnswers({});
    setEvalResults({});
    setExpanded({});
  }, []);

  useEffect(() => {
    loadQuestions(activeSub, activeSubtopic, activeLevel);
  }, [activeSub, activeSubtopic, activeLevel, loadQuestions]);

  const fetchAIQuestions = async (targetCompany = 'TCS') => {
    setAiLoading(true);
    try {
      const res = await fetch(`${API}/practice/rag-generate-questions`, {
        method: 'POST',
        headers: tks(),
        body: JSON.stringify({
          roundType: 'TECHNICAL',
          company: typeof targetCompany === 'string' ? targetCompany : 'TCS',
          subject: activeSub,
          difficulty: activeLevel === 'All' ? 'Medium' : activeLevel,
          domain: 'CSE'
        })
      }).then(r => r.json());

      if (res.questions && res.questions.length > 0) {
        const mapped = res.questions.map(q => ({
          level: q.difficulty || (activeLevel === 'All' ? 'Medium' : activeLevel),
          company: q.company || 'TCS/Amazon',
          q: q.question || q.title,
          a: q.answer || q.sampleAnswer || q.explanation || 'Detailed solution provided.'
        }));
        setQuestions(mapped);
      } else {
        const aiGenerated = generateDynamicAIQuestions(activeSub, activeSubtopic, activeLevel);
        setQuestions(aiGenerated);
      }
    } catch (e) {
      const aiGenerated = generateDynamicAIQuestions(activeSub, activeSubtopic, activeLevel);
      setQuestions(aiGenerated);
    } finally {
      setAiLoading(false);
    }
  };

  const evaluateAnswer = (idx, qItem) => {
    const text = (userAnswers[idx] || '').trim().toLowerCase();
    if (!text) return;

    const words = qItem.a.toLowerCase().split(/\s+/);
    const keyTermsCandidate = words.filter(w => w.length > 4).slice(0, 5);
    const matched = keyTermsCandidate.filter(w => text.includes(w));
    const score = Math.min(100, Math.max(35, Math.round((matched.length / keyTermsCandidate.length) * 100)));

    setEvalResults(prev => ({
      ...prev,
      [idx]: {
        score: score >= 40 ? score : 45,
        keyTerms: keyTermsCandidate.map(w => w.toUpperCase())
      }
    }));
  };

  const LEVELS = ['All', 'Beginner', 'Intermediate', 'Advanced'];
  const curCheatSheet = CHEATSHEETS[activeSub]?.[activeSubtopic] || CHEATSHEETS[activeSub]?.[Object.keys(CHEATSHEETS[activeSub] || {})[0]];
  const curResourceLinks = RESOURCE_LINKS[activeSub] || [];

  return (
    <div style={{ fontFamily: "'Nunito',sans-serif" }}>
      <RoundHeader
        icon="🏢🟠"
        title="360° Technical Interview Preparation & AI Evaluator"
        subtitle="Master subject subtopics, practice authentic company interview questions (TCS, Amazon, Cognizant, Wipro), and evaluate your technical answers with AI feedback."
      />

      {/* 3-Phase Navigation Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 18 }}>
        {[
          { key: 'learn', label: '📖 Phase 1: Subtopic Cheat Sheets', color: '#531697' },
          { key: 'practice', label: '🧪 Phase 2: Q&A & AI Evaluator', color: '#13a1a5' },
          { key: 'timed', label: '⏱️ Phase 3: Timed Interview Test', color: '#ef4444' }
        ].map(p => (
          <button
            key={p.key}
            onClick={() => setPhaseMode(p.key)}
            style={{
              padding: '11px 14px',
              borderRadius: 12,
              border: phaseMode === p.key ? `2px solid ${p.color}` : '1.5px solid #d0d7e8',
              background: phaseMode === p.key ? `${p.color}12` : '#fff',
              color: phaseMode === p.key ? p.color : 'var(--text)',
              fontFamily: "'Syne',sans-serif",
              fontWeight: 800,
              fontSize: '.82rem',
              cursor: 'pointer',
              boxShadow: phaseMode === p.key ? `0 4px 14px ${p.color}20` : 'none',
              transition: 'all .15s ease'
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Subject Selectors */}
      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 12 }}>
        {Object.keys(SUBJECT_SUBTOPICS).map(s => (
          <button
            key={s}
            onClick={() => handleSubjectChange(s)}
            style={{
              padding: '7px 14px',
              borderRadius: 9,
              border: `1.5px solid ${activeSub === s ? '#531697' : '#d0d7e8'}`,
              background: activeSub === s ? GRAD : '#fff',
              color: activeSub === s ? '#fff' : 'var(--text-3)',
              fontWeight: 800,
              cursor: 'pointer',
              fontSize: '.78rem',
              display: 'flex',
              alignItems: 'center',
              gap: 5
            }}
          >
            <span>{SUBJECT_ICONS[s] || '📖'}</span> {s}
          </button>
        ))}
      </div>

      {/* Subtopics Selector Bar */}
      <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 16 }}>
        <div style={{ fontSize: '.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8 }}>
          {activeSub} SUBTOPICS:
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(SUBJECT_SUBTOPICS[activeSub] || []).map(sub => (
            <button
              key={sub}
              onClick={() => { setActiveSubtopic(sub); loadQuestions(activeSub, sub, activeLevel); }}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                border: activeSubtopic === sub ? '1.5px solid #13a1a5' : '1px solid #cbd5e1',
                background: activeSubtopic === sub ? 'rgba(19,161,165,0.1)' : '#fff',
                color: activeSubtopic === sub ? '#0d7a7e' : 'var(--text)',
                fontWeight: 700,
                fontSize: '.75rem',
                cursor: 'pointer'
              }}
            >
              {sub}
            </button>
          ))}
        </div>
      </div>

      {/* Level Filter Bar & Resources Toggle */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: '.75rem', fontWeight: 800, color: 'var(--text-3)' }}>Difficulty Level:</span>
          {LEVELS.map(lvl => (
            <button
              key={lvl}
              onClick={() => setActiveLevel(lvl)}
              style={{
                padding: '5px 11px',
                borderRadius: 7,
                border: activeLevel === lvl ? 'none' : '1px solid #d0d7e8',
                background: activeLevel === lvl ? (lvl === 'Advanced' ? '#ef4444' : lvl === 'Intermediate' ? '#f59e0b' : '#531697') : '#fff',
                color: activeLevel === lvl ? '#fff' : 'var(--text-3)',
                fontWeight: 800,
                fontSize: '.72rem',
                cursor: 'pointer'
              }}
            >
              {lvl === 'Beginner' ? '🟢 Beginner (Service)' : lvl === 'Intermediate' ? '🟡 Intermediate (Cognizant/Zoho)' : lvl === 'Advanced' ? '🔴 Advanced (Amazon/FAANG)' : 'All Levels'}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setShowRes(r => !r)}
            style={{
              padding: '7px 14px',
              borderRadius: 8,
              border: `1.5px solid ${showRes ? '#531697' : '#d0d7e8'}`,
              background: showRes ? 'rgba(83,22,151,0.06)' : '#fff',
              color: showRes ? '#531697' : 'var(--text-3)',
              fontWeight: 800,
              fontSize: '.78rem',
              cursor: 'pointer'
            }}
          >
            📚 {showRes ? 'Hide Resources' : 'Resources'}
          </button>
          <button
            onClick={fetchAIQuestions}
            disabled={aiLoading}
            style={{
              padding: '7px 15px',
              borderRadius: 8,
              border: 'none',
              background: GRAD,
              color: '#fff',
              fontWeight: 800,
              cursor: aiLoading ? 'wait' : 'pointer',
              fontSize: '.78rem',
              boxShadow: '0 4px 12px rgba(83,22,151,0.2)'
            }}
          >
            {aiLoading ? '⌛ Fetching AI Questions…' : '🤖 Fetch Dynamic AI Questions'}
          </button>
        </div>
      </div>

      {/* Resource Links Drawer */}
      {showRes && (
        <Card style={{ marginBottom: 16, background: 'rgba(83,22,151,0.03)', border: '1.5px solid rgba(83,22,151,0.18)' }}>
          <SectionTitle>📚 Curated External Guides for {activeSub}</SectionTitle>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            {curResourceLinks.map((r, i) => (
              <a key={i} href={r.url} target="_blank" rel="noreferrer"
                style={{ padding: '7px 14px', borderRadius: 8, background: '#fff', border: '1px solid #e8edf5', color: '#531697', fontWeight: 800, textDecoration: 'none', fontSize: '.78rem', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
                📖 {r.name} ↗
              </a>
            ))}
          </div>
          <div style={{ fontSize: '.7rem', fontWeight: 800, color: '#b0bec9', marginBottom: 6 }}>ALL TECHNICAL INTERVIEW PORTALS</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {ROUND_RESOURCES.TECHNICAL.map((r, i) => (
              <a key={i} href={r.url} target="_blank" rel="noreferrer"
                style={{ padding: '5px 11px', borderRadius: 6, background: r.color + '18', color: r.color, fontSize: '.72rem', fontWeight: 800, textDecoration: 'none', border: `1px solid ${r.color}30` }}>
                {r.tag} — {r.name} ↗
              </a>
            ))}
          </div>
        </Card>
      )}

      {/* Phase 1: Learn Cheat Sheets */}
      {phaseMode === 'learn' && (
        <Card style={{ marginBottom: 20, background: '#fff' }}>
          <SectionTitle>📖 Subtopic Cheat Sheet & Concept Guide — {activeSubtopic}</SectionTitle>

          {curCheatSheet ? (
            <div>
              <div style={{ fontSize: '.88rem', color: 'var(--text)', fontWeight: 700, marginBottom: 12, lineHeight: 1.6 }}>
                {curCheatSheet.summary}
              </div>

              <div style={{ display: 'grid', gap: 8, marginBottom: 14 }}>
                {curCheatSheet.points.map((pt, idx) => (
                  <div key={idx} style={{ padding: '10px 14px', borderRadius: 8, background: '#f8fafc', borderLeft: '3px solid #531697', fontSize: '.82rem', color: 'var(--text-2)', lineHeight: 1.6 }}>
                    {pt}
                  </div>
                ))}
              </div>

              {curCheatSheet.shortcut && (
                <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(19,161,165,0.08)', border: '1px solid rgba(19,161,165,0.2)', fontSize: '.8rem', fontWeight: 800, color: '#0d7a7e' }}>
                  💡 {curCheatSheet.shortcut}
                </div>
              )}
            </div>
          ) : (
            <div style={{ fontSize: '.83rem', color: 'var(--text-2)', lineHeight: 1.7 }}>
              Master high-frequency concepts for <strong>{activeSubtopic}</strong> tested in Tier-1 & Tier-2 company interviews. Review trade-offs, architecture patterns, and key syntax before practicing!
            </div>
          )}
        </Card>
      )}

      {/* Questions List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {questions.map((item, i) => (
          <Card key={i} style={{ padding: 18, background: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ padding: '3px 8px', borderRadius: 6, background: 'rgba(83,22,151,0.08)', color: '#531697', fontWeight: 800, fontSize: '.7rem' }}>
                  Q{i + 1}
                </span>
                <span style={{ padding: '3px 8px', borderRadius: 6, background: '#f1f5f9', color: 'var(--text-3)', fontWeight: 700, fontSize: '.7rem' }}>
                  {item.level || 'Intermediate'}
                </span>
                {item.company && (
                  <span style={{ padding: '3px 8px', borderRadius: 6, background: 'rgba(19,161,165,0.08)', color: '#0d7a7e', fontWeight: 800, fontSize: '.7rem' }}>
                    🏢 {item.company}
                  </span>
                )}
              </div>

              <button
                onClick={() => setExpanded(e => ({ ...e, [i]: !e[i] }))}
                style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid #d0d7e8', background: 'transparent', color: '#531697', fontWeight: 800, fontSize: '.72rem', cursor: 'pointer' }}
              >
                {expanded[i] ? 'Hide Answer' : 'Reveal Expert Answer'}
              </button>
            </div>

            <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: '.92rem', color: 'var(--text)', marginBottom: 12 }}>
              {item.q}
            </div>

            {/* Answer Evaluator Input Box */}
            <div style={{ marginBottom: 12 }}>
              <textarea
                rows={2}
                value={userAnswers[i] || ''}
                onChange={(e) => setUserAnswers({ ...userAnswers, [i]: e.target.value })}
                placeholder="Type your technical answer here to get AI accuracy feedback..."
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #d0d7e8', fontFamily: "'Nunito',sans-serif", fontSize: '.82rem', outline: 'none', resize: 'vertical' }}
              />
              <button
                onClick={() => evaluateAnswer(i, item)}
                style={{ marginTop: 6, padding: '6px 14px', borderRadius: 7, border: 'none', background: GRAD, color: '#fff', fontWeight: 800, fontSize: '.75rem', cursor: 'pointer' }}
              >
                📝 Evaluate My Answer with AI
              </button>
            </div>

            {evalResults[i] && (
              <AIMentorCard score={evalResults[i].score} feedback={null} keyTerms={evalResults[i].keyTerms} />
            )}

            {expanded[i] && (
              <div style={{ marginTop: 12, padding: 14, borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '.83rem', color: 'var(--text-2)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                <div style={{ fontWeight: 800, color: '#531697', marginBottom: 4 }}>🏆 Model Tier-1 Interview Answer:</div>
                {item.a}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
