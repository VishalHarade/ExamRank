import { PrismaClient, Role, ExamStatus, Difficulty } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting ExamRank database seeding...");

  // Clear existing data in reverse order of dependencies
  await prisma.submissionTestResult.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.violation.deleteMany();
  await prisma.examAttempt.deleteMany();
  await prisma.examQuestion.deleteMany();
  await prisma.testCase.deleteMany();
  await prisma.question.deleteMany();
  await prisma.exam.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("password123", 10);
  const adminPasswordHash = await bcrypt.hash("admin123", 10);

  // 1. Create Users
  const teacher = await prisma.user.create({
    data: {
      name: "Prof. Alan Turing",
      email: "teacher@college.edu",
      passwordHash,
      role: Role.TEACHER,
      department: "Computer Science & Engineering",
    },
  });

  const admin = await prisma.user.create({
    data: {
      name: "Dr. Grace Hopper",
      email: "admin@college.edu",
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
      department: "Dean of Computing & Information Sciences",
    },
  });

  const student1 = await prisma.user.create({
    data: {
      name: "Alex Rivera",
      email: "student1@college.edu",
      passwordHash,
      role: Role.STUDENT,
      usn: "1MS21CS001",
      department: "Computer Science & Engineering",
      semester: 6,
      division: "A",
    },
  });

  const student2 = await prisma.user.create({
    data: {
      name: "Priya Sharma",
      email: "student2@college.edu",
      passwordHash,
      role: Role.STUDENT,
      usn: "1MS21CS045",
      department: "Computer Science & Engineering",
      semester: 6,
      division: "A",
    },
  });

  const student3 = await prisma.user.create({
    data: {
      name: "David Chen",
      email: "student3@college.edu",
      passwordHash,
      role: Role.STUDENT,
      usn: "1MS21CS078",
      department: "Computer Science & Engineering",
      semester: 6,
      division: "B",
    },
  });

  const student4 = await prisma.user.create({
    data: {
      name: "Rahul Mehta",
      email: "student4@college.edu",
      passwordHash,
      role: Role.STUDENT,
      usn: "1MS21CS112",
      department: "Computer Science & Engineering",
      semester: 6,
      division: "A",
    },
  });

  const student5 = await prisma.user.create({
    data: {
      name: "Ananya Gupta",
      email: "student5@college.edu",
      passwordHash,
      role: Role.STUDENT,
      usn: "1MS21CS144",
      department: "Information Science & Engineering",
      semester: 6,
      division: "B",
    },
  });

  console.log("👤 Created sample users (Teacher, Admin, 5 Students)");

  // 2. Create Questions with REAL starter code stubs (NOT solutions)
  const starterCodeTwoSum = JSON.stringify({
    python: `import sys

def two_sum(nums, target):
    # Write your solution here
    # Return the 0-based indices of two numbers that add up to target
    pass

def main():
    input_data = sys.stdin.read().split()
    if not input_data:
        return
    n = int(input_data[0])
    target = int(input_data[1])
    nums = [int(x) for x in input_data[2:2+n]]
    
    # Call two_sum and print the two indices separated by a space: e.g. print(i, j)

if __name__ == "__main__":
    main()
`,
    javascript: `const fs = require('fs');

function solve() {
    const input = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);
    if (input.length < 2) return;
    const n = parseInt(input[0]);
    const target = parseInt(input[1]);
    const nums = input.slice(2, 2 + n).map(Number);

    // Write your code here:
    // Output the two indices separated by a space: console.log(i + " " + j);
}

solve();
`,
    cpp: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    int n, target;
    if (!(cin >> n >> target)) return 0;
    vector<int> nums(n);
    for (int i = 0; i < n; i++) {
        cin >> nums[i];
    }

    // Write your solution here:
    // Print the two indices separated by a space

    return 0;
}
`,
    c: `#include <stdio.h>
#include <stdlib.h>

int main() {
    int n, target;
    if (scanf("%d %d", &n, &target) != 2) return 0;
    int* arr = (int*)malloc(n * sizeof(int));
    for (int i = 0; i < n; i++) {
        scanf("%d", &arr[i]);
    }

    // Write your solution here:

    free(arr);
    return 0;
}
`,
  });

  const q1 = await prisma.question.create({
    data: {
      title: "Two Sum Indices",
      slug: "two-sum-indices",
      description: `Given an array of integers \`nums\` and an integer \`target\`, return the **0-based indices** of the two numbers such that they add up to \`target\`.

You may assume that each input would have **exactly one solution**, and you may not use the same element twice. Output the smaller index first, separated by a single space.`,
      inputFormat: `The first line contains two integers: \`N\` (number of elements) and \`target\` separated by a space.
The second line contains \`N\` space-separated integers representing the array elements.`,
      outputFormat: `Print the two indices separated by a single space (e.g. \`0 1\`).`,
      constraints: `2 <= N <= 10^5
-10^9 <= nums[i] <= 10^9
-10^9 <= target <= 10^9
Exactly one valid answer exists.`,
      difficulty: Difficulty.EASY,
      allowedLanguages: "c,cpp,python,javascript",
      timeLimit: 2000,
      memoryLimit: 256,
      defaultMarks: 20,
      starterCode: starterCodeTwoSum,
      tags: "array,hash-table,two-pointers",
      createdById: teacher.id,
      testCases: {
        create: [
          {
            input: "4 9\n2 7 11 15",
            expectedOutput: "0 1",
            explanation: "nums[0] + nums[1] = 2 + 7 = 9. Output indices: 0 1.",
            marks: 5,
            isHidden: false,
            orderIndex: 0,
          },
          {
            input: "3 6\n3 2 4",
            expectedOutput: "1 2",
            explanation: "nums[1] + nums[2] = 2 + 4 = 6. Output indices: 1 2.",
            marks: 5,
            isHidden: false,
            orderIndex: 1,
          },
          {
            input: "2 6\n3 3",
            expectedOutput: "0 1",
            explanation: "Duplicate values matching target.",
            marks: 5,
            isHidden: true,
            orderIndex: 2,
          },
          {
            input: "5 0\n-5 2 7 5 9",
            expectedOutput: "0 3",
            explanation: "Handling negative integers properly.",
            marks: 5,
            isHidden: true,
            orderIndex: 3,
          },
        ],
      },
    },
  });

  const starterCodeKadane = JSON.stringify({
    python: `import sys

def max_subarray(nums):
    # Write your solution here
    # Return the maximum contiguous subarray sum
    pass

def main():
    input_data = sys.stdin.read().split()
    if not input_data:
        return
    n = int(input_data[0])
    nums = [int(x) for x in input_data[1:1+n]]
    
    # Calculate and print the maximum subarray sum

if __name__ == "__main__":
    main()
`,
    javascript: `const fs = require('fs');

function solve() {
    const input = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);
    if (!input || input.length < 2) return;
    const n = parseInt(input[0]);
    const arr = input.slice(1, 1 + n).map(Number);

    // Write your code here:
    // Print the maximum contiguous subarray sum
}

solve();
`,
    cpp: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    int n;
    if (!(cin >> n)) return 0;
    vector<long long> a(n);
    for (int i = 0; i < n; i++) cin >> a[i];

    // Write your solution here:
    // Print the maximum contiguous subarray sum

    return 0;
}
`,
    c: `#include <stdio.h>
#include <stdlib.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    long long* arr = (long long*)malloc(n * sizeof(long long));
    for (int i = 0; i < n; i++) {
        scanf("%lld", &arr[i]);
    }

    // Write your solution here:

    free(arr);
    return 0;
}
`,
  });

  const q2 = await prisma.question.create({
    data: {
      title: "Maximum Subarray Sum (Kadane's)",
      slug: "maximum-subarray-sum",
      description: `Given an integer array \`nums\`, find the contiguous subarray (containing at least one number) which has the largest sum and return **its sum**.`,
      inputFormat: `The first line contains an integer \`N\`, the number of elements.
The second line contains \`N\` space-separated integers.`,
      outputFormat: `Print a single integer representing the maximum contiguous subarray sum.`,
      constraints: `1 <= N <= 10^5
-10^4 <= nums[i] <= 10^4`,
      difficulty: Difficulty.MEDIUM,
      allowedLanguages: "c,cpp,python,javascript",
      timeLimit: 1500,
      memoryLimit: 128,
      defaultMarks: 30,
      starterCode: starterCodeKadane,
      tags: "array,dynamic-programming,divide-and-conquer",
      createdById: teacher.id,
      testCases: {
        create: [
          {
            input: "9\n-2 1 -3 4 -1 2 1 -5 4",
            expectedOutput: "6",
            explanation: "[4,-1,2,1] has the largest sum = 6.",
            marks: 10,
            isHidden: false,
            orderIndex: 0,
          },
          {
            input: "1\n1",
            expectedOutput: "1",
            explanation: "Single element array.",
            marks: 5,
            isHidden: false,
            orderIndex: 1,
          },
          {
            input: "5\n5 4 -1 7 8",
            expectedOutput: "23",
            explanation: "Subarray [5, 4, -1, 7, 8] has the largest sum = 23.",
            marks: 5,
            isHidden: true,
            orderIndex: 2,
          },
          {
            input: "4\n-5 -2 -8 -1",
            expectedOutput: "-1",
            explanation: "All negative values: should pick the maximum single element (-1).",
            marks: 10,
            isHidden: true,
            orderIndex: 3,
          },
        ],
      },
    },
  });

  const starterCodeParens = JSON.stringify({
    python: `import sys

def is_balanced(s):
    # Write your solution here
    # Return True if balanced, False otherwise
    pass

def main():
    s = sys.stdin.read().strip()
    if not s:
        return
    
    # Print YES if balanced, otherwise NO

if __name__ == "__main__":
    main()
`,
    javascript: `const fs = require('fs');

function solve() {
    const s = fs.readFileSync(0, 'utf-8').trim();
    if (!s) return;

    // Write your code here:
    // Print YES if balanced, otherwise NO
}

solve();
`,
    cpp: `#include <iostream>
#include <string>
using namespace std;

int main() {
    string s;
    if (!(cin >> s)) return 0;

    // Write your solution here:
    // Print YES if balanced, otherwise NO

    return 0;
}
`,
  });

  const q3 = await prisma.question.create({
    data: {
      title: "Balanced Parentheses Checker",
      slug: "balanced-parentheses-checker",
      description: `Given a string \`s\` containing just the characters \`'('\`, \`')'\`, \`'{'\`, \`'}'\`, \`'['\` and \`']'\`, determine if the input string is valid.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.

Print \`YES\` if valid, otherwise print \`NO\`.`,
      inputFormat: `A single line containing the bracket string \`s\`.`,
      outputFormat: `Print either \`YES\` or \`NO\`.`,
      constraints: `1 <= s.length <= 10^4
s consists of parentheses only: '()[]{}'.`,
      difficulty: Difficulty.EASY,
      allowedLanguages: "c,cpp,python,javascript",
      timeLimit: 1500,
      memoryLimit: 128,
      defaultMarks: 20,
      starterCode: starterCodeParens,
      tags: "stack,string",
      createdById: teacher.id,
      testCases: {
        create: [
          {
            input: "()[]{}",
            expectedOutput: "YES",
            explanation: "All brackets open and close properly.",
            marks: 5,
            isHidden: false,
            orderIndex: 0,
          },
          {
            input: "(]",
            expectedOutput: "NO",
            explanation: "Mismatched closing bracket.",
            marks: 5,
            isHidden: false,
            orderIndex: 1,
          },
          {
            input: "{[()]}",
            expectedOutput: "YES",
            explanation: "Nested brackets are valid.",
            marks: 5,
            isHidden: true,
            orderIndex: 2,
          },
          {
            input: "([)]",
            expectedOutput: "NO",
            explanation: "Wrong closing order.",
            marks: 5,
            isHidden: true,
            orderIndex: 3,
          },
        ],
      },
    },
  });

  console.log("📝 Created 3 standard examination questions with clean starter code stubs");

  // 3. Create Exams
  const now = new Date();
  const startTime = new Date(now.getTime() - 15 * 60 * 1000); // 15 mins ago
  const endTime = new Date(now.getTime() + 120 * 60 * 1000); // 2 hours from now

  const activeExam = await prisma.exam.create({
    data: {
      title: "CS302: Data Structures & Algorithms Lab Exam",
      description: "Semester VI Official Practical Examination. All browser integrity checks are actively enforced. Code will be auto-evaluated against private test cases upon submission.",
      instructions: `1. Ensure your browser remains in FULLSCREEN mode throughout the duration of the examination.
2. Leaving or switching browser tabs will trigger an immediate VIOLATION incident.
3. Three (3) recorded violations will result in automatic exam termination.
4. Clipboard paste is locked outside of the code editor.
5. Code autosaves automatically every few keystrokes and upon running tests.
6. Server-authoritative timer locks at expiration.`,
      duration: 90,
      startTime,
      endTime,
      status: ExamStatus.ACTIVE,
      maxAttempts: 1,
      violationLimit: 3,
      autoSubmit: true,
      allowedLanguages: "python,javascript,cpp,c",
      totalMarks: 70,
      passPercentage: 40.0,
      enableFullscreen: true,
      enableTabMonitoring: true,
      enableClipboardRestrictions: true,
      enableRightClickDisable: true,
      targetDepartment: "Computer Science & Engineering",
      targetSemester: 6,
      createdById: teacher.id,
      examQuestions: {
        create: [
          { questionId: q1.id, orderIndex: 0, marks: 20 },
          { questionId: q2.id, orderIndex: 1, marks: 30 },
          { questionId: q3.id, orderIndex: 2, marks: 20 },
        ],
      },
    },
  });

  // Note: For activeExam, student1 has NO attempt! student1 starts completely fresh!
  // Seed Priya (student2) as in-progress for realistic live proctoring demonstration
  await prisma.examAttempt.create({
    data: {
      examId: activeExam.id,
      studentId: student2.id,
      status: "IN_PROGRESS",
      startedAt: new Date(now.getTime() - 10 * 60 * 1000),
      endTime: new Date(now.getTime() + 80 * 60 * 1000),
      totalScore: 0,
      percentage: 0,
      violationCount: 0,
    },
  });

  const scheduledExam = await prisma.exam.create({
    data: {
      title: "CS401: Advanced Competitive Programming & Graph Theory",
      description: "Mid-Term assessment covering shortest path algorithms, topological sorting, and dynamic programming.",
      instructions: "Standard College Code Exam rules apply. Ensure stable network connection.",
      duration: 120,
      startTime: new Date(now.getTime() + 24 * 60 * 60 * 1000), // Tomorrow
      endTime: new Date(now.getTime() + 26 * 60 * 60 * 1000),
      status: ExamStatus.SCHEDULED,
      maxAttempts: 1,
      violationLimit: 3,
      autoSubmit: true,
      allowedLanguages: "cpp,python,javascript",
      totalMarks: 50,
      passPercentage: 50.0,
      targetDepartment: "Computer Science & Engineering",
      targetSemester: 6,
      createdById: teacher.id,
      examQuestions: {
        create: [
          { questionId: q2.id, orderIndex: 0, marks: 30 },
          { questionId: q3.id, orderIndex: 1, marks: 20 },
        ],
      },
    },
  });

  // Past exam with published results for analytics & showcase
  const pastExam = await prisma.exam.create({
    data: {
      title: "CS201: Foundations of Problem Solving & Logic",
      description: "End-Semester laboratory examination for 2nd Year undergraduates.",
      instructions: "Closed-book programming exam.",
      duration: 60,
      startTime: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      endTime: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
      status: ExamStatus.RESULT_PUBLISHED,
      maxAttempts: 1,
      violationLimit: 3,
      autoSubmit: true,
      allowedLanguages: "c,cpp,python,javascript",
      totalMarks: 40,
      passPercentage: 40.0,
      targetDepartment: "Computer Science & Engineering",
      targetSemester: 4,
      createdById: teacher.id,
      examQuestions: {
        create: [
          { questionId: q1.id, orderIndex: 0, marks: 20 },
          { questionId: q3.id, orderIndex: 1, marks: 20 },
        ],
      },
    },
  });

  // Seed student2 and student3 attempts for past exam to give rich charts and data
  const pastAttempt1 = await prisma.examAttempt.create({
    data: {
      examId: pastExam.id,
      studentId: student2.id,
      status: "SUBMITTED",
      startedAt: new Date(pastExam.startTime),
      submittedAt: new Date(pastExam.startTime.getTime() + 45 * 60 * 1000),
      totalScore: 40,
      percentage: 100.0,
      violationCount: 0,
    },
  });

  const pastAttempt2 = await prisma.examAttempt.create({
    data: {
      examId: pastExam.id,
      studentId: student3.id,
      status: "SUBMITTED",
      startedAt: new Date(pastExam.startTime),
      submittedAt: new Date(pastExam.startTime.getTime() + 55 * 60 * 1000),
      totalScore: 30,
      percentage: 75.0,
      violationCount: 1,
    },
  });

  // Record a violation for student3
  await prisma.violation.create({
    data: {
      attemptId: pastAttempt2.id,
      studentId: student3.id,
      type: "TAB_SWITCH",
      severity: "WARNING",
      metadata: "Student switched browser tab to external window for 4 seconds.",
    },
  });

  // 4. Seed Rahul (student4) as TERMINATED due to violation limit (3 violations) on activeExam
  const disqualifiedAttempt = await prisma.examAttempt.create({
    data: {
      examId: activeExam.id,
      studentId: student4.id,
      status: "TERMINATED",
      startedAt: new Date(now.getTime() - 25 * 60 * 1000),
      submittedAt: new Date(now.getTime() - 5 * 60 * 1000),
      totalScore: 0,
      percentage: 0,
      violationCount: 3,
    },
  });

  await prisma.violation.createMany({
    data: [
      {
        attemptId: disqualifiedAttempt.id,
        studentId: student4.id,
        type: "TAB_SWITCH",
        severity: "WARNING",
        metadata: "Student navigated away to external browser tab for 8 seconds.",
      },
      {
        attemptId: disqualifiedAttempt.id,
        studentId: student4.id,
        type: "FULLSCREEN_EXIT",
        severity: "FINAL_WARNING",
        metadata: "Student pressed Escape and exited enforced fullscreen mode.",
      },
      {
        attemptId: disqualifiedAttempt.id,
        studentId: student4.id,
        type: "CLIPBOARD_PASTE",
        severity: "CRITICAL",
        metadata: "Attempted external clipboard paste into source editor. Violation threshold exceeded.",
      },
    ],
  });

  // 5. Seed Ananya (student5) as FAILED on pastExam (scored 10 / 40, below 40% pass threshold)
  const failedAttempt = await prisma.examAttempt.create({
    data: {
      examId: pastExam.id,
      studentId: student5.id,
      status: "SUBMITTED",
      startedAt: new Date(pastExam.startTime),
      submittedAt: new Date(pastExam.startTime.getTime() + 50 * 60 * 1000),
      totalScore: 10,
      percentage: 25.0,
      violationCount: 1,
    },
  });

  await prisma.violation.create({
    data: {
      attemptId: failedAttempt.id,
      studentId: student5.id,
      type: "DEVTOOLS_ATTEMPT",
      severity: "WARNING",
      metadata: "Developer inspection tools shortcut (F12) intercepted.",
    },
  });

  console.log("🎓 Created 3 Exams with active, failed, and violation-disqualified candidate attempts");
  console.log("✅ Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
